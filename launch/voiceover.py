"""Record narration with macOS `say`, fit each line into its scene window, mix it onto the video.

Usage (from the repo root): python3 launch/voiceover.py . [voice]   e.g. "Ava (Premium)" once downloaded in
System Settings > Accessibility > Spoken Content > System voice > Manage voices.
Writes launch/papilio-<name>-voiced.mp4 next to the silent originals; originals are untouched.
"""
import json, subprocess, sys, tempfile
from pathlib import Path

REPO = Path(sys.argv[1])
VOICE = sys.argv[2] if len(sys.argv) > 2 else "Samantha"
BASE_RATE = 175  # words per minute; raised per line only if a line would overrun its scene

# (start s, must end by s, text). Domain spelled for speech.
SITE = "papilio dot vital veev dot in slash app"
SCRIPTS = {
    "explainer": [
        (0.3, 6.0, "Every swap you make is public forever: your wallet, your balance, your history."),
        (6.3, 12.0, "Papilio hides the trader, not the trade. Private intents on Aleo, settled on CoW Protocol."),
        (12.3, 20.0, "First, lock in zero knowledge. Your wallet proves you hold the amount. Only a commitment hash goes on chain."),
        (20.3, 26.8, "Then a relayer places an ordinary CoW order from its own funds. Solvers see a tier and a receiver. Never you."),
        (27.0, 34.0, "Solvers fill it at the batch price, and the relayer is repaid from escrow. Never filled? You take your funds back."),
        (34.3, 41.0, "It's live on testnet. Every transaction is real, and you can check every one."),
        (41.5, 49.8, f"Try it now, at {SITE}."),
    ],
    "demo": [
        (0.3, 4.1, "Papilio: private swaps, with Aleo zero knowledge and CoW Protocol."),
        (4.2, 6.1, "Connect a Shield, Leo, or Puzzle wallet."),
        (6.2, 10.1, "Pick a fixed tier, so every order in a tier looks the same."),
        (10.2, 14.1, "You get a live CoW quote, and a fresh address to receive on Sepolia."),
        (14.2, 18.1, "Your address and balance stay hidden. Only the tier is public."),
        (18.2, 20.9, "Shield and swap. Your wallet proves and locks the intent."),
        (21.0, 26.1, "Here's a real testnet trade: locked, ordered on CoW, settled, and the escrow claimed."),
        (26.2, 28.4, "Every step links to a public explorer."),
        (28.5, 34.1, "If an order never fills, you refund the escrow yourself after it expires. No permission needed."),
        (34.3, 42.0, "The proof page shows one full trade, and the refund path, all on public explorers."),
        (42.2, 47.8, f"Try it at {SITE}. Testnet only, no token."),
    ],
}


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)],
                         capture_output=True, text=True, check=True).stdout
    return float(json.loads(out)["format"]["duration"])


def record(text, out, window):
    rate = BASE_RATE
    while True:
        subprocess.run(["say", "-v", VOICE, "-r", str(rate), "-o", str(out), text], check=True)
        d = duration(out)
        if d <= window or rate >= 230:  # don't go faster than ~230 wpm: it stops sounding human
            return d, rate
        rate += 10


def build(name):
    src = REPO / "launch" / f"papilio-{name}.mp4"
    dst = REPO / "launch" / f"papilio-{name}-voiced.mp4"
    video_len = duration(src)
    tmp = Path(tempfile.mkdtemp())
    inputs, filters, end = [], [], 0.0
    for i, (start, stop, text) in enumerate(SCRIPTS[name]):
        clip = tmp / f"{i}.aiff"
        d, rate = record(text, clip, stop - start)
        flag = "" if start + d <= stop else f"  OVERRUNS by {start + d - stop:.1f}s"
        print(f"{name} {i}: {start:5.1f}s +{d:4.1f}s @{rate}wpm{flag}")
        end = max(end, start + d)
        inputs += ["-i", str(clip)]
        ms = int(start * 1000)
        filters.append(f"[{i + 1}:a]adelay={ms}|{ms}[a{i}]")
    n = len(SCRIPTS[name])
    pad = max(0.0, end + 0.8 - video_len)  # hold the last frame if the closing line runs past the end
    mix = "".join(f"[a{i}]" for i in range(n))
    # apad + -t: silence fills to the end, so the video plays out fully instead of stopping with the last line.
    filters.append(f"{mix}amix=inputs={n}:normalize=0,loudnorm=I=-16:TP=-1.5,apad[aout]")
    filters.append(f"[0:v]tpad=stop_mode=clone:stop_duration={pad:.2f}[vout]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), *inputs,
                    "-filter_complex", ";".join(filters), "-map", "[vout]", "-map", "[aout]",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "160k", "-t", f"{video_len + pad:.2f}", "-movflags", "+faststart", str(dst)], check=True)
    print(f"{dst.name}: {duration(dst):.1f}s (video was {video_len:.1f}s, padded {pad:.1f}s)")


for name in SCRIPTS:
    build(name)
