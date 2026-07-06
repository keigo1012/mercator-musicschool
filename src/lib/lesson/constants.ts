export const LESSON_HOURS = [13, 14, 15, 16, 17, 18, 19, 20, 21] as const;
export const DEFAULT_CLOSED_LESSON_HOURS = [18] as const;

export const INSTRUMENTS = [
  { id: "drums", label: "ドラム" },
  { id: "acousticGuitar", label: "アコースティックギター" },
  { id: "electricGuitar", label: "エレキギター" },
  { id: "electricBass", label: "エレキベース" },
  { id: "popsPiano", label: "ポップスピアノ" },
  { id: "dtm", label: "DTM" },
  { id: "fingerDrum", label: "フィンガードラム" },
] as const;

export type InstrumentId = (typeof INSTRUMENTS)[number]["id"];

export const DEFAULT_INSTRUMENT: InstrumentId = "drums";

export function getInstrumentLabel(instrument: string | undefined | null) {
  return INSTRUMENTS.find((item) => item.id === instrument)?.label ?? "ドラム";
}

export function isDefaultClosedLessonHour(hour: number) {
  return DEFAULT_CLOSED_LESSON_HOURS.includes(hour as (typeof DEFAULT_CLOSED_LESSON_HOURS)[number]);
}
