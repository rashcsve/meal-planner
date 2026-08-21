import { describe, expect, it } from 'vitest'
import { convertToBaseUnit, resolveUniversalRule, type ConversionRule } from '../src/lib/units.js'
import { MissingIngredientDensityError, UnsupportedUnitConversionError } from '../src/lib/errors.js'

const GRAM: ConversionRule = { factor: 1, toBaseUnit: 'g' }
const KILOGRAM: ConversionRule = { factor: 1000, toBaseUnit: 'g' }
const MILLILITER: ConversionRule = { factor: 1, toBaseUnit: 'ml' }
const PIECE: ConversionRule = { factor: 1, toBaseUnit: 'pcs' }

describe('convertToBaseUnit', () => {
  it("applies the rule's factor when its target already matches the base unit", () => {
    expect(convertToBaseUnit(2, 'kg', 'g', KILOGRAM)).toBe(2000)
    expect(convertToBaseUnit(250, 'g', 'g', GRAM)).toBe(250)
    expect(convertToBaseUnit(3, 'pcs', 'pcs', PIECE)).toBe(3)
  })

  it('throws UnsupportedUnitConversionError when no rule was resolved', () => {
    expect(() => convertToBaseUnit(1, 'cup', 'ml', undefined)).toThrow(UnsupportedUnitConversionError)
  })

  it('throws UnsupportedUnitConversionError bridging to or from pcs, even with a resolved rule', () => {
    expect(() => convertToBaseUnit(2, 'kg', 'pcs', KILOGRAM)).toThrow(UnsupportedUnitConversionError)
    expect(() => convertToBaseUnit(2, 'pcs', 'g', PIECE)).toThrow(UnsupportedUnitConversionError)
  })

  it('throws MissingIngredientDensityError when the resolved rule does not bridge to the base unit', () => {
    expect(() => convertToBaseUnit(100, 'ml', 'g', MILLILITER)).toThrow(MissingIngredientDensityError)
  })

  it('never guesses a density — the same case without a rule also throws', () => {
    expect(() => convertToBaseUnit(100, 'ml', 'g', undefined)).toThrow(UnsupportedUnitConversionError)
  })

  it('applies an ingredient-specific override rule directly, whatever units it bridges', () => {
    // resolved override for olive oil: 1 ml = 0.92 g
    const oliveOilOverride: ConversionRule = { factor: 0.92, toBaseUnit: 'g' }
    expect(convertToBaseUnit(100, 'ml', 'g', oliveOilOverride)).toBeCloseTo(92)
  })
})

describe('resolveUniversalRule', () => {
  it('resolves tablespoon and teaspoon synonyms across languages to the same rule', () => {
    for (const unit of ['lžíce', 'tbsp', 'tablespoon', 'ст.л.']) {
      expect(resolveUniversalRule(unit)).toEqual({ factor: 15, toBaseUnit: 'ml' })
    }
    for (const unit of ['lžička', 'tsp', 'teaspoon', 'ч.л.']) {
      expect(resolveUniversalRule(unit)).toEqual({ factor: 5, toBaseUnit: 'ml' })
    }
    for (const unit of ['pcs', 'ks', 'шт']) {
      expect(resolveUniversalRule(unit)).toEqual({ factor: 1, toBaseUnit: 'pcs' })
    }
  })

  it('matches units case-insensitively', () => {
    expect(resolveUniversalRule('KG')).toEqual({ factor: 1000, toBaseUnit: 'g' })
    expect(resolveUniversalRule('Tbsp')).toEqual({ factor: 15, toBaseUnit: 'ml' })
  })

  it('returns undefined for an unrecognized unit', () => {
    expect(resolveUniversalRule('cup')).toBeUndefined()
  })
})
