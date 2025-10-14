'use client'
import { useState, useEffect } from 'react'
import { 
  SunIcon, 
  CloudIcon, 
  EyeDropperIcon,
  InformationCircleIcon 
} from '@heroicons/react/24/outline'

interface WeatherData {
  temperature: number
  condition: string
  humidity: number
  windSpeed: number
  description: string
  icon: string
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [location] = useState('Paris')

  useEffect(() => {
    fetchWeather()
  }, [])

  const fetchWeather = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Simulation de données météo pour la démonstration
      // En production, vous utiliseriez une vraie API météo comme OpenWeatherMap
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockWeatherData: WeatherData = {
        temperature: Math.round(Math.random() * 20 + 10), // 10-30°C
        condition: ['Ensoleillé', 'Nuageux', 'Pluvieux'][Math.floor(Math.random() * 3)],
        humidity: Math.round(Math.random() * 40 + 40), // 40-80%
        windSpeed: Math.round(Math.random() * 15 + 5), // 5-20 km/h
        description: 'Conditions favorables pour les travaux extérieurs',
        icon: 'sun'
      }
      
      // Ajuster la description selon les conditions
      if (mockWeatherData.condition === 'Pluvieux') {
        mockWeatherData.description = 'Conditions défavorables - Protéger les équipements'
        mockWeatherData.icon = 'rain'
      } else if (mockWeatherData.condition === 'Nuageux') {
        mockWeatherData.description = 'Conditions correctes pour les travaux'
        mockWeatherData.icon = 'cloud'
      }
      
      setWeather(mockWeatherData)
    } catch {
      setError('Impossible de récupérer les données météo')
    } finally {
      setLoading(false)
    }
  }

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'Ensoleillé':
        return <SunIcon className="h-8 w-8 text-yellow-500" />
      case 'Nuageux':
        return <CloudIcon className="h-8 w-8 text-gray-500" />
      case 'Pluvieux':
        return <EyeDropperIcon className="h-8 w-8 text-blue-500" />
      default:
        return <SunIcon className="h-8 w-8 text-yellow-500" />
    }
  }

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Ensoleillé':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'Nuageux':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'Pluvieux':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getWorkingSuitability = (condition: string, temperature: number) => {
    if (condition === 'Pluvieux') return { level: 'Mauvais', color: 'text-red-600' }
    if (condition === 'Nuageux') return { level: 'Correct', color: 'text-yellow-600' }
    if (temperature > 30) return { level: 'Attention chaleur', color: 'text-orange-600' }
    if (temperature < 5) return { level: 'Attention froid', color: 'text-blue-600' }
    return { level: 'Excellent', color: 'text-green-600' }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden h-full flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Météo {location}
          </h3>
          <button
            onClick={fetchWeather}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
            disabled={loading}
          >
            <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-6 flex-grow">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-center">
              <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mx-auto mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32 mx-auto"></div>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-center text-red-500 dark:text-red-400">
            <div>
              <InformationCircleIcon className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : weather ? (
          <div className="space-y-4">
            {/* Conditions principales */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {getWeatherIcon(weather.condition)}
                <span className="text-3xl font-bold text-gray-900 dark:text-white ml-3">
                  {weather.temperature}°C
                </span>
              </div>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                {weather.condition}
              </p>
            </div>

            {/* Détails météo */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="text-gray-600 dark:text-gray-400">Humidité</div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {weather.humidity}%
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="text-gray-600 dark:text-gray-400">Vent</div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {weather.windSpeed} km/h
                </div>
              </div>
            </div>

            {/* Conditions de travail */}
            {weather && (
              <div className={`p-3 rounded-lg border ${getConditionColor(weather.condition)}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Conditions de travail
                  </span>
                  <span className={`text-sm font-semibold ${getWorkingSuitability(weather.condition, weather.temperature).color}`}>
                    {getWorkingSuitability(weather.condition, weather.temperature).level}
                  </span>
                </div>
                <p className="text-xs mt-1 opacity-80">
                  {weather.description}
                </p>
              </div>
            )}

            {/* Conseils */}
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              {weather.condition === 'Pluvieux' && (
                <p>💧 Prévoir des bâches de protection</p>
              )}
              {weather.temperature > 25 && (
                <p>☀️ Prévoir des pauses hydratation</p>
              )}
              {weather.temperature < 10 && (
                <p>🧥 Équipements de protection contre le froid</p>
              )}
              {weather.windSpeed > 20 && (
                <p>💨 Attention aux travaux en hauteur</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
} 