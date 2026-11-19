import type { Metadata } from "next";
import { TelaAtendimento } from "@/components/telas/atendimento";

export const metadata: Metadata = { title: "Atendimento" };

export default function PaginaAtendimento() {
  return <TelaAtendimento />;
}
