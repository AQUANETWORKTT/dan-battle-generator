import type { Metadata } from "next";
import type { ReactNode } from "react";
import styles from "./start-your-journey.module.css";

export const metadata: Metadata = {
  title: "Start Your Journey | First Class Agency",
  description: "Creator opportunities, support and real stories at First Class Agency.",
};

const benefits = [
  ["◎", "Free management", "Full support at no cost to you."],
  ["↗", "Creator support", "Guidance, tips and 1:1 support."],
  ["✦", "Exclusive events", "Invites to battles, meet-ups and more."],
];

const creators = ["Creator one", "Creator two", "Creator three", "Creator four"];
const stories = ["Creator story one", "Creator story two", "Creator story three"];

function Placeholder({ label, kind = "photo", className = "" }: { label: string; kind?: "photo" | "video"; className?: string }) {
  return <div className={`${styles.placeholder} ${styles[kind]} ${className}`} aria-label={`${label} placeholder`}>
    <span>{kind === "video" ? "▶" : "▣"}</span>
    <strong>{label}</strong>
    <small>Replace with {kind === "video" ? "video" : "image"}</small>
  </div>;
}

function GoldButton({ children, outline = false }: { children: ReactNode; outline?: boolean }) {
  return <button type="button" className={`${styles.button} ${outline ? styles.buttonOutline : ""}`}>{children}<span aria-hidden>→</span></button>;
}

export default function StartYourJourneyPage() {
  return <main className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroGlow} />
      <header className={styles.nav}>
        <img className={styles.logo} src="/branding/first-class-logo.png" alt="First Class Agency" />
        <button type="button" aria-label="Open menu" className={styles.menu}><i /><i /><i /></button>
      </header>
      <div className={styles.heroContent}>
        <Placeholder label="Hero creator photo" className={styles.heroMedia} />
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>First Class Agency</p>
          <h1>Your journey <em>starts here.</em></h1>
          <p className={styles.lead}>Create. Connect. Grow.</p>
          <p className={styles.copy}>Join a community of TikTok LIVE creators and unlock new opportunities with free management, support and exciting events.</p>
          <div className={styles.actions}><GoldButton>Apply to join</GoldButton><GoldButton outline>Visit our TikTok</GoldButton></div>
        </div>
      </div>
      <div className={styles.stats}><span><b>500+</b> creators</span><span><b>10M+</b> audience reach</span><span><b>Global</b> opportunities</span></div>
    </section>

    <section className={styles.section}>
      <div className={styles.eyebrow}>About us</div>
      <div className={styles.split}>
        <div>
          <h2>More than<br />just an agency.</h2>
          <p className={styles.copy}>First Class Agency is built for creators, by a team that understands the platform. We provide free management, guidance, networking and real opportunities to help you grow and achieve your goals.</p>
          <div className={styles.benefits}>{benefits.map(([icon, title, text]) => <article className={styles.benefit} key={title}><span>{icon}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
        </div>
        <Placeholder label="First Class studio photo" className={styles.studioMedia} />
      </div>
    </section>

    <section className={`${styles.section} ${styles.community}`}>
      <div className={styles.eyebrow}>Our community</div>
      <h2>Meet the faces<br />of First Class.</h2>
      <p className={styles.copy}>A community of talented creators, all on their own unique journeys. This could be you.</p>
      <div className={styles.creatorGrid}>{creators.map((creator) => <article className={styles.creatorCard} key={creator}><Placeholder label={creator} /><p>@username</p><span>♪</span></article>)}</div>
      <div className={styles.center}><GoldButton outline>View more creators</GoldButton></div>
    </section>

    <section className={`${styles.section} ${styles.stories}`}>
      <div className={styles.eyebrow}>Success stories</div>
      <h2>Real people.<br />Real opportunities.</h2>
      <p className={styles.copy}>Hear from our creators and see how First Class Agency has helped them grow.</p>
      <div className={styles.storyGrid}>{stories.map((story, index) => <article className={styles.story} key={story}><Placeholder label={story} kind="video" /><p>“A place for a short creator quote about their First Class journey.”</p><b>@creator_{index + 1}</b></article>)}</div>
      <div className={styles.dots}><i /><i className={styles.activeDot} /><i /><i /></div>
    </section>

    <section className={`${styles.section} ${styles.highlights}`}>
      <div className={styles.eyebrow}>TikTok highlights</div>
      <h2>Watch our creators<br />in action.</h2>
      <div className={styles.highlightGrid}><Placeholder label="TikTok highlight one" kind="video" /><Placeholder label="TikTok highlight two" kind="video" /><Placeholder label="TikTok highlight three" kind="video" /></div>
      <div className={styles.center}><GoldButton outline>Follow us on TikTok</GoldButton></div>
    </section>

    <section className={styles.apply}>
      <div className={styles.applyMedia}><Placeholder label="Team event photo" /></div>
      <div className={styles.applyForm}>
        <div className={styles.eyebrow}>Apply now</div>
        <h2>Ready to go live?</h2>
        <p className={styles.copy}>Take the first step and join First Class Agency. It only takes a minute to apply.</p>
        <form>
          <input aria-label="TikTok username" placeholder="TikTok Username" />
          <input aria-label="Your name" placeholder="Your Name" />
          <input aria-label="Email address" placeholder="Email Address" type="email" />
          <select aria-label="Your age" defaultValue=""><option value="" disabled>Your Age</option><option>18–24</option><option>25–34</option><option>35+</option></select>
          <GoldButton>Submit application</GoldButton>
        </form>
        <div className={styles.or}>or</div>
        <GoldButton outline>Message us on TikTok</GoldButton>
      </div>
    </section>

    <footer className={styles.footer}><img src="/branding/first-class-logo.png" alt="First Class Agency" /><p>Creators change lives.</p></footer>
  </main>;
}
