/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Gera build standalone para Docker
  output: 'standalone',
  // Configuração para otimização de bundle
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Headers de segurança
  async headers() {
    return [
      {
        source: '/:path*',
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
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
