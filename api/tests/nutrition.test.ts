import { describe, expect, it } from 'vitest'
import { summarizeKcal } from '../src/services/nutrition.js'

describe('summarizeKcal', () => {
  it('sums amount_base / 100 * kcal_per_100g across lines', () => {
    const result = summarizeKcal([
      { amountBase: 200, kcalPer100g: 165 }, // 330
      { amountBase: 50, kcalPer100g: 350 }, // 175
    ])
    expect(result).toEqual({ kcalTotal: 505 })
  })

  it('includes optional ingredients the same as required ones', () => {
    // summarizeKcal never sees isOptional at all — every resolved line counts
    const result = summarizeKcal([{ amountBase: 100, kcalPer100g: 200 }])
    expect(result).toEqual({ kcalTotal: 200 })
  })

  it('treats a null amount_base as contributing nothing', () => {
    const result = summarizeKcal([{ amountBase: null, kcalPer100g: 165 }])
    expect(result).toEqual({ kcalTotal: 0 })
  })

  it('treats a missing ingredient kcal figure as contributing nothing, not zero', () => {
    const result = summarizeKcal([{ amountBase: 200, kcalPer100g: null }])
    expect(result).toEqual({ kcalTotal: 0 })
  })

  it('sums only the computable lines, skipping the rest', () => {
    const result = summarizeKcal([
      { amountBase: 200, kcalPer100g: 165 }, // 330, computable
      { amountBase: null, kcalPer100g: 165 }, // skipped
      { amountBase: 100, kcalPer100g: null }, // skipped
    ])
    expect(result).toEqual({ kcalTotal: 330 })
  })

  it('returns zero total for no lines', () => {
    expect(summarizeKcal([])).toEqual({ kcalTotal: 0 })
  })
})
