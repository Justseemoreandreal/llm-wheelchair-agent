export interface PhoneTestState {
  speechSupported: boolean;
  speechStatus: string;
  transcript: string;
  stop: boolean;
  latch: boolean;
  reset: boolean;
  forwardAfterReset: boolean;
  fallback: boolean;
}

export function buildPhoneTestSummary(state: PhoneTestState) {
  return {
    stage: "DemoV0.2",
    generated_at: new Date().toISOString(),
    simulation_only: true,
    real_phone_status: "USER TEST REQUIRED",
    speech_api_supported: state.speechSupported,
    speech_status: state.speechStatus,
    last_transcript: state.transcript,
    checks: {
      p0_stop: state.stop,
      latch_blocked_motion: state.latch,
      explicit_reset: state.reset,
      forward_after_reset: state.forwardAfterReset,
      fallback_planner: state.fallback
    }
  };
}
