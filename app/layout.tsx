import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"] });
const jb = JetBrains_Mono({ variable: "--font-jb", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Papilio — shielded intent router",
  description:
    "Your trade, before it becomes a butterfly. Swap intents hidden in a ZK proof on Aleo, executed MEV-protected through CoW Swap.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable} ${jb.variable} antialiased`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
