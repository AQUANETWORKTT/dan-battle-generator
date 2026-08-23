"use client";

import Image from "next/image";

export default function RaceToTheTopPage() {
  return (
    <main className="finished-event" aria-labelledby="event-finished-title">
      <section className="finished-event-card">
        <Image
          src="/race-to-the-top-logo-transparent.png"
          alt="Race to the Top"
          className="finished-event-logo"
          width={1536}
          height={1024}
          priority
        />
        <p className="archived-label">Archived event</p>
        <h1 id="event-finished-title">This event has finished</h1>
      </section>

      <style jsx>{`
        .finished-event {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 32px 20px;
          background:
            linear-gradient(rgba(9, 10, 15, 0.84), rgba(9, 10, 15, 0.94)),
            url("/race-to-the-top-background.png") center / cover;
          color: #e5e7eb;
        }

        .finished-event-card {
          width: min(100%, 600px);
          padding: 46px 32px;
          border: 1px solid rgba(203, 213, 225, 0.22);
          border-radius: 28px;
          background: rgba(29, 32, 42, 0.82);
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.36);
          text-align: center;
        }

        .finished-event-logo {
          display: block;
          width: min(100%, 390px);
          height: auto;
          margin: 0 auto 24px;
          filter: grayscale(1) brightness(0.82) opacity(0.68);
        }

        .archived-label {
          margin: 0 0 12px;
          color: #94a3b8;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          color: #f1f5f9;
          font-family: var(--font-norwester), sans-serif;
          font-size: clamp(1.85rem, 6vw, 3rem);
          line-height: 1.08;
          text-transform: uppercase;
        }
      `}</style>
    </main>
  );
}
