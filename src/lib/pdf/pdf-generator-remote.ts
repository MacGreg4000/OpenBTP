import { type PDFOptions, type CompanySettings } from './pdf-generator'

export class RemotePDFGenerator {
  private static pdfServiceUrl: string
  private static provider: 'browserless' | 'custom'

  static {
    // Récupérer l'URL et le provider du service PDF depuis les variables d'environnement
    this.pdfServiceUrl = process.env.PDF_SERVICE_URL || 'http://localhost:3001'
    this.provider = (process.env.PDF_SERVICE_PROVIDER as 'browserless' | 'custom') || 'custom'
  }

  // Santé du service : la vérification ne doit jamais bloquer la génération.
  // Sans délai maximum, un service injoignable faisait attendre la requête
  // jusqu'au timeout TCP (plusieurs dizaines de secondes) avant le repli local.
  private static sante: { ok: boolean; le: number } | null = null
  private static readonly DUREE_CACHE_SANTE = 60_000
  private static readonly DELAI_SANTE = 3_000
  /** Au-delà, on abandonne le service distant et on génère en local. */
  private static readonly DELAI_GENERATION = 60_000

  static marquerIndisponible() {
    this.sante = { ok: false, le: Date.now() }
  }

  // Méthode pour vérifier la santé du service
  static async checkHealth(): Promise<boolean> {
    if (this.sante && Date.now() - this.sante.le < this.DUREE_CACHE_SANTE) return this.sante.ok
    let ok = false
    try {
      if (this.provider === 'browserless') {
        // Browserless n'expose pas /health de base; on teste la page d'accueil ou /sessions
        const response = await fetch(`${this.pdfServiceUrl}`, { signal: AbortSignal.timeout(this.DELAI_SANTE) })
        ok = response.ok
      } else {
        const response = await fetch(`${this.pdfServiceUrl}/health`, { signal: AbortSignal.timeout(this.DELAI_SANTE) })
        if (response.ok) {
          const data = await response.json().catch(() => ({})) as { status?: string; browser?: string }
          console.log('🏥 Service PDF:', data.status, '- Browser:', data.browser)
          ok = data?.status === 'ok' || data?.browser === 'connected'
        }
      }
    } catch (error) {
      console.error('❌ Service PDF inaccessible:', error instanceof Error ? error.message : error)
      ok = false
    }
    this.sante = { ok, le: Date.now() }
    return ok
  }

  // Méthode pour générer un PDF via le service distant
  static async generatePDF(
    html: string,
    options: PDFOptions = {}
  ): Promise<Buffer> {
    try {
      console.log(`📡 Envoi vers service PDF distant: ${this.pdfServiceUrl} (provider=${this.provider})`)

      const endpoint = this.provider === 'browserless' ? '/pdf' : '/generate-pdf'

      // Mapper les options pour Browserless
      const browserlessOptions: {
        html: string
        options: {
          format: string
          landscape: boolean
          printBackground: boolean
          margin: { top: string; right: string; bottom: string; left: string }
          preferCSSPageSize: boolean
          headerTemplate?: string
          footerTemplate?: string
        }
      } = {
        html,
        options: {
          format: options.format || 'A4',
          landscape: options.orientation === 'landscape',
          printBackground: true,
          margin: {
            top: options.margins?.top || '15mm',
            right: options.margins?.right || '15mm',
            bottom: options.margins?.bottom || '15mm',
            left: options.margins?.left || '15mm'
          },
          preferCSSPageSize: true,
        }
      }

      // Ajouter headerTemplate et footerTemplate seulement s'ils ne sont pas vides
      if (options.displayHeaderFooter) {
        if (options.headerTemplate && options.headerTemplate.trim()) {
          browserlessOptions.options.headerTemplate = options.headerTemplate
        }
        if (options.footerTemplate && options.footerTemplate.trim()) {
          browserlessOptions.options.footerTemplate = options.footerTemplate
        }
      }

      const response = await fetch(`${this.pdfServiceUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(browserlessOptions),
        signal: AbortSignal.timeout(this.DELAI_GENERATION)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Service PDF error: ${response.status} - ${errorText}`)
      }

      const pdfBuffer = await response.arrayBuffer()
      console.log(`✅ PDF reçu du service distant: ${pdfBuffer.byteLength} bytes`)
      return Buffer.from(pdfBuffer)
    } catch (error) {
      console.error('❌ Erreur lors de la génération PDF distante:', error)
      throw error
    }
  }

  // Méthodes utilitaires réutilisées du générateur original
  static async getImageAsBase64(imagePath: string): Promise<string | null> {
    try {
      const fs = await import('fs')
      const path = await import('path')
      
      // Convertir le chemin relatif en chemin absolu
      const fullPath = imagePath.startsWith('/') 
        ? path.join(process.cwd(), 'public', imagePath)
        : imagePath
      
      if (!fs.existsSync(fullPath)) {
        console.warn(`⚠️ Image non trouvée: ${fullPath}`)
        return null
      }
      
      const imageBuffer = fs.readFileSync(fullPath)
      const extension = path.extname(fullPath).toLowerCase()
      const mimeType = extension === '.png' ? 'image/png' : 
                      extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : 
                      'image/png'
      
      const base64 = `data:${mimeType};base64,${imageBuffer.toString('base64')}`
      console.log(`🖼️ Logo converti en base64: ${fullPath} (${imageBuffer.length} bytes)`)
      return base64
    } catch (error) {
      console.error('❌ Erreur lors de la conversion du logo:', error)
      return null
    }
  }

  static async getCompanySettings(): Promise<CompanySettings | null> {
    try {
      const { prisma } = await import('@/lib/prisma/client')
      
      console.log('🔍 Recherche des paramètres entreprise...')
      const settings = await prisma.companysettings.findFirst({
        orderBy: { createdAt: 'desc' }
      })
      
      if (!settings) {
        console.warn('⚠️ Aucun paramètre société trouvé')
        return null
      }
      
      // Convertir le logo en base64 si présent
      let logoBase64 = null
      if (settings.logo) {
        logoBase64 = await this.getImageAsBase64(settings.logo)
      }
      
      // Mapper les champs de la base vers l'interface CompanySettings
      const companyData = {
        logo: logoBase64,
        nomEntreprise: settings.name || undefined,
        adresse: settings.address ? `${settings.address}${settings.zipCode ? ', ' + settings.zipCode : ''}${settings.city ? ' ' + settings.city : ''}` : undefined,
        telephone: settings.phone || undefined,
        email: settings.email || undefined,
        siret: settings.tva || undefined,
      }
      
      console.log(`🏢 Données société mappées: ${settings.name} ${logoBase64 ? '(avec logo)' : '(sans logo)'}`)
      return companyData
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des paramètres entreprise:', error)
      return null
    }
  }
}
