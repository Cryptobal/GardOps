/** @type {import('next').NextConfig} */
const nextConfig = {
  // La configuración appDir ya no es necesaria en Next.js 14
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
}

module.exports = nextConfig 