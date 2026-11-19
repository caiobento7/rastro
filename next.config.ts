import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Esconde o indicador do Next em desenvolvimento (aparecia nas capturas de tela).
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
