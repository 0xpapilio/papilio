"use client";

import dynamic from "next/dynamic";

// Wallet adapters touch `window`; render the app in the browser only.
const PapilioApp = dynamic(() => import("./PapilioApp"), {
  ssr: false,
  loading: () => <p className="py-24 text-center font-mono text-xs tracking-wider text-dim">Loading Papilio…</p>,
});

export default function ClientApp() {
  return <PapilioApp />;
}
