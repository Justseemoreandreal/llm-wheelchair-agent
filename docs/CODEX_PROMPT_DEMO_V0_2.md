# Codex Execution Prompt — Demo V0.2 Local Streaming ASR

Recommended model: GPT-5.6 Sol
Reasoning: High
Use Extra High only for difficult WebAudio/AudioWorklet, PCM streaming, sherpa-onnx, or cross-browser debugging.

Repository:
Justseemoreandreal/llm-wheelchair-agent

Branch:
demo/mobile-voice-v0.2-local-asr

You are the implementation executor. Do not redesign the stage.

Read:
1. docs/V0_2_CONTROLLER_PLAN.md
2. docs/V0_1_HOTFIX_WIN10013.md
3. docs/feedback_packages/DemoV0_1/00_CONTROLLER_FEEDBACK.md
4. existing frontend/backend/launcher code
5. GitHub Issue for V0.2

The controller has decided that browser SpeechRecognition is no longer the primary ASR path.

Implement exactly the controller plan:
- browser raw microphone capture;
- WebAudio PCM16 16k mono stream;
- /ws/asr;
- local sherpa-onnx Chinese streaming recognizer;
- partial/final transcript events;
- partial transcript feeds existing SafetyRouter;
- diagnostics UI;
- local audio-file regression mode;
- pinned runtime model download/cache;
- preserve one-click desktop/phone launchers;
- preserve P0 and server latch;
- keep Web Speech only as optional fallback/comparison;
- no cloud LLM;
- no real hardware.

Important:
- do not commit any user voice recordings;
- actual voice files are external/private regression samples;
- test audio-file mode must accept user-selected local files through the browser;
- if m4a browser decoding fails on a platform, report it and support wav at minimum, but Edge should be tested with m4a.

First run the V0.1 baseline tests.
Then implement in small verified steps.
Actually download the pinned sherpa model in the execution environment and run at least one true ASR decode test.
Do not claim ASR works merely because code compiles.

At end:
- run all tests/build;
- manually run START_DEMO and START_PHONE_DEMO;
- verify /ws/asr;
- create DemoV0_2 feedback package and ZIP;
- commit and PUSH;
- stop and report.

If physical phone use cannot be performed by Codex, mark:
REAL PHONE LIVE ASR: USER TEST REQUIRED

Do not proceed to LLM integration.
