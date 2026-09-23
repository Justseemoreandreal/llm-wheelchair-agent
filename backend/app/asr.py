"""Streaming PCM session primitives for the local Demo V0.2 ASR gateway."""

from __future__ import annotations

import argparse
import json
import tarfile
import threading
import time
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Protocol


TARGET_SAMPLE_RATE = 16_000
MODEL_NAME = "sherpa-onnx-streaming-zipformer-small-ctc-zh-2025-04-01"
MODEL_ARCHIVE_URL = (
    "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/"
    f"{MODEL_NAME}.tar.bz2"
)
MODEL_ROOT = Path(__file__).resolve().parents[2] / ".runtime" / "models"


class StreamingRecognizer(Protocol):
    def accept_pcm(self, pcm: bytes) -> None: ...

    def decode(self) -> str: ...

    def reset(self) -> None: ...

    def finish(self) -> None: ...

    def is_endpoint(self) -> bool: ...


@dataclass(frozen=True)
class ASRControl:
    type: str
    sample_rate: int = TARGET_SAMPLE_RATE
    channels: int = 1
    format: str = "pcm_s16le"


@dataclass(frozen=True)
class ASRStatus:
    event_type: str
    status: str
    sequence: int


@dataclass(frozen=True)
class ASREvent:
    event_type: str
    text: str
    sequence: int
    audio_ms_received: int
    server_decode_ms: float
    timestamp_ms: int
    is_session_end: bool = False

    def as_dict(self) -> dict[str, object]:
        return {
            "event_type": self.event_type,
            "text": self.text,
            "sequence": self.sequence,
            "audio_ms_received": self.audio_ms_received,
            "server_decode_ms": self.server_decode_ms,
            "timestamp_ms": self.timestamp_ms,
            "is_session_end": self.is_session_end,
        }


def parse_asr_control(payload: object) -> ASRControl:
    if not isinstance(payload, dict):
        raise ValueError("ASR control frame must be a JSON object")
    frame_type = payload.get("type")
    if frame_type not in {"start", "stop", "reset", "config"}:
        raise ValueError("ASR control type must be start, stop, reset, or config")
    control = ASRControl(
        type=frame_type,
        sample_rate=int(payload.get("sample_rate", TARGET_SAMPLE_RATE)),
        channels=int(payload.get("channels", 1)),
        format=str(payload.get("format", "pcm_s16le")),
    )
    if control.type in {"start", "config"}:
        if control.sample_rate != TARGET_SAMPLE_RATE:
            raise ValueError("ASR PCM sample_rate must be 16000")
        if control.channels != 1:
            raise ValueError("ASR PCM must be mono")
        if control.format != "pcm_s16le":
            raise ValueError("ASR PCM format must be pcm_s16le")
    return control


class ASRSession:
    def __init__(self, recognizer: StreamingRecognizer) -> None:
        self.recognizer = recognizer
        self.sequence = 0
        self.audio_bytes_received = 0
        self.latest_text = ""
        self.closed = False

    @property
    def audio_ms_received(self) -> int:
        return round(self.audio_bytes_received / 2 / TARGET_SAMPLE_RATE * 1000)

    def accept_pcm(self, pcm: bytes) -> ASREvent:
        if self.closed:
            raise ValueError("ASR session is closed")
        if len(pcm) % 2:
            raise ValueError("ASR PCM frame must contain 16-bit samples")
        started = time.perf_counter()
        self.recognizer.accept_pcm(pcm)
        text = self.recognizer.decode().strip()
        endpoint = bool(getattr(self.recognizer, "is_endpoint", lambda: False)())
        self.audio_bytes_received += len(pcm)
        self.latest_text = text
        self.sequence += 1
        event = ASREvent(
            event_type="asr_final" if endpoint and text else "asr_partial",
            text=text,
            sequence=self.sequence,
            audio_ms_received=self.audio_ms_received,
            server_decode_ms=round((time.perf_counter() - started) * 1000, 3),
            timestamp_ms=int(time.time() * 1000),
        )
        if endpoint:
            self.recognizer.reset()
        return event

    def stop(self) -> ASREvent:
        started = time.perf_counter()
        self.recognizer.finish()
        text = self.recognizer.decode().strip()
        self.latest_text = text
        self.sequence += 1
        return ASREvent(
            event_type="asr_final",
            text=text,
            sequence=self.sequence,
            audio_ms_received=self.audio_ms_received,
            server_decode_ms=round((time.perf_counter() - started) * 1000, 3),
            timestamp_ms=int(time.time() * 1000),
            is_session_end=True,
        )

    def reset(self) -> ASRStatus:
        self.recognizer.reset()
        self.latest_text = ""
        self.audio_bytes_received = 0
        self.sequence += 1
        return ASRStatus(event_type="asr_status", status="reset", sequence=self.sequence)

    async def close(self) -> None:
        self.closed = True


class SherpaStreamingRecognizer:
    """A small adapter that keeps sherpa/numpy outside protocol and test code."""

    def __init__(self, recognizer: object, engine_lock: threading.Lock) -> None:
        self.recognizer = recognizer
        self.engine_lock = engine_lock
        with self.engine_lock:
            self.stream = recognizer.create_stream()

    def accept_pcm(self, pcm: bytes) -> None:
        import numpy as np

        samples = np.frombuffer(pcm, dtype="<i2").astype(np.float32) / 32768.0
        with self.engine_lock:
            self.stream.accept_waveform(TARGET_SAMPLE_RATE, samples)

    def decode(self) -> str:
        with self.engine_lock:
            while self.recognizer.is_ready(self.stream):
                self.recognizer.decode_stream(self.stream)
            return self.recognizer.get_result_all(self.stream).text

    def reset(self) -> None:
        with self.engine_lock:
            self.recognizer.reset(self.stream)
            self.stream = self.recognizer.create_stream()

    def finish(self) -> None:
        with self.engine_lock:
            self.stream.input_finished()

    def is_endpoint(self) -> bool:
        with self.engine_lock:
            return self.recognizer.is_endpoint(self.stream)


class ASRService:
    def __init__(self, model_root: Path = MODEL_ROOT) -> None:
        self.model_root = model_root
        self._recognizer: object | None = None
        self._load_lock = threading.Lock()
        self._engine_lock = threading.Lock()
        self._error = ""

    @property
    def model_dir(self) -> Path:
        return self.model_root / MODEL_NAME

    def prepare_model(self, progress: Callable[[str], None] | None = None) -> Path:
        if (self.model_dir / "model.onnx").is_file() and (self.model_dir / "tokens.txt").is_file():
            return self.model_dir
        self.model_root.mkdir(parents=True, exist_ok=True)
        archive = self.model_root / f"{MODEL_NAME}.tar.bz2"
        if progress:
            progress(f"Downloading ASR model: {MODEL_NAME}")
        last_percent = -10

        def report_download(blocks: int, block_size: int, total_bytes: int) -> None:
            nonlocal last_percent
            if progress and total_bytes > 0:
                percent = min(100, blocks * block_size * 100 // total_bytes)
                if percent >= last_percent + 10:
                    last_percent = percent
                    progress(f"ASR model download: {percent}%")

        urllib.request.urlretrieve(MODEL_ARCHIVE_URL, archive, reporthook=report_download)
        if progress:
            progress("Extracting ASR model...")
        with tarfile.open(archive, "r:bz2") as package:
            package.extractall(self.model_root, filter="data")
        if not (self.model_dir / "model.onnx").is_file():
            raise RuntimeError("ASR model extraction did not produce model.onnx")
        return self.model_dir

    def _load(self) -> object:
        with self._load_lock:
            if self._recognizer is not None:
                return self._recognizer
            try:
                import sherpa_onnx

                model_dir = self.prepare_model()
                self._recognizer = sherpa_onnx.OnlineRecognizer.from_zipformer2_ctc(
                    tokens=str(model_dir / "tokens.txt"),
                    model=str(model_dir / "model.onnx"),
                    sample_rate=TARGET_SAMPLE_RATE,
                    enable_endpoint_detection=True,
                    num_threads=2,
                    provider="cpu",
                    debug=False,
                )
                self._error = ""
                return self._recognizer
            except Exception as error:
                self._error = str(error)
                raise

    def create_recognizer(self) -> SherpaStreamingRecognizer:
        return SherpaStreamingRecognizer(self._load(), self._engine_lock)

    def status(self) -> dict[str, object]:
        return {
            "status": "ready" if self._recognizer is not None else "not_loaded",
            "model": MODEL_NAME,
            "model_dir": str(self.model_dir),
            "error": self._error,
        }


def main() -> int:
    parser = argparse.ArgumentParser(description="Prepare the pinned Demo V0.2 ASR model.")
    parser.add_argument("command", choices=["prepare-model", "status"])
    args = parser.parse_args()
    service = ASRService()
    if args.command == "prepare-model":
        path = service.prepare_model(lambda message: print(message, flush=True))
        print(json.dumps({"status": "ready", "model": MODEL_NAME, "path": str(path)}))
    else:
        print(json.dumps(service.status()))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
