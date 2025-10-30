'use client'

import React from 'react'
import { PortalI18nProvider } from '../../i18n'

export default function PublicPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalI18nProvider>
      {children}
    </PortalI18nProvider>
  )
}
