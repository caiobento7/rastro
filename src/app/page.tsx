import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Marca } from "@/components/rastro/marca";
import { COR_DA_CAUSA } from "@/components/rastro/visual";
import { CAUSAS, TIMES } from "@/core/domain/causas";
import type { Causa } from "@/core/domain/tipos";

const REPOSITORIO = "https://github.com/caiobento7/rastro";

const EXEMPLOS: Record<Exclude<Causa, "venda_contabilizada">, string> = {
  uso_do_link: "A cliente clicou no link, mas fechou a compra pela página do produtor.",
  regra: "Compra feita com dados iguais aos do afiliado, sem comissão por regra.",
  prazo: "Produto físico: a comissão só aparece depois da entrega.",
  conta: "Conta bloqueada meses antes, sem o afiliado saber.",
  configuracao: "O produtor nunca aprovou a afiliação ao produto.",
  possivel_falha: "Tudo certo no caminho, e a venda mesmo assim sumiu.",
};

const CITACOES = [
  { texto: "Agora estou com medo de continuar divulgando produtos", fonte: "Afiliada, Kiwify, 2023" },
  { texto: "Eu costumava faturar cerca de R$1200/mês em comissões… o valor caiu para aproximadamente R$420", fonte: "Afiliada, Mercado Livre, 2026" },
  { texto: "Abro mão da minha comissão mas não perco a minha credibilidade com meus clientes", fonte: "Afiliada, Kiwify, 2024" },
];

const PASSOS = [
  {
    titulo: "Lê o rastro da venda",
    texto: "Clique no link, checkout, pagamento, atribuição, entrega e comissão: eventos que a plataforma já registra.",
  },
  {
    titulo: "As regras decidem",
    texto: "Um motor de regras testado aponta a causa e a prova decisiva. A IA nunca escolhe o motivo.",
  },
  {
    titulo: "A IA explica",
    texto: "Em linguagem simples, com o caminho da venda e o próximo passo. Se os dados não explicam, ela diz que não sabe.",
  },
  {
    titulo: "O time certo recebe",
    texto: "Contestação vai ao atendimento com resposta sugerida. Falhas parecidas viram um alerta para a tecnologia.",
  },
];

const AREAS = [
  { href: "/creator", nome: "Creator", texto: "Pergunte por que a venda de ontem não contou." },
  { href: "/atendimento", nome: "Atendimento", texto: "Responda só o que precisa de uma pessoa, com a prova na tela." },
  { href: "/tecnologia", nome: "Tecnologia", texto: "Resolva o alerta do checkout que perdeu atribuições." },
  { href: "/gestao", nome: "Gestão", texto: "Veja o que o Rastro resolveu e qual time pode evitar cada causa." },
];

function Trilha() {
  const pontos = [
    { rotulo: "Clique no link", hora: "20:01" },
    { rotulo: "Checkout com o código", hora: "20:12" },
    { rotulo: "Pagamento aprovado", hora: "20:14" },
  ];
  return (
    <div className="relative px-1 pt-2 pb-1">
      <div className="relative flex items-start justify-between">
        <span aria-hidden="true" className="desenhar absolute top-[7px] left-[7px] h-0.5 w-[62%] bg-tinta" />
        <span aria-hidden="true" className="rastro-perdido-h absolute top-[7px] right-[7px] left-[66%] h-0.5" />
        {pontos.map((p) => (
          <div key={p.rotulo} className="relative z-10 flex w-1/5 flex-col items-start gap-2">
            <span className="size-4 rounded-full bg-tinta" />
            <span className="text-xs leading-tight font-medium">{p.rotulo}</span>
            <span className="text-[11px] text-muted-foreground">{p.hora}</span>
          </div>
        ))}
        <div className="relative z-10 flex w-1/5 flex-col items-start gap-2">
          <span className="size-4 rounded-full border-2 border-dashed border-quebra bg-card" />
          <span className="text-xs leading-tight font-semibold text-quebra">Atribuição</span>
          <span className="text-[11px] text-quebra">não registrada</span>
        </div>
        <div className="relative z-10 flex w-[12%] flex-col items-end gap-2 text-right">
          <span className="size-4 rounded-full border-2 border-linha bg-card" />
          <span className="text-xs leading-tight text-muted-foreground">Comissão</span>
        </div>
      </div>
    </div>
  );
}

export default function Inicio() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Marca className="text-tinta" />
          <nav aria-label="Seções" className="hidden gap-6 text-sm text-muted-foreground md:flex">
            <a href="#problema" className="hover:text-foreground">
              O problema
            </a>
            <a href="#solucao" className="hover:text-foreground">
              A solução
            </a>
            <a href="#times" className="hover:text-foreground">
              Os times
            </a>
            <a href="#limites" className="hover:text-foreground">
              Limites
            </a>
          </nav>
          <Link href="/creator" className={buttonVariants({ size: "sm" })}>
            Abrir a demonstração
          </Link>
        </div>
      </header>

      <main id="conteudo">
        {/* Abertura */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:pt-20">
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">Desafio de Inovação YouShop 2027, uma proposta de Caio Bento</p>
            <h1 className="text-5xl leading-[1.02] font-bold sm:text-6xl lg:text-7xl">Toda venda deixa um rastro.</h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              Quando um creator diz &ldquo;minha venda não contou&rdquo;, o Rastro lê o caminho da venda, mostra a prova e
              explica em minutos. O que os dados não explicam vai para uma pessoa, e cada causa chega ao time que pode
              evitá-la.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/creator" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5 text-base")}>
                Ver funcionando
              </Link>
              <a href="#problema" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-5 text-base")}>
                Entender o problema
              </a>
            </div>
          </div>

          <figure className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-[0_1px_0_var(--linha),0_24px_48px_-28px_rgb(23_32_51/0.35)]">
            <figcaption className="flex items-baseline justify-between text-sm">
              <span className="font-semibold">Kit Whey Protein 900g</span>
              <span className="text-muted-foreground">venda de 16/11</span>
            </figcaption>
            <Trilha />
            <div className="space-y-3 border-t border-border pt-5">
              <p className="ml-auto w-fit max-w-[85%] rounded-lg bg-tinta px-3 py-2 text-sm text-white">
                Minha venda de ontem não contou.
              </p>
              <div className="max-w-[92%] space-y-1 rounded-lg border border-border px-3 py-2 text-sm leading-relaxed">
                <Marca comNome={false} className="text-tinta" />
                <p>
                  O pagamento foi aprovado com o seu código, mas{" "}
                  <span className="grifo font-medium">a atribuição nunca foi registrada</span>. Nenhuma regra explica isso.
                  O caso já está com a tecnologia, junto com 5 vendas parecidas.
                </p>
              </div>
            </div>
          </figure>
        </section>

        {/* Problema */}
        <section id="problema" className="border-y border-border bg-card">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold sm:text-4xl">Uma frase, seis causas diferentes.</h2>
              <p className="max-w-2xl leading-relaxed text-muted-foreground">
                Li uma por uma 12 reclamações públicas de afiliados no Reclame Aqui, em seis plataformas: Kiwify, Hotmart,
                Eduzz, Braip, Shopee e Mercado Livre. A queixa era quase sempre a mesma. A causa, não. E a primeira resposta
                levou de 2 a 45 dias. Nenhuma delas é contra a YouShop: é um problema do mercado de afiliados.
              </p>
              <ul className="divide-y divide-border border-y border-border">
                {(Object.keys(EXEMPLOS) as (keyof typeof EXEMPLOS)[]).map((c) => (
                  <li key={c} className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="size-2.5 rounded-full" style={{ background: COR_DA_CAUSA[c] }} aria-hidden="true" />
                      {CAUSAS[c].nome}
                    </span>
                    <span className="text-muted-foreground">{EXEMPLOS[c]}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-8 lg:pt-16">
              {CITACOES.map((c) => (
                <blockquote key={c.fonte} className="space-y-2 border-l-2 border-quebra pl-5">
                  <p className="text-xl leading-snug font-medium">&ldquo;{c.texto}&rdquo;</p>
                  <footer className="text-sm text-muted-foreground">{c.fonte}</footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        {/* Quem sente */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="max-w-2xl text-3xl font-bold sm:text-4xl">Quem perde quando ninguém explica.</h2>
          <div className="mt-10 grid gap-10 md:grid-cols-3">
            {[
              ["O creator", "Não sabe se errou, se foi uma regra ou se a plataforma falhou. Desconfia e para de divulgar, e é ele quem gera as vendas."],
              ["O atendimento", "Recebe chamados iguais com causas diferentes e investiga um por um, abrindo vários sistemas."],
              ["A tecnologia", "É interrompida caso a caso, e uma falha real se esconde no meio de dezenas de dúvidas."],
            ].map(([quem, texto]) => (
              <div key={quem} className="space-y-2 border-t-2 border-tinta pt-4">
                <h3 className="text-lg font-semibold">{quem}</h3>
                <p className="leading-relaxed text-muted-foreground">{texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Solução */}
        <section id="solucao" className="bg-tinta text-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="max-w-2xl space-y-4">
              <h2 className="text-3xl font-bold sm:text-4xl">As regras decidem. A IA explica.</h2>
              <p className="leading-relaxed text-white/75">
                Um chatbot de perguntas frequentes responde o que está escrito no manual. O Rastro responde com a prova da
                própria venda, e usa as perguntas dos creators para encontrar falhas antes da reclamação pública.
              </p>
            </div>
            <ol className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {PASSOS.map((p, i) => (
                <li key={p.titulo} className="space-y-3">
                  <span className="flex size-9 items-center justify-center rounded-full border border-white/30 font-semibold tabular-nums">
                    {i + 1}
                  </span>
                  <h3 className="text-lg font-semibold">{p.titulo}</h3>
                  <p className="text-sm leading-relaxed text-white/75">{p.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Times */}
        <section id="times" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-3xl font-bold sm:text-4xl">Cada causa tem um time que pode evitá-la.</h2>
            <p className="leading-relaxed text-muted-foreground">
              O Rastro não para na resposta ao creator. Cada pergunta registrada vira um sinal para o time que consegue
              cortar a causa pela raiz.
            </p>
          </div>
          <div className="mt-8 overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-border text-sm text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Quando a causa é</th>
                  <th className="px-5 py-3 font-medium">Quem recebe</th>
                  <th className="px-5 py-3 font-medium">O que pode mudar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(Object.keys(EXEMPLOS) as (keyof typeof EXEMPLOS)[]).map((c) => (
                  <tr key={c}>
                    <td className="px-5 py-3.5 font-medium">{CAUSAS[c].nome}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">{TIMES[CAUSAS[c].time].nome}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{CAUSAS[c].prevencao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Métricas e limites */}
        <section className="border-y border-border bg-card">
          <div className="mx-auto grid max-w-6xl gap-14 px-4 py-16 sm:px-6 lg:grid-cols-2">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">Como saber se funcionou.</h2>
              <dl className="space-y-5">
                {[
                  ["Tempo até a explicação", "Nas reclamações, de 2 a 45 dias. A meta é minutos."],
                  ["Perguntas resolvidas sem atendente", "Percentual de casos encerrados pelo Rastro, sem ninguém precisar agir."],
                  ["Creators que seguem divulgando", "Quem contestou uma venda e fez nova venda depois. É o número da confiança."],
                  ["Tempo para descobrir uma falha", "Hoje aparece na queixa pública. A meta é horas, com o alerta de casos parecidos."],
                ].map(([t, d]) => (
                  <div key={t}>
                    <dt className="font-semibold">{t}</dt>
                    <dd className="text-muted-foreground">{d}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-sm text-muted-foreground">Para medir: um piloto de 30 dias com um grupo de creators, comparando com a fila atual.</p>
            </div>
            <div id="limites" className="space-y-6">
              <h2 className="text-3xl font-bold">Limites e cuidados.</h2>
              <dl className="space-y-5">
                {[
                  ["Privacidade", "O creator nunca vê dados do comprador. O Rastro diz só se os dados coincidem com os dele."],
                  ["Antifraude protegido", "Explica a regra sem revelar quais sinais a plataforma usa para detectar fraude."],
                  ["Quando a IA erra", "Confiança baixa e contestações vão para uma pessoa. A IA não inventa motivo."],
                  ["LGPD", "Usa só os dados necessários para o diagnóstico e registra o que foi consultado."],
                ].map(([t, d]) => (
                  <div key={t}>
                    <dt className="font-semibold">{t}</dt>
                    <dd className="text-muted-foreground">{d}</dd>
                  </div>
                ))}
              </dl>
              <p className="rounded-lg bg-muted px-4 py-3 text-sm">
                O limite principal: o Rastro só explica o que a plataforma registra. Se um evento não foi gravado, ele não
                adivinha, e escala para uma pessoa.
              </p>
            </div>
          </div>
        </section>

        {/* Demonstração */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-bold sm:text-4xl">Veja dos quatro lados.</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            A demonstração usa um mês de vendas fictícias. O que você faz em uma área aparece nas outras: a pergunta da
            creator chega ao alerta da tecnologia, e a correção volta para ela.
          </p>
          <ul className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {AREAS.map((a) => (
              <li key={a.href} className="bg-card">
                <Link href={a.href} className="group block h-full space-y-2 p-5 hover:bg-accent/50">
                  <span className="text-lg font-semibold group-hover:underline group-hover:underline-offset-4">{a.nome}</span>
                  <span className="block text-sm text-muted-foreground">{a.texto}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <p>
            Feito por Caio Bento para o Desafio de Inovação YouShop 2027. Dados fictícios. Reclamações lidas no Reclame Aqui em
            17/11/2026.
          </p>
          <div className="flex gap-4">
            <a href={REPOSITORIO} className="hover:text-foreground">
              Código no GitHub
            </a>
            <a href="https://www.linkedin.com/in/caiobentoo" className="hover:text-foreground">
              LinkedIn
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
