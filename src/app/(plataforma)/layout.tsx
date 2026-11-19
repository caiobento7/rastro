import Link from "next/link";
import { CabecalhoDaPlataforma } from "@/components/rastro/cabecalho";

export default function LayoutDaPlataforma({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CabecalhoDaPlataforma />
      <main id="conteudo" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:px-6">
          <p>Dados fictícios. A demonstração roda em 17/11/2026 às 18h e guarda suas ações só neste navegador.</p>
          <Link href="/" className="underline-offset-4 hover:underline">
            Entenda o problema e a proposta
          </Link>
        </div>
      </footer>
    </>
  );
}
