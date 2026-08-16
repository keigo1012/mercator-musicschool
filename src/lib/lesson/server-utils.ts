import { INSTRUMENTS } from "./constants";

export function assertInstrument(instrument: string) {
  if (!INSTRUMENTS.some((item) => item.id === instrument)) throw new Error("楽器の選択が正しくありません。");
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
