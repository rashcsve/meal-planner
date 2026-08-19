import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "./logger.js";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    logger.warn({ err, status: err.status }, "request failed");
    return c.json(
      {
        error: {
          message: err.message,
          ...(err.cause ? { details: err.cause } : {}),
        },
      },
      err.status,
    );
  }

  logger.error({ err }, "unhandled error");
  return c.json({ error: { message: "Internal Server Error" } }, 500);
};
