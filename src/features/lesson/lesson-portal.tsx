"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { LessonBooking, LessonClosedDay, LessonUser } from "@/lib/lesson/types";
import { apiFetch, card, primaryButton, subtleButton, type ApiState } from "./lesson-shared";

const MyPage = dynamic(() => import("./mypage-client").then((module) => module.MyPage));
const LessonPage = dynamic(() => import("./lesson-page-client").then((module) => module.LessonPage));
const AdminPage = dynamic(() => import("./admin-page-client").then((module) => module.AdminPage));

type Mode = "mypage" | "lesson" | "admin";

function firebaseErrorMessage(caught: unknown, fallback: string) {
  const firebaseCode = typeof caught === "object" && caught !== null && "code" in caught ? String(caught.code) : "";
  const message = caught instanceof Error ? caught.message : fallback;
  return firebaseCode ? `${message} (${firebaseCode})` : message;
}


function firebaseErrorCode(caught: unknown) {
  return typeof caught === "object" && caught !== null && "code" in caught ? String(caught.code) : "";
}

function usesIosWebKit() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}


export function LessonPortal({ mode }: { mode: Mode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [state, setState] = useState<ApiState>({ user: null, bookings: [], closedDays: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let settled = false;
    const fallbackTimer = window.setTimeout(() => {
      if (settled) return;
      setError("ログイン状態の確認に時間がかかっています。ページを再読み込みしてください。");
      setAuthReady(true);
    }, 8000);
    try {
      const nextAuth = getFirebaseAuth();
      void getRedirectResult(nextAuth).catch((caught) => {
        setError(firebaseErrorMessage(caught, "Googleログインに失敗しました。"));
      });
      const unsubscribe = onAuthStateChanged(nextAuth, (nextUser) => {
        settled = true;
        window.clearTimeout(fallbackTimer);
        setAuthUser(nextUser);
        setAuthReady(true);
      });
      return () => {
        settled = true;
        window.clearTimeout(fallbackTimer);
        unsubscribe();
      };
    } catch {
      window.setTimeout(() => {
        settled = true;
        window.clearTimeout(fallbackTimer);
        setError("Firebaseの初期化に失敗しました。");
        setAuthReady(true);
      }, 0);
      return () => {
        settled = true;
        window.clearTimeout(fallbackTimer);
      };
    }
  }, []);

  const refresh = useCallback(async (target: Mode = mode) => {
    if (!authUser) return;
    setLoading(true);
    setError("");
    try {
      const me = await apiFetch<{ user: LessonUser }>("/api/me/", authUser);
      const next: ApiState = { user: me.user, bookings: [], closedDays: [] };
      if (target === "lesson") {
        next.bookings = (await apiFetch<{ bookings: LessonBooking[] }>("/api/lesson-bookings/", authUser)).bookings;
      }
      if (target === "lesson") {
        next.closedDays = (await apiFetch<{ closedDays: LessonClosedDay[] }>("/api/lesson-closed-days/", authUser)).closedDays;
      }
      setState(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [authUser, mode]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (authUser) void refresh();
      if (!authUser) setState({ user: null, bookings: [], closedDays: [] });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authUser, mode, refresh]);

  if (!authReady) {
    return <PortalShell title={mode === "admin" ? "管理" : mode === "lesson" ? "レッスン" : "マイページ"}><p className={card}>読み込み中です。</p></PortalShell>;
  }

  if (!authUser) {
    return <PortalShell title={mode === "admin" ? "管理" : mode === "lesson" ? "レッスン" : "マイページ"}><AuthPanel onError={setError} error={error} /></PortalShell>;
  }

  const title = mode === "admin" ? "管理" : mode === "lesson" ? "レッスン" : "マイページ";
  const displayName = state.user?.lessonFullName || state.user?.name || "氏名未登録";
  const displayEmail = state.user?.lessonEmail || state.user?.email || authUser.email || "";

  async function handleLogout() {
    if (!confirm("ログアウトしますか？")) return;
    await signOut(getFirebaseAuth());
  }

  return (
    <PortalShell title={title}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-bold text-slate-700">
          <span>{displayName}</span>
          <span className="mx-2 text-slate-300">/</span>
          <span className="font-medium text-slate-600">{displayEmail}</span>
        </div>
        <div className="flex flex-wrap gap-2">
        </div>
      </div>
      {error ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
      {notice ? <p className="mb-4 rounded-lg bg-[#EAF6FD] px-4 py-3 text-sm font-bold text-[#015F96]">{notice}</p> : null}
      {loading && <p className="mb-4 text-sm font-bold text-slate-500">更新中です。</p>}
      {mode === "mypage" && state.user ? <MyPage authUser={authUser} user={state.user} /> : null}
      {mode === "lesson" && state.user ? <LessonPage authUser={authUser} state={state} refresh={() => refresh("lesson")} setError={setError} setNotice={setNotice} /> : null}
      {mode === "admin" && state.user ? <AdminPage authUser={authUser} state={state} setError={setError} setNotice={setNotice} /> : null}
      <div className="mt-8 flex justify-center border-t border-slate-950/10 pt-6">
        <button className={subtleButton} onClick={handleLogout}>ログアウト</button>
      </div>
    </PortalShell>
  );
}

function PortalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="portal-shell bg-white px-4 py-12 md:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="page-heading luxury-heading luxury-heading-rule mx-auto max-w-4xl">{title}</h1>
          <div className="luxury-heading-accent mx-auto mt-5" />
        </div>
        {children}
      </div>
    </section>
  );
}

function AuthPanel({ onError, error }: { onError: (message: string) => void; error: string }) {
  const [busy, setBusy] = useState(false);

  async function signInWithGoogle() {
    setBusy(true);
    onError("");
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    try {
      if (usesIosWebKit()) {
        await signInWithRedirect(auth, provider);
        return;
      }
      await signInWithPopup(auth, provider);
    } catch (caught) {
      const code = firebaseErrorCode(caught);
      if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError) {
          onError(firebaseErrorMessage(redirectError, "Googleログインに失敗しました。"));
        }
        return;
      }
      onError(firebaseErrorMessage(caught, "Googleログインに失敗しました。"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${card} mx-auto max-w-md space-y-4`}>
      <h2 className="panel-heading font-black text-slate-950">ログイン</h2>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p> : null}
      <button type="button" className={`${primaryButton} w-full`} onClick={signInWithGoogle} disabled={busy}>
        {busy ? "処理中" : "Googleでログイン"}
      </button>
    </div>
  );
}
