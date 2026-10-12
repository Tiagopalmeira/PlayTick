/** Fonte de tempo injetável — permite relógio simulado nos testes. */
export interface Clock {
  now(): number
}

export const systemClock: Clock = { now: () => Date.now() }
