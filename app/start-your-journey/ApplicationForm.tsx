"use client";

import { useState, type FormEvent } from "react";
import styles from "./start-your-journey.module.css";

const countryCodes = ["+44", "+1", "+353", "+61", "+64", "+33", "+49", "+34", "+39", "+27"];

export default function ApplicationForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");
    const form = event.currentTarget;
    const response = await fetch("/api/start-your-journey/application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      setStatus("error");
      setMessage(result?.error || "Something went wrong. Please try again.");
      return;
    }
    form.reset();
    setStatus("success");
    setMessage("Thank you — your application has been sent.");
  }

  return <form onSubmit={submit} className={styles.applicationForm}>
    <input aria-label="Your name" name="name" placeholder="Your Name" required maxLength={80} onInput={(event) => { event.currentTarget.value = event.currentTarget.value.replace(/[^a-zA-Z\s]/g, ""); }} />
    <input aria-label="TikTok username optional" name="tiktokUsername" placeholder="TikTok Username (Optional)" maxLength={80} />
    <div className={styles.phoneField}>
      <select aria-label="Country code" name="countryCode" defaultValue="+44">{countryCodes.map((code) => <option key={code} value={code}>{code}</option>)}</select>
      <input aria-label="Phone number" name="phoneNumber" placeholder="Phone Number" required inputMode="numeric" pattern="[0-9]*" maxLength={15} onInput={(event) => { event.currentTarget.value = event.currentTarget.value.replace(/\D/g, ""); }} />
    </div>
    <input className={styles.websiteField} tabIndex={-1} autoComplete="off" name="website" aria-hidden="true" />
    <button className={styles.button} type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Submit application"}<span aria-hidden>→</span></button>
    {message ? <p className={`${styles.formMessage} ${status === "error" ? styles.formError : ""}`} aria-live="polite">{message}</p> : null}
  </form>;
}
