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
    <main className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-md rounded-3xl border border-yellow-400/30 bg-zinc-950 p-8">
        <h1 className="mb-6 text-center text-4xl font-black text-yellow-300">
          Dans Space
        </h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-black px-4 py-4 text-white outline-none"
          />

          <button
            type="submit"
            className="w-full rounded-xl bg-yellow-300 py-4 font-black text-black"
          >
            LOGIN
          </button>
        </form>
      </div>
    </main>
  );
}