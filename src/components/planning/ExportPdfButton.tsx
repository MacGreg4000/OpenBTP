'use client'

import { useNotification } from '@/hooks/useNotification'

// Export vectoriel avec pdfmake (sans capture écran)
type PdfMakeLib = { vfs?: unknown; createPdf: (docDef: unknown) => { download: (name?: string) => void } }
type PdfFontsLib = { vfs: unknown }

type TaskStatus = 'PREVU'|'EN_COURS'|'TERMINE'
type ApiTask = {
  id: string
  title: string
  start: string
  end: string
  status: TaskStatus
  ouvriersInternes?: Array<{ ouvrierInterne: { id: string } }>
  sousTraitants?: Array<{ soustraitant: { id: string } }>
}
type ResourceItem = { id: string; title: string; kind: 'I'|'S' }

export default function ExportPdfButton({ title = 'Exporter PDF', fileName = 'planning-ressources.pdf', getPlanningData }: { title?: string; fileName?: string; getPlanningData: () => { days: string[]; resources: ResourceItem[]; tasks: ApiTask[]; periodText: string } }) {
  const { showNotification, NotificationComponent } = useNotification()
  const getColorForResource = (resourceId: string) => {
    const palette = ['#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#14b8a6','#06b6d4','#3b82f6','#6366f1','#8b5cf6','#a855f7','#d946ef','#f43f5e','#fb7185']
    let h = 0; for (let i=0;i<resourceId.length;i++) { h = (h<<5) - h + resourceId.charCodeAt(i); h|=0 }
    return palette[Math.abs(h)%palette.length]
  }
  const taskSegmentsForDay = (task: ApiTask, dayIso: string): ('FULL'|'AM'|'PM')[] => {
    const day = new Date(dayIso)
    const s = new Date(task.start); const e = new Date(task.end)
    const d0 = new Date(day); d0.setHours(0,0,0,0)
    const d1 = new Date(day); d1.setHours(23,59,59,999)
    if (e < d0 || s > d1) return []
    const amStart = new Date(day); amStart.setHours(7,30,0,0)
    const amEnd = new Date(day); amEnd.setHours(12,0,0,0)
    const pmStart = new Date(day); pmStart.setHours(13,0,0,0)
    const pmEnd = new Date(day); pmEnd.setHours(16,30,0,0)
    const coversAM = e > amStart && s < amEnd
    const coversPM = e > pmStart && s < pmEnd
    if (coversAM && coversPM) return ['FULL']
    if (coversAM) return ['AM']
    if (coversPM) return ['PM']
    if (s <= amStart && e >= pmEnd) return ['FULL']
    return []
  }

  const handleExport = async () => {
    try {
      const pdfMakeModule = await import('pdfmake/build/pdfmake')
      const pdfFontsModule = await import('pdfmake/build/vfs_fonts')
      const pdfMakeLib = (pdfMakeModule as unknown as { default: PdfMakeLib }).default
      const pdfFontsLib = (pdfFontsModule as unknown as { default: PdfFontsLib }).default
      if (!pdfMakeLib.vfs) { pdfMakeLib.vfs = pdfFontsLib.vfs }

      const { days, resources, tasks, periodText } = await Promise.resolve(getPlanningData())
      const companyResp = await fetch('/api/company').catch(()=>null)
      const company = companyResp && companyResp.ok ? await companyResp.json() : {}

      const headerRow: unknown[] = [{ text: 'Ressource', style: 'th', fillColor: '#f3f4f6' }]
      for (const d of days) headerRow.push({ text: new Date(d).toLocaleDateString('fr-FR', { weekday:'short', day:'2-digit' }), style: 'th', fillColor: '#f3f4f6' })

      const body: unknown[] = [headerRow]
      for (const r of resources) {
        const row: unknown[] = [{ text: r.title, style: 'tdLeft' }]
        for (const d of days) {
          const occ = (tasks||[]).filter(t=> (
            (r.id.startsWith('I:') && (t.ouvriersInternes||[]).some(oi=> `I:${oi.ouvrierInterne.id}`===r.id)) ||
            (r.id.startsWith('S:') && (t.sousTraitants||[]).some(st=> `S:${st.soustraitant.id}`===r.id))
          ))
          const segs = occ.flatMap(t=> taskSegmentsForDay(t, d))
          const color = getColorForResource(r.id)
          const chips = segs.length? segs.map(s=> ({ text: s==='FULL'?'Jour':s, color:'#fff', margin:[0,2,0,2], fillColor: color, style:'chip' })) : [{ text:'', margin:[0,12,0,12] }]
          row.push({ stack: chips, alignment:'center', border:[true,true,true,true] })
        }
        body.push(row)
      }

      const docDefinition: unknown = {
        pageOrientation: 'landscape',
        pageMargins: [28, 60, 28, 40],
        header: { margin:[28,20,28,0], columns:[ { text:'Planning des Ressources', style:'title' }, { text: periodText||'', alignment:'right', style:'period' } ] },
        footer: (currentPage:number, pageCount:number)=>{
          const parts = [company.name, company.address, company.zipCode && company.city ? `${company.zipCode} ${company.city}`:'', company.phone, company.email].filter(Boolean)
          return { margin:[28,0,28,10], columns:[ { text: parts.join('  •  '), style:'footer' }, { text:`${currentPage} / ${pageCount}`, alignment:'right', style:'footer' } ] }
        },
        content: [
          {
            table: { headerRows:1, widths: [200, ...days.map(()=> 'auto')], body },
            layout: { fillColor: (row:number)=> row===0 ? '#f3f4f6' : null, hLineColor: '#d1d5db', vLineColor: '#d1d5db' }
          }
        ],
        styles: { title:{ fontSize:16, bold:true }, period:{ fontSize:10, color:'#666' }, footer:{ fontSize:9, color:'#666' }, th:{ bold:true }, tdLeft:{ margin:[6,8,6,8] }, chip:{ fontSize:9, bold:true } }
      }
      pdfMakeLib.createPdf(docDefinition).download(fileName)
    } catch (e) {
      console.error(e)
      showNotification('Erreur', "Échec de l'export PDF", 'error')
    }
  }

  return (
    <>
      <button onClick={handleExport} className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-white text-gray-700 border border-gray-300 shadow-sm hover:bg-gray-50">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75h9m-9 0A2.25 2.25 0 005.25 6v12A2.25 2.25 0 007.5 20.25h9A2.25 2.25 0 0018.75 18V6A2.25 2.25 0 0016.5 3.75m-9 0h9M9 8.25h6M9 12h6m-6 3.75h3" /></svg>
        {title}
      </button>
      <NotificationComponent />
    </>
  )
}

