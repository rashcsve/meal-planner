import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createRecipeSchema } from "shared";
import { idParamSchema } from "../lib/params.js";
import { createRecipe, getRecipe, listRecipes } from "../services/recipes.js";
import { DuplicateTitleError } from "../lib/errors.js";

export const recipesRoute = new Hono()
  .get("/", async (c) => {
    const recipes = await listRecipes();
    return c.json(recipes);
  })
  .get(
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
      const recipe = await getRecipe(id);
      if (!recipe) {
        throw new HTTPException(404, { message: "Recipe not found" });
      }
      return c.json(recipe);
    },
  )
  .post(
    "/",
    zValidator("json", createRecipeSchema, (result) => {
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
        const recipe = await createRecipe(data);
        return c.json(recipe, 201);
      } catch (err) {
        if (err instanceof DuplicateTitleError) {
          throw new HTTPException(409, { message: err.message });
        }
        throw err;
      }
    },
  );
