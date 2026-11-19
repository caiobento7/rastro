import { dataHora } from "@/core/domain/formatar";
import type { PassoDaTrilha } from "@/core/domain/tipos";
import { cn } from "@/lib/utils";

const DESCRICAO_DO_ESTADO: Record<PassoDaTrilha["estado"], string> = {
  ok: "registrado",
  problema: "aqui está o problema",
  faltando: "não registrado",
  pendente: "ainda vai acontecer",
};

function Marcador({ estado }: { estado: PassoDaTrilha["estado"] }) {
  const base = "relative z-10 mt-1 size-3.5 shrink-0 rounded-full";
  if (estado === "ok") return <span className={cn(base, "bg-tinta")} />;
  if (estado === "problema") return <span className={cn(base, "border-[3px] border-quebra bg-card")} />;
  if (estado === "faltando") return <span className={cn(base, "border-2 border-dashed border-quebra bg-card")} />;
  return <span className={cn(base, "border-2 border-espera bg-card")} />;
}

/**
 * O caminho da venda, passo a passo. O trecho até um passo com problema ou que
 * não foi registrado aparece tracejado em vermelho: é ali que o rastro se perde.
 */
export function Trilha({ passos, className }: { passos: PassoDaTrilha[]; className?: string }) {
  return (
    <ol className={cn("relative", className)} aria-label="Caminho da venda">
      {passos.map((p, i) => {
        const proximo = passos[i + 1];
        const quebra = proximo && (proximo.estado === "faltando" || proximo.estado === "problema");
        const espera = proximo?.estado === "pendente";
        return (
          <li key={`${p.rotulo}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
            {proximo && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-4 bottom-0 left-[6px] w-0.5",
                  quebra ? "rastro-perdido" : espera ? "bg-espera/40" : "bg-tinta/80",
                )}
              />
            )}
            <Marcador estado={p.estado} />
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
              <p
                className={cn(
                  "text-sm",
                  p.estado === "problema" || p.estado === "faltando" ? "font-semibold text-quebra" : "",
                  p.estado === "pendente" ? "text-espera" : "",
                )}
              >
                {p.rotulo}
                <span className="sr-only"> ({DESCRICAO_DO_ESTADO[p.estado]})</span>
              </p>
              <p className="text-xs text-muted-foreground">{p.data_hora ? dataHora(p.data_hora) : "sem registro"}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
