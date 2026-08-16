import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiErrorResponse(error: unknown, fallbackMessage: string, fallbackStatus = 400) {
  const message = error instanceof Error ? error.message : fallbackMessage;
  const status = error instanceof ApiError ? error.status : fallbackStatus;
  return NextResponse.json({ error: message }, { status });
}
