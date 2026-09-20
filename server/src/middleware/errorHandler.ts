import { ErrorRequestHandler } from "express";

interface AppError extends Error {
  status?: number;
  statusCode?: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err: AppError, _req, res, _next) => {
  const status = err.status ?? err.statusCode ?? 500;
  const message = err.message ?? "Internal Server Error";

  // Don't leak stack traces in production
  const body: Record<string, unknown> = { error: message };
  if (process.env.NODE_ENV !== "production" && err.stack) {
    body.stack = err.stack;
  }

  console.error(`[${new Date().toISOString()}] ❌ ${status} ${message}`);
  res.status(status).json(body);
};
