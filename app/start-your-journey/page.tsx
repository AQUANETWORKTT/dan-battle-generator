import type { Metadata } from "next";
import type { ReactNode } from "react";
import styles from "./start-your-journey.module.css";
import ApplicationForm from "./ApplicationForm";
import ApplicationJumpLink from "./ApplicationJumpLink";

export const metadata: Metadata = {
  title: "Start Your Journey | First Class Agency",
  description: "Creator opportunities, support and real stories at First Class Agency.",
};

const benefits = [
  ["Free management", "Full support at no cost to you."],
  ["Creator support", "Guidance, tips and 1:1 support."],
  ["Exclusive events", "Battles, TikTok HQ and London meet-ups."],
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

function Photo({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return <div className={`${styles.photo} ${className}`}><img src={src} alt={alt} /></div>;
}

function GoldButton({ children, outline = false }: { children: ReactNode; outline?: boolean }) {
  return <button type="button" className={`${styles.button} ${outline ? styles.buttonOutline : ""}`}>{children}<span aria-hidden>→</span></button>;
}

function GoldLink({ children, href, outline = false }: { children: ReactNode; href: string; outline?: boolean }) {
  const external = href.startsWith("http");
  return <a className={`${styles.button} ${outline ? styles.buttonOutline : ""}`} href={href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>{children}<span aria-hidden>→</span></a>;
}

export default function StartYourJourneyPage() {
  return <main className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroGlow} />
      <header className={styles.nav}>
        <img className={styles.logo} src="/branding/first-class-logo.png" alt="First Class Agency" />
      </header>
      <div className={styles.heroContent}>
        <Photo src="/branding/journey-hero-creator.png" alt="Creator in a First Class style studio" className={styles.heroMedia} />
        <div className={styles.heroCopy}>
          <h1>Your journey <em>starts here.</em></h1>
          <p className={styles.lead}>Create. Connect. Grow.</p>
          <p className={styles.copy}>Thousands of creators are earning from their phone — whenever and wherever they choose. With completely free management, expert support and real opportunities, you can build something bigger too.</p>
          <div className={styles.actions}><ApplicationJumpLink /> <GoldLink href="https://www.tiktok.com/@firstclassagency_uk" outline>Visit our TikTok</GoldLink></div>
        </div>
      </div>
      <div className={styles.stats}><span><b>1,500+</b> creators</span><span><b>10M+</b> audience reach</span><span><b>Global</b> opportunities</span></div>
    </section>

    <section className={styles.section}>
      <div className={styles.eyebrow}>About us</div>
      <div className={styles.split}>
        <div>
          <h2>More than<br />just an agency.</h2>
          <p className={styles.copy}>First Class Agency is built for creators, by a team that understands the platform. We provide free management, guidance, networking and real opportunities to help you grow and achieve your goals.</p>
          <div className={styles.benefits}>{benefits.map(([title, text]) => <article className={styles.benefit} key={title}><h3>{title}</h3><p>{text}</p></article>)}</div>
        </div>
        <Photo src="/branding/journey-community-event.png" alt="First Class creator networking event" className={styles.studioMedia} />
      </div>
    </section>

    <section className={`${styles.section} ${styles.community}`}>
      <div className={styles.eyebrow}>Our community</div>
      <h2>Meet the faces<br />of First Class.</h2>
      <p className={styles.copy}>A community of talented creators, all on their own unique journeys. This could be you.</p>
      <div className={styles.creatorGrid}>{creators.map((creator, index) => <article className={styles.creatorCard} key={creator}><Photo src={index % 2 ? "/branding/journey-community-event.png" : "/branding/journey-hero-creator.png"} alt={`${creator} placeholder`} /><p>@username</p><span>♪</span></article>)}</div>
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
      <div className={styles.center}><GoldLink href="https://www.tiktok.com/@firstclassagency_uk" outline>Follow us on TikTok</GoldLink></div>
    </section>

    <section className={styles.apply} id="application">
      <div className={styles.applyMedia}><Photo src="/branding/journey-community-event.png" alt="Creators at a First Class event" /></div>
      <div className={styles.applyForm}>
        <div className={styles.eyebrow}>Apply now</div>
        <h2>Ready to get started?</h2>
        <p className={styles.copy}>Take the first step and join First Class Agency. It only takes a minute to apply.</p>
        <ApplicationForm />
      </div>
    </section>

    <footer className={styles.footer}><img src="/branding/first-class-logo.png" alt="First Class Agency" /><p>Creators change lives.</p></footer>
  </main>;
}
