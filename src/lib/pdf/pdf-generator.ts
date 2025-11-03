import puppeteer, { type PDFOptions as PuppeteerPDFOptions, type Browser } from 'puppeteer'
import { prisma } from '@/lib/prisma/client'
import fs from 'fs'
import path from 'path'
import { RemotePDFGenerator } from './pdf-generator-remote'

export interface PDFOptions {
  format?: 'A4' | 'A3'
  orientation?: 'portrait' | 'landscape'
  margins?: {
    top?: string
    right?: string
    bottom?: string
    left?: string
  }
  headerTemplate?: string
  footerTemplate?: string
  displayHeaderFooter?: boolean
}

export interface CompanySettings {
  logo?: string
  nomEntreprise?: string
  adresse?: string
  telephone?: string
  email?: string
  siret?: string
}

export class PDFGenerator {
  private static browser: Browser | null = null

  // Méthode pour convertir une image en base64
  static async getImageAsBase64(imagePath: string): Promise<string | null> {
    try {
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

  // Méthode pour récupérer les paramètres de l'entreprise
  static async getCompanySettings(): Promise<CompanySettings | null> {
    try {
      console.log('🔍 Recherche des paramètres entreprise...')
      const settings = await prisma.companysettings.findFirst({
        orderBy: { createdAt: 'desc' }
      })
      
      console.log('🔍 Données brutes de la base:', JSON.stringify(settings, null, 2))
      
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
        logo: logoBase64, // Utiliser la version base64
        nomEntreprise: settings.name || undefined,
        adresse: settings.address ? `${settings.address}${settings.zipCode ? ', ' + settings.zipCode : ''}${settings.city ? ' ' + settings.city : ''}` : undefined,
        telephone: settings.phone || undefined,
        email: settings.email || undefined,
        siret: settings.tva || undefined, // TVA utilisée comme SIRET pour l'instant
      }
      
      console.log(`🏢 Données société mappées: ${settings.name} ${logoBase64 ? '(avec logo)' : '(sans logo)'}`)
      return companyData
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des paramètres entreprise:', error)
      return null
    }
  }

  static async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      console.log('🚀 Lancement nouveau browser Puppeteer...')
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-extensions',
          '--disable-web-security',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]
      })
    }
    return this.browser
  }

  static async generatePDF(
    html: string,
    options: PDFOptions = {}
  ): Promise<Buffer> {
    // Vérifier si un service PDF distant est configuré
    if (process.env.PDF_SERVICE_URL) {
      console.log('📡 Utilisation du service PDF distant')
      try {
        const isHealthy = await RemotePDFGenerator.checkHealth()
        if (isHealthy) {
          return await RemotePDFGenerator.generatePDF(html, options)
        } else {
          console.warn('⚠️ Service PDF distant non disponible, fallback vers Puppeteer local')
        }
      } catch (error) {
        console.warn('⚠️ Erreur service PDF distant, fallback vers Puppeteer local:', error)
      }
    }

    // Fallback vers Puppeteer local
    console.log('🖥️ Utilisation de Puppeteer local')
    const browser = await this.getBrowser()
    const page = await browser.newPage()

    try {
      // Pas besoin d'intercepter les requêtes car nous utilisons des images base64

      // Configuration de la page (optimisée)
      await page.setContent(html, {
        waitUntil: 'domcontentloaded', // Plus rapide que networkidle0
        timeout: 10000 // Réduit de 30s à 10s
      })

      // Options par défaut
      const pdfOptions: PuppeteerPDFOptions = {
        format: options.format || 'A4',
        landscape: options.orientation === 'landscape',
        printBackground: true,
        margin: options.margins || {
          top: '15mm',
          right: '15mm',
          bottom: '15mm',
          left: '15mm'
        },
        displayHeaderFooter: options.displayHeaderFooter || false,
        headerTemplate: options.headerTemplate || '',
        footerTemplate: options.footerTemplate || '',
        preferCSSPageSize: true
      }

      const buffer = await page.pdf(pdfOptions)
      return Buffer.from(buffer)
    } finally {
      await page.close()
    }
  }



  static async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}

// Cleanup automatique à l'arrêt du processus (éviter les listeners multiples)
if (!process.listenerCount('beforeExit')) {
  process.on('beforeExit', () => {
    PDFGenerator.cleanup()
  })
}

if (!process.listenerCount('SIGINT')) {
  process.on('SIGINT', () => {
    PDFGenerator.cleanup()
    process.exit(0)
  })
}

if (!process.listenerCount('SIGTERM')) {
  process.on('SIGTERM', () => {
    PDFGenerator.cleanup()
    process.exit(0)
  })
}
