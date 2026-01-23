/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration pour Next.js
  reactStrictMode: true,
  // output standalone désactivé pour éviter le warning de copy traced files
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    // Configurations spécifiques pour les images statiques
    disableStaticImages: false,
    // Permettre les images non optimisées pour les URLs dynamiques
    unoptimized: true,
  },
  // Packages externes pour les composants serveur
  serverExternalPackages: ['pdf-lib', 'pdfkit'],
  // Augmenter le timeout des requêtes et la taille des données
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    largePageDataBytes: 50 * 1024 * 1024, // 50MB pour les réponses (dossiers techniques volumineux)
  },
  // Production: activer les vérifications TypeScript
  typescript: {
    ignoreBuildErrors: false,
  },
  // Configuration pour permettre l'importation d'images
  webpack(config) {
    config.module.rules.push({
      test: /\.(png|jpg|gif|svg|eot|ttf|woff|woff2)$/,
      type: 'asset/resource',
    });

    return config;
  },
  // Configuration Turbopack (Next.js 16+)
  turbopack: {},
  // Extensions de pages (par défaut)
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  // Ajouter des règles de réécriture pour servir correctement les fichiers statiques
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/documents/serve/:path*'
      }
    ];
  },
  // Headers de sécurité pour PWA
  async headers() {
    return [
      // Exception pour les documents servis : permettre l'affichage dans iframe
      // IMPORTANT: Cette règle doit être AVANT la règle générale
      {
        source: '/api/documents/serve/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self'",
          },
        ],
      },
      // Exception pour les routes NextAuth : permettre l'accès
      {
        source: '/api/auth/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
}

// Bundle analyzer (activé quand ANALYZE=true)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
  analyzerMode: 'static',
});

const config = withBundleAnalyzer(nextConfig)

module.exports = config