import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";
import { errorHandler } from "./middleware/errorHandler.js";
import tradesRouter from "./routes/trades.js";
import rulesRouter from "./routes/rules.js";
import journalRouter from "./routes/journal.js";
import settingsRouter from "./routes/settings.js";
import columnsRouter from "./routes/columns.js";
import viewsRouter from "./routes/views.js";
import metaRouter from "./routes/meta.js";
import exportRouter from "./routes/export.js";
import authRouter from "./routes/auth.js";
import accountsRouter from "./routes/accounts.js";
import cashbookRouter from "./routes/cashbook.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [CLIENT_ORIGIN, "http://localhost:5173", "http://localhost:4173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" })); // 10MB to handle large trade history
app.use(express.urlencoded({ extended: true }));

// ── Request logger (dev only) ────────────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/trades", tradesRouter);
app.use("/api/rules", rulesRouter);
app.use("/api/journal", journalRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/columns", columnsRouter);
app.use("/api/views", viewsRouter);
app.use("/api/meta", metaRouter);
app.use("/api/export", exportRouter);
app.use("/api/auth", authRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/cashbook", cashbookRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// ── Central error handler ────────────────────────────────────────────────────
app.use(errorHandler);

// ── Boot ──────────────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Trading Journal API running on http://localhost:${PORT}`);
      console.log(`📊 Health: http://localhost:${PORT}/health`);
      console.log(`🌐 Accepting requests from: ${CLIENT_ORIGIN}\n`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n⚡ ${signal} received. Shutting down gracefully...`);
      server.close(() => {
        console.log("✅ HTTP server closed.");
        process.exit(0);
      });
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

bootstrap();
