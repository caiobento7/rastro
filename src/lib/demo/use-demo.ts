"use client";

import { useMemo, useSyncExternalStore } from "react";
import { assinar, montarRastro, obterEstado, obterEstadoDoServidor } from "./estado";

/** Lê o estado da demonstração e devolve um Rastro pronto para consultas. */
export function useDemo() {
  const estado = useSyncExternalStore(assinar, obterEstado, obterEstadoDoServidor);
  const { rastro } = useMemo(() => montarRastro(estado), [estado]);
  return { estado, rastro, agora: rastro.agora() };
}
