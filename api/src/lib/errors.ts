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

export class WeekAlreadyGeneratedError extends Error {
  constructor(weekStartDate: string) {
    super(`A plan for the week of ${weekStartDate} was already generated`);
    this.name = "WeekAlreadyGeneratedError";
  }
}

export class PlanWeekNotFoundError extends Error {
  constructor(weekStartDate: string) {
    super(`No plan exists for the week of ${weekStartDate}`);
    this.name = "PlanWeekNotFoundError";
  }
}

export class PlanSlotNotFoundError extends Error {
  constructor(day: number, mealSlot: string) {
    super(`No slot for day ${day}, ${mealSlot}`);
    this.name = "PlanSlotNotFoundError";
  }
}

export class RecipeNotFoundError extends Error {
  constructor(recipeId: number) {
    super(`No recipe with id ${recipeId}`);
    this.name = "RecipeNotFoundError";
  }
}

export class HouseholdSettingsNotConfiguredError extends Error {
  constructor() {
    super(
      "Cannot plan without household settings: weekly budget and start day of week are not set",
    );
    this.name = "HouseholdSettingsNotConfiguredError";
  }
}

export class NoHouseholdMembersError extends Error {
  constructor() {
    super("Cannot plan with no household members: there is no calorie target to plan against");
    this.name = "NoHouseholdMembersError";
  }
}
