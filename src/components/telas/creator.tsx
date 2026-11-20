"use client";

import { useState } from "react";
import { ArrowUpRight, Loader2, MessageCircleQuestion, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Conversa } from "@/components/rastro/conversa";
import { Trilha } from "@/components/rastro/trilha";
import { Evidencias, Iniciais, NomeDoTime, SeloCausa, Situacao, StatusDoCaso } from "@/components/rastro/visual";
import type { Rastro } from "@/core/application/rastro";
import type { RespostaDoExplicador } from "@/core/application/portas";
import { dataHora, dia, dinheiro } from "@/core/domain/formatar";
import type { ResumoVenda } from "@/core/domain/tipos";
import { executar, trocarCreator } from "@/lib/demo/estado";
import { useDemo } from "@/lib/demo/use-demo";
import { cn } from "@/lib/utils";

type Filtro = "todas" | "nao_contou" | "pendentes";

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: "todas", rotulo: "Todas" },
  { id: "nao_contou", rotulo: "Não contaram" },
  { id: "pendentes", rotulo: "Pendentes" },
];

function filtrar(vendas: ResumoVenda[], filtro: Filtro) {
  if (filtro === "nao_contou") return vendas.filter((v) => v.situacao === "nao_contou" || v.situacao === "sem_comissao");
  if (filtro === "pendentes") return vendas.filter((v) => v.situacao === "comissao_pendente");
  return vendas;
}

/** @param comIA true quando o servidor tem chave da API e a pergunta livre passa pelo Claude. */
export function TelaCreator({ comIA = false }: { comIA?: boolean }) {
  const { estado, rastro } = useDemo();
  const creator = rastro.creator(estado.creatorAtual);
  const vendas = rastro.vendasDoCreator(creator.id);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [escolhida, setEscolhida] = useState<string | null>(null);

  const visiveis = filtrar(vendas, filtro);
  const vendaId =
    escolhida && vendas.some((v) => v.venda_id === escolhida)
      ? escolhida
      : (vendas.find((v) => v.situacao === "nao_contou") ?? vendas[0])?.venda_id;
  const venda = vendas.find((v) => v.venda_id === vendaId);

  const liberado = vendas.filter((v) => v.situacao === "contou").reduce((s, v) => s + (v.comissao ?? 0), 0);
  const naoContaram = vendas.filter((v) => v.situacao === "nao_contou").length;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <Iniciais nome={creator.nome} className="size-11 text-sm" />
          <div>
            <h1 className="text-2xl font-semibold">{creator.nome}</h1>
            <p className="text-sm text-muted-foreground">
              {creator.usuario}, {creator.nicho.toLowerCase()}
            </p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Ver a demonstração como
          <select
            value={creator.id}
            onChange={(e) => {
              trocarCreator(e.target.value);
              setEscolhida(null);
            }}
            className="h-8 rounded-md border border-input bg-card px-2 text-sm text-foreground"
          >
            {rastro.creators().map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
      </section>

      <dl className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-card">
        <div className="px-4 py-3">
          <dt className="text-xs text-muted-foreground">Vendas no último mês</dt>
          <dd className="text-xl font-semibold">{vendas.length}</dd>
        </div>
        <div className="px-4 py-3">
          <dt className="text-xs text-muted-foreground">Comissões liberadas</dt>
          <dd className="text-xl font-semibold">{dinheiro(liberado)}</dd>
        </div>
        <div className="px-4 py-3">
          <dt className="text-xs text-muted-foreground">Não contaram</dt>
          <dd className={cn("text-xl font-semibold", naoContaram > 0 && "text-quebra")}>{naoContaram}</dd>
        </div>
      </dl>

      <PerguntaLivre creatorId={creator.id} aoEscolher={setEscolhida} comIA={comIA} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section aria-labelledby="titulo-vendas" className="self-start rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 id="titulo-vendas" className="font-semibold">
              Suas vendas
            </h2>
            <div role="group" aria-label="Filtrar vendas" className="flex gap-1">
              {FILTROS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filtro === f.id}
                  onClick={() => setFiltro(f.id)}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-medium",
                    filtro === f.id ? "bg-tinta text-white" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {f.rotulo}
                </button>
              ))}
            </div>
          </div>
          <ul className="max-h-[560px] divide-y divide-border overflow-y-auto">
            {visiveis.map((v) => (
              <li key={v.venda_id}>
                <button
                  type="button"
                  onClick={() => setEscolhida(v.venda_id)}
                  aria-current={v.venda_id === vendaId ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 border-l-[3px] px-4 py-3 text-left transition-colors hover:bg-muted/60",
                    v.venda_id === vendaId ? "border-l-cobalto bg-accent/60" : "border-l-transparent",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{v.produto}</span>
                    <span className="block text-xs text-muted-foreground">
                      {dataHora(v.data_hora)}, {dinheiro(v.valor)}
                    </span>
                  </span>
                  <Situacao situacao={v.situacao} />
                </button>
              </li>
            ))}
            {visiveis.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma venda neste filtro.</li>
            )}
          </ul>
        </section>

        {venda ? <DetalheDaVenda key={venda.venda_id} venda={venda} creatorId={creator.id} rastro={rastro} /> : null}
      </div>
    </div>
  );
}

function PerguntaLivre({
  creatorId,
  aoEscolher,
  comIA,
}: {
  creatorId: string;
  aoEscolher: (id: string) => void;
  comIA: boolean;
}) {
  const [pergunta, setPergunta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const exemplos = ["Minha venda de ontem não contou", "Cadê a comissão da creatina?", "Por que o treino do dia 15 não entrou?"];

  async function enviar(texto: string) {
    if (texto.trim().length < 2) return;
    setEnviando(true);
    try {
      const r = await fetch("/api/perguntar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId, pergunta: texto }),
      });
      const dados = (await r.json()) as RespostaDoExplicador & { erro?: string };
      if (!r.ok || dados.erro) throw new Error(dados.erro ?? "Não deu para responder agora.");
      if (!dados.venda_id) {
        toast.info(dados.resposta);
        return;
      }
      const resultado = executar((rastro) =>
        rastro.perguntar(creatorId, dados.venda_id!, texto, dados.modo === "ia" ? dados.resposta : undefined),
      );
      aoEscolher(dados.venda_id);
      setPergunta("");
      if (resultado.repetida) toast.info(`Você já tinha perguntado sobre esta venda. Protocolo ${resultado.caso.protocolo}.`);
      if (dados.aviso) toast.warning(dados.aviso);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não deu para responder agora.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void enviar(pergunta);
      }}
      className="rounded-xl border border-tinta/15 bg-tinta p-4 text-white sm:p-5"
    >
      <label htmlFor="pergunta" className="flex items-center gap-2 font-semibold">
        <MessageCircleQuestion className="size-5" aria-hidden="true" />
        Pergunte ao Rastro do seu jeito
      </label>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id="pergunta"
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          maxLength={500}
          placeholder="Ex.: minha venda de ontem não contou"
          className="h-10 flex-1 rounded-md border border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-white/55 focus-visible:outline-grifo"
        />
        <Button type="submit" disabled={enviando || pergunta.trim().length < 2} className="h-10 bg-grifo px-4 text-tinta hover:bg-grifo/90">
          {enviando ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Send data-icon="inline-start" />}
          Perguntar
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/70">
        <span>Ou tente:</span>
        {exemplos.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={enviando}
            onClick={() => void enviar(ex)}
            className="rounded-full border border-white/25 px-2.5 py-1 text-white/90 hover:bg-white/10"
          >
            {ex}
          </button>
        ))}
      </div>
      <p className="mt-3 border-t border-white/15 pt-3 text-xs leading-relaxed text-white/70">
        {comIA
          ? "O Claude entende a sua pergunta e reescreve a explicação. A causa sempre vem do motor de regras."
          : "Nesta demonstração, as respostas vêm só do motor de regras, sem IA generativa e sem custo de API. Com a chave da API, o Claude entende a pergunta livre e reescreve a explicação; a causa continua vindo das regras."}
      </p>
    </form>
  );
}

function DetalheDaVenda({ venda, creatorId, rastro }: { venda: ResumoVenda; creatorId: string; rastro: Rastro }) {
  const caso = rastro.casosDoCreator(creatorId).find((c) => c.venda_id === venda.venda_id);
  const diagnostico = rastro.diagnosticarVenda(venda.venda_id, creatorId);
  const [contestando, setContestando] = useState(false);
  const [relato, setRelato] = useState("");
  if (!diagnostico) return null;

  const perguntaPadrao =
    venda.situacao === "nao_contou" || venda.situacao === "sem_comissao"
      ? "Por que esta venda não contou?"
      : venda.situacao === "comissao_pendente"
        ? "Quando a comissão desta venda libera?"
        : "Entender esta venda";

  function perguntar() {
    const texto = perguntaPadrao.endsWith("?") ? perguntaPadrao : "Pode me explicar o que aconteceu com esta venda?";
    const r = executar((x) => x.perguntar(creatorId, venda.venda_id, texto));
    if (r.caso.status === "com_tecnologia") {
      toast.warning(`Os dados não explicam esta venda. Caso ${r.caso.protocolo} enviado para a tecnologia.`);
    }
  }

  function contestar() {
    const caso2 = executar((x) => x.contestar(caso!.protocolo, relato));
    setContestando(false);
    setRelato("");
    toast.success(`Pronto. Uma pessoa do atendimento vai olhar o caso ${caso2.protocolo}.`);
  }

  const alerta = caso ? rastro.alertaDoCaso(caso) : null;

  return (
    <section aria-labelledby="titulo-venda" className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 id="titulo-venda" className="text-lg font-semibold">
            {venda.produto}
          </h2>
          <p className="text-sm text-muted-foreground">
            {dataHora(venda.data_hora)}, {dinheiro(venda.valor)}
            {venda.comissao ? `, comissão de ${dinheiro(venda.comissao)}` : ""}
          </p>
        </div>
        <Situacao situacao={venda.situacao} />
      </div>

      {!caso ? (
        <div className="space-y-4 px-5 py-8">
          <p className="max-w-prose text-sm text-muted-foreground">
            O Rastro lê o caminho desta venda, do clique no seu link até a comissão, e explica o que aconteceu. Leva poucos
            segundos e não precisa de print.
          </p>
          <Button size="lg" onClick={perguntar} className="h-10 px-4">
            {perguntaPadrao}
          </Button>
        </div>
      ) : (
        <div className="acender space-y-6 px-5 py-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <SeloCausa causa={diagnostico.causa} />
              <StatusDoCaso status={caso.status} />
              <span className="text-xs text-muted-foreground">Protocolo {caso.protocolo}</span>
            </div>
            <h3 className="text-xl font-semibold">{diagnostico.titulo}</h3>
            <p className="max-w-prose leading-relaxed">{diagnostico.explicacao}</p>
          </div>

          {alerta && caso.status !== "resolvido" && (
            <p className="rounded-lg border border-quebra/30 bg-quebra/5 px-4 py-3 text-sm">
              Não é só com você: outras {alerta.venda_ids.length - 1} vendas parecidas ficaram sem atribuição desde{" "}
              {dataHora(alerta.primeira_em)}. O time de tecnologia já recebeu um alerta com todas elas.
            </p>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="mb-2 text-sm font-semibold">As provas</h4>
              <Evidencias evidencias={diagnostico.evidencias} />
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold">O caminho da venda</h4>
              <Trilha passos={diagnostico.trilha} />
            </div>
          </div>

          <div className="rounded-lg bg-muted px-4 py-3">
            <p className="text-sm font-semibold">Próximo passo</p>
            <p className="text-sm leading-relaxed">{diagnostico.proximo_passo}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Este tipo de caso é evitado pelo time de <NomeDoTime time={diagnostico.time_responsavel} className="text-foreground" />
              . O Rastro já registrou a sua pergunta para eles.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Conversa</h4>
            <Conversa mensagens={caso.mensagens} nomeDoCreator={rastro.creator(creatorId).nome} />
          </div>

          {caso.status === "explicado" && !contestando && (
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">A explicação não bate com o que você viu?</p>
              <Button variant="outline" onClick={() => setContestando(true)}>
                Não concordo, quero falar com uma pessoa
              </Button>
            </div>
          )}

          {contestando && (
            <form
              className="space-y-2 border-t border-border pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                contestar();
              }}
            >
              <label htmlFor="relato" className="text-sm font-semibold">
                Conte o que você viu
              </label>
              <Textarea
                id="relato"
                value={relato}
                onChange={(e) => setRelato(e.target.value)}
                placeholder="Ex.: a cliente me mandou print dizendo que comprou pelo meu link."
                maxLength={500}
              />
              <div className="flex gap-2">
                <Button type="submit">Enviar para o atendimento</Button>
                <Button type="button" variant="ghost" onClick={() => setContestando(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          {caso.status === "aguardando_atendimento" && (
            <p className="text-sm text-muted-foreground">
              Uma pessoa do atendimento já recebeu o caso com o diagnóstico completo. A resposta aparece aqui.
            </p>
          )}
        </div>
      )}
      {caso?.status === "resolvido" && caso.resolvido_em && (
        <p className="flex items-center gap-1.5 border-t border-border px-5 py-3 text-xs text-muted-foreground">
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
          Caso encerrado em {dia(caso.resolvido_em)}.
        </p>
      )}
    </section>
  );
}
