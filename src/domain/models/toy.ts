export type ToyCategory = 'motinha' | 'pula-pula' | 'outro'

export const TOY_CATEGORIES: readonly ToyCategory[] = ['motinha', 'pula-pula', 'outro']

export const CATEGORY_LABEL: Record<ToyCategory, string> = {
  motinha: 'Motinha',
  'pula-pula': 'Pula-pula',
  outro: 'Outro',
}

export interface Toy {
  id: string
  name: string
  category: ToyCategory
  /** Duração padrão em segundos. */
  durationSec: number
  /** Preço padrão em centavos (inteiro). */
  priceCents: number
  active: boolean
  order: number
  /** Brinquedo criado pelos dados de exemplo — pode ser removido em lote. */
  isDemo: boolean
  createdAt: number
  updatedAt: number
}

export interface ToyInput {
  name: string
  category: ToyCategory
  durationSec: number
  priceCents: number
  active: boolean
}

export const TOY_LIMITS = {
  nameMax: 40,
  minDurationSec: 10,
  maxDurationSec: 4 * 60 * 60,
  maxPriceCents: 100_000_00,
} as const

/** Retorna a lista de erros de validação (vazia quando válido). */
export function validateToyInput(input: ToyInput): string[] {
  const errors: string[] = []
  const name = input.name.trim()
  if (!name) errors.push('Informe o nome do brinquedo.')
  if (name.length > TOY_LIMITS.nameMax) errors.push(`Use até ${TOY_LIMITS.nameMax} caracteres no nome.`)
  if (!TOY_CATEGORIES.includes(input.category)) errors.push('Escolha uma categoria.')
  if (!Number.isInteger(input.durationSec) || input.durationSec < TOY_LIMITS.minDurationSec)
    errors.push('A duração mínima é de 10 segundos.')
  else if (input.durationSec > TOY_LIMITS.maxDurationSec) errors.push('A duração máxima é de 4 horas.')
  if (!Number.isInteger(input.priceCents) || input.priceCents < 0) errors.push('Informe um preço válido.')
  else if (input.priceCents > TOY_LIMITS.maxPriceCents) errors.push('Preço acima do limite permitido.')
  return errors
}
