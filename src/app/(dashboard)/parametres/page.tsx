import ThemeToggle from '@/components/ThemeToggle'

export default function ParametresPage() {

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8 dark:text-white">Paramètres</h1>
      
      {/* Section Apparence */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 dark:text-white flex items-center">
          ⚙️ Apparence
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium dark:text-gray-200">Mode sombre</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Basculer entre le mode clair et le mode sombre
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>

    </div>
  )
} 