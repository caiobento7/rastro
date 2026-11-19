import type { Metadata } from "next";
import { TelaGestao } from "@/components/telas/gestao";

export const metadata: Metadata = { title: "Gestão" };

export default function PaginaGestao() {
  return <TelaGestao />;
}
