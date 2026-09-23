"""Measure the local ASR gateway using the official bundled WAV, not private recordings."""

import json
import statistics
import sys
import time
import wave
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app.main import app, asr_service  # noqa: E402

WAV = ROOT / ".runtime/models/sherpa-onnx-streaming-zipformer-small-ctc-zh-2025-04-01/test_wavs/0.wav"


def summary(values: list[float]) -> dict[str, float]:
    ordered = sorted(values)
    return {
        "min": round(ordered[0], 3),
        "mean": round(statistics.mean(ordered), 3),
        "median": round(statistics.median(ordered), 3),
        "p95": round(ordered[min(len(ordered) - 1, int(len(ordered) * 0.95))], 3),
        "max": round(ordered[-1], 3),
    }


with wave.open(str(WAV), "rb") as source:
    pcm = source.readframes(source.getnframes())

decode_ms: list[float] = []
first_nonempty = None
asr_service.create_recognizer()  # Exclude cold model load from streaming decode timing.
start = time.perf_counter()
with TestClient(app).websocket_connect("/ws/asr") as socket:
    socket.send_json({"type": "start", "sample_rate": 16000, "channels": 1, "format": "pcm_s16le"})
    socket.receive_json()
    for index in range(0, len(pcm), 3200):
        socket.send_bytes(pcm[index:index + 3200])
        event = socket.receive_json()
        decode_ms.append(event["server_decode_ms"])
        if first_nonempty is None and event["text"]:
            first_nonempty = {"wall_ms": round((time.perf_counter() - start) * 1000, 3), "audio_ms_received": event["audio_ms_received"]}
    socket.send_json({"type": "stop"})
    final = socket.receive_json()

print(json.dumps({
    "fixture": "official 0.wav",
    "audio_duration_ms": round(len(pcm) / 2 / 16_000 * 1000),
    "frame_count": len(decode_ms),
    "server_decode_ms": summary(decode_ms),
    "first_nonempty_partial": first_nonempty,
    "total_decode_wall_ms": round((time.perf_counter() - start) * 1000, 3),
    "final": final["text"],
}, ensure_ascii=True))
