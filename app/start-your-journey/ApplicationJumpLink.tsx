"use client";

import type { MouseEvent } from "react";
import styles from "./start-your-journey.module.css";

function easeInOutCubic(progress: number) {
  return progress < 0.5 ? 4 * progress ** 3 : 1 - ((-2 * progress + 2) ** 3) / 2;
}

export default function ApplicationJumpLink() {
  function scrollToApplication(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const target = document.getElementById("application");
    if (!target) return;

    const start = window.scrollY;
    const end = target.getBoundingClientRect().top + window.scrollY - 16;
    const distance = Math.abs(end - start);
    const duration = Math.min(3200, Math.max(1700, distance * 0.42));
    const startedAt = performance.now();

    function animate(now: number) {
      const progress = Math.min(1, (now - startedAt) / duration);
      window.scrollTo({ top: start + (end - start) * easeInOutCubic(progress) });
      if (progress < 1) window.requestAnimationFrame(animate);
      else window.history.replaceState(null, "", "#application");
    }
    window.requestAnimationFrame(animate);
  }

  return <a className={styles.button} href="#application" onClick={scrollToApplication}>Apply here<span aria-hidden>→</span></a>;
}
