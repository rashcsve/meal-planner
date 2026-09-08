import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { generatePlanSchema, replaceSlotSchema } from "shared";
import { weekParamSchema, slotParamSchema } from "../lib/params.js";
import {
  generatePlan,
  getWeek,
  setSlotLocked,
  replaceSlot,
} from "../services/plans.js";
import {
  WeekAlreadyGeneratedError,
  PlanWeekNotFoundError,
  PlanSlotNotFoundError,
  RecipeNotFoundError,
  HouseholdSettingsNotConfiguredError,
  NoHouseholdMembersError,
  EmptyPriceCatalogError,
  EmptyPreferencesError,
} from "../lib/errors.js";

function mapPlanError(err: unknown): never {
  if (err instanceof WeekAlreadyGeneratedError) {
    throw new HTTPException(409, { message: err.message });
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
    err instanceof EmptyPriceCatalogError ||
    err instanceof EmptyPreferencesError
  ) {
    throw new HTTPException(422, { message: err.message });
  }
  throw err;
}

export const plansRoute = new Hono()
  .post(
    "/generate",
    zValidator("json", generatePlanSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(422, {
          message: "Validation failed",
          cause: z.treeifyError(result.error),
        });
      }
    }),
    async (c) => {
      const { weekStartDate, seed } = c.req.valid("json");
      try {
        const week = await generatePlan(weekStartDate, seed);
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
    async (c) => {
      const { weekStartDate, day, mealSlot } = c.req.valid("param");
      try {
        const slot = await setSlotLocked(weekStartDate, day, mealSlot, true);
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
    async (c) => {
      const { weekStartDate, day, mealSlot } = c.req.valid("param");
      try {
        const slot = await setSlotLocked(weekStartDate, day, mealSlot, false);
        return c.json(slot);
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
      const { recipeId } = c.req.valid("json");
      try {
        const slot = await replaceSlot(weekStartDate, day, mealSlot, recipeId);
        return c.json(slot);
      } catch (err) {
        mapPlanError(err);
      }
    },
  );
