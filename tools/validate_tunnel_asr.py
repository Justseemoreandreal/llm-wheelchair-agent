"""Run while START_PHONE_DEMO is open; never prints the per-run token or URL."""

import asyncio
import json
import urllib.request
import wave
from pathlib import Path
from urllib.parse import urlsplit

from websockets.asyncio.client import connect


ROOT = Path(__file__).resolve().parents[1]


async def main() -> None:
    launch_url = (ROOT / ".runtime" / "phone_url.txt").read_text(encoding="utf-8").strip()
    parsed = urlsplit(launch_url)
    assert parsed.scheme == "https"
    with urllib.request.urlopen(f"https://{parsed.netloc}/health", timeout=20) as response:
        assert json.load(response)["status"] == "ok"

    wav = ROOT / ".runtime" / "models" / "sherpa-onnx-streaming-zipformer-small-ctc-zh-2025-04-01" / "test_wavs" / "0.wav"
    with wave.open(str(wav), "rb") as source:
        pcm = source.readframes(source.getnframes())

    ws_url = f"wss://{parsed.netloc}/ws/asr?{parsed.query}"
    async with connect(ws_url, open_timeout=30, max_size=2**20) as websocket:
        await websocket.send(json.dumps({"type": "start", "sample_rate": 16000, "channels": 1, "format": "pcm_s16le"}))
        ready = json.loads(await websocket.recv())
        assert ready["status"] == "ready"
        partial_count = 0
        for index in range(0, len(pcm), 3200):
            await websocket.send(pcm[index:index + 3200])
            partial = json.loads(await websocket.recv())
            assert partial["event_type"] == "asr_partial"
            partial_count += 1
        await websocket.send(json.dumps({"type": "stop"}))
        final = json.loads(await websocket.recv())
        assert final["event_type"] == "asr_final"
        assert "大家" in final["text"]
        print(json.dumps({"https_health": "PASS", "wss_asr": "PASS", "partial_events": partial_count, "final_text": final["text"]}))


if __name__ == "__main__":
    asyncio.run(main())
