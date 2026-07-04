"use client";

import Image from "next/image";
import { useState } from "react";

export default function FirstClassLogo({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [logoLoaded, setLogoLoaded] = useState(false);

  return (
    <div
      className={`relative flex justify-center ${
        logoLoaded ? "" : "h-0 overflow-hidden"
      } ${logoLoaded ? className : ""}`}
    >
      <Image
        src="/branding/first-class-hub-logo.png"
        alt="First Class Hub"
        width={900}
        height={520}
        priority
        onLoad={() => setLogoLoaded(true)}
        onError={() => setLogoLoaded(false)}
        className={`h-auto w-full ${
          compact ? "max-w-[300px]" : "max-w-[520px]"
        } drop-shadow-[0_20px_35px_rgba(0,0,0,0.65)] ${
          logoLoaded ? "block" : "hidden"
        }`}
      />
    </div>
  );
}
