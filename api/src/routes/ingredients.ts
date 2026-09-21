import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createIngredientSchema } from "shared";
import { createIngredient, listIngredients } from "../services/ingredients.js";
import { DuplicateIngredientNameError } from "../lib/errors.js";

export const ingredientsRoute = new Hono()
  .get("/", async (c) => {
    const ingredients = await listIngredients();
    return c.json(ingredients);
  })
  .post(
    "/",
    zValidator("json", createIngredientSchema, (result) => {
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
        const ingredient = await createIngredient(data);
        return c.json(ingredient, 201);
      } catch (err) {
        if (err instanceof DuplicateIngredientNameError) {
          throw new HTTPException(409, { message: err.message });
        }
        throw err;
      }
    },
  );
