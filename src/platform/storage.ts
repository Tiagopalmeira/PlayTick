export interface StorageInfo {
  usageBytes: number | null
  quotaBytes: number | null
  persisted: boolean | null
}

export async function getStorageInfo(): Promise<StorageInfo> {
  const s = typeof navigator !== 'undefined' ? navigator.storage : undefined
  const info: StorageInfo = { usageBytes: null, quotaBytes: null, persisted: null }
  if (!s) return info
  try {
    const est = await s.estimate()
    info.usageBytes = est.usage ?? null
    info.quotaBytes = est.quota ?? null
  } catch {
    /* indisponível */
  }
  try {
    info.persisted = s.persisted ? await s.persisted() : null
  } catch {
    /* indisponível */
  }
  return info
}

/** Pede ao navegador para não apagar os dados automaticamente quando faltar espaço. */
export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1).replace('.', ',')} MB`
  return `${(bytes / 1024 ** 3).toFixed(1).replace('.', ',')} GB`
}
