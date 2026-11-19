/**
 * Regras de arquitetura, checadas no CI com `npm run arquitetura`.
 * Ver docs/adr/0002-arquitetura-hexagonal.md.
 *
 * core/domain       -> não depende de nada fora dele
 * core/application  -> só depende do domínio
 * adapters          -> dependem do núcleo, nunca das telas
 * app e components  -> usam o núcleo e os adaptadores
 */
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "dominio-puro",
      severity: "error",
      comment: "O domínio é TypeScript puro: não importa aplicação, adaptadores, telas nem pacotes externos.",
      from: { path: "^src/core/domain" },
      to: { pathNot: "^src/core/domain" },
    },
    {
      name: "aplicacao-so-usa-dominio",
      severity: "error",
      comment: "Os casos de uso falam com o mundo só pelas portas.",
      from: { path: "^src/core/application" },
      to: { pathNot: "^src/core/(application|domain)" },
    },
    {
      name: "adaptadores-nao-conhecem-telas",
      severity: "error",
      comment: "Adaptadores implementam portas; não importam React, páginas ou componentes.",
      from: { path: "^src/adapters" },
      to: { path: "^src/(app|components|lib/demo)|^node_modules/(react|next)/" },
    },
    {
      name: "telas-nao-chamam-a-ia-direto",
      severity: "error",
      comment: "A IA só entra pela rota /api/perguntar. Componentes de tela não importam o SDK nem o adaptador de IA.",
      from: { path: "^src/components" },
      to: { path: "^src/adapters/ia|@anthropic-ai" },
    },
    {
      name: "sem-ciclos",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    exclude: { path: "\\.next|mcp/dist" },
  },
};
