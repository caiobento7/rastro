"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Conversa } from "@/components/rastro/conversa";
import { Trilha } from "@/components/rastro/trilha";
import { Evidencias, Iniciais, NomeDoTime, SeloCausa, StatusDoCaso } from "@/components/rastro/visual";
import type { Rastro } from "@/core/application/rastro";
import { dataHora, duracao, haQuantoTempo } from "@/core/domain/formatar";
import { semAtendente } from "@/core/domain/metricas";
import type { Caso, StatusCaso } from "@/core/domain/tipos";
import { executar } from "@/lib/demo/estado";
import { useDemo } from "@/lib/demo/use-demo";
import { cn } from "@/lib/utils";

const ABAS: { status: StatusCaso; rotulo: string }[] = [
  { status: "aguardando_atendimento", rotulo: "Precisam de você" },
  { status: "com_tecnologia", rotulo: "Com a tecnologia" },
  { status: "explicado", rotulo: "Explicados pelo Rastro" },
  { status: "resolvido", rotulo: "Resolvidos" },
];

export function TelaAtendimento() {
  const { rastro, agora } = useDemo();
  const fila = rastro.filaDoAtendimento();
  const [aba, setAba] = useState<StatusCaso>("aguardando_atendimento");
  const [escolhido, setEscolhido] = useState<string | null>(null);

  const daAba = fila.filter((c) => c.status === aba);
  const caso = daAba.find((c) => c.protocolo === escolhido) ?? daAba[0];
  const numeros = rastro.painel().numeros;
  const hoje = agora.slice(0, 10);
  const explicadosHoje = fila.filter((c) => c.aberto_em.startsWith(hoje) && semAtendente(c)).length;

  return (
    <div className="space-y-6">
      <section className="max-w-3xl space-y-1">
        <h1 className="text-2xl font-semibold">Atendimento ao creator</h1>
        <p className="text-muted-foreground">
          O Rastro explica sozinho o que os dados explicam. Aqui chega o que precisa de uma pessoa, já com o diagnóstico, as
          provas e uma resposta sugerida.
        </p>
      </section>

      <dl className="grid grid-cols-2 divide-border rounded-xl border border-border bg-card md:grid-cols-4 md:divide-x">
        <Numero rotulo="Precisam de você" valor={String(numeros.aguardando_atendimento)} destaque={numeros.aguardando_atendimento > 0} />
        <Numero rotulo="Explicados pelo Rastro hoje" valor={String(explicadosHoje)} />
        <Numero rotulo="Com a tecnologia" valor={String(numeros.com_tecnologia)} />
        <Numero
          rotulo="Tempo até a explicação"
          valor={numeros.mediana_minutos_ate_explicacao < 1 ? "menos de 1 min" : duracao(numeros.mediana_minutos_ate_explicacao)}
        />
      </dl>

      <div role="tablist" aria-label="Situação dos casos" className="flex flex-wrap gap-1 border-b border-border">
        {ABAS.map((a) => {
          const n = fila.filter((c) => c.status === a.status).length;
          return (
            <button
              key={a.status}
              role="tab"
              type="button"
              aria-selected={aba === a.status}
              onClick={() => {
                setAba(a.status);
                setEscolhido(null);
              }}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
                aba === a.status ? "border-tinta text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {a.rotulo} <span className="tabular-nums text-muted-foreground">{n}</span>
            </button>
          );
        })}
      </div>

      {daAba.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="font-medium">Nenhum caso aqui agora.</p>
          <p className="text-sm text-muted-foreground">
            {aba === "aguardando_atendimento"
              ? "Tudo o que chegou foi explicado pelo Rastro. Quando um creator discordar de uma explicação, o caso aparece aqui."
              : "Os casos aparecem aqui conforme os creators perguntam."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <ul className="max-h-[640px] self-start divide-y divide-border overflow-y-auto rounded-xl border border-border bg-card" aria-label="Casos">
            {daAba.map((c) => {
              const creator = rastro.creator(c.creator_id);
              const ativo = c.protocolo === caso?.protocolo;
              return (
                <li key={c.protocolo}>
                  <button
                    type="button"
                    onClick={() => setEscolhido(c.protocolo)}
                    aria-current={ativo ? "true" : undefined}
                    className={cn(
                      "flex w-full gap-3 border-l-[3px] px-4 py-3 text-left hover:bg-muted/60",
                      ativo ? "border-l-cobalto bg-accent/60" : "border-l-transparent",
                    )}
                  >
                    <Iniciais nome={creator.nome} />
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium">{creator.nome}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{haQuantoTempo(c.mensagens.at(-1)!.em, agora)}</span>
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{c.mensagens.at(-1)!.texto}</span>
                      <SeloCausa causa={c.causa} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {caso && <DetalheDoCaso key={caso.protocolo} caso={caso} rastro={rastro} agora={agora} />}
        </div>
      )}
    </div>
  );
}

function Numero({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className={cn("text-xl font-semibold tabular-nums", destaque && "text-quebra")}>{valor}</dd>
    </div>
  );
}

function DetalheDoCaso({ caso, rastro, agora }: { caso: Caso; rastro: Rastro; agora: string }) {
  const creator = rastro.creator(caso.creator_id);
  const d = rastro.diagnosticarVenda(caso.venda_id, caso.creator_id)!;
  const [resposta, setResposta] = useState(() => rastro.respostaSugerida(caso.protocolo));
  const alerta = rastro.alertaDoCaso(caso);
  const podeAgir = caso.status === "aguardando_atendimento";

  function responder() {
    try {
      executar((r) => r.responder(caso.protocolo, resposta));
      toast.success(`Resposta enviada para ${creator.nome.split(" ")[0]}. Caso ${caso.protocolo} resolvido.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não deu para enviar.");
    }
  }

  function encaminhar() {
    executar((r) => r.encaminharParaTecnologia(caso.protocolo));
    toast.success(`Caso ${caso.protocolo} encaminhado para a tecnologia com o diagnóstico.`);
  }

  return (
    <article className="space-y-5 rounded-xl border border-border bg-card p-5" aria-labelledby="titulo-caso">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Iniciais nome={creator.nome} className="size-10" />
          <div>
            <h2 id="titulo-caso" className="font-semibold">
              {creator.nome} <span className="font-normal text-muted-foreground">{creator.usuario}</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              {d.produto}, venda de {dataHora(d.data_hora)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusDoCaso status={caso.status} />
          <span className="text-xs text-muted-foreground">
            {caso.protocolo}, aberto {haQuantoTempo(caso.aberto_em, agora)}
          </span>
        </div>
      </header>

      <section className="rounded-lg border border-border">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <h3 className="text-sm font-semibold">Diagnóstico do Rastro</h3>
          <div className="flex items-center gap-2">
            <SeloCausa causa={d.causa} />
            <span className={cn("text-xs font-medium", d.confianca === "alta" ? "text-seguro" : "text-quebra")}>
              {d.confianca === "alta" ? "Confiança alta: as regras explicam" : "Confiança baixa: nenhuma regra explica"}
            </span>
          </div>
        </div>
        <div className="grid gap-5 p-4 md:grid-cols-2">
          <div className="space-y-3">
            <p className="font-medium">{d.titulo}</p>
            <Evidencias evidencias={d.evidencias} />
            <p className="text-xs text-muted-foreground">
              Time que pode evitar esta causa: <NomeDoTime time={d.time_responsavel} className="text-foreground" />
            </p>
          </div>
          <Trilha passos={d.trilha} />
        </div>
      </section>

      {alerta && (
        <p className="rounded-lg border border-quebra/30 bg-quebra/5 px-4 py-3 text-sm">
          Esta venda faz parte de um alerta com {alerta.venda_ids.length} vendas parecidas.{" "}
          <Link href="/tecnologia" className="font-medium text-cobalto underline-offset-4 hover:underline">
            Ver o alerta na tecnologia
          </Link>
        </p>
      )}

      <section>
        <h3 className="mb-3 text-sm font-semibold">Conversa</h3>
        <Conversa mensagens={caso.mensagens} nomeDoCreator={creator.nome} ponto="time" />
      </section>

      {podeAgir ? (
        <form
          className="space-y-2 border-t border-border pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            responder();
          }}
        >
          <label htmlFor="resposta" className="text-sm font-semibold">
            Resposta para {creator.nome.split(" ")[0]}
          </label>
          <p className="text-xs text-muted-foreground">
            Sugerida pelo Rastro a partir do diagnóstico. Revise e ajuste antes de enviar.
          </p>
          <Textarea id="resposta" value={resposta} onChange={(e) => setResposta(e.target.value)} className="min-h-28" />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!resposta.trim()}>
              Enviar resposta
            </Button>
            <Button type="button" variant="outline" onClick={encaminhar}>
              Encaminhar para a tecnologia
            </Button>
          </div>
        </form>
      ) : (
        <p className="border-t border-border pt-4 text-sm text-muted-foreground">
          {caso.status === "explicado" && "O Rastro já explicou e o creator não pediu uma pessoa. Nada a fazer aqui."}
          {caso.status === "com_tecnologia" && "A tecnologia está com o caso. Quando o alerta for resolvido, o creator recebe a resposta."}
          {caso.status === "resolvido" && "Caso resolvido."}
        </p>
      )}
    </article>
  );
}
