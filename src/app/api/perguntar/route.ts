/**
 * POST /api/perguntar
 * Recebe uma pergunta em texto livre e devolve a venda identificada e a explicação.
 * Com ANTHROPIC_API_KEY, usa o Claude com ferramentas. Sem chave, ou se a API falhar,
 * usa só as regras. Nos dois casos, a causa vem do motor de regras.
 * Cada origem pode fazer até 10 perguntas por minuto (ver docs/adr/0006-limite-de-uso-da-ia.md).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { Rastro } from "@/core/application/rastro";
import { CasosEmMemoria, EstadoDeAlertasEmMemoria, RelogioAjustavel } from "@/adapters/memoria";
import { catalogoDaDemo, HOJE } from "@/adapters/demo";
import { ExplicadorComClaude } from "@/adapters/ia/claude";
import { ExplicadorDeRegras } from "@/adapters/ia/regras";
import { limiteDaRotaDeIA, origemDoPedido } from "@/adapters/limite";

const Corpo = z.object({
  creatorId: z.string().min(1).max(40),
  pergunta: z.string().trim().min(2, "Escreva a pergunta.").max(500, "Use no máximo 500 caracteres."),
});

export async function POST(req: Request) {
  if (!limiteDaRotaDeIA.permitir(origemDoPedido(req))) {
    return NextResponse.json(
      { erro: "Muitas perguntas em pouco tempo. Espere um minuto e tente de novo." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição não é um JSON válido." }, { status: 400 });
  }
  const dados = Corpo.safeParse(corpo);
  if (!dados.success) {
    return NextResponse.json({ erro: dados.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const rastro = new Rastro(catalogoDaDemo(), new CasosEmMemoria(), new EstadoDeAlertasEmMemoria(), new RelogioAjustavel(HOJE));
  const { creatorId, pergunta } = dados.data;
  if (!rastro.creators().some((c) => c.id === creatorId)) {
    return NextResponse.json({ erro: "Creator não encontrado." }, { status: 404 });
  }

  const regras = new ExplicadorDeRegras(rastro);
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(await regras.explicar(creatorId, pergunta));
  }
  try {
    return NextResponse.json(await new ExplicadorComClaude(rastro).explicar(creatorId, pergunta));
  } catch {
    return NextResponse.json(await regras.explicar(creatorId, pergunta, "A IA não respondeu. Esta explicação veio direto das regras."));
  }
}
