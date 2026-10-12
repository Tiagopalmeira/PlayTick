import { describe, expect, it } from 'vitest'
import { formatCountdown, formatDurationLabel, formatMoney, formatTime, parseMoney } from '@/utils/format'
import { validateToyInput } from '@/domain/models'

describe('formatação', () => {
  it('formata dinheiro em reais', () => {
    expect(formatMoney(1050)).toBe('R$ 10,50')
    expect(formatMoney(123456)).toBe('R$ 1.234,56')
  })

  it('interpreta valores digitados em centavos inteiros', () => {
    expect(parseMoney('10')).toBe(1000)
    expect(parseMoney('10,5')).toBe(1050)
    expect(parseMoney('R$ 1.234,56')).toBe(123456)
    expect(parseMoney('0,10')).toBe(10)
    expect(parseMoney('12.50')).toBe(1250)
    expect(parseMoney('abc')).toBeNull()
    expect(parseMoney('1,234')).toBeNull()
  })

  it('formata contagem regressiva arredondando para cima', () => {
    expect(formatCountdown(272_000)).toBe('04:32')
    expect(formatCountdown(200)).toBe('00:01')
    expect(formatCountdown(0)).toBe('00:00')
    expect(formatCountdown(-5)).toBe('00:00')
    expect(formatCountdown(3_723_000)).toBe('1:02:03')
  })

  it('formata durações e horários em 24 h', () => {
    expect(formatDurationLabel(300)).toBe('5 min')
    expect(formatDurationLabel(90)).toBe('1 min 30 s')
    expect(formatDurationLabel(3900)).toBe('1 h 05 min')
    expect(formatTime(new Date(2026, 9, 12, 21, 5).getTime())).toBe('21:05')
  })

  it('valida o cadastro de brinquedo', () => {
    expect(validateToyInput({ name: ' ', category: 'motinha', durationSec: 5, priceCents: -1, active: true })).toHaveLength(3)
    expect(validateToyInput({ name: 'Moto', category: 'motinha', durationSec: 300, priceCents: 1000, active: true })).toEqual([])
  })
})
