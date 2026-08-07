"use client";

import { ReactNode, useEffect } from "react";

export default function BattleNetworkLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    const rename = () => document.querySelectorAll("button, h2").forEach((element) => {
      if (element.textContent?.trim() === "AVAILABLE CREATORS") element.textContent = "AVAILABLE BATTLES";
    });
    rename();
    const observer = new MutationObserver(rename);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return <>
    <style>{`
      /* Keep the compact desktop sheet in one evenly-spaced row. */
      main section > div.mt-3 {
        overflow: visible;
      }
      main .battle-field {
        display: flex;
        min-height: 62px;
        min-width: 0 !important;
        flex-direction: column;
        justify-content: center;
      }
      main .battle-field:has(img) img + span {
        display: none;
      }
      main .battle-field a {
        display: block;
        white-space: nowrap;
        font-size: 9px;
      }
      main .battle-field strong { min-width: 0; }
      /* Preserve the desktop battle-sheet proportions on narrower screens. */
      @media (max-width: 1320px) {
        main > div > div.mt-5.space-y-4 {
          width: 1325px;
          zoom: clamp(.32, calc((100vw - 32px) / 1325), 1);
          transform-origin: top left;
        }
      }
    `}</style>
    {children}
  </>;
}
