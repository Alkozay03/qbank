"use client";

export type TelemetryPayload = {
  questionId: string;
  portal: string;
  quizId?: string;
  quizItemId?: string;
  choiceId?: string | null;
  isCorrect?: boolean | null;
  timeTakenSec?: number | null;
  changeDelta?: number | null;
  finalize?: boolean | null;
  logEvent?: "SELECT" | "CHANGE" | "CLEAR" | "SUBMIT";
};

export async function sendTelemetry(payload: TelemetryPayload) {
  try {
    await fetch("/api/telemetry/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (e) {
    console.warn("telemetry error", e);
  }
}
