import { generateContratSoustraitance as generatePuppeteerContrat, signerContrat as signerPuppeteerContrat } from './contract-generator-puppeteer'

// Wrappers fins autour du générateur Puppeteer (nouveau système avec templates)

export async function generateContratSoustraitance(soustraitantId: string, userId: string): Promise<string> {
  return generatePuppeteerContrat(soustraitantId, userId)
}

export async function signerContrat(token: string, signatureBase64: string): Promise<string> {
  return signerPuppeteerContrat(token, signatureBase64)
}