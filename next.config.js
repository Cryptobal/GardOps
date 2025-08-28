/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración básica
  experimental: {
    webpackBuildWorker: false,
  },
  
  // Configuración para Vercel
  output: 'standalone',
  
  // Excluir archivos de script del build
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
  
  // Configuración de imágenes para Vercel
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
  
  // Configuración de headers para Vercel
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig 