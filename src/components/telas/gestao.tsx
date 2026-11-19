"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { COR_DA_CAUSA, SeloCausa } from "@/components/rastro/visual";
import { MINIMO_PARA_ALERTA } from "@/core/domain/alertas";
import { CAUSAS, ORDEM_DAS_CAUSAS } from "@/core/domain/causas";
import { dia, duracao, minutosEntre } from "@/core/domain/formatar";
import { useDemo } from "@/lib/demo/use-demo";

const configDoGrafico = Object.fromEntries(
  ORDEM_DAS_CAUSAS.map((c) => [c, { label: CAUSAS[c].nome, color: COR_DA_CAUSA[c] }]),
) satisfies ChartConfig;

export function TelaGestao() {
  const { rastro } = useDemo();
  const painel = rastro.painel();
  const { numeros, continuaram } = painel;
  const alerta = painel.alertas[0];

  let deteccao: number | null = null;
  if (alerta) {
    const perguntas = rastro
      .filaDoAtendimento()
      .filter((c) => alerta.venda_ids.includes(c.venda_id))
      .map((c) => c.aberto_em)
      .sort();
    const abertura = perguntas[MINIMO_PARA_ALERTA - 1];
    if (abertura) deteccao = minutosEntre(alerta.primeira_em, abertura);
  }

  const dados = painel.por_dia.map((d) => ({ ...d, rotulo: dia(`${d.dia}T12:00:00-03:00`) }));
  const causasNoGrafico = ORDEM_DAS_CAUSAS.filter((c) => dados.some((d) => (d[c] ?? 0) > 0));

  return (
    <div className="space-y-8">
      <section className="max-w-3xl space-y-1">
        <h1 className="text-2xl font-semibold">Gestão</h1>
        <p className="text-muted-foreground">
          O que o Rastro resolveu sozinho no último mês e onde cada time pode agir para os mesmos chamados não voltarem.
        </p>
      </section>

      <dl className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          rotulo="Tempo até a explicação"
          valor={numeros.mediana_minutos_ate_explicacao < 1 ? "menos de 1 min" : duracao(numeros.mediana_minutos_ate_explicacao)}
          contexto="Nas 12 reclamações públicas que analisei, a primeira resposta levou de 2 a 45 dias."
        />
        <Indicador
          rotulo="Explicados sem atendente"
          valor={`${numeros.percentual_sem_atendente}%`}
          contexto={`${numeros.explicados_sem_atendente} de ${numeros.total} perguntas no mês, sem ninguém do atendimento precisar agir.`}
        />
        <Indicador
          rotulo="Creators que seguiram vendendo"
          valor={continuaram.elegiveis ? `${continuaram.percentual}%` : "sem dados"}
          contexto={`Dos ${continuaram.elegiveis} creators que perguntaram há mais de 7 dias, quantos fizeram uma nova venda depois.`}
        />
        <Indicador
          rotulo="Falha encontrada em"
          valor={deteccao !== null ? duracao(deteccao) : "nenhuma falha"}
          contexto="Do primeiro erro no checkout ao alerta para a tecnologia, sem depender de reclamação pública."
        />
      </dl>

      <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="titulo-grafico">
        <h2 id="titulo-grafico" className="font-semibold">
          Perguntas ao Rastro por dia
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">Últimos 14 dias, separadas pela causa que o motor de regras encontrou.</p>
        <ChartContainer config={configDoGrafico} className="h-64 w-full">
          <BarChart data={dados} margin={{ left: -20, right: 4, top: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {causasNoGrafico.map((c, i) => (
              <Bar
                key={c}
                dataKey={c}
                stackId="causas"
                fill={`var(--color-${c})`}
                radius={i === causasNoGrafico.length - 1 ? [3, 3, 0, 0] : 0}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </section>

      <section className="space-y-3" aria-labelledby="titulo-times">
        <div className="max-w-3xl">
          <h2 id="titulo-times" className="text-lg font-semibold">
            Cada causa tem um time que pode evitá-la
          </h2>
          <p className="text-sm text-muted-foreground">
            Uma pergunta de creator vira uma melhoria para quem pode resolver a raiz: conteúdo, produto, operações, produtor ou
            tecnologia.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Causa</th>
                <th className="px-4 py-3 font-medium">Perguntas no mês</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">O que pode evitar</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {painel.prevencao.map((p) => (
                <tr key={p.causa}>
                  <td className="px-4 py-3">
                    <SeloCausa causa={p.causa} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-right font-semibold tabular-nums">{p.casos}</span>
                      <span className="h-1.5 w-24 rounded-full bg-muted" aria-hidden="true">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${Math.max(4, p.percentual)}%`, background: COR_DA_CAUSA[p.causa] }}
                        />
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">{p.percentual}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{p.time.nome}</td>
                  <td className="max-w-sm px-4 py-3 text-muted-foreground">{p.prevencao}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={p.casos === 0}
                      onClick={() =>
                        toast.success(`Sugestão enviada para ${p.time.nome}`, {
                          description: `${p.casos} perguntas sobre "${p.nome.toLowerCase()}" no mês, com os exemplos anexados.`,
                        })
                      }
                    >
                      Enviar sugestão
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Como medir de verdade: um piloto de 30 dias com um grupo de creators, comparando estes números com a fila atual do
          atendimento.
        </p>
      </section>
    </div>
  );
}

function Indicador({ rotulo, valor, contexto }: { rotulo: string; valor: string; contexto: string }) {
  return (
    <div className="space-y-1 bg-card px-5 py-4">
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="text-3xl font-semibold tracking-tight tabular-nums">{valor}</dd>
      <dd className="text-xs leading-relaxed text-muted-foreground">{contexto}</dd>
    </div>
  );
}
