import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { recipesRoute } from "./routes/recipes.js";
import { ingredientsRoute } from "./routes/ingredients.js";
import { pantryRoute } from "./routes/pantry.js";
import { plansRoute } from "./routes/plans.js";
import { householdRoute } from "./routes/household.js";
import { requestLogger } from "./lib/requestLogger.js";
import { errorHandler } from "./lib/errorHandler.js";
import { config } from "./config/index.js";

const app = new Hono();

app.use(requestLogger);
app.use(cors({ origin: config.CORS_ORIGIN }));
app.onError(errorHandler);

const routes = app
  .get("/health", (c) => {
    return c.json({ status: "ok" });
  })
  .route("/api/recipes", recipesRoute)
  .route("/api/ingredients", ingredientsRoute)
  .route("/api/pantry", pantryRoute)
  .route("/api/plans", plansRoute)
  .route("/api/household", householdRoute);

export type AppType = typeof routes;

serve({ fetch: app.fetch, port: 3000 });
