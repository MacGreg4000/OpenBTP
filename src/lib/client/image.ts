export async function compressImageFile(inputFile: File, maxWidth = 1600, quality = 0.82): Promise<File> {
  try {
    if (!inputFile.type.startsWith('image/')) return inputFile
    const bitmap = await createImageBitmap(inputFile)
    const scale = Math.min(1, maxWidth / bitmap.width)
    const targetW = Math.round(bitmap.width * scale)
    const targetH = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0, targetW, targetH)
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) return inputFile
    return new File([blob], inputFile.name.replace(/\.(png|jpeg|jpg|webp)$/i, '.jpg'), { type: 'image/jpeg' })
  } catch {
    return inputFile
  }
}

