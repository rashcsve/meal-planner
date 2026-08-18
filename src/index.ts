import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { recipesRoute } from "./routes/recipes.js";
import { requestLogger } from "./lib/requestLogger.js";
import { errorHandler } from "./lib/errorHandler.js";
import { config } from "./config/index.js";

const app = new Hono();

app.use(requestLogger);
app.use(cors({ origin: config.CORS_ORIGIN }));
app.onError(errorHandler);

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

app.route("/api/recipes", recipesRoute);

serve({ fetch: app.fetch, port: 3000 });
