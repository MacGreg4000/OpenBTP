'use client'

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'

export type Lang = 'fr' | 'en' | 'pt' | 'ro'

const STRINGS: Record<Lang, Record<string, string>> = {
  fr: {
    portal_title_ouvrier: "Portail Ouvrier Interne",
    portal_title_sst: "Portail Sous-traitant",
    enter_pin: "Entrez votre code PIN pour accéder à votre espace.",
    pin_placeholder: "Code PIN (6 chiffres)",
    connect: "Se connecter",
    receptions: "Réceptions",
    sav_tickets: "Tickets SAV",
    new_bon_regie: "Nouveau bon régie",
    my_planning: "Mon planning",
    back: "Retour",
    search: "Rechercher",
    loading: "Chargement...",
    error: "Erreur",
  },
  en: {
    portal_title_ouvrier: "Worker Portal",
    portal_title_sst: "Subcontractor Portal",
    enter_pin: "Enter your PIN code to access your space.",
    pin_placeholder: "PIN code (6 digits)",
    connect: "Sign in",
    receptions: "Receptions",
    sav_tickets: "Service tickets",
    new_bon_regie: "New work order",
    my_planning: "My schedule",
    back: "Back",
    search: "Search",
    loading: "Loading...",
    error: "Error",
  },
  pt: {
    portal_title_ouvrier: "Portal do Colaborador",
    portal_title_sst: "Portal do Subempreiteiro",
    enter_pin: "Insira o seu PIN para aceder ao espaço.",
    pin_placeholder: "Código PIN (6 dígitos)",
    connect: "Entrar",
    receptions: "Receções",
    sav_tickets: "Tickets de assistência",
    new_bon_regie: "Nova ordem de serviço",
    my_planning: "O meu planeamento",
    back: "Voltar",
    search: "Pesquisar",
    loading: "A carregar...",
    error: "Erro",
  },
  ro: {
    portal_title_ouvrier: "Portal lucrător intern",
    portal_title_sst: "Portal subcontractant",
    enter_pin: "Introduceți codul PIN pentru a accesa spațiul dvs.",
    pin_placeholder: "Cod PIN (6 cifre)",
    connect: "Conectare",
    receptions: "Recepții",
    sav_tickets: "Tichete SAV",
    new_bon_regie: "Ordin de lucru nou",
    my_planning: "Programul meu",
    back: "Înapoi",
    search: "Căutare",
    loading: "Se încarcă...",
    error: "Eroare",
  },
}

type I18nContextType = {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function PortalI18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr')

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? (localStorage.getItem('portalLang') as Lang | null) : null
    if (stored && STRINGS[stored]) setLangState(stored)
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem('portalLang', l)
      document.cookie = `portalLang=${l}; path=/; max-age=${60 * 60 * 24 * 365}`
    } catch {}
  }

  const t = useCallback((key: string) => STRINGS[lang][key] || key, [lang])

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function usePortalI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('usePortalI18n must be used within PortalI18nProvider')
  return ctx
}

