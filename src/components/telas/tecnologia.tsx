"use client";

import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusDoCaso } from "@/components/rastro/visual";
import type { Rastro } from "@/core/application/rastro";
import { dataHora, dinheiro, haQuantoTempo, hora, dia, minutosEntre } from "@/core/domain/formatar";
import type { Alerta, StatusAlerta } from "@/core/domain/tipos";
import { executar } from "@/lib/demo/estado";
import { useDemo } from "@/lib/demo/use-demo";
import { cn } from "@/lib/utils";

const ETAPAS: { status: StatusAlerta; rotulo: string }[] = [
  { status: "aberto", rotulo: "Aberto" },
  { status: "investigando", rotulo: "Investigando" },
  { status: "resolvido", rotulo: "Resolvido" },
];

export function TelaTecnologia() {
  const { rastro, agora } = useDemo();
  const alertas = rastro.alertas();
  const isoladas = rastro.falhasIsoladas();

  return (
    <div className="space-y-6">
      <section className="max-w-3xl space-y-1">
        <h1 className="text-2xl font-semibold">Tecnologia</h1>
        <p className="text-muted-foreground">
          Quando várias vendas ficam sem explicação com a mesma assinatura, o Rastro junta as perguntas dos creators num
          alerta. A falha chega aqui com provas, antes de virar reclamação pública.
        </p>
      </section>

      {alertas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="font-medium">Nenhum alerta agora.</p>
          <p className="text-sm text-muted-foreground">
            Um alerta abre quando 3 ou mais vendas parecidas ficam sem explicação.
          </p>
        </div>
      ) : (
        alertas.map((a) => <CartaoDoAlerta key={a.id} alerta={a} rastro={rastro} agora={agora} />)
      )}

      {isoladas.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Vendas sem explicação fora de alerta</h2>
          <p className="text-sm text-muted-foreground">Casos isolados. Viram alerta se aparecerem outros parecidos.</p>
          <ul className="mt-3 divide-y divide-border">
            {isoladas.map((c) => (
              <li key={c.protocolo} className="flex justify-between py-2 text-sm">
                <span>
                  {c.protocolo}, {rastro.creator(c.creator_id).nome}
                </span>
                <StatusDoCaso status={c.status} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function CartaoDoAlerta({ alerta, rastro, agora }: { alerta: Alerta; rastro: Rastro; agora: string }) {
  const indice = ETAPAS.findIndex((e) => e.status === alerta.status);
  const casos = rastro.filaDoAtendimento().filter((c) => alerta.venda_ids.includes(c.venda_id));
  const vizinhas = rastro.vendasAoRedorDoAlerta(alerta.id);
  const naoReclamadas = vizinhas.filter((v) => v.sem_atribuicao && !v.no_alerta && v.checkout_versao === alerta.assinatura.checkout_versao);

  function mudar(status: StatusAlerta) {
    executar((r) => r.mudarStatusDoAlerta(alerta.id, status));
    if (status === "investigando") toast.success("Alerta assumido. O atendimento vê que a tecnologia está investigando.");
    if (status === "resolvido") {
      toast.success(`Vendas reprocessadas. ${alerta.creator_ids.length} creators receberam a resposta no próprio caso.`);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(alerta.resumo_tecnico);
      toast.success("Resumo técnico copiado.");
    } catch {
      toast.error("Não deu para copiar. Selecione o texto manualmente.");
    }
  }

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card" aria-labelledby={`titulo-${alerta.id}`}>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Aberto pelo Rastro a partir de {alerta.venda_ids.length} perguntas de creators. Primeira venda afetada{" "}
            {haQuantoTempo(alerta.primeira_em, agora)}, em {dataHora(alerta.primeira_em)}.
          </p>
          <h2 id={`titulo-${alerta.id}`} className="text-xl font-semibold">
            {alerta.titulo}
          </h2>
        </div>
        <ol className="flex items-center gap-1 text-xs font-medium" aria-label="Andamento do alerta">
          {ETAPAS.map((e, i) => (
            <li key={e.status} className="flex items-center gap-1">
              <span
                aria-current={i === indice ? "step" : undefined}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1",
                  i < indice && "bg-muted text-muted-foreground",
                  i === indice && (e.status === "resolvido" ? "bg-seguro text-white" : "bg-quebra text-white"),
                  i > indice && "border border-border text-muted-foreground",
                )}
              >
                {i < indice && <Check className="size-3" aria-hidden="true" />}
                {e.rotulo}
              </span>
              {i < ETAPAS.length - 1 && <span aria-hidden="true" className="h-px w-3 bg-linha" />}
            </li>
          ))}
        </ol>
      </header>

      <dl className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
        {[
          ["Vendas afetadas", String(alerta.venda_ids.length + naoReclamadas.length)],
          ["Creators afetados", String(alerta.creator_ids.length)],
          ["Comissões em risco", dinheiro(alerta.comissoes_em_risco)],
          ["Assinatura", `Checkout ${alerta.assinatura.checkout_versao}, ${alerta.assinatura.produtor}`],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="bg-card px-5 py-3">
            <dt className="text-xs text-muted-foreground">{rotulo}</dt>
            <dd className="font-semibold">{valor}</dd>
          </div>
        ))}
      </dl>

      <section className="space-y-3 px-5 py-5" aria-labelledby={`linha-${alerta.id}`}>
        <h3 id={`linha-${alerta.id}`} className="text-sm font-semibold">
          Vendas da {alerta.assinatura.produtor} no período
        </h3>
        <LinhaDoIncidente vendas={vizinhas} versao={alerta.assinatura.checkout_versao} />
        {naoReclamadas.length > 0 && (
          <p className="text-sm">
            <span className="grifo font-medium">
              {naoReclamadas.length === 1 ? "1 venda" : `${naoReclamadas.length} vendas`} com a mesma falha ainda sem reclamação
            </span>{" "}
            (em {naoReclamadas.map((v) => dataHora(v.data_hora)).join(", ")}). O reprocessamento corrige essa também.
          </p>
        )}
      </section>

      <section className="space-y-2 border-t border-border px-5 py-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Resumo técnico</h3>
          <Button variant="ghost" size="sm" onClick={copiar}>
            <Copy data-icon="inline-start" />
            Copiar
          </Button>
        </div>
        <p className="max-w-prose rounded-lg bg-muted px-4 py-3 text-sm leading-relaxed">{alerta.resumo_tecnico}</p>
      </section>

      <section className="border-t border-border px-5 py-5">
        <h3 className="mb-3 text-sm font-semibold">Casos ligados ao alerta</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Protocolo</th>
                <th className="py-2 pr-4 font-medium">Creator</th>
                <th className="py-2 pr-4 font-medium">Venda</th>
                <th className="py-2 pr-4 font-medium">Perguntou</th>
                <th className="py-2 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {casos.map((c) => {
                const v = vizinhas.find((x) => x.venda_id === c.venda_id);
                return (
                  <tr key={c.protocolo}>
                    <td className="py-2 pr-4 tabular-nums">{c.protocolo}</td>
                    <td className="py-2 pr-4">{rastro.creator(c.creator_id).nome}</td>
                    <td className="py-2 pr-4">
                      {v?.produto}, {v ? dataHora(v.data_hora) : ""}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {v ? `${Math.max(1, Math.round(minutosEntre(v.data_hora, c.aberto_em) / 60))} h depois` : ""}
                    </td>
                    <td className="py-2">
                      <StatusDoCaso status={c.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/50 px-5 py-4">
        <p className="text-sm text-muted-foreground">
          {alerta.status === "aberto" && "Ninguém assumiu este alerta ainda."}
          {alerta.status === "investigando" && "Depois de corrigir o checkout, reprocesse as vendas. Cada creator recebe a resposta no próprio caso."}
          {alerta.status === "resolvido" && `Resolvido. ${alerta.creator_ids.length} creators avisados sem nenhum chamado manual.`}
        </p>
        <div className="flex gap-2">
          {alerta.status === "aberto" && <Button onClick={() => mudar("investigando")}>Assumir a investigação</Button>}
          {alerta.status === "investigando" && (
            <Button onClick={() => mudar("resolvido")}>Marcar como corrigido e reprocessar as vendas</Button>
          )}
        </div>
      </footer>
    </article>
  );
}

/** Uma faixa de tempo com cada venda do produtor: as que falharam em vermelho, as que passaram em tinta. */
function LinhaDoIncidente({
  vendas,
  versao,
}: {
  vendas: ReturnType<Rastro["vendasAoRedorDoAlerta"]>;
  versao: string;
}) {
  if (vendas.length === 0) return null;
  const inicio = vendas[0].data_hora;
  const total = Math.max(60, minutosEntre(inicio, vendas.at(-1)!.data_hora));
  const x = (iso: string) => 2 + (minutosEntre(inicio, iso) / total) * 96;
  const dias = [...new Set(vendas.map((v) => v.data_hora.slice(0, 10)))];

  return (
    <figure className="space-y-2">
      <div className="relative h-24 rounded-lg border border-border bg-papel">
        <span aria-hidden="true" className="absolute top-1/2 right-2 left-2 h-px bg-linha" />
        {vendas.map((v) => {
          const falhou = v.sem_atribuicao && v.checkout_versao === versao;
          return (
            <span
              key={v.venda_id}
              title={`${v.produto}, ${dataHora(v.data_hora)}, checkout ${v.checkout_versao}${falhou ? ", sem atribuição" : ""}`}
              className={cn(
                "absolute size-3.5 -translate-x-1/2 rounded-full border-2",
                falhou ? "top-[22%] border-quebra bg-card" : "top-[62%] border-tinta bg-tinta",
              )}
              style={{ left: `${x(v.data_hora)}%` }}
            />
          );
        })}
        {dias.map((d) => {
          const meiaNoite = `${d}T00:00:00-03:00`;
          if (meiaNoite <= inicio) return null;
          return (
            <span key={d} className="absolute bottom-1 -translate-x-1/2 text-[11px] text-muted-foreground" style={{ left: `${x(meiaNoite)}%` }}>
              {dia(meiaNoite)}
            </span>
          );
        })}
      </div>
      <figcaption className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2 border-quebra" aria-hidden="true" /> Sem atribuição, checkout {versao}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-tinta" aria-hidden="true" /> Atribuída normalmente, outras versões
        </span>
        <span>
          Das {hora(vendas[0].data_hora)} de {dia(vendas[0].data_hora)} às {hora(vendas.at(-1)!.data_hora)} de {dia(vendas.at(-1)!.data_hora)}
        </span>
      </figcaption>
    </figure>
  );
}
