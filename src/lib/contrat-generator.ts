import {
  generateContratSoustraitance as generatePuppeteerContrat,
  signerContrat as signerPuppeteerContrat
} from './contract-generator-puppeteer'

// Wrappers autour du générateur Puppeteer (système avec templates en base de données)

export async function generateContratSoustraitance(soustraitantId: string, userId: string): Promise<string> {
  return generatePuppeteerContrat(soustraitantId, userId)
}

export async function signerContrat(
  token: string,
  signatureBase64: string,
  auditInfo?: { ipAddress?: string | null; userAgent?: string | null; identityConfirmed?: boolean; consentGiven?: boolean; horodatageCertifie?: Date }
): Promise<string> {
  return signerPuppeteerContrat(token, signatureBase64, auditInfo)
}