"use client";

import { useEffect, useRef } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";

export default function RecruitmentQualityPage() {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => { const element = frame.current; if (!element) return; let observer: MutationObserver | null = null; const showOnlyRecruitment = () => { const document = element.contentDocument; if (!document) return; const keep = new Set(["recruitment-new-and-hidden", "recruitment-quality"]); document.querySelectorAll("main > div > *").forEach((node) => { const item = node as HTMLElement; item.style.display = keep.has(item.id) ? "" : "none"; }); const main = document.querySelector("main") as HTMLElement | null; if (main) { main.style.padding = "0"; main.style.background = "#f8fafc"; } }; const attach = () => { const document = element.contentDocument; if (!document) return; observer?.disconnect(); observer = new MutationObserver(showOnlyRecruitment); observer.observe(document.body, { childList: true, subtree: true }); showOnlyRecruitment(); window.setTimeout(showOnlyRecruitment, 500); window.setTimeout(showOnlyRecruitment, 1500); }; element.addEventListener("load", attach); return () => { element.removeEventListener("load", attach); observer?.disconnect(); }; }, []);
  return <DataAccessGuard><main className="min-h-screen bg-[#080806] p-4"><iframe ref={frame} title="Recruitment Quality" src="/creator-intelligence" className="min-h-screen w-full border-0 bg-slate-50" /></main></DataAccessGuard>;
}
