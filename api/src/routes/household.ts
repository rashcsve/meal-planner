import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { updateHouseholdSettingsSchema, updateMemberDinnerTargetSchema } from "shared";
import { idParamSchema } from "../lib/params.js";
import { getHouseholdSettings, updateHouseholdSettings } from "../services/householdSettings.js";
import { listHouseholdMembers, updateMemberDinnerTarget } from "../services/householdMembers.js";
import { HouseholdMemberNotFoundError } from "../lib/errors.js";

export const householdRoute = new Hono()
  .get("/settings", async (c) => {
    const settings = await getHouseholdSettings();
    return c.json(settings);
  })
  .put(
    "/settings",
    zValidator("json", updateHouseholdSettingsSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(422, {
          message: "Validation failed",
          cause: z.treeifyError(result.error),
        });
      }
    }),
    async (c) => {
      const data = c.req.valid("json");
      const settings = await updateHouseholdSettings(data);
      return c.json(settings);
    },
  )
  .get("/members", async (c) => {
    const members = await listHouseholdMembers();
    return c.json(members);
  })
  .put(
    "/members/:id",
    zValidator("param", idParamSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(400, {
          message: "Validation failed",
          cause: z.treeifyError(result.error),
        });
      }
    }),
    zValidator("json", updateMemberDinnerTargetSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(422, {
          message: "Validation failed",
          cause: z.treeifyError(result.error),
        });
      }
    }),
    async (c) => {
      const { id } = c.req.valid("param");
      const { dinnerCalorieTarget } = c.req.valid("json");
      try {
        const member = await updateMemberDinnerTarget(id, dinnerCalorieTarget);
        return c.json(member);
      } catch (err) {
        if (err instanceof HouseholdMemberNotFoundError) {
          throw new HTTPException(404, { message: err.message });
        }
        throw err;
      }
    },
  );
