import { CAUSAS, TIMES } from "@/core/domain/causas";
import type { Causa, Evidencia, ResumoVenda, StatusCaso, TimeId } from "@/core/domain/tipos";
import { cn } from "@/lib/utils";

/** Uma cor por causa, usada nos selos e no gráfico da gestão. */
export const COR_DA_CAUSA: Record<Causa, string> = {
  uso_do_link: "#2747d0",
  prazo: "#8b93a5",
  regra: "#6a4fc0",
  configuracao: "#0f7f81",
  conta: "#a3620a",
  possivel_falha: "#c4283a",
  venda_contabilizada: "#15784f",
};

export function SeloCausa({ causa, className }: { causa: Causa; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        className,
      )}
    >
      <span className="size-2 rounded-full" style={{ background: COR_DA_CAUSA[causa] }} aria-hidden="true" />
      {CAUSAS[causa].nome}
    </span>
  );
}

const SITUACAO: Record<ResumoVenda["situacao"], { rotulo: string; classe: string }> = {
  contou: { rotulo: "Comissão liberada", classe: "text-seguro bg-seguro/10" },
  comissao_pendente: { rotulo: "Comissão pendente", classe: "text-espera bg-espera/10" },
  sem_comissao: { rotulo: "Sem comissão", classe: "text-muted-foreground bg-muted" },
  nao_contou: { rotulo: "Não contou", classe: "text-quebra bg-quebra/10" },
};

export function Situacao({ situacao, className }: { situacao: ResumoVenda["situacao"]; className?: string }) {
  const s = SITUACAO[situacao];
  return (
    <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", s.classe, className)}>
      {s.rotulo}
    </span>
  );
}

const STATUS: Record<StatusCaso, { rotulo: string; classe: string }> = {
  explicado: { rotulo: "Explicado pelo Rastro", classe: "text-seguro bg-seguro/10" },
  aguardando_atendimento: { rotulo: "Precisa de uma pessoa", classe: "text-quebra bg-quebra/10" },
  com_tecnologia: { rotulo: "Com a tecnologia", classe: "text-cobalto bg-cobalto/10" },
  resolvido: { rotulo: "Resolvido", classe: "text-muted-foreground bg-muted" },
};

export function StatusDoCaso({ status, className }: { status: StatusCaso; className?: string }) {
  const s = STATUS[status];
  return (
    <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", s.classe, className)}>
      {s.rotulo}
    </span>
  );
}

export function NomeDoTime({ time, className }: { time: TimeId; className?: string }) {
  return <span className={cn("font-medium", className)}>{TIMES[time].nome}</span>;
}

/** Lista de fatos que sustentam o diagnóstico. A prova decisiva aparece grifada. */
export function Evidencias({ evidencias, className }: { evidencias: Evidencia[]; className?: string }) {
  return (
    <ul className={cn("space-y-1.5 text-sm", className)}>
      {evidencias.map((e) => (
        <li key={e.fato} className="flex gap-2">
          <span aria-hidden="true" className={cn("mt-2 size-1.5 shrink-0 rounded-full", e.decisiva ? "bg-tinta" : "bg-linha")} />
          <span className={e.decisiva ? "font-medium" : "text-muted-foreground"}>
            {e.decisiva ? <span className="grifo">{e.fato}</span> : e.fato}
            {e.decisiva && <span className="sr-only"> (prova decisiva)</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

const TONS = ["#dfe5fb", "#e6f2ec", "#f6ead9", "#ece6f7", "#e0f0f0", "#f6e3e5", "#e9ebef"];

export function Iniciais({ nome, className }: { nome: string; className?: string }) {
  const partes = nome.split(" ");
  const iniciais = (partes[0][0] + (partes.at(-1)?.[0] ?? "")).toUpperCase();
  const tom = TONS[[...nome].reduce((s, c) => s + c.charCodeAt(0), 0) % TONS.length];
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-tinta", className)}
      style={{ background: tom }}
    >
      {iniciais}
    </span>
  );
}
