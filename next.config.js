/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración de webpack para evitar problemas
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig 