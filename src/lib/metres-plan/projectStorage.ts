import JSZip from 'jszip'
import type { Project } from '@/types/metres-plan'

const MPLAN_VERSION = '2.0'

export interface LoadResult {
  project: Project
  pdfBytes: Uint8Array | null
  pdfFileName: string | null
}

/**
 * Déclenche le téléchargement local d'un fichier .mplan (ZIP contenant project.json + document.pdf).
 * Anciennement saveProject.
 */
export async function downloadProject(project: Project, pdfBytes: Uint8Array | null, pdfFileName: string | null): Promise<void> {
  const zip = new JSZip()
  zip.file('project.json', JSON.stringify({ version: MPLAN_VERSION, ...project }, null, 2))
  if (pdfBytes && pdfFileName) {
    zip.file('document.pdf', pdfBytes)
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.mplan`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Ouvre un file picker et charge un fichier .mplan depuis le disque de l'utilisateur.
 * Anciennement loadProject.
 */
export async function loadProjectFromFile(): Promise<LoadResult | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.mplan,.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) { resolve(null); return }
      try {
        const arrayBuf = await file.arrayBuffer()
        const uint8 = new Uint8Array(arrayBuf)
        // ZIP magic bytes: PK (0x50 0x4B)
        if (uint8[0] === 0x50 && uint8[1] === 0x4B) {
          const zip = await JSZip.loadAsync(arrayBuf)
          const projectEntry = zip.file('project.json')
          if (!projectEntry) throw new Error('project.json manquant dans le fichier .mplan')
          const projectJson = await projectEntry.async('string')
          const { version: _, ...project } = JSON.parse(projectJson)
          const pdfEntry = zip.file('document.pdf')
          const pdfBytes = pdfEntry ? await pdfEntry.async('uint8array') : null
          const pdfFileName = pdfBytes ? (project.pdfFileName || 'document.pdf') : null
          resolve({ project: project as Project, pdfBytes, pdfFileName })
        } else {
          // Ancien format JSON — compatibilité ascendante
          const text = new TextDecoder().decode(uint8)
          const { version: _, ...project } = JSON.parse(text)
          resolve({ project: project as Project, pdfBytes: null, pdfFileName: null })
        }
      } catch {
        alert('Fichier .mplan invalide.')
        resolve(null)
      }
    }
    input.oncancel = () => resolve(null)
    input.click()
  })
}

/**
 * Sauvegarde le projet sur le serveur via PUT /api/metres-plan/:metrePlanId/file.
 * Envoie un FormData avec :
 *   - mplan : Blob JSON stringifié du projet (champ "mplan")
 *   - pdf   : Blob des bytes PDF si disponible (champ "pdf")
 */
export async function saveProjectToServer(
  metrePlanId: string,
  project: Project,
  pdfBytes: Uint8Array | null,
  pdfFileName: string | null
): Promise<void> {
  const formData = new FormData()

  const mplanBlob = new Blob(
    [JSON.stringify({ version: MPLAN_VERSION, ...project }, null, 2)],
    { type: 'application/json' }
  )
  formData.append('mplan', mplanBlob, `${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.mplan`)

  if (pdfBytes && pdfFileName) {
    const pdfBlob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
    formData.append('pdf', pdfBlob, pdfFileName)
  }

  const response = await fetch(`/api/metres-plan/${metrePlanId}/file`, {
    method: 'PUT',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Erreur serveur lors de la sauvegarde : ${response.status} ${response.statusText}`)
  }
}

/**
 * Charge le projet depuis le serveur via GET /api/metres-plan/:metrePlanId/file.
 * Retourne le LoadResult parsé, ou null si rien n'est trouvé (404).
 */
export async function loadProjectFromServer(metrePlanId: string): Promise<LoadResult | null> {
  const response = await fetch(`/api/metres-plan/${metrePlanId}/file`)

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Erreur serveur lors du chargement : ${response.status} ${response.statusText}`)
  }

  const arrayBuf = await response.arrayBuffer()
  const uint8 = new Uint8Array(arrayBuf)

  // ZIP magic bytes: PK (0x50 0x4B)
  if (uint8[0] === 0x50 && uint8[1] === 0x4B) {
    const zip = await JSZip.loadAsync(arrayBuf)
    const projectEntry = zip.file('project.json')
    if (!projectEntry) throw new Error('project.json manquant dans la réponse serveur')
    const projectJson = await projectEntry.async('string')
    const { version: _, ...project } = JSON.parse(projectJson)
    const pdfEntry = zip.file('document.pdf')
    const pdfBytes = pdfEntry ? await pdfEntry.async('uint8array') : null
    const pdfFileName = pdfBytes ? (project.pdfFileName || 'document.pdf') : null
    return { project: project as Project, pdfBytes, pdfFileName }
  } else {
    // Format JSON simple
    const text = new TextDecoder().decode(uint8)
    const { version: _, ...project } = JSON.parse(text)
    return { project: project as Project, pdfBytes: null, pdfFileName: null }
  }
}
