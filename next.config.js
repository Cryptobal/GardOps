/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración básica
  experimental: {
    webpackBuildWorker: true,
  },
  // Excluir archivos de script del build
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
  // Excluir archivos de script de la compilación
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig 