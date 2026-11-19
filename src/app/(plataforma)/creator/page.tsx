import type { Metadata } from "next";
import { TelaCreator } from "@/components/telas/creator";

export const metadata: Metadata = { title: "Creator" };

export default function PaginaCreator() {
  return <TelaCreator />;
}
