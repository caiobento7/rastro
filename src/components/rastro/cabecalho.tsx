"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, Circle, ListChecks, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { HOJE } from "@/adapters/demo";
import { reiniciarDemo } from "@/lib/demo/estado";
import { useDemo } from "@/lib/demo/use-demo";
import { cn } from "@/lib/utils";
import { Marca } from "./marca";

const AREAS = [
  { href: "/creator", rotulo: "Creator" },
  { href: "/atendimento", rotulo: "Atendimento" },
  { href: "/tecnologia", rotulo: "Tecnologia" },
  { href: "/gestao", rotulo: "Gestão" },
];

function useRoteiro() {
  const { rastro } = useDemo();
  const casosDaLia = rastro.casosDoCreator("c-lia");
  const vendaDeOntem = rastro
    .vendasDoCreator("c-lia")
    .find((v) => v.data_hora.startsWith("2026-11-16") && v.situacao === "nao_contou");
  const alerta = rastro.alertas()[0];
  const fila = rastro.filaDoAtendimento();
  return [
    {
      area: "/creator",
      texto: "Como Lia, pergunte por que a venda de ontem não contou.",
      feito: casosDaLia.some((c) => c.venda_id === vendaDeOntem?.venda_id),
    },
    {
      area: "/creator",
      texto: "Pergunte sobre o treino de 15/11 e diga que não concorda com a explicação.",
      feito: casosDaLia.some((c) => c.contestado),
    },
    {
      area: "/atendimento",
      texto: "No atendimento, responda um caso que precisa de uma pessoa usando a resposta sugerida.",
      feito: fila.some((c) => c.mensagens.some((m) => m.autor === "atendimento" && m.em >= HOJE)),
    },
    {
      area: "/tecnologia",
      texto: "Na tecnologia, investigue e resolva o alerta do checkout v3.2.",
      feito: alerta?.status === "resolvido",
    },
    {
      area: "/gestao",
      texto: "Na gestão, veja quanto o Rastro resolveu sozinho e qual time pode evitar cada causa.",
      feito: false,
    },
  ];
}

function Roteiro() {
  const passos = useRoteiro();
  const feitos = passos.filter((p) => p.feito).length;
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm">
            <ListChecks data-icon="inline-start" />
            Roteiro
            <span className="text-muted-foreground">
              {feitos}/{passos.length}
            </span>
          </Button>
        }
      />
      <SheetContent side="right" className="w-full max-w-md">
        <SheetHeader>
          <SheetTitle>Roteiro da demonstração</SheetTitle>
          <SheetDescription>
            Cinco passos para ver o Rastro dos dois lados: de quem vende e de quem trabalha na YouShop. Cada ação muda as
            outras telas.
          </SheetDescription>
        </SheetHeader>
        <ol className="space-y-4 px-4">
          {passos.map((p, i) => (
            <li key={i} className="flex gap-3">
              {p.feito ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-seguro" aria-label="Feito" />
              ) : (
                <Circle className="mt-0.5 size-5 shrink-0 text-linha" aria-label="A fazer" />
              )}
              <div className="space-y-1">
                <p className={cn("text-sm", p.feito && "text-muted-foreground line-through decoration-1")}>{p.texto}</p>
                <Link href={p.area} className="text-sm font-medium text-cobalto underline-offset-4 hover:underline">
                  Ir para {AREAS.find((a) => a.href === p.area)?.rotulo}
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </SheetContent>
    </Sheet>
  );
}

export function CabecalhoDaPlataforma() {
  const caminho = usePathname();
  const { rastro } = useDemo();
  const aguardando = rastro.filaDoAtendimento().filter((c) => c.status === "aguardando_atendimento").length;
  const alertasAbertos = rastro.alertas().filter((a) => a.status !== "resolvido").length;
  const contagem: Record<string, number> = { "/atendimento": aguardando, "/tecnologia": alertasAbertos };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="Rastro, página inicial">
          <Marca className="text-tinta" />
          <span className="hidden text-xs text-muted-foreground md:inline">Protótipo para a YouShop</span>
        </Link>

        <nav aria-label="Áreas da plataforma" className="order-3 -mx-4 w-full overflow-x-auto px-4 md:order-none md:mx-0 md:w-auto md:px-0">
          <ul className="flex gap-1">
            {AREAS.map((a) => {
              const ativa = caminho.startsWith(a.href);
              return (
                <li key={a.href}>
                  <Link
                    href={a.href}
                    aria-current={ativa ? "page" : undefined}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                      ativa ? "bg-tinta text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {a.rotulo}
                    {contagem[a.href] ? (
                      <span
                        className={cn(
                          "min-w-5 rounded-full px-1.5 text-center text-xs",
                          ativa ? "bg-white/20 text-white" : "bg-quebra text-white",
                        )}
                      >
                        {contagem[a.href]}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Roteiro />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              reiniciarDemo();
              toast.success("Demonstração reiniciada", { description: "Tudo voltou ao estado de 17/11 às 18h." });
            }}
          >
            <RotateCcw data-icon="inline-start" />
            <span className="hidden sm:inline">Reiniciar</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
