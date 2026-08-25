"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  cardClass,
  dangerButtonClass,
  inputClass as sharedInputClass,
  primaryButtonClass,
  selectedButtonClass,
  subtleButtonClass,
  unavailableSlotButtonClass,
} from "@/components/ui/styles";
import { formatDateJa, validateLessonDeadline } from "@/lib/lesson/dates";
import { getInstrumentLabel } from "@/lib/lesson/constants";
import type { BookedLesson, LessonBooking, LessonClosedDay, LessonUser } from "@/lib/lesson/types";

export type ApiState = {
  user: LessonUser | null;
  bookings: LessonBooking[];
  closedDays: LessonClosedDay[];
};

type LessonListTab = "upcoming" | "past";
type LessonListPage = {
  lessons: BookedLesson[];
  cursor: { value: string; id: string } | null;
  hasMore: boolean;
  loaded: boolean;
};

export const card = cardClass;
export const primaryButton = primaryButtonClass;
export const subtleButton = subtleButtonClass;
export const selectedButton = selectedButtonClass;
export const dangerButton = dangerButtonClass;
export const unavailableSlotButton = unavailableSlotButtonClass;
export const inputClass = sharedInputClass;
export const applicationField = "block min-w-0 text-sm font-bold text-slate-700 md:col-span-2";
export const applicationControl = `${inputClass} mt-2 block w-full`;


export function formatLessonFormat(value?: string) {
  return value === "online" ? "オンライン" : value === "inPerson" ? "対面" : "";
}


export async function apiFetch<T>(path: string, authUser: User, init: RequestInit = {}): Promise<T> {
  const token = await authUser.getIdToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "処理に失敗しました。");
  }
  return data as T;
}

export function Info({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 rounded-lg bg-[#f7fbfa] p-3"><dt className="text-xs font-bold text-slate-500">{label}</dt><dd className="font-bold text-slate-900">{value}</dd></div>;
}

export function LessonTicketWarning({ tickets }: { tickets: NonNullable<LessonUser["lessonTickets"]> }) {
  return (
    <div className="mt-4 rounded-lg border border-[#f5c26b] bg-[#fff4e6] px-4 py-3 text-sm text-[#92400e]">
      <p className="font-bold">有効期限が1ヶ月以内のチケットがあります</p>
      <div className="mt-2 space-y-1">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="flex flex-wrap justify-between gap-x-4">
            <span>{ticket.count}回</span>
            <span>有効期限 {ticket.expiresOn}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


function emptyLessonListPage(): LessonListPage {
  return { lessons: [], cursor: null, hasMore: false, loaded: false };
}

export function BookedLessonsCard({ authUser, onCancel }: { authUser: User; onCancel?: (booking: BookedLesson) => void }) {
  const [selectedTab, setSelectedTab] = useState<LessonListTab>("upcoming");
  const [now, setNow] = useState(() => new Date());
  const [pages, setPages] = useState<Record<LessonListTab, LessonListPage>>({ upcoming: emptyLessonListPage(), past: emptyLessonListPage() });
  const [loadingTab, setLoadingTab] = useState<LessonListTab | null>(null);
  const [listError, setListError] = useState("");

  const loadLessons = useCallback(async (tab: LessonListTab, append = false) => {
    const currentPage = pages[tab];
    if (loadingTab || (append && !currentPage.hasMore)) return;
    setLoadingTab(tab);
    setListError("");
    try {
      const params = new URLSearchParams({ tab });
      if (append && currentPage.cursor) {
        params.set("cursor", currentPage.cursor.value);
        params.set("cursorId", currentPage.cursor.id);
      }
      const data = await apiFetch<{ lessons: BookedLesson[]; cursor: { value: string; id: string } | null; hasMore: boolean }>(`/api/my-lessons/?${params}`, authUser);
      setPages((current) => ({
        ...current,
        [tab]: {
          lessons: append ? [...current[tab].lessons, ...data.lessons] : data.lessons,
          cursor: data.cursor,
          hasMore: data.hasMore,
          loaded: true,
        },
      }));
    } catch (caught) {
      setListError(caught instanceof Error ? caught.message : "レッスン履歴の取得に失敗しました。");
    } finally {
      setLoadingTab(null);
    }
  }, [authUser, loadingTab, pages]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadLessons("upcoming"), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lessons = pages[selectedTab].lessons;

  function selectTab(tab: LessonListTab) {
    setSelectedTab(tab);
    if (!pages[tab].loaded) void loadLessons(tab);
  }

  return (
    <article className={card}>
      <h2 className="text-xl font-black text-slate-950">予約済みレッスン</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className={selectedTab === "upcoming" ? selectedButton : subtleButton} onClick={() => selectTab("upcoming")}>今後</button>
        <button className={selectedTab === "past" ? selectedButton : subtleButton} onClick={() => selectTab("past")}>過去</button>
      </div>
      <div className="mt-4 space-y-3">
        {listError ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{listError}</p> : null}
        {lessons.length ? lessons.map((lesson) => (
          <div key={lesson.id} className="rounded-lg bg-[#f7fbfa] p-3">
            <div className="font-bold text-slate-950">{formatDateJa(lesson.date)} {lesson.startAt.slice(11, 16)}-{lesson.endAt.slice(11, 16)}</div>
            {lesson.lessonKind === "adminAssigned" ? (
              <div className="mt-1 text-sm text-slate-600"><span className="font-bold text-[#015F96]">{lesson.lessonTitle || "管理者付与レッスン"}</span>{lesson.memberName ? ` / ${lesson.memberName}` : ""}<span className="block text-xs text-slate-500">管理者による付与</span></div>
            ) : (
              <div className="mt-1 text-sm text-slate-600">{lesson.memberName ? `${lesson.memberName} / ` : ""}{lesson.lessonFormat ? `${formatLessonFormat(lesson.lessonFormat)} / ` : ""}{getInstrumentLabel(lesson.instrument)}</div>
            )}
            {onCancel && lesson.lessonKind !== "adminAssigned" && !lesson.adminOnlyCancellation && !validateLessonDeadline(lesson.date, now) ? <button className={`${dangerButton} mt-3`} onClick={() => onCancel(lesson)}>キャンセル</button> : null}
          </div>
        )) : pages[selectedTab].loaded && loadingTab !== selectedTab ? <p className="text-sm text-slate-500">{selectedTab === "upcoming" ? "今後の予約はありません" : "過去のレッスンはありません"}</p> : null}
        {loadingTab === selectedTab ? <p className="text-sm font-bold text-slate-500">読み込み中です。</p> : null}
        {pages[selectedTab].loaded && pages[selectedTab].hasMore ? (
          <button className={`${subtleButton} w-full`} disabled={Boolean(loadingTab)} onClick={() => void loadLessons(selectedTab, true)}>さらに表示</button>
        ) : null}
      </div>
    </article>
  );
}
