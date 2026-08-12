"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import DataAccessGuard from "../../components/DataAccessGuard";

export default function RecruitmentQualityPage() {
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    let observer: MutationObserver | null = null;
    let resizer: ResizeObserver | null = null;

    const showOnlyRecruitment = () => {
      const embeddedDocument = element.contentDocument;
      if (!embeddedDocument) return;
      const target = embeddedDocument.getElementById("recruitment-dashboard");
      if (!target) return;

      let style = embeddedDocument.getElementById("recruitment-quality-only") as HTMLStyleElement | null;
      if (!style) {
        style = embeddedDocument.createElement("style");
        style.id = "recruitment-quality-only";
        embeddedDocument.head.append(style);
      }
      style.textContent = "#recruitment-dashboard { display: block !important; margin: 0 !important; }";

      let current: HTMLElement | null = target;
      while (current?.parentElement) {
        const parent: HTMLElement = current.parentElement;
        (Array.from(parent.children) as HTMLElement[]).forEach((sibling) => {
          if (sibling !== current && !sibling.contains(target)) sibling.style.setProperty("display", "none", "important");
        });
        if (parent.tagName === "MAIN") break;
        current = parent;
      }

      const main = embeddedDocument.querySelector("main") as HTMLElement | null;
      if (main) {
        main.style.padding = "0";
        main.style.background = "#f8fafc";
      }

      window.requestAnimationFrame(() => {
        element.style.height = `${Math.max(embeddedDocument.body.scrollHeight, embeddedDocument.documentElement.scrollHeight, target.scrollHeight)}px`;
      });
    };

    const attach = () => {
      const embeddedDocument = element.contentDocument;
      if (!embeddedDocument) return;
      observer?.disconnect();
      resizer?.disconnect();
      observer = new MutationObserver(showOnlyRecruitment);
      observer.observe(embeddedDocument.body, { childList: true, subtree: true, attributes: true });
      resizer = new ResizeObserver(showOnlyRecruitment);
      resizer.observe(embeddedDocument.body);
      showOnlyRecruitment();
      [250, 750, 1500, 3000, 6000].forEach((delay) => window.setTimeout(showOnlyRecruitment, delay));
    };

    element.addEventListener("load", attach);
    return () => {
      element.removeEventListener("load", attach);
      observer?.disconnect();
      resizer?.disconnect();
    };
  }, []);

  return <DataAccessGuard><main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950"><header className="mx-auto mb-8 max-w-6xl text-center"><Image src="/logo.png" alt="First Class Agency" width={520} height={260} priority className="mx-auto h-28 w-auto max-w-full object-contain sm:h-36" /><h1 className="mt-4 text-4xl font-black uppercase text-sky-950 sm:text-6xl">Recruitment Quality</h1></header><iframe ref={frame} title="Recruitment Quality" src="/creator-intelligence?view=recruitment" scrolling="no" className="mx-auto block w-full max-w-6xl border-0 bg-slate-50" /></main></DataAccessGuard>;
}
