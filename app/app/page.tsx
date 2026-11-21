import type { Metadata } from "next";
import ClientApp from "@/components/app/ClientApp";

export const metadata: Metadata = {
  title: "Papilio app — shield & swap (testnet)",
  description: "Connect an Aleo wallet, lock a private trade intent in zero knowledge, and watch it settle on CoW Protocol (Sepolia).",
};

export default function AppPage() {
  return <ClientApp />;
}
