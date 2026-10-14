"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./start-your-journey.module.css";
type Clip = { src: string; label: string; poster?: string; type?: string };
export default function VideoCarousel({ clips, autoplay = true }: { clips: Clip[]; autoplay?: boolean }) {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const [started, setStarted] = useState(autoplay);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [failed, setFailed] = useState<string[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const touchX = useRef<number | null>(null);
  const previousPlayback = useRef({ visible: false, active: -1 });
  const enableSound = () => {
    setStarted(true);
    const video = videos.current[active];
    if (video) { video.muted = false; void video.play().then(() => setSoundEnabled(true)).catch(() => { setSoundEnabled(false); video.muted = true; void video.play().catch(() => undefined); }); }
  };
  const move = (step: number) => { enableSound(); setActive(index => (index + step + clips.length) % clips.length); };
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.35 });
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  // A vertical swipe anywhere on the page should also enable the first visible
  // clip's audio, rather than requiring a horizontal swipe to the next clip.
  useEffect(() => {
    const unlockVisibleVideo = () => {
      const bounds = root.current?.getBoundingClientRect();
      if (!bounds || bounds.bottom <= 0 || bounds.top >= window.innerHeight || !visible) return;
      enableSound();
    };
    document.addEventListener("touchend", unlockVisibleVideo, { passive: true });
    document.addEventListener("click", unlockVisibleVideo);
    return () => {
      document.removeEventListener("touchend", unlockVisibleVideo);
      document.removeEventListener("click", unlockVisibleVideo);
    };
  }, [visible, active]);
  useEffect(() => {
    const restart = visible && (!previousPlayback.current.visible || previousPlayback.current.active !== active);
    previousPlayback.current = { visible, active };
    videos.current.forEach((video, index) => {
      if (!video) return;
      if (index !== active || !visible) video.pause();
      else if (started) {
        if (restart || video.ended) video.currentTime = 0;
        video.muted = false;
        void video.play().then(() => setSoundEnabled(true)).catch(() => { setSoundEnabled(false); video.muted = true; void video.play().catch(() => undefined); });
      }
    });
  }, [active, visible, started]);
  return <div ref={root} className={styles.videoCarousel} aria-label="Creator videos" onTouchStart={e => { touchX.current = e.touches[0].clientX; }} onTouchEnd={e => { if (touchX.current === null) return; const distance = e.changedTouches[0].clientX - touchX.current; if (Math.abs(distance) > 45) move(distance < 0 ? 1 : -1); touchX.current = null; }}>
    <div className={styles.carouselStage}>{clips.map((clip, index) => {
      const offset = (index - active + clips.length) % clips.length;
      const position = offset === 0 ? "centre" : offset === clips.length - 1 ? "left" : "right";
      return <div key={clip.src} className={styles.carouselSlide} data-position={position} aria-hidden={index !== active}>
        <video ref={node => { videos.current[index] = node; }} src={clip.src} poster={clip.poster} muted={!soundEnabled} playsInline preload="metadata" aria-label={clip.label} tabIndex={index === active ? 0 : -1} data-first-class-video onClick={enableSound}
          onPlay={e => { setStarted(true); document.querySelectorAll<HTMLVideoElement>("video[data-first-class-video]").forEach(video => { if (video !== e.currentTarget) video.pause(); }); }}
          onEnded={() => { setStarted(true); setActive(current => (current + 1) % clips.length); }} onError={() => setFailed(items => items.includes(clip.src) ? items : [...items, clip.src])} />
        {failed.includes(clip.src) && <p className={styles.videoError}>Video couldn’t load. <a href={clip.src}>Open video</a></p>}
      </div>;
    })}</div>
    <div className={styles.carouselControls}><div className={styles.carouselDots}>{clips.map((clip,index) => <button key={clip.src} aria-label={`Show video ${index + 1}`} aria-pressed={active === index} onClick={() => { enableSound(); setActive(index); }} />)}</div></div>
    {!soundEnabled && <button className={styles.soundPrompt} onClick={enableSound}>Tap for sound</button>}
  </div>;
}
