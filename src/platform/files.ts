export function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Abre o seletor de arquivos e devolve o texto do arquivo escolhido (ou null se cancelado). */
export function pickTextFile(accept: string): Promise<{ name: string; text: string } | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      if (file.size > 50 * 1024 * 1024) return reject(new Error('Arquivo grande demais para ser um backup do ParquiTime.'))
      file.text().then((text) => resolve({ name: file.name, text }), reject)
    })
    input.addEventListener('cancel', () => resolve(null))
    input.click()
  })
}

/** "parquitime-backup-2026-10-12-1405" */
export function stampedName(prefix: string, ext: string, ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${prefix}-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.${ext}`
}
