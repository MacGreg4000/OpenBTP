import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // console.log('🔍 Middleware - Chemin:', pathname);
  
  // Pages et ressources publiques
  if (
    pathname === '/login' ||
    pathname === '/logout' ||
    pathname === '/setup' ||
    pathname === '/clear-cache' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/setup') ||
    pathname.startsWith('/api/public/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.')
  ) {
    // console.log('✅ Chemin public autorisé:', pathname);
    return NextResponse.next();
  }
  
  // Vérifier si l'application nécessite une configuration initiale
  try {
    const setupCheckUrl = new URL('/api/setup', req.url);
    const response = await fetch(setupCheckUrl.toString());
    if (response.ok) {
      const { isConfigured } = await response.json();
      if (!isConfigured) {
        // console.log('🔧 Application non configurée - redirection vers setup');
        return NextResponse.redirect(new URL('/setup', req.url));
      }
    }
  } catch {
    // console.error('Erreur lors de la vérification de la configuration:', error);
    // En cas d'erreur, on assume que l'app est configurée et on continue vers la vérification d'auth
    // console.log('⚠️ Erreur de vérification config - on continue vers l\'authentification');
  }
  
  // Vérifier l'authentification avec NextAuth JWT
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET,
  }); 
  
  // console.log('🔐 Token trouvé:', !!token);
  if (token) {
    // console.log('👤 Utilisateur:', token.email);
    
    // Vérification supplémentaire : s'assurer que le token a tous les champs requis
    if (!token.id || !token.email) {
      // console.log('⚠️ Token incomplet - redirection vers login');
      const loginUrl = new URL('/login', req.url);
      if (pathname !== '/') {
        loginUrl.searchParams.set('callbackUrl', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // Si pas de token ou token invalide, rediriger vers login
  if (!token) {
    // console.log('❌ Non authentifié - redirection vers login');
    const loginUrl = new URL('/login', req.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('callbackUrl', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }
  
  // Si authentifié et sur la racine, rediriger vers dashboard
  if (pathname === '/') {
    // console.log('🏠 Redirection racine vers dashboard');
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  // console.log('✅ Accès autorisé');
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/chantiers/:path*',
    '/clients/:path*',
    '/sous-traitants/:path*',
    '/outillage/:path*',
    '/administratif/:path*',
    '/bons-regie/:path*',
    '/parametres/:path*',
    '/utilisateurs/:path*',
    '/planning/:path*',
    '/configuration/:path*'
  ],
}; 