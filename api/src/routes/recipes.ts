import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createRecipeSchema, recipeIngredientLineSchema, updateRecipeServingsSchema } from "shared";
import { idParamSchema, recipeIngredientLineParamSchema } from "../lib/params.js";
import {
  archiveRecipe,
  createRecipe,
  editRecipeServings,
  getRecipe,
  listRecipes,
} from "../services/recipes.js";
import {
  addIngredientLine,
  editIngredientLine,
  removeIngredientLine,
} from "../services/recipeIngredients.js";
import {
  DuplicateTitleError,
  IngredientNotFoundError,
  RecipeIngredientLineNotFoundError,
  RecipeNotFoundError,
} from "../lib/errors.js";

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
  )
  .put(
    "/:id",
    zValidator("param", idParamSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(400, {
          message: "Validation failed",
          cause: z.treeifyError(result.error),
        });
      }
    }),
    zValidator("json", updateRecipeServingsSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(422, {
          message: "Validation failed",
          cause: z.treeifyError(result.error),
        });
      }
    }),
    async (c) => {
      const { id } = c.req.valid("param");
      const { servings } = c.req.valid("json");
      try {
        const recipe = await editRecipeServings(id, servings);
        return c.json(recipe);
      } catch (err) {
        if (err instanceof RecipeNotFoundError) {
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
      try {
        await archiveRecipe(id);
        return c.body(null, 204);
      } catch (err) {
        if (err instanceof RecipeNotFoundError) {
          throw new HTTPException(404, { message: err.message });
        }
        throw err;
      }
    },
  )
  .post(
    "/:id/ingredients",
    zValidator("param", idParamSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(400, {
          message: "Validation failed",
          cause: z.treeifyError(result.error),
        });
      }
    }),
    zValidator("json", recipeIngredientLineSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(422, {
          message: "Validation failed",
          cause: z.treeifyError(result.error),
        });
      }
    }),
    async (c) => {
      const { id } = c.req.valid("param");
      const data = c.req.valid("json");
      try {
        const line = await addIngredientLine(id, data);
        return c.json(line, 201);
      } catch (err) {
        if (err instanceof RecipeNotFoundError || err instanceof IngredientNotFoundError) {
          throw new HTTPException(404, { message: err.message });
        }
        throw err;
      }
    },
  )
  .put(
    "/:id/ingredients/:lineId",
    zValidator("param", recipeIngredientLineParamSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(400, {
          message: "Validation failed",
          cause: z.treeifyError(result.error),
        });
      }
    }),
    zValidator("json", recipeIngredientLineSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(422, {
          message: "Validation failed",
          cause: z.treeifyError(result.error),
        });
      }
    }),
    async (c) => {
      const { id, lineId } = c.req.valid("param");
      const data = c.req.valid("json");
      try {
        const line = await editIngredientLine(id, lineId, data);
        return c.json(line);
      } catch (err) {
        if (
          err instanceof RecipeIngredientLineNotFoundError ||
          err instanceof IngredientNotFoundError
        ) {
          throw new HTTPException(404, { message: err.message });
        }
        throw err;
      }
    },
  )
  .delete(
    "/:id/ingredients/:lineId",
    zValidator("param", recipeIngredientLineParamSchema, (result) => {
      if (!result.success) {
        throw new HTTPException(400, {
          message: "Validation failed",
          cause: z.treeifyError(result.error),
        });
      }
    }),
    async (c) => {
      const { id, lineId } = c.req.valid("param");
      try {
        await removeIngredientLine(id, lineId);
        return c.body(null, 204);
      } catch (err) {
        if (err instanceof RecipeIngredientLineNotFoundError) {
          throw new HTTPException(404, { message: err.message });
        }
        throw err;
      }
    },
  );
