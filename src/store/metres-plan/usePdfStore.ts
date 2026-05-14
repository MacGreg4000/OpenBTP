import { create } from 'zustand'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { PdfPageInfo } from '@/types/metres-plan'

interface PdfStore {
  pdfDocument: PDFDocumentProxy | null
  pdfBytes: Uint8Array | null
  currentPage: number
  totalPages: number
  zoom: number
  pageInfo: PdfPageInfo | null
  pdfFileName: string

  setPdfDocument: (doc: PDFDocumentProxy, fileName: string) => void
  setPdfBytes: (bytes: Uint8Array) => void
  setCurrentPage: (page: number) => void
  setZoom: (zoom: number) => void
  setPageInfo: (info: PdfPageInfo) => void
  zoomIn: () => void
  zoomOut: () => void
  zoomReset: () => void
  zoomFit: () => void
  closePdf: () => void
}

export const usePdfStore = create<PdfStore>((set, get) => ({
  pdfDocument: null,
  pdfBytes: null,
  currentPage: 1,
  totalPages: 0,
  zoom: 1,
  pageInfo: null,
  pdfFileName: '',

  setPdfDocument: (doc, fileName) => set({
    pdfDocument: doc,
    totalPages: doc.numPages,
    currentPage: 1,
    pdfFileName: fileName,
    zoom: 1,
  }),

  setPdfBytes: (bytes) => set({ pdfBytes: bytes }),

  setCurrentPage: (page) => {
    const { totalPages } = get()
    if (page >= 1 && page <= totalPages) {
      set({ currentPage: page })
    }
  },

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),

  setPageInfo: (info) => set({ pageInfo: info }),

  zoomIn: () => set(s => ({ zoom: Math.min(5, s.zoom * 1.2) })),
  zoomOut: () => set(s => ({ zoom: Math.max(0.1, s.zoom / 1.2) })),
  zoomReset: () => set({ zoom: 1 }),
  zoomFit: () => set({ zoom: -1 }), // -1 signals "fit to screen"

  closePdf: () => set({
    pdfDocument: null,
    pdfBytes: null,
    currentPage: 1,
    totalPages: 0,
    zoom: 1,
    pageInfo: null,
    pdfFileName: '',
  }),
}))
