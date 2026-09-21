import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { generatePlanSchema, replaceSlotSchema, setSlotLockedSchema } from "shared";
import { weekParamSchema, slotParamSchema } from "../lib/params.js";
import {
  generatePlan,
  getWeek,
  setSlotLocked,
  replaceSlot,
  getSlotCandidates,
} from "../services/plans.js";
import {
  WeekAlreadyGeneratedError,
  PlanWeekNotFoundError,
  PlanSlotNotFoundError,
  RecipeNotFoundError,
  SlotLockedError,
  RecipeNotEligibleError,
  HouseholdSettingsNotConfiguredError,
  NoHouseholdMembersError,
  HouseholdMemberMissingDinnerTargetError,
  EmptyPriceCatalogError,
  EmptyPreferencesError,
  StaleRevisionError,
  ExpectedRevisionRequiredError,
} from "../lib/errors.js";

function mapPlanError(err: unknown): never {
  if (err instanceof WeekAlreadyGeneratedError) {
    throw new HTTPException(409, { message: err.message });
  }
  if (err instanceof StaleRevisionError) {
    throw new HTTPException(409, {
      message: err.message,
      cause: { code: "STALE_PLAN_REVISION" },
    });
  }
  if (err instanceof SlotLockedError) {
    throw new HTTPException(409, {
      message: err.message,
      cause: { code: "SLOT_LOCKED" },
    });
  }
  if (err instanceof ExpectedRevisionRequiredError) {
    throw new HTTPException(400, {
      message: err.message,
      cause: { code: "EXPECTED_REVISION_REQUIRED" },
    });
  }
  if (
    err instanceof PlanWeekNotFoundError ||
    err instanceof PlanSlotNotFoundError ||
    err instanceof RecipeNotFoundError
  ) {
    throw new HTTPException(404, { message: err.message });
  }
  if (
    err instanceof HouseholdSettingsNotConfiguredError ||
    err instanceof NoHouseholdMembersError ||
    err instanceof HouseholdMemberMissingDinnerTargetError ||
    err instanceof EmptyPriceCatalogError ||
    err instanceof EmptyPreferencesError ||
    err instanceof RecipeNotEligibleError
  ) {
    throw new HTTPException(422, {
      message: err.message,
      cause: err instanceof RecipeNotEligibleError ? { code: "RECIPE_NOT_ELIGIBLE" } : undefined,
    });
  }
  throw err;
}

export const plansRoute = new Hono()
  .post(
    "/generate",
    zValidator("json", generatePlanSchema, (result) => {
      if (!result.success) {
        // A malformed expectedRevision (not a whole number >= 1) is reported
        // as its own 400, distinct from the generic 422 used for other
        // fields and from the 409 a genuinely stale revision gets.
        const onlyExpectedRevisionInvalid = result.error.issues.every(
          (issue) => issue.path[0] === "expectedRevision",
        );
        throw new HTTPException(onlyExpectedRevisionInvalid ? 400 : 422, {
          message: "Validation failed",
          cause: z.treeifyError(result.error),
        });
      }
    }),
    async (c) => {
      const { weekStartDate, seed, expectedRevision } = c.req.valid("json");
      try {
        const week = await generatePlan(weekStartDate, seed, expectedRevision);
        return c.json(week);
      } catch (err) {
        mapPlanError(err);
      }
    },
  )
  .get(
    "/:weekStartDate",
    zValidator("param", weekParamSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(400, {
          message: "Validation failed",
          cause: z.treeifyError(result.error),
        });
      }
    }),
    async (c) => {
      const { weekStartDate } = c.req.valid("param");
      try {
        const week = await getWeek(weekStartDate);
        return c.json(week);
      } catch (err) {
        mapPlanError(err);
      }
    },
  )
  .put(
    "/:weekStartDate/slots/:day/:mealSlot/lock",
    zValidator("param", slotParamSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(400, {
          message: "Validation failed",
          cause: z.treeifyError(result.error),
        });
      }
    }),
    zValidator("json", setSlotLockedSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(422, {
          message: "Validation failed",
          cause: z.treeifyError(result.error),
        });
      }
    }),
    async (c) => {
      const { weekStartDate, day, mealSlot } = c.req.valid("param");
      const { expectedRevision } = c.req.valid("json");
      try {
        const slot = await setSlotLocked(weekStartDate, day, mealSlot, true, expectedRevision);
        return c.json(slot);
      } catch (err) {
        mapPlanError(err);
      }
    },
  )
  .delete(
    "/:weekStartDate/slots/:day/:mealSlot/lock",
    zValidator("param", slotParamSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(400, {
          message: "Validation failed",
          cause: z.treeifyError(result.error),
        });
      }
    }),
    zValidator("json", setSlotLockedSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(422, {
          message: "Validation failed",
          cause: z.treeifyError(result.error),
        });
      }
    }),
    async (c) => {
      const { weekStartDate, day, mealSlot } = c.req.valid("param");
      const { expectedRevision } = c.req.valid("json");
      try {
        const slot = await setSlotLocked(weekStartDate, day, mealSlot, false, expectedRevision);
        return c.json(slot);
      } catch (err) {
        mapPlanError(err);
      }
    },
  )
  .get(
    "/:weekStartDate/slots/:day/:mealSlot/candidates",
    zValidator("param", slotParamSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(400, {
          message: "Validation failed",
          cause: z.treeifyError(result.error),
        });
      }
    }),
    async (c) => {
      const { weekStartDate, day, mealSlot } = c.req.valid("param");
      try {
        const result = await getSlotCandidates(weekStartDate, day, mealSlot);
        return c.json(result);
      } catch (err) {
        mapPlanError(err);
      }
    },
  )
  .put(
    "/:weekStartDate/slots/:day/:mealSlot",
    zValidator("param", slotParamSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(400, {
          message: "Validation failed",
          cause: z.treeifyError(result.error),
        });
      }
    }),
    zValidator("json", replaceSlotSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(422, {
          message: "Validation failed",
          cause: z.treeifyError(result.error),
        });
      }
    }),
    async (c) => {
      const { weekStartDate, day, mealSlot } = c.req.valid("param");
      const { recipeId, expectedRevision } = c.req.valid("json");
      try {
        const slot = await replaceSlot(weekStartDate, day, mealSlot, recipeId, expectedRevision);
        return c.json(slot);
      } catch (err) {
        mapPlanError(err);
      }
    },
  );
