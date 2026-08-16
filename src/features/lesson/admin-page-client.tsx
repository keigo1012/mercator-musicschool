"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import type { User } from "firebase/auth";
import type { LessonApplication, LessonUser } from "@/lib/lesson/types";
import { apiFetch, card, subtleButton, type ApiState } from "./lesson-shared";

const AdminLessonTab = dynamic(() => import("./admin-calendar-client").then((module) => module.AdminLessonTab));
const AdminApplications = dynamic(() => import("./admin-applications-client").then((module) => module.AdminApplications));
const AdminMemberUsers = dynamic(() => import("./admin-members-client").then((module) => module.AdminMemberUsers));

export function AdminPage({ authUser, state, setError, setNotice }: { authUser: User; state: ApiState; setError: (m: string) => void; setNotice: (m: string) => void }) {
  const [tab, setTab] = useState<"lesson" | "applications" | "members">("lesson");
  const [openedTabs, setOpenedTabs] = useState<Set<"lesson" | "applications" | "members">>(() => new Set(["lesson"]));
  const [memberUsers, setMemberUsers] = useState<LessonUser[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [applications, setApplications] = useState<LessonApplication[]>([]);
  const [applicationsLoaded, setApplicationsLoaded] = useState(false);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const loadMemberUsers = useCallback(async () => {
    if (membersLoading) return;
    setMembersLoading(true);
    setError("");
    try {
      const data = await apiFetch<{ users: LessonUser[] }>("/api/admin/users/", authUser);
      setMemberUsers(data.users);
      setMembersLoaded(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "会員情報の読み込みに失敗しました。");
    } finally {
      setMembersLoading(false);
    }
  }, [authUser, membersLoading, setError]);
  const loadApplications = useCallback(async () => {
    if (applicationsLoading) return;
    setApplicationsLoading(true);
    setError("");
    try {
      const data = await apiFetch<{ applications: LessonApplication[] }>("/api/admin/lesson-applications/", authUser);
      setApplications(data.applications);
      setApplicationsLoaded(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "申込情報の読み込みに失敗しました。");
    } finally {
      setApplicationsLoading(false);
    }
  }, [applicationsLoading, authUser, setError]);
  if (!state.user?.isAdmin) return <article className={card}><h2 className="text-xl font-black text-red-700">管理者権限がありません</h2></article>;
  function selectAdminTab(nextTab: "lesson" | "applications" | "members") {
    setTab(nextTab);
    setOpenedTabs((current) => current.has(nextTab) ? current : new Set(current).add(nextTab));
    if (nextTab === "applications" && !applicationsLoaded) void loadApplications();
    if (nextTab === "members" && !membersLoaded) void loadMemberUsers();
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">{[["lesson", "レッスン"], ["applications", "申込承認"], ["members", "会員管理"]].map(([id, label]) => <button key={id} className={`${subtleButton} ${tab === id ? "border-[#0176BA] bg-[#EAF6FD] text-[#015F96]" : ""}`} onClick={() => selectAdminTab(id as typeof tab)}>{label}</button>)}</div>
      <div hidden={tab !== "lesson"}>
        <AdminLessonTab authUser={authUser} setError={setError} setNotice={setNotice} />
      </div>
      {openedTabs.has("applications") ? (
        <div hidden={tab !== "applications"}>
          {applicationsLoading && !applicationsLoaded ? <article className={card}><p className="text-sm font-bold text-slate-500">申込情報を読み込み中です。</p></article> : <AdminApplications authUser={authUser} applications={applications} refresh={loadApplications} setError={setError} setNotice={setNotice} />}
        </div>
      ) : null}
      {openedTabs.has("members") ? (
        <div hidden={tab !== "members"}>
          {membersLoading && !membersLoaded ? <article className={card}><p className="text-sm font-bold text-slate-500">会員情報を読み込み中です。</p></article> : <AdminMemberUsers authUser={authUser} users={memberUsers} refresh={loadMemberUsers} setError={setError} setNotice={setNotice} />}
        </div>
      ) : null}
    </div>
  );
}
