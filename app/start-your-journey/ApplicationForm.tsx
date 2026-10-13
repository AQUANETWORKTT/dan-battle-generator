"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./start-your-journey.module.css";

const countryCodes = ["+44", "+1", "+353", "+61", "+64", "+33", "+49", "+34", "+39", "+27"];

function hasValidMobileLength(countryCode: string, input: string) {
  const callingCode = countryCode.slice(1);
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith(`00${callingCode}`)) digits = digits.slice(callingCode.length + 2);
  else if (digits.startsWith(callingCode)) digits = digits.slice(callingCode.length);
  if (countryCode === "+44") return /^0?7\d{9}$/.test(digits);
  if (countryCode === "+353") return /^0?8[3-9]\d{7}$/.test(digits);
  return /^\d{6,15}$/.test(digits);
}

export default function ApplicationForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");
    const form = event.currentTarget;
    const countryCode = (form.elements.namedItem("countryCode") as HTMLSelectElement).value;
    const phoneNumber = form.elements.namedItem("phoneNumber") as HTMLInputElement;
    if (!hasValidMobileLength(countryCode, phoneNumber.value)) {
      const message = countryCode === "+44" ? "Enter a valid UK mobile number, for example 07970 123456." : countryCode === "+353" ? "Enter a valid Irish mobile number." : "Enter a valid mobile number.";
      phoneNumber.setCustomValidity(message);
      phoneNumber.reportValidity();
      setStatus("error");
      setMessage(message);
      return;
    }
    phoneNumber.setCustomValidity("");
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
    router.push("/start-your-journey/thank-you");
  }

  return <form onSubmit={submit} className={styles.applicationForm}>
    <input aria-label="Your name" name="name" placeholder="Your Name" required maxLength={80} onInput={(event) => { event.currentTarget.value = event.currentTarget.value.replace(/[^a-zA-Z\s]/g, ""); }} />
    <input aria-label="TikTok username optional" name="tiktokUsername" placeholder="TikTok Username (Optional)" maxLength={80} />
    <div className={styles.phoneField}>
      <select aria-label="Country code" name="countryCode" defaultValue="+44">{countryCodes.map((code) => <option key={code} value={code}>{code}</option>)}</select>
      <input aria-label="Phone number" name="phoneNumber" placeholder="Phone Number" required inputMode="tel" maxLength={15} onInput={(event) => { const input = event.currentTarget; const countryCode = (input.form?.elements.namedItem("countryCode") as HTMLSelectElement | null)?.value || "+44"; const callingCode = countryCode.slice(1); let digits = input.value.replace(/\D/g, ""); if (digits.startsWith(`00${callingCode}`)) digits = digits.slice(callingCode.length + 2); else if (digits.startsWith(callingCode)) digits = digits.slice(callingCode.length); input.value = digits; input.setCustomValidity(""); }} />
    </div>
    <input className={styles.websiteField} tabIndex={-1} autoComplete="off" name="website" aria-hidden="true" />
    <button className={styles.button} type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Submit application"}<span aria-hidden>→</span></button>
    {message ? <p className={`${styles.formMessage} ${status === "error" ? styles.formError : ""}`} aria-live="polite">{message}</p> : null}
  </form>;
}
