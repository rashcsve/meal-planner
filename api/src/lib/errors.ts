export class DuplicateTitleError extends Error {
  constructor(title: string) {
    super(`A recipe titled "${title}" already exists`);
    this.name = "DuplicateTitleError";
  }
}

export class DuplicateIngredientNameError extends Error {
  constructor(name: string) {
    super(`An ingredient named "${name}" already exists`);
    this.name = "DuplicateIngredientNameError";
  }
}

export class MissingIngredientDensityError extends Error {
  constructor(unit: string, baseUnit: string) {
    super(
      `Converting "${unit}" to "${baseUnit}" needs the ingredient's density, but none was given`,
    );
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
    super("Cannot plan without household preferences: neverIngredientIds is empty");
    this.name = "EmptyPreferencesError";
  }
}

export class WeekAlreadyGeneratedError extends Error {
  constructor(weekStartDate: string) {
    super(`A plan for the week of ${weekStartDate} was already generated`);
    this.name = "WeekAlreadyGeneratedError";
  }
}

export class StaleRevisionError extends Error {
  constructor(weekStartDate: string, expectedRevision: number) {
    super(
      `Plan for week ${weekStartDate} was changed by another request (expected revision ${expectedRevision}); refetch and retry`,
    );
    this.name = "StaleRevisionError";
  }
}

export class ExpectedRevisionRequiredError extends Error {
  constructor(weekStartDate: string) {
    super(
      `expectedRevision is required to regenerate the existing plan for week ${weekStartDate}; fetch the plan first to get its current revision`,
    );
    this.name = "ExpectedRevisionRequiredError";
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

export class RecipeIngredientLineNotFoundError extends Error {
  constructor(recipeId: number, lineId: number) {
    super(`No ingredient line ${lineId} on recipe ${recipeId}`);
    this.name = "RecipeIngredientLineNotFoundError";
  }
}

export class HouseholdSettingsNotConfiguredError extends Error {
  constructor() {
    super("Household settings are not configured: weekly budget and start day of week are not set");
    this.name = "HouseholdSettingsNotConfiguredError";
  }
}

export class NoHouseholdMembersError extends Error {
  constructor() {
    super("Cannot plan with no household members: there is no calorie target to plan against");
    this.name = "NoHouseholdMembersError";
  }
}

export class HouseholdMemberMissingDinnerTargetError extends Error {
  constructor(memberName: string) {
    super(`Household member "${memberName}" has no dinner calorie target set`);
    this.name = "HouseholdMemberMissingDinnerTargetError";
  }
}

export class HouseholdMemberNotFoundError extends Error {
  constructor(id: number) {
    super(`No household member with id ${id}`);
    this.name = "HouseholdMemberNotFoundError";
  }
}

export class InvalidStandardPortionTargetError extends Error {
  constructor(targetKcal: number, proposedTargetKcal: number, bandRatio: number) {
    const low = proposedTargetKcal * (1 - bandRatio);
    const high = proposedTargetKcal * (1 + bandRatio);
    super(
      `Standard portion target ${targetKcal} is outside the allowed range ${low}-${high} ` +
        `around the current proposal (${proposedTargetKcal})`,
    );
    this.name = "InvalidStandardPortionTargetError";
  }
}

export class HouseholdShareMemberMismatchError extends Error {
  constructor() {
    super("Confirmed shares must cover exactly the household's current members");
    this.name = "HouseholdShareMemberMismatchError";
  }
}

export class SlotLockedError extends Error {
  constructor(day: number, mealSlot: string) {
    super(`Slot for day ${day}, ${mealSlot} is locked; unlock it before replacing its recipe`);
    this.name = "SlotLockedError";
  }
}

export class RecipeNotEligibleError extends Error {
  constructor(recipeId: number, day: number, mealSlot: string, reason: string) {
    super(`Recipe ${recipeId} can't fill day ${day}, ${mealSlot}: ${reason}`);
    this.name = "RecipeNotEligibleError";
  }
}
