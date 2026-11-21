"use client";

import { useState } from "react";
import Burst from "@/components/Burst";

export default function Waitlist() {
  const [state, setState] = useState<"idle" | "sending" | "joined">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setState("joined");
        window.dispatchEvent(new Event("papilio:joined")); // the hero butterfly flaps hard
        return;
      }
      setError((await res.json().catch(() => null))?.error ?? "Couldn't add you right now. Try again.");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    }
    setState("idle");
  }

  return (
    <form onSubmit={onSubmit} className="relative mt-7 mb-3.5 flex flex-wrap gap-2.5">
      {state === "joined" ? (
        <>
          <p role="status" className="joined flex-1 basis-52 rounded-lg border border-acc/50 bg-card px-3.5 py-2.5 font-mono text-sm text-acc">
            ✓ You&apos;re on the list. Check your inbox.
          </p>
          <Burst className="top-1/2 left-1/3" />
        </>
      ) : (
        <>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@domain.xyz"
            aria-label="Email"
            className="min-w-0 flex-1 basis-52 rounded-lg border border-line bg-card px-3.5 py-2.5 font-mono text-sm text-ink placeholder:text-faint focus:border-acc focus:outline-none"
          />
          {/* Honeypot: hidden from people, bots fill it, the API drops those. */}
          <input name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
          <button type="submit" disabled={state === "sending"} className="btn disabled:animate-pulse">
            {state === "sending" ? "Joining…" : "Join waitlist"}
          </button>
        </>
      )}
      <a href="#how" className="btn btn-ghost">How it works</a>
      {error && <p role="alert" className="basis-full text-sm text-ink">{error}</p>}
    </form>
  );
}
