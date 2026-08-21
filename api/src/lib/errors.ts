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
