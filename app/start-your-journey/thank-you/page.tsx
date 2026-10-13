import type { Metadata } from "next";
import Link from "next/link";
import styles from "./thank-you.module.css";

export const metadata: Metadata = {
  title: "Application received | First Class Agency",
  description: "Your First Class Agency application has been received.",
};

export default function ThankYouPage() {
  return <main className={styles.page}>
    <div className={styles.glow} />
    <section className={styles.card}>
      <img src="/branding/first-class-logo.png" alt="First Class Agency" className={styles.logo} />
      <div className={styles.tick} aria-hidden>✓</div>
      <p className={styles.eyebrow}>Application received</p>
      <h1>Thank you for<br /><em>your application.</em></h1>
      <p>Thank you for applying to First Class Agency. We look forward to speaking with you and will be in touch shortly through WhatsApp.</p>
      <Link href="/start-your-journey" className={styles.button}>Back to First Class Agency <span aria-hidden>→</span></Link>
    </section>
  </main>;
}
