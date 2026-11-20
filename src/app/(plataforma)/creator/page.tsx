import type { Metadata } from "next";
import { TelaCreator } from "@/components/telas/creator";

export const metadata: Metadata = { title: "Creator" };

export default function PaginaCreator() {
  // A tela diz com transparência se a pergunta livre passa pela IA ou só pelas regras.
  return <TelaCreator comIA={Boolean(process.env.ANTHROPIC_API_KEY)} />;
}
