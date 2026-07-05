"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      window.location.href = "/";
    } else {
      alert("Incorrect password");
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4">
      <div
        className="fixed inset-0 scale-105 bg-cover bg-center blur-sm"
        style={{ backgroundImage: "url('/branding/first-class-data-bg.jpg')" }}
      />
      <div className="fixed inset-0 bg-black/45" />
      <div className="fixed inset-0 bg-gradient-to-b from-black/20 via-slate-950/10 to-black/70" />

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/20 bg-black/35 p-8 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-yellow-200/25 bg-black/70 px-4 py-4 text-white outline-none focus:border-yellow-100"
          />

          <button
            type="submit"
            className="w-full rounded-xl bg-yellow-300 py-4 font-black uppercase text-black shadow-lg shadow-yellow-950/20 hover:bg-yellow-200"
          >
            LOGIN
          </button>
        </form>
      </div>
    </main>
  );
}
