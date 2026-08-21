import type { BASE_UNITS } from "shared";
import {
  MissingIngredientDensityError,
  UnsupportedUnitConversionError,
} from "./errors.js";

export type BaseUnit = (typeof BASE_UNITS)[number];

export interface ConversionRule {
  factor: number;
  toBaseUnit: BaseUnit;
}

const TABLESPOON: ConversionRule = { factor: 15, toBaseUnit: "ml" };
const TEASPOON: ConversionRule = { factor: 5, toBaseUnit: "ml" };
const PIECE: ConversionRule = { factor: 1, toBaseUnit: "pcs" };

const UNIVERSAL_CONVERSIONS: Record<string, ConversionRule> = {
  g: { factor: 1, toBaseUnit: "g" },
  kg: { factor: 1000, toBaseUnit: "g" },
  ml: { factor: 1, toBaseUnit: "ml" },
  l: { factor: 1000, toBaseUnit: "ml" },
  lžíce: TABLESPOON,
  tbsp: TABLESPOON,
  tablespoon: TABLESPOON,
  "ст.л.": TABLESPOON,
  lžička: TEASPOON,
  tsp: TEASPOON,
  teaspoon: TEASPOON,
  "ч.л.": TEASPOON,
  pcs: PIECE,
  ks: PIECE,
  шт: PIECE,
};

export function resolveUniversalRule(unit: string): ConversionRule | undefined {
  return UNIVERSAL_CONVERSIONS[unit.toLowerCase()];
}

export function convertToBaseUnit(
  amount: number,
  unit: string,
  baseUnit: BaseUnit,
  rule: ConversionRule | undefined,
): number {
  if (!rule) {
    throw new UnsupportedUnitConversionError(unit, baseUnit);
  }

  if (rule.toBaseUnit === baseUnit) {
    return amount * rule.factor;
  }

  if (rule.toBaseUnit === "pcs" || baseUnit === "pcs") {
    throw new UnsupportedUnitConversionError(unit, baseUnit);
  }

  throw new MissingIngredientDensityError(unit, baseUnit);
}
