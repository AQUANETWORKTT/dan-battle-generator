"use client";

import { useEffect, useRef } from "react";

type ManagedVideoProps = {
  src: string;
  type: string;
  label: string;
  className: string;
  poster?: string;
  autoPlayWhenVisible?: boolean;
  playlist?: string;
};

export default function ManagedVideo({ src, type, label, className, poster, autoPlayWhenVisible = false, playlist }: ManagedVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !autoPlayWhenVisible) return;

    const playVideo = () => {
      video.muted = true;
      void video.play().catch(() => undefined);
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        playVideo();
      } else {
        if (playlist) {
          document.querySelectorAll<HTMLVideoElement>(`video[data-highlight-playlist="${playlist}"]`).forEach((highlight) => highlight.pause());
        } else {
          video.pause();
        }
      }
    }, { threshold: 0.45 });

    observer.observe(video);
    return () => observer.disconnect();
  }, [autoPlayWhenVisible, playlist]);

  const advancePlaylist = () => {
    if (!playlist) return;
    const videos = Array.from(document.querySelectorAll<HTMLVideoElement>(`video[data-highlight-playlist="${playlist}"]`));
    const currentIndex = videos.indexOf(videoRef.current as HTMLVideoElement);
    const nextVideo = videos[(currentIndex + 1) % videos.length];
    if (!nextVideo) return;
    nextVideo.muted = true;
    void nextVideo.play().catch(() => undefined);
  };

  return <video
    ref={videoRef}
    className={className}
    controls
    playsInline
    preload="metadata"
    aria-label={label}
    poster={poster}
    data-first-class-video
    data-highlight-playlist={playlist}
    muted={autoPlayWhenVisible}
    onPlay={(event) => {
      document.querySelectorAll<HTMLVideoElement>("video[data-first-class-video]").forEach((video) => {
        if (video !== event.currentTarget) video.pause();
      });
    }}
    onEnded={advancePlaylist}
  >
    <source src={src} type={type} />
    Your browser does not support video playback.
  </video>;
}
