'use client'

import { useEffect, useState } from 'react'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

export default function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    // Vérifier si le mode sombre est activé dans le localStorage
    const isDark = localStorage.getItem('darkMode') === 'true'
    setDarkMode(isDark)
    if (isDark) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('darkMode', newDarkMode.toString())
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      title={darkMode ? "Passer au mode clair" : "Passer au mode sombre"}
    >
      {darkMode ? (
        <SunIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      ) : (
        <MoonIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      )}
    </button>
  )
} 