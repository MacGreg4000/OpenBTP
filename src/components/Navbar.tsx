'use client'
import { Fragment, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'
import { 
  HomeIcon, 
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  CalendarIcon,
  DocumentTextIcon,
  CubeIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  ClipboardDocumentListIcon,
  DocumentDuplicateIcon,
  SwatchIcon,
  CalendarDaysIcon,
  TruckIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { Menu, Transition } from '@headlessui/react'
import ThemeToggle from './ThemeToggle'
import { NotificationBell } from './NotificationBell'
import { useFeatures } from '@/hooks/useFeatures'

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { isEnabled, error: modulesError } = useFeatures()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [logoLoadStatus, setLogoLoadStatus] = useState<'loading' | 'loaded' | 'error' | 'none'>('loading')

  // Charger le logo depuis les settings (priorité: logoSquare > favicon)
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch('/api/company')
        if (response.ok) {
          const data = await response.json()
          // Priorité: logoSquare > favicon
          if (data.logoSquare) {
            setCompanyLogo(data.logoSquare)
            setLogoLoadStatus('loaded')
          } else {
            // Fallback sur le favicon
            setCompanyLogo('/favicon.ico')
            setLogoLoadStatus('loaded')
          }
        } else {
          // Fallback sur le favicon en cas d'erreur
          setCompanyLogo('/favicon.ico')
          setLogoLoadStatus('loaded')
        }
      } catch (error) {
        console.error('Erreur lors du chargement du logo:', error)
        // Fallback sur le favicon en cas d'erreur
        setCompanyLogo('/favicon.ico')
        setLogoLoadStatus('loaded')
      }
    }
    loadLogo()
  }, [])

  // Ne pas afficher la navbar sur la page de login
  if (pathname === '/auth/login') return null

  const allNavigationItems = [
    {
      name: 'Gestion',
      items: [
        { name: 'Clients', href: '/clients', icon: UserGroupIcon, moduleCode: 'clients' },
        { name: 'Devis', href: '/devis', icon: DocumentTextIcon, moduleCode: 'devis' },
        { name: 'Sous-traitants et ouvriers', href: '/sous-traitants', icon: UserGroupIcon, moduleCode: 'sous_traitants' },
        { name: 'Chantiers', href: '/chantiers', icon: BuildingOfficeIcon, moduleCode: 'chantiers' },
        { name: 'Planning chantiers', href: '/planning', icon: CalendarIcon, moduleCode: 'planning' },
        { name: 'Planning ressources', href: '/planning-ressources', icon: CalendarIcon, moduleCode: 'planning' },
        { name: 'Journal', href: '/journal', icon: CalendarDaysIcon, moduleCode: 'journal' },
      ]
    },
    {
      name: 'Documents',
      items: [
        { name: 'Administratifs', href: '/administratif/documents', icon: DocumentTextIcon, moduleCode: 'documents' },
        { name: 'Bons de régie', href: '/bons-regie', icon: ClipboardDocumentListIcon, moduleCode: 'bons_regie' },
        { name: 'Choix client', href: '/choix-clients', icon: SwatchIcon, moduleCode: 'choix_clients' },
        { name: 'SAV', href: '/sav', icon: DocumentDuplicateIcon, moduleCode: 'sav' },
        { name: 'Métrés soumis', href: '/metres', icon: ChartBarIcon, moduleCode: 'metres' },
      ]
    },
    {
      name: 'Organisation',
      items: [
        { name: 'Outillage', href: '/outillage', icon: WrenchScrewdriverIcon, moduleCode: 'outillage' },
        { name: 'Inventaire', href: '/inventory', icon: CubeIcon, moduleCode: 'inventory' },
        ...(session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER' 
          ? [{ name: 'Planification chargements', href: '/planification-chargements', icon: TruckIcon, moduleCode: 'planning_chargements' }]
          : []
        ),
      ]
    }
  ]

  // Filtrer les éléments de navigation selon les modules actifs
  const navigationGroups = allNavigationItems.map(group => ({
    ...group,
    items: group.items.filter(item => isEnabled(item.moduleCode))
  })).filter(group => group.items.length > 0) // Ne garder que les groupes non vides

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const getActiveGroup = () => {
    for (const group of navigationGroups) {
      for (const item of group.items) {
        if (isActive(item.href)) return group.name
      }
    }
    return null
  }

  return (
    <>
      {/* Navbar principale */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200/30 dark:border-gray-700/30 shadow-sm">
        {/* Message d'erreur pour les modules */}
        {modulesError && (
          <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-2">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <p className="text-sm text-red-800 dark:text-red-200">{modulesError}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
              >
                Actualiser
              </button>
            </div>
          </div>
        )}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex justify-between items-center ${modulesError ? 'h-14' : 'h-16'}`}>
            
            {/* Logo */}
            <div className="flex items-center space-x-4">
              {/* Logo avec gradient ou logo personnalisé */}
              <Link 
                href="/dashboard" 
                className="flex items-center space-x-3 group relative"
              >
                {companyLogo && logoLoadStatus === 'loaded' ? (
                  <div className="relative w-10 h-10 flex-shrink-0 rounded-xl overflow-hidden ring-2 ring-gray-200/50 dark:ring-gray-700/50 group-hover:ring-blue-500/30 transition-all duration-300">
                    <Image
                      src={companyLogo.startsWith('data:') ? companyLogo : companyLogo}
                      alt="Logo entreprise"
                      width={40}
                      height={40}
                      className="object-contain"
                      priority
                      onLoad={() => setLogoLoadStatus('loaded')}
                      onError={() => setLogoLoadStatus('none')}
                    />
                  </div>
                ) : logoLoadStatus === 'loading' ? (
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl blur-md opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                    <div className="relative bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-xl shadow-lg ring-2 ring-blue-500/20 group-hover:ring-blue-500/40 transition-all duration-300">
                      <HomeIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl blur-md opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                    <div className="relative bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-xl shadow-lg ring-2 ring-blue-500/20 group-hover:ring-blue-500/40 group-hover:scale-105 transition-all duration-300">
                      <HomeIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                )}
                <span className="text-xl font-black bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:to-blue-800 transition-all duration-300">
                  OpenBTP
                </span>
              </Link>
            </div>

            {/* Navigation desktop avec dropdowns */}
            <div className="hidden lg:flex items-center space-x-2">
              {navigationGroups.map((group) => (
                <Menu as="div" key={group.name} className="relative z-[100]">
                  {({ open }) => (
                    <>
                      <Menu.Button className={`group inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 relative ${
                        getActiveGroup() === group.name
                          ? 'bg-gradient-to-r from-blue-600/10 to-blue-700/10 text-blue-700 dark:text-blue-400 shadow-md'
                          : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                      }`}>
                        {getActiveGroup() === group.name && (
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-blue-700/10 rounded-xl blur-sm"></div>
                        )}
                        <span className="relative">{group.name}</span>
                        <ChevronDownIcon className={`ml-2 h-4 w-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
                      </Menu.Button>
                      
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-2 scale-95"
                        enterTo="opacity-100 translate-y-0 scale-100"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0 scale-100"
                        leaveTo="opacity-0 translate-y-2 scale-95"
                      >
                        <Menu.Items className="absolute left-0 mt-3 w-64 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 divide-y divide-gray-100/30 dark:divide-gray-700/30 focus:outline-none z-[100] overflow-hidden">
                          {/* Effet de brillance en arrière-plan */}
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-700/5 pointer-events-none"></div>
                          <div className="relative p-2">
                            {group.items.map((item) => (
                              <Menu.Item key={item.name}>
                                {({ active }) => (
                                  <Link
                                    href={item.href}
                                    className={`${
                                      active || isActive(item.href)
                                        ? 'bg-gradient-to-r from-blue-500/20 to-blue-700/20 text-blue-700 dark:text-blue-400 shadow-md'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50'
                                    } group flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 relative`}
                                  >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-all duration-200 ${
                                      active || isActive(item.href)
                                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30'
                                    }`}>
                                      <item.icon className="h-4 w-4" />
                                    </div>
                                    <span className="relative">{item.name}</span>
                                  </Link>
                                )}
                              </Menu.Item>
                            ))}
                          </div>
                        </Menu.Items>
                      </Transition>
                    </>
                  )}
                </Menu>
              ))}
            </div>

            {/* Actions à droite */}
            <div className="flex items-center space-x-2">
              {session ? (
                <>

                  {/* Gestion utilisateurs (ADMIN/MANAGER uniquement) */}
                  {session?.user?.role && ['ADMIN', 'MANAGER'].includes(session.user.role as string) && (
                    <Link
                      href="/utilisateurs"
                      className={`relative p-2.5 rounded-xl transition-all duration-300 group ${
                        isActive('/utilisateurs')
                          ? 'bg-gradient-to-r from-blue-500/20 to-blue-700/20 text-blue-700 dark:text-blue-400 shadow-md'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      {isActive('/utilisateurs') && (
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-blue-700/10 rounded-xl blur-sm"></div>
                      )}
                      <UserCircleIcon className="h-5 w-5 relative z-10" />
                    </Link>
                  )}

                  {/* Notifications */}
                  <div className="relative">
                    <NotificationBell />
                  </div>

                  {/* Toggle thème */}
                  <ThemeToggle />

                  {/* Menu utilisateur */}
                  <Menu as="div" className="relative z-[100]">
                    {({ open }) => (
                      <>
                        <Menu.Button className="flex items-center space-x-3 p-1.5 rounded-xl hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all duration-300 group relative">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full blur-md opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                            <div className="relative w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg ring-2 ring-white/20 dark:ring-gray-800/20 group-hover:ring-blue-500/30 transition-all duration-300 group-hover:scale-105">
                              {session.user?.email?.[0]?.toUpperCase() || 'U'}
                            </div>
                          </div>
                          <div className="hidden sm:block text-left">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {session.user?.name || 'Utilisateur'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {session.user?.email}
                            </p>
                          </div>
                          <ChevronDownIcon className={`hidden sm:block h-4 w-4 text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
                        </Menu.Button>
                        
                        <Transition
                          as={Fragment}
                          enter="transition ease-out duration-200"
                          enterFrom="opacity-0 translate-y-2 scale-95"
                          enterTo="opacity-100 translate-y-0 scale-100"
                          leave="transition ease-in duration-150"
                          leaveFrom="opacity-100 translate-y-0 scale-100"
                          leaveTo="opacity-0 translate-y-2 scale-95"
                        >
                          <Menu.Items className="absolute right-0 mt-3 w-64 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 divide-y divide-gray-100/30 dark:divide-gray-700/30 focus:outline-none z-[100] overflow-hidden">
                            {/* Effet de brillance en arrière-plan */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-700/5 pointer-events-none"></div>
                            
                            {/* Informations utilisateur */}
                            <div className="p-4 bg-gradient-to-r from-blue-500/10 to-blue-700/10">
                              <div className="flex items-center space-x-3">
                                <div className="relative">
                                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full blur-md opacity-30"></div>
                                  <div className="relative w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg ring-2 ring-white/20 dark:ring-gray-800/20">
                                    {session.user?.email?.[0]?.toUpperCase() || 'U'}
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                    {session.user?.name || 'Utilisateur'}
                                  </p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                    {session.user?.email}
                                  </p>
                                  {session.user?.role && (
                                    <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                      {session.user.role}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="p-2">
                              <Menu.Item>
                                {({ active }) => (
                                  <Link
                                    href="/configuration"
                                    className={`${
                                      active ? 'bg-gradient-to-r from-blue-500/20 to-blue-700/20 text-blue-700 dark:text-blue-400 shadow-md' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50'
                                    } group flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200`}
                                  >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-all duration-200 ${
                                      active
                                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30'
                                    }`}>
                                      <Cog6ToothIcon className="h-4 w-4" />
                                    </div>
                                    Configuration
                                  </Link>
                                )}
                              </Menu.Item>
                              
                              {/* Gestion des modules (ADMIN uniquement) */}
                              {session?.user?.role === 'ADMIN' && (
                                <Menu.Item>
                                  {({ active }) => (
                                    <Link
                                      href="/admin/modules"
                                      className={`${
                                        active ? 'bg-gradient-to-r from-purple-500/20 to-purple-700/20 text-purple-700 dark:text-purple-400 shadow-md' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50'
                                      } group flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200`}
                                    >
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-all duration-200 ${
                                        active
                                          ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg'
                                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30'
                                      }`}>
                                        <Cog6ToothIcon className="h-4 w-4" />
                                      </div>
                                      Modules
                                    </Link>
                                  )}
                                </Menu.Item>
                              )}
                            </div>
                            <div className="p-2">
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => signOut({ callbackUrl: '/' })}
                                    className={`${
                                      active ? 'bg-red-50/50 dark:bg-red-900/20 text-red-700 dark:text-red-300 shadow-md' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50'
                                    } group flex w-full items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200`}
                                  >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-all duration-200 ${
                                      active
                                        ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg'
                                        : 'bg-gray-100 dark:bg-gray-700 text-red-500 dark:text-red-400 group-hover:bg-red-100 dark:group-hover:bg-red-900/30'
                                    }`}>
                                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                                    </div>
                                    Déconnexion
                                  </button>
                                )}
                              </Menu.Item>
                            </div>
                          </Menu.Items>
                        </Transition>
                      </>
                    )}
                  </Menu>
                </>
              ) : (
                <Link
                  href="/login"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                >
                  Connexion
                </Link>
              )}

              {/* Bouton menu mobile */}
              <button
                type="button"
                className="lg:hidden p-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all duration-300 relative group"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="sr-only">Ouvrir le menu</span>
                {mobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6 relative z-10" />
                ) : (
                  <Bars3Icon className="h-6 w-6 relative z-10" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-blue-700/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Menu mobile */}
      <Transition
        show={mobileMenuOpen}
        as={Fragment}
        enter="transition ease-out duration-300"
        enterFrom="opacity-0 translate-x-full"
        enterTo="opacity-100 translate-x-0"
        leave="transition ease-in duration-200"
        leaveFrom="opacity-100 translate-x-0"
        leaveTo="opacity-0 translate-x-full"
      >
        <div className="lg:hidden fixed inset-0 z-[100] flex">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative ml-auto w-80 h-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl border-l border-gray-200/50 dark:border-gray-700/50">
            <div className="h-full overflow-y-auto p-6">
              {/* Effet de brillance en arrière-plan */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-700/5 pointer-events-none"></div>
              
              <div className="relative flex items-center justify-between mb-8 pb-4 border-b border-gray-200/30 dark:border-gray-700/30">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl blur-md opacity-30"></div>
                    <div className="relative bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-xl shadow-lg">
                      <HomeIcon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <h2 className="text-xl font-black bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                    Menu
                  </h2>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all duration-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="relative space-y-6">
                {navigationGroups.map((group) => (
                  <div key={group.name}>
                    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1">
                      {group.name}
                    </h3>
                    <div className="space-y-1.5">
                      {group.items.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                            isActive(item.href)
                              ? 'bg-gradient-to-r from-blue-500/20 to-blue-700/20 text-blue-700 dark:text-blue-400 shadow-md'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-all duration-200 ${
                            isActive(item.href)
                              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}>
                            <item.icon className="h-4 w-4" />
                          </div>
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Actions supplémentaires pour mobile */}
                <div className="relative pt-6 mt-6 border-t border-gray-200/30 dark:border-gray-700/30">
                  <div className="space-y-1.5">
                    <Link
                      href="/configuration"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                        isActive('/configuration')
                          ? 'bg-gradient-to-r from-blue-500/20 to-blue-700/20 text-blue-700 dark:text-blue-400 shadow-md'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-all duration-200 ${
                        isActive('/configuration')
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        <Cog6ToothIcon className="h-4 w-4" />
                      </div>
                      Configuration
                    </Link>

                    {session?.user?.role && ['ADMIN', 'MANAGER'].includes(session.user.role as string) && (
                      <Link
                        href="/utilisateurs"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                          isActive('/utilisateurs')
                            ? 'bg-gradient-to-r from-blue-500/20 to-blue-700/20 text-blue-700 dark:text-blue-400 shadow-md'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-all duration-200 ${
                          isActive('/utilisateurs')
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                          <UserCircleIcon className="h-4 w-4" />
                        </div>
                        Utilisateurs
                      </Link>
                    )}

                    <button
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                        <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      </div>
                      Déconnexion
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </>
  )
} 