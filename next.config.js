/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración básica
  experimental: {
    webpackBuildWorker: true,
  },
  // Configuración de webpack para manejar módulos de Node.js
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
      };
    }
    return config;
  },
  // Excluir archivos de script de la compilación
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ignorar errores de ESLint durante el build
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig 