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
  TruckIcon
} from '@heroicons/react/24/outline'
import { Menu, Transition } from '@headlessui/react'
import ThemeToggle from './ThemeToggle'

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [logoLoadStatus, setLogoLoadStatus] = useState<'loading' | 'loaded' | 'error' | 'none'>('loading')

  // Charger le logo depuis les settings
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch('/api/company')
        if (response.ok) {
          const data = await response.json()
          if (data.logo) {
            setCompanyLogo(data.logo)
            setLogoLoadStatus('loaded')
          } else {
            setLogoLoadStatus('none') // Pas de logo configuré
          }
        } else {
          setLogoLoadStatus('none')
        }
      } catch (error) {
        console.error('Erreur lors du chargement du logo:', error)
        setLogoLoadStatus('none') // En cas d'erreur, utiliser le logo par défaut
      }
    }
    loadLogo()
  }, [])

  // Ne pas afficher la navbar sur la page de login
  if (pathname === '/auth/login') return null

  const navigationGroups = [
    {
      name: 'Principal',
      items: [
        { name: 'Clients', href: '/clients', icon: UserGroupIcon },
        { name: 'Sous-traitants et ouvriers', href: '/sous-traitants', icon: UserGroupIcon },
        { name: 'Chantiers', href: '/chantiers', icon: BuildingOfficeIcon },
        { name: 'Planning chantiers', href: '/planning', icon: CalendarIcon },
        { name: 'Planning ressources', href: '/planning-ressources', icon: CalendarIcon },
        { name: 'Journal', href: '/journal', icon: CalendarDaysIcon },
      ]
    },
    {
      name: 'Documents',
      items: [
        { name: 'Administratifs', href: '/administratif', icon: DocumentTextIcon },
        { name: 'Bons de régie', href: '/bons-regie', icon: ClipboardDocumentListIcon },
        { name: 'Choix client', href: '/choix-clients', icon: SwatchIcon },
        { name: 'SAV', href: '/sav', icon: DocumentDuplicateIcon },
      ]
    },
    {
      name: 'Outils',
      items: [
        { name: 'Outillage', href: '/outillage', icon: WrenchScrewdriverIcon },
        { name: 'Inventaire', href: '/inventory', icon: CubeIcon },
        ...(session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER' 
          ? [{ name: 'Planification chargements', href: '/planification-chargements', icon: TruckIcon }]
          : []
        ),
      ]
    }
  ]

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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200/20 dark:border-gray-700/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo */}
            <div className="flex items-center space-x-4">
              {/* Logo avec gradient ou logo personnalisé */}
              <Link 
                href="/dashboard" 
                className="flex items-center space-x-3 group"
              >
                {companyLogo && logoLoadStatus === 'loaded' ? (
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <Image
                      src={companyLogo.startsWith('data:') ? companyLogo : companyLogo}
                      alt="Logo entreprise"
                      width={40}
                      height={40}
                      className="object-contain rounded-lg"
                      priority
                      onLoad={() => setLogoLoadStatus('loaded')}
                      onError={() => setLogoLoadStatus('none')}
                    />
                  </div>
                ) : logoLoadStatus === 'loading' ? (
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                    <div className="relative bg-gradient-to-r from-blue-600 to-cyan-500 p-2 rounded-lg">
                      <HomeIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                    <div className="relative bg-gradient-to-r from-blue-600 to-cyan-500 p-2 rounded-lg">
                      <HomeIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                )}
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  OpenBTP
                </span>
              </Link>
            </div>

            {/* Navigation desktop avec dropdowns */}
            <div className="hidden lg:flex items-center space-x-1">
              {navigationGroups.map((group) => (
                <Menu as="div" key={group.name} className="relative">
                  <Menu.Button className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                    getActiveGroup() === group.name
                      ? 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 text-blue-700 dark:text-blue-300 shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                  }`}>
                    {group.name}
                    <ChevronDownIcon className="ml-1 h-4 w-4" />
                  </Menu.Button>
                  
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="opacity-0 translate-y-1"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 translate-y-1"
                  >
                    <Menu.Items className="absolute left-0 mt-2 w-56 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-xl shadow-lg border border-gray-200/20 dark:border-gray-700/20 divide-y divide-gray-100/20 dark:divide-gray-700/20 focus:outline-none">
                      <div className="p-1">
                        {group.items.map((item) => (
                          <Menu.Item key={item.name}>
                            {({ active }) => (
                              <Link
                                href={item.href}
                                className={`${
                                  active || isActive(item.href)
                                    ? 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 text-blue-700 dark:text-blue-300'
                                    : 'text-gray-700 dark:text-gray-300'
                                } group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200`}
                              >
                                <item.icon className="h-5 w-5 mr-3" />
                                {item.name}
                              </Link>
                            )}
                          </Menu.Item>
                        ))}
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              ))}
            </div>

            {/* Actions à droite */}
            <div className="flex items-center space-x-3">
              {session ? (
                <>

                  {/* Gestion utilisateurs (ADMIN/MANAGER uniquement) */}
                  {session?.user?.role && ['ADMIN', 'MANAGER'].includes(session.user.role as string) && (
                    <Link
                      href="/utilisateurs"
                      className={`p-2 rounded-lg transition-all duration-300 ${
                        isActive('/utilisateurs')
                          ? 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50/50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <UserCircleIcon className="h-5 w-5" />
                    </Link>
                  )}

                  {/* Toggle thème */}
                  <ThemeToggle />

                  {/* Menu utilisateur */}
                  <Menu as="div" className="relative">
                    <Menu.Button className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-all duration-300 group">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        <div className="relative w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {session.user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                      </div>
                      <div className="hidden sm:block text-left">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {session.user?.name || 'Utilisateur'}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {session.user?.email}
                        </p>
                      </div>
                      <ChevronDownIcon className="hidden sm:block h-4 w-4 text-gray-400" />
                    </Menu.Button>
                    
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-200"
                      enterFrom="opacity-0 translate-y-1"
                      enterTo="opacity-100 translate-y-0"
                      leave="transition ease-in duration-150"
                      leaveFrom="opacity-100 translate-y-0"
                      leaveTo="opacity-0 translate-y-1"
                    >
                      <Menu.Items className="absolute right-0 mt-2 w-56 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-xl shadow-lg border border-gray-200/20 dark:border-gray-700/20 divide-y divide-gray-100/20 dark:divide-gray-700/20 focus:outline-none">
                        <div className="p-1">
                          <Menu.Item>
                            {({ active }) => (
                              <Link
                                href="/configuration"
                                className={`${
                                  active ? 'bg-gray-50/50 dark:bg-gray-700/50' : ''
                                } group flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-lg transition-all duration-200`}
                              >
                                <Cog6ToothIcon className="h-5 w-5 mr-3" />
                                Configuration
                              </Link>
                            )}
                          </Menu.Item>
                        </div>
                        <div className="p-1">
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className={`${
                                  active ? 'bg-red-50/50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'
                                } group flex w-full items-center px-3 py-2 text-sm rounded-lg transition-all duration-200`}
                              >
                                <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
                                Déconnexion
                              </button>
                            )}
                          </Menu.Item>
                        </div>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                </>
              ) : (
                <Link
                  href="/login"
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Connexion
                </Link>
              )}

              {/* Bouton menu mobile */}
              <button
                type="button"
                className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-all duration-300"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="sr-only">Ouvrir le menu</span>
                {mobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
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
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative ml-auto w-80 h-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg shadow-xl border-l border-gray-200/20 dark:border-gray-700/20">
            <div className="h-full overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Menu</h2>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {navigationGroups.map((group) => (
                  <div key={group.name}>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                      {group.name}
                    </h3>
                    <div className="space-y-1">
                      {group.items.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                            isActive(item.href)
                              ? 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 text-blue-700 dark:text-blue-300'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'
                          }`}
                        >
                          <item.icon className="h-5 w-5 mr-3" />
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Actions supplémentaires pour mobile */}
                <div className="pt-6 border-t border-gray-200/20 dark:border-gray-700/20">
                  <div className="space-y-1">
                    <Link
                      href="/configuration"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive('/configuration')
                          ? 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 text-blue-700 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <Cog6ToothIcon className="h-5 w-5 mr-3" />
                      Configuration
                    </Link>

                    {session?.user?.role && ['ADMIN', 'MANAGER'].includes(session.user.role as string) && (
                      <Link
                        href="/utilisateurs"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                          isActive('/utilisateurs')
                            ? 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 text-blue-700 dark:text-blue-300'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        <UserCircleIcon className="h-5 w-5 mr-3" />
                        Utilisateurs
                      </Link>
                    )}

                    <button
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                    >
                      <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
                      Déconnexion
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      {/* Espacer le contenu pour compenser la navbar fixe */}
      <div className="h-16"></div>
    </>
  )
} 