import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createPantryItemSchema } from "shared";
import { idParamSchema } from "../lib/params.js";
import {
  addPantryItem,
  listPantryItems,
  removePantryItem,
} from "../services/pantry.js";
import { IngredientNotFoundError } from "../lib/errors.js";

export const pantryRoute = new Hono()
  .get("/", async (c) => {
    const items = await listPantryItems();
    return c.json(items);
  })
  .post(
    "/",
    zValidator("json", createPantryItemSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(422, {
          message: "Validation failed",
          cause: z.treeifyError(result.error),
        });
      }
    }),
    async (c) => {
      const data = c.req.valid("json");
      try {
        const item = await addPantryItem(data);
        return c.json(item, 201);
      } catch (err) {
        if (err instanceof IngredientNotFoundError) {
          throw new HTTPException(404, { message: err.message });
        }
        throw err;
      }
    },
  )
  .delete(
    "/:id",
    zValidator("param", idParamSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(400, {
          message: "Validation failed",
          cause: z.treeifyError(result.error),
        });
      }
    }),
    async (c) => {
      const { id } = c.req.valid("param");
      const item = await removePantryItem(id);
      if (!item) {
        throw new HTTPException(404, { message: "Pantry item not found" });
      }
      return c.body(null, 204);
    },
  );
