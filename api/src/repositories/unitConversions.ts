import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { unitConversions } from "../db/schema.js";
import {
  resolveUniversalRule,
  type BaseUnit,
  type ConversionRule,
} from "../lib/units.js";

export async function findConversionRule(
  unit: string,
  baseUnit: BaseUnit,
  ingredientId: number,
): Promise<ConversionRule | undefined> {
  const universal = resolveUniversalRule(unit);
  if (!universal) {
    return undefined;
  }

  if (
    universal.toBaseUnit === baseUnit ||
    universal.toBaseUnit === "pcs" ||
    baseUnit === "pcs"
  ) {
    return universal;
  }

  const [override] = await db
    .select()
    .from(unitConversions)
    .where(
      and(
        eq(unitConversions.fromUnit, universal.toBaseUnit),
        eq(unitConversions.ingredientId, ingredientId),
      ),
    );

  if (!override) {
    return universal;
  }

  return {
    factor: universal.factor * override.factor,
    toBaseUnit: override.toBaseUnit as BaseUnit,
  };
}
