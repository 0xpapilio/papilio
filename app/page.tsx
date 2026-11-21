import DotArt from "@/components/DotArt";
import Waitlist from "@/components/Waitlist";

const STAGES = [
  { art: "cat", note: "exposed…", title: "Caterpillar", text: "Raw intent. Visible to MEV." },
  { art: "chr", note: "proving…", title: "Chrysalis", text: "Intent hidden in a ZK proof on Aleo." },
  { art: "fly", note: "settled.", title: "Butterfly", text: "Executed via CoW solvers. MEV-protected." },
] as const;

const LEAKS = ["Wallet address", "Exact size", "Timing"];

const WHY = [
  { title: "MEV eats your price", text: "Visible intents get sandwiched before they settle." },
  { title: "Your wallet is your identity", text: "Every swap adds to a public profile of you." },
  { title: "Solvers should compete blind", text: "Best price wins, without knowing who is asking." },
];

const TEAM = [
  {
    art: "emperor",
    name: "Veevaa Bajaj",
    school: "NIFT SXR",
    role: "Design + marketing",
    text: "Shapes how Papilio looks and feels, and how people find it.",
  },
  {
    art: "monarch",
    name: "Sarandha Bhola",
    school: "PIMR · BA LLB",
    role: "Legal + compliance",
    text: "Keeps Papilio on the right side of the rules.",
  },
] as const;

function ScoreCard({ name, score, papilio = false }: { name: string; score: number; papilio?: boolean }) {
  const tone = papilio ? "text-acc" : "text-dim";
  return (
    <div className={`card ${papilio ? "border-acc/35" : ""}`}>
      <p className="text-[15px] text-dim">{name}</p>
      <p className={`font-display text-7xl leading-none font-bold ${tone}`}>
        {score} <span className="font-sans text-base font-normal text-faint">/ 100</span>
      </p>
      <div className="mt-4 mb-5 h-1.5 overflow-hidden rounded-full bg-line">
        <div className={`h-full ${papilio ? "bg-acc" : "bg-dim"}`} style={{ width: `${score}%` }} />
      </div>
      <ul>
        {LEAKS.map((leak) => (
          <li key={leak} className="flex justify-between border-t border-line py-2.5 font-mono text-xs tracking-wider text-dim">
            <span>{leak}</span>
            <span className={tone}>{papilio ? "HIDDEN" : "LEAKED"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Home() {
  return (
    <div className="mx-auto max-w-[1100px] px-5">
      <nav className="flex items-center gap-6 border-b border-line py-4">
        <a href="#top" className="mr-auto flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <DotArt art="fly" n={48} className="w-8" />
          papilio
        </a>
        <a href="#how" className="hidden text-sm text-dim hover:text-ink md:inline">How it works</a>
        <a href="#score" className="hidden text-sm text-dim hover:text-ink md:inline">Privacy score</a>
        <a href="#roadmap" className="hidden text-sm text-dim hover:text-ink md:inline">Roadmap</a>
        <a href="#team" className="hidden text-sm text-dim hover:text-ink md:inline">Team</a>
        <a href="#top" className="btn">Join waitlist</a>
      </nav>

      <header id="top" className="grid items-center gap-6 pt-12 pb-18 md:grid-cols-[1.1fr_0.9fr] md:pt-20 md:pb-28">
        <div>
          <p className="label">Papilio · shielded intent router</p>
          <h1 className="mt-3.5 mb-4.5 font-display text-[clamp(40px,7vw,68px)] leading-[1.02] font-bold tracking-tight">
            Your trade, before it becomes a <span className="text-acc">butterfly.</span>
          </h1>
          <p className="max-w-[460px] text-[17px] text-dim">
            Swap intents hidden in a ZK proof on Aleo, executed MEV-protected through CoW Swap.
          </p>
          <Waitlist />
          <p className="font-mono text-xs tracking-wider text-dim">No custody · testnet only in V1</p>
        </div>
        <div className="relative mx-auto w-full max-w-[480px]">
          <div className="pointer-events-none absolute -inset-[8%] bg-[radial-gradient(closest-side,#0066ff26,transparent)]" />
          <DotArt art="fly" n={150} flap className="relative h-auto w-full" />
        </div>
      </header>

      <section id="how" className="border-t border-line py-16">
        <p className="label">How it works</p>
        <h2 className="mt-2.5 mb-8 font-display text-[clamp(28px,4vw,40px)] font-bold tracking-tight">Three stages. One clean trade.</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STAGES.map((s, i) => (
            <li key={s.title} className="card relative">
              {i < STAGES.length - 1 && (
                <span aria-hidden className="absolute top-1/2 -right-[13px] z-10 hidden -translate-y-1/2 font-mono text-xs text-acc md:block">
                  →
                </span>
              )}
              <div className="mb-4 rounded-lg border border-line bg-bg p-4">
                <DotArt art={s.art} n={64} className="mx-auto h-auto w-full max-w-[170px]" />
                <p className="mt-2 font-mono text-xs tracking-wider text-dim">{s.note}</p>
              </div>
              <p className="font-mono text-xs tracking-wider text-acc">0{i + 1}</p>
              <h3 className="my-1 font-display text-xl font-bold tracking-tight">{s.title}</h3>
              <p className="text-[15px] text-dim">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="score" className="border-t border-line py-16">
        <p className="label">
          Privacy score
          <span className="ml-2.5 rounded-full border border-line px-2.5 py-0.5 text-dim">example data</span>
        </p>
        <h2 className="mt-2.5 mb-8 font-display text-[clamp(28px,4vw,40px)] font-bold tracking-tight">What a swap leaks.</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <ScoreCard name="Normal swap" score={18} />
          <ScoreCard name="With Papilio" score={92} papilio />
        </div>
      </section>

      <section className="border-t border-line py-16">
        <p className="label">Why it matters</p>
        <h2 className="mt-2.5 mb-8 font-display text-[clamp(28px,4vw,40px)] font-bold tracking-tight">Privacy is price.</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {WHY.map((w) => (
            <div key={w.title} className="card">
              <h3 className="mb-1 font-display text-xl font-bold tracking-tight">{w.title}</h3>
              <p className="text-[15px] text-dim">{w.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="roadmap" className="border-t border-line py-16">
        <p className="text-center font-mono text-xs leading-loose tracking-wider text-dim">
          Built for CoW + Aleo grants · V1: Sepolia + Aleo testnet · No token, no paywall.
        </p>
      </section>

      <section id="team" className="border-t border-line py-12">
        <p className="label">Team</p>
        <ul className="mt-5 grid gap-4 md:grid-cols-2">
          {TEAM.map((m) => (
            <li key={m.name} className="card group flex items-center gap-4 transition-colors hover:border-acc/40">
              <div className="shrink-0 rounded-lg border border-line bg-bg p-2">
                <DotArt art={m.art} n={56} flap className="h-auto w-20 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-lg leading-tight font-bold tracking-tight">{m.name}</h3>
                <p className="font-mono text-xs tracking-wider text-dim">{m.school}</p>
                <p className="mt-2 font-mono text-xs tracking-wider text-acc uppercase">{m.role}</p>
                <p className="text-sm text-dim">{m.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <footer className="flex flex-wrap items-center gap-4 border-t border-line py-7 font-mono text-xs tracking-wider text-dim">
        <DotArt art="fly" n={48} className="w-6" />
        <span className="mr-auto">Papilio never holds your funds.</span>
        <a href="#" className="hover:text-ink">X</a>
        <a href="#" className="hover:text-ink">GitHub</a>
      </footer>
    </div>
  );
}
