export class DuplicateTitleError extends Error {
  constructor(title: string) {
    super(`A recipe titled "${title}" already exists`);
    this.name = "DuplicateTitleError";
  }
}

export class MissingIngredientDensityError extends Error {
  constructor(unit: string, baseUnit: string) {
    super(`Converting "${unit}" to "${baseUnit}" needs the ingredient's density, but none was given`);
    this.name = "MissingIngredientDensityError";
  }
}

export class UnsupportedUnitConversionError extends Error {
  constructor(unit: string, baseUnit: string) {
    super(`Cannot convert "${unit}" to "${baseUnit}"`);
    this.name = "UnsupportedUnitConversionError";
  }
}

export class IngredientNotFoundError extends Error {
  constructor(ingredientId: number) {
    super(`No ingredient with id ${ingredientId}`);
    this.name = "IngredientNotFoundError";
  }
}

export class EmptyPriceCatalogError extends Error {
  constructor() {
    super(
      "Cannot plan with an empty price catalog: promo detection and store consolidation have nothing to work with",
    );
    this.name = "EmptyPriceCatalogError";
  }
}

export class EmptyPreferencesError extends Error {
  constructor() {
    super(
      "Cannot plan without household preferences: neverIngredientIds is empty",
    );
    this.name = "EmptyPreferencesError";
  }
}
