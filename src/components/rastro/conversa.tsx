import { hora, dia } from "@/core/domain/formatar";
import type { MensagemDoCaso } from "@/core/domain/tipos";
import { cn } from "@/lib/utils";
import { Marca } from "./marca";

const AUTOR: Record<MensagemDoCaso["autor"], string> = {
  creator: "Creator",
  rastro: "Rastro",
  atendimento: "Atendimento YouShop",
  tecnologia: "Tecnologia YouShop",
};

/** A conversa do caso, na ordem em que aconteceu. */
export function Conversa({
  mensagens,
  nomeDoCreator,
  ponto = "creator",
  className,
}: {
  mensagens: MensagemDoCaso[];
  nomeDoCreator: string;
  /** De quem é a tela: as mensagens dessa pessoa ficam à direita. */
  ponto?: "creator" | "time";
  className?: string;
}) {
  return (
    <ol className={cn("space-y-3", className)} aria-label="Conversa do caso">
      {mensagens.map((m, i) => {
        const minha = ponto === "creator" ? m.autor === "creator" : m.autor === "atendimento" || m.autor === "tecnologia";
        return (
          <li key={i} className={cn("flex flex-col gap-1", minha ? "items-end" : "items-start")}>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {m.autor === "rastro" ? <Marca comNome={false} className="text-tinta" /> : null}
              <span className="font-medium text-foreground">{m.autor === "creator" ? nomeDoCreator : AUTOR[m.autor]}</span>
              <span>
                {dia(m.em)}, {hora(m.em)}
              </span>
            </p>
            <p
              className={cn(
                "max-w-[62ch] rounded-lg px-3 py-2 text-sm leading-relaxed",
                m.autor === "creator" && "bg-tinta text-white",
                m.autor === "rastro" && "border border-border bg-card",
                (m.autor === "atendimento" || m.autor === "tecnologia") && "bg-accent text-accent-foreground",
              )}
            >
              {m.texto}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
