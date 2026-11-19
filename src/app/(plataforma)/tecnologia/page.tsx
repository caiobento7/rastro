import type { Metadata } from "next";
import { TelaTecnologia } from "@/components/telas/tecnologia";

export const metadata: Metadata = { title: "Tecnologia" };

export default function PaginaTecnologia() {
  return <TelaTecnologia />;
}
