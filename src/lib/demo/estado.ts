/**
 * Estado da demonstração no navegador.
 *
 * O catálogo de vendas é fixo e igual para todos. O que muda (casos, contestações,
 * respostas, estado dos alertas) fica no navegador de quem testa, em localStorage.
 * Assim a demo funciona na Vercel sem banco e cada pessoa vê o resultado das próprias ações.
 * Ver docs/adr/0003-estado-da-demo-no-navegador.md.
 */
import { Rastro } from "@/core/application/rastro";
import type { Relogio } from "@/core/application/portas";
import { somarMinutos } from "@/core/domain/formatar";
import type { Caso, StatusAlerta } from "@/core/domain/tipos";
import { CasosEmMemoria, EstadoDeAlertasEmMemoria } from "@/adapters/memoria";
import { catalogoDaDemo, CREATOR_PRINCIPAL, estadoInicialDaDemo, HOJE } from "@/adapters/demo";

const CHAVE = "rastro-demo-v1";

export interface EstadoDaDemo {
  versao: 1;
  /** Quando a pessoa abriu a demo. O relógio da demo anda a partir de HOJE. */
  inicio: number;
  casos: Caso[];
  alertas: Record<string, StatusAlerta>;
  creatorAtual: string;
  /** Áreas que a pessoa já abriu, para o roteiro marcar os passos de leitura. */
  vistos: string[];
}

let inicial: EstadoDaDemo | null = null;

/** Estado de fábrica. Determinístico, então o servidor e o navegador renderizam igual. */
export function estadoDeFabrica(): EstadoDaDemo {
  if (!inicial) {
    const { casos, alertas } = estadoInicialDaDemo();
    inicial = { versao: 1, inicio: 0, casos, alertas, creatorAtual: CREATOR_PRINCIPAL, vistos: [] };
  }
  return inicial;
}

class RelogioDaDemo implements Relogio {
  constructor(private readonly inicio: number) {}
  agora() {
    if (!this.inicio) return HOJE;
    const minutos = Math.max(0, Math.floor((Date.now() - this.inicio) / 60000));
    return somarMinutos(HOJE, minutos);
  }
}

export interface RastroDaDemo {
  rastro: Rastro;
  casos: CasosEmMemoria;
  alertas: EstadoDeAlertasEmMemoria;
}

export function montarRastro(estado: EstadoDaDemo): RastroDaDemo {
  const casos = new CasosEmMemoria(estado.casos);
  const alertas = new EstadoDeAlertasEmMemoria(estado.alertas);
  return { rastro: new Rastro(catalogoDaDemo(), casos, alertas, new RelogioDaDemo(estado.inicio)), casos, alertas };
}

// ---- Armazenamento com assinatura (para useSyncExternalStore) ----

let atual: EstadoDaDemo | null = null;
const ouvintes = new Set<() => void>();

function ler(): EstadoDaDemo {
  if (typeof window === "undefined") return estadoDeFabrica();
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (bruto) {
      const salvo = JSON.parse(bruto) as EstadoDaDemo;
      if (salvo.versao === 1 && Array.isArray(salvo.casos)) return { ...salvo, vistos: salvo.vistos ?? [] };
    }
  } catch {
    // Navegação privada ou armazenamento bloqueado: segue com o estado de fábrica.
  }
  return { ...estadoDeFabrica(), inicio: Date.now() };
}

export function obterEstado(): EstadoDaDemo {
  if (!atual) atual = ler();
  return atual;
}

export function obterEstadoDoServidor(): EstadoDaDemo {
  return estadoDeFabrica();
}

export function assinar(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  const aoMudarEmOutraAba = (e: StorageEvent) => {
    if (e.key === CHAVE) {
      atual = ler();
      ouvinte();
    }
  };
  window.addEventListener("storage", aoMudarEmOutraAba);
  return () => {
    ouvintes.delete(ouvinte);
    window.removeEventListener("storage", aoMudarEmOutraAba);
  };
}

export function definirEstado(novo: EstadoDaDemo) {
  atual = novo;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(novo));
  } catch {
    // Sem armazenamento, a demo continua funcionando só nesta aba.
  }
  for (const o of ouvintes) o();
}

/** Roda uma ação do núcleo sobre o estado atual e salva o resultado. */
export function executar<T>(acao: (r: Rastro) => T): T {
  const estado = obterEstado();
  const montado = montarRastro(estado);
  const resultado = acao(montado.rastro);
  definirEstado({ ...estado, casos: montado.casos.todos(), alertas: montado.alertas.comoObjeto() });
  return resultado;
}

export function reiniciarDemo() {
  definirEstado({ ...estadoDeFabrica(), inicio: Date.now() });
}

export function trocarCreator(id: string) {
  definirEstado({ ...obterEstado(), creatorAtual: id });
}

/** Registra que a pessoa abriu uma área (usado pelo roteiro da demonstração). */
export function marcarVisto(area: string) {
  const estado = obterEstado();
  if (!estado.vistos.includes(area)) definirEstado({ ...estado, vistos: [...estado.vistos, area] });
}
