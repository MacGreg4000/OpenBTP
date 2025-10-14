'use client'
// Placeholder pour le composant Toast et Toaster de shadcn/ui
// Ajoutez-les avec `npx shadcn-ui@latest add toast`

import * as React from "react"

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Toaster() {
  // Simule un conteneur de toast, ne fait rien visuellement dans ce placeholder
  return <div id="toaster-placeholder" style={{ display: 'none' }} />;
}

// Autres exports possibles de shadcn/ui toast (Toast, ToastAction, etc.) peuvent être ajoutés ici si nécessaire 