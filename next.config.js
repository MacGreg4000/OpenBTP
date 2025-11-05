/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration pour Next.js
  reactStrictMode: true,
  // output standalone désactivé pour éviter le warning de copy traced files
  images: {
    domains: ['localhost'],
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
      bodySizeLimit: '10mb',
    },
    largePageDataBytes: 10 * 1024 * 1024, // 10MB pour les réponses
  },
  // Production: activer les vérifications TypeScript et ESLint
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Configuration pour permettre l'importation d'images
  webpack(config) {
    config.module.rules.push({
      test: /\.(png|jpg|gif|svg|eot|ttf|woff|woff2)$/,
      type: 'asset/resource',
    });

    return config;
  },
  // Ajouter des règles de réécriture pour servir correctement les fichiers statiques
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/documents/serve/:path*'
      }
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

// PWA (seulement en production - chargement conditionnel pour éviter les erreurs en dev)
let config = withBundleAnalyzer(nextConfig)

if (process.env.NODE_ENV === 'production') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const withPWA = require('next-pwa')({
      dest: 'public',
      register: true,
      skipWaiting: true,
      disable: false,
      runtimeCaching: [
        {
          urlPattern: /^https?.*/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'offlineCache',
            expiration: {
              maxEntries: 200,
            },
          },
        },
      ],
    });
    config = withPWA(config)
  } catch (error) {
    console.warn('⚠️  next-pwa non disponible, PWA désactivée:', error.message)
  }
}

module.exports = config