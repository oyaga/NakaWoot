import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Configurar output para servir via Go backend
  output: 'export',
  // Diretório de saída local (será copiado para /manager/dist no Dockerfile)
  distDir: 'out',
  // Desabilitar otimização de imagens para export estático
  images: {
    unoptimized: true,
  },
  // Base path vazio pois será servido na raiz
  basePath: '',
  // Trailing slash
  trailingSlash: false,
};

export default nextConfig;