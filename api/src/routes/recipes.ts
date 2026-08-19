import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createRecipeSchema } from "shared";
import { createRecipe, listRecipes } from "../services/recipes.js";

export const recipesRoute = new Hono();

recipesRoute.get("/", async (c) => {
  const recipes = await listRecipes();
  return c.json(recipes);
});

recipesRoute.post(
  "/",
  zValidator("json", createRecipeSchema, (result) => {
    if (!result.success) {
      throw new HTTPException(400, {
        message: "Validation failed",
        cause: z.treeifyError(result.error),
      });
    }
  }),
  async (c) => {
    const data = c.req.valid("json");
    const recipe = await createRecipe(data);
    return c.json(recipe, 201);
  },
);
