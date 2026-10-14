"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./start-your-journey.module.css";

type Creator = { username: string; image: string; alt: string };

const initialCreators: Creator[] = [
  { username: "@S.ISBACKBABY69", image: "/branding/creator-s-isbackbaby69.png", alt: "@S.ISBACKBABY69" },
  { username: "@GEORGIABROOKSS20", image: "/branding/creator-georgiabrookss20.png", alt: "@GEORGIABROOKSS20" },
  { username: "@DAM_IT_CHAN", image: "/branding/creator-dam-it-chan.png", alt: "@DAM_IT_CHAN" },
  { username: "@LIANAFOSTER", image: "/branding/creator-lianafoster.png", alt: "@LIANAFOSTER" },
  { username: "@J.WLIVEACC", image: "/branding/creator-j-wliveacc.png", alt: "@J.WLIVEACC" },
  { username: "@ELLABYRNE1904", image: "/branding/creator-ellabyrne1904.png", alt: "@ELLABYRNE1904" },
  { username: "@POPPY_COOPER06", image: "/branding/creator-poppy-cooper06.png", alt: "@POPPY_COOPER06" },
  { username: "@KAYJB_3", image: "/branding/creator-kayjb-3.png", alt: "@KAYJB_3" },
  { username: "@GAZBEADLE", image: "/branding/creator-gazbeadle.png", alt: "@GAZBEADLE" },
  { username: "@SAMBAILEYSINGEROFFICIAL", image: "/branding/creator-sambaileysingerofficial.png", alt: "@SAMBAILEYSINGEROFFICIAL" },
  { username: "@HARRYJONESEY", image: "/branding/creator-harryjonesey.png", alt: "@HARRYJONESEY" },
  { username: "@9DOESGYM", image: "/branding/creator-9doesgym.png", alt: "@9DOESGYM" },
  { username: "@JDMPIXXIE", image: "/branding/creator-jdmpixxie.png", alt: "@JDMPIXXIE" },
  { username: "@DAN.BRADLEY", image: "/branding/creator-dan-bradley-rotation.png", alt: "@DAN.BRADLEY" },
  { username: "@ARONMIRMUSIC", image: "/branding/creator-aronmirmusic.png", alt: "@ARONMIRMUSIC" },
];

const menInDisplayOrder = ["@HARRYJONESEY", "@9DOESGYM", "@DAN.BRADLEY", "@ARONMIRMUSIC", "@KAYJB_3", "@GAZBEADLE"];
const men = menInDisplayOrder.map((username) => initialCreators.find((creator) => creator.username === username)).filter((creator): creator is Creator => Boolean(creator));
const women = initialCreators.filter((creator) => !menInDisplayOrder.includes(creator.username));
const initialVisibleCreators = [women[0], men[0], women[1], men[1]];

export default function CreatorRotator() {
  const [creators, setCreators] = useState(() => initialVisibleCreators);
  const [changing, setChanging] = useState<number | null>(null);
  const nextWomanIndex = useRef(2);
  const nextManIndex = useRef(2);
  const nextSlot = useRef(0);

  useEffect(() => {
    const loaded = new Map(initialCreators.map(creator => {
      const image = new Image();
      image.src = creator.image;
      return [creator.image, image.decode().catch(() => undefined)] as const;
    }));
    let cancelled = false;
    let rotating = false;
    let swapTimeout: number | undefined;
    let fadeTimeout: number | undefined;
    const rotate = async () => {
      if (rotating) return;
      rotating = true;
      const slot = nextSlot.current;
      nextSlot.current = (nextSlot.current + 1) % 4;
      const isWomanSlot = slot % 2 === 0;
      const queue = isWomanSlot ? women : men;
      const incomingIndex = isWomanSlot ? nextWomanIndex.current : nextManIndex.current;
      const incomingCreator = queue[incomingIndex % queue.length];
      if (!incomingCreator) return;
      await loaded.get(incomingCreator.image);
      if (cancelled) return;
      if (isWomanSlot) nextWomanIndex.current += 1;
      else nextManIndex.current += 1;
      setChanging(slot);
      swapTimeout = window.setTimeout(() => setCreators((current) => {
        const next = [...current];
        next[slot] = incomingCreator;
        return next;
      }), 800);
      fadeTimeout = window.setTimeout(() => { setChanging(null); rotating = false; }, 1000);
    };

    const interval = window.setInterval(rotate, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearTimeout(swapTimeout);
      window.clearTimeout(fadeTimeout);
    };
  }, []);

  return <div className={styles.creatorGrid}>
    {creators.map((creator, index) => <a
      className={`${styles.creatorCard} ${changing === index ? styles.creatorChanging : ""}`}
      key={index}
      href={`https://www.tiktok.com/@${creator.username.replace(/^@/, "").toLowerCase()}`}
      aria-label={`Open ${creator.username} on TikTok`}
    >
      <div className={styles.creatorPhoto}><img src={creator.image} alt={creator.alt} /></div>
      <p>{creator.username}</p>
    </a>)}
  </div>;
}
