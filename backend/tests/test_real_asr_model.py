"""Optional local integration test; official model/audio are runtime downloads, never Git fixtures."""

import wave

import pytest
from fastapi.testclient import TestClient

from app.asr import ASRService, ASRSession, MODEL_ROOT
from app.main import app

OFFICIAL_EXPECTED_0 = "对我做了介绍那么我想说的是呢大家如果对我的研究感兴趣呢"


@pytest.mark.skipif(
    not (MODEL_ROOT / "sherpa-onnx-streaming-zipformer-small-ctc-zh-2025-04-01" / "test_wavs" / "0.wav").is_file(),
    reason="official sherpa-onnx model/test wav not downloaded",
)
def test_official_chinese_wav_produces_partial_and_final():
    wav = MODEL_ROOT / "sherpa-onnx-streaming-zipformer-small-ctc-zh-2025-04-01" / "test_wavs" / "0.wav"
    with wave.open(str(wav), "rb") as source:
        assert source.getframerate() == 16000
        assert source.getnchannels() == 1
        assert source.getsampwidth() == 2
        pcm = source.readframes(source.getnframes())

    session = ASRSession(ASRService().create_recognizer())
    partials = [session.accept_pcm(pcm[index:index + 3200]).text for index in range(0, len(pcm), 3200)]
    final = session.stop()

    assert any(partial for partial in partials)
    assert final.event_type == "asr_final"
    assert final.text == OFFICIAL_EXPECTED_0


@pytest.mark.skipif(
    not (MODEL_ROOT / "sherpa-onnx-streaming-zipformer-small-ctc-zh-2025-04-01" / "test_wavs" / "1.wav").is_file(),
    reason="official sherpa-onnx model/test wav not downloaded",
)
def test_real_websocket_asr_streams_chinese_partial_and_final():
    wav = MODEL_ROOT / "sherpa-onnx-streaming-zipformer-small-ctc-zh-2025-04-01" / "test_wavs" / "1.wav"
    with wave.open(str(wav), "rb") as source:
        pcm = source.readframes(source.getnframes())
    partials = []
    with TestClient(app).websocket_connect("/ws/asr") as socket:
        socket.send_json({"type": "start", "sample_rate": 16000, "channels": 1, "format": "pcm_s16le"})
        assert socket.receive_json()["status"] == "ready"
        for index in range(0, len(pcm), 3200):
            socket.send_bytes(pcm[index:index + 3200])
            partials.append(socket.receive_json()["text"])
        socket.send_json({"type": "stop"})
        final = socket.receive_json()
    assert any("重点" in partial for partial in partials)
    assert final["event_type"] == "asr_final"
    assert "金融" in final["text"]
