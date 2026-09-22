# Demo V0.2 Controller Plan — Browser Audio Capture + Local Streaming ASR

## Why this stage exists

Real-user validation on 2026-09-22 showed:

- Microsoft Edge: microphone permission granted and UI reached LISTENING, but no transcript was produced.
- Huawei/HarmonyOS browser: microphone permission prompt appeared, then SpeechRecognition entered ERROR.
- Three externally supplied Mandarin recordings were inspected by the controller and had usable signal levels; the failure is therefore treated as a browser SpeechRecognition portability problem, not a user speaking-volume problem.

Web Speech API is no longer the primary ASR path.

## Stage objective

Make speech recognition independent of browser-vendor SpeechRecognition services.

The browser is responsible only for:
- microphone permission;
- raw audio capture;
- local level meter;
- streaming PCM audio to the laptop backend.

The backend is responsible for:
- Chinese streaming ASR;
- partial/final transcript generation;
- returning transcript events to the browser.

Existing SafetyRouter remains responsible for P0 phrase matching.

No cloud LLM work in this stage.

## Frozen architecture

```
Phone / PC microphone
  -> getUserMedia
  -> Web Audio capture
  -> PCM16 mono frames
  -> WSS /ws/asr
  -> FastAPI ASR session
  -> sherpa-onnx streaming Chinese model
  -> partial/final transcript
  -> browser SafetyRouter
  -> P0 control command
  -> simulated control gateway
```

Web Speech API remains only as an optional diagnostic fallback/comparison mode, never the default.

## ASR engine decision

Primary engine: `sherpa-onnx`.

Default model target:
`sherpa-onnx-streaming-zipformer-small-ctc-zh-2025-04-01`

Reasons:
- official Chinese streaming model;
- suitable for local/edge use;
- much smaller than xlarge models;
- model is downloaded at runtime and not committed to Git.

If Codex finds a compatibility blocker with the exact Python/runtime version, it may use another official sherpa-onnx Chinese streaming model, but must document the reason and keep the model version pinned.

## Audio transport contract

WebSocket:
`/ws/asr`

Client -> server JSON control frames:
- start
- stop
- reset
- config

Client -> server binary frames:
- PCM signed 16-bit little-endian
- mono
- target sample rate 16000 Hz

Server -> client JSON:
```json
{
  "event_type": "asr_partial | asr_final | asr_status | asr_error",
  "text": "...",
  "sequence": 1,
  "audio_ms_received": 0,
  "server_decode_ms": 0,
  "timestamp_ms": 0
}
```

## Browser capture

Primary:
- `navigator.mediaDevices.getUserMedia({audio:true})`
- Web Audio API
- AudioWorklet when available

Fallback:
- ScriptProcessorNode or another browser-compatible PCM capture path when AudioWorklet is unavailable.

Do not use MediaRecorder + server-side ffmpeg as the primary architecture.

## Required diagnostics

UI must show:
- microphone permission state;
- getUserMedia success/failure;
- actual input sample rate;
- live RMS/level meter;
- audio frames sent count;
- audio bytes sent;
- ASR WebSocket connected/disconnected;
- server ASR ready/model loaded;
- latest partial transcript;
- latest final transcript;
- exact error code/message;
- last partial/final timestamp;
- speech-to-partial observable latency where measurable.

This allows a beginner to send a screenshot instead of opening developer tools.

## Audio-file regression mode

Add a visible test input:
`选择录音文件测试识别`

Flow:
- user selects local m4a/wav/mp3 supported by browser;
- browser decodes with AudioContext;
- converts/resamples to the same 16 kHz PCM stream;
- sends through the exact same `/ws/asr` protocol;
- UI displays partial/final results and timing.

This is specifically intended for the three user-supplied regression recordings, but voice files must NOT be committed to Git unless the user explicitly approves that later.

Expected labels supplied externally:
1. 停下
2. 停下，刹车，前进，后退
3. 帮我把水杯拿过来，我刚才让你去的地方，现在还有多少电

## Model management

- model files stored under ignored `.runtime/models/`;
- launcher checks for model presence;
- first run downloads the pinned official model with visible progress/status;
- no model binaries in Git;
- record model name/version in UI diagnostics and feedback package;
- failure to download model must produce an actionable message.

## One-click launcher preservation

Existing:
- START_DEMO.bat
- START_PHONE_DEMO.bat
- STOP_DEMO.bat

must continue working.

After V0.2:
- START_DEMO prepares ASR dependency/model if needed and opens local demo;
- START_PHONE_DEMO uses the same laptop-side ASR through HTTPS/WSS tunnel;
- no ASR model is installed on the phone.

## P0 behavior

P0 is triggered from `asr_partial` as soon as a phrase is observed.

Example:
partial text = "停下"
-> SafetyRouter
-> P0 immediate_stop
-> simulated controller latch

Do not wait for `asr_final` for emergency words.

Keep duplicate suppression and latch.

## Test plan

Automated:
- audio resampler unit tests;
- PCM framing tests;
- ASR WebSocket schema tests;
- recognizer session lifecycle tests;
- partial transcript -> P0 routing test;
- ASR disconnect does not crash UI;
- text/button fallback remains functional;
- existing V0.1 tests remain passing.

Model integration:
- use model-provided official test wav(s) or another non-user fixture to validate actual decode;
- record expected vs actual transcript;
- do not commit user voice recordings.

Manual user acceptance:
- Edge microphone;
- Huawei/HarmonyOS browser microphone;
- three local audio-file regression samples;
- say “停下” live;
- verify partial transcript and P0 latch.

## Acceptance criteria

1. Edge no longer depends on browser SpeechRecognition to produce transcript.
2. Huawei browser no longer depends on browser SpeechRecognition; if raw getUserMedia/WebAudio works, recognition should be backend-driven.
3. Live audio level meter visibly responds to speech.
4. ASR backend returns Chinese partial/final text.
5. “停下” can trigger P0 from partial transcript.
6. User can select the three private recordings and see recognition results.
7. One-click launch/stop flow remains intact.
8. Phone tunnel flow remains intact.
9. Web Speech API can be disabled entirely and core demo still works.
10. Feedback package is committed and pushed.

## Stage boundary

Do not add cloud LLM integration.
Do not add real wheelchair hardware.
Do not commit private voice recordings.

After implementation, create:
`docs/feedback_packages/DemoV0_2/`
and
`artifacts/feedback_packages/DemoV0_2_Feedback_Package.zip`

Push to `demo/mobile-voice-v0.2-local-asr` and stop for controller review.
