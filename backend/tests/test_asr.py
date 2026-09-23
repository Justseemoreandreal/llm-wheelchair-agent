import asyncio

import pytest

from app.asr import ASRSession, ASRStatus, parse_asr_control


class FakeRecognizer:
    def __init__(self, values: list[str]) -> None:
        self.values = iter(values)
        self.accepted: list[bytes] = []
        self.reset_calls = 0
        self.finish_calls = 0

    def accept_pcm(self, pcm: bytes) -> None:
        self.accepted.append(pcm)

    def decode(self) -> str:
        return next(self.values, "")

    def reset(self) -> None:
        self.reset_calls += 1

    def finish(self) -> None:
        self.finish_calls += 1


def test_parse_asr_start_control_requires_pcm_16khz_mono():
    control = parse_asr_control(
        {"type": "start", "sample_rate": 16000, "channels": 1, "format": "pcm_s16le"}
    )

    assert control.type == "start"
    assert control.sample_rate == 16000

    with pytest.raises(ValueError, match="16000"):
        parse_asr_control({"type": "start", "sample_rate": 44100, "channels": 1, "format": "pcm_s16le"})


def test_asr_session_emits_partial_then_final_and_tracks_audio_duration():
    recognizer = FakeRecognizer(["停", "停下", ""])
    session = ASRSession(recognizer)

    partial = session.accept_pcm(b"\x00\x00" * 1600)
    final = session.stop()

    assert partial.event_type == "asr_partial"
    assert partial.text == "停"
    assert partial.sequence == 1
    assert partial.audio_ms_received == 100
    assert final.event_type == "asr_final"
    assert final.text == "停下"
    assert final.sequence == 2
    assert recognizer.finish_calls == 1
    assert final.is_session_end is True


def test_asr_session_reset_clears_partial_state():
    recognizer = FakeRecognizer(["停下", ""])
    session = ASRSession(recognizer)
    session.accept_pcm(b"\x00\x00" * 160)

    status = session.reset()

    assert status == ASRStatus(event_type="asr_status", status="reset", sequence=2)
    assert recognizer.reset_calls == 1
    assert session.latest_text == ""


def test_asr_session_rejects_odd_length_pcm_frame():
    session = ASRSession(FakeRecognizer([]))

    with pytest.raises(ValueError, match="16-bit"):
        session.accept_pcm(b"\x00")


def test_asr_session_disconnect_is_safe_after_stop():
    session = ASRSession(FakeRecognizer([""]))

    asyncio.run(session.close())
    asyncio.run(session.close())

    assert session.closed is True


def test_endpoint_emits_final_and_resets_for_next_utterance():
    class EndpointRecognizer(FakeRecognizer):
        def is_endpoint(self) -> bool:
            return True

    recognizer = EndpointRecognizer(["停下"])
    event = ASRSession(recognizer).accept_pcm(b"\x00\x00" * 160)
    assert event.event_type == "asr_final"
    assert event.text == "停下"
    assert event.is_session_end is False
    assert recognizer.reset_calls == 1
