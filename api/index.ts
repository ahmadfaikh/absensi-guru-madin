import "dotenv/config";
import express from "express";
import { initDatabase } from "../server/db.ts";
import { apiRouter } from "../server/api.ts";

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

let dbInitPromise: Promise<void> | null = null;

// Middleware to ensure DB is initialized before processing API requests
app.use(async (req, res, next) => {
  try {
    if (!dbInitPromise) {
      dbInitPromise = initDatabase();
    }
    await dbInitPromise;
    next();
  } catch (err) {
    console.error("Database initialization error:", err);
    res.status(500).json({ error: "Gagal menginisialisasi database." });
  }
});

// Mount API routes
app.use("/api", apiRouter);

// Fallback 404 for unmatched /api routes
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `Endpoint API ${req.method} ${req.originalUrl} tidak ditemukan.` });
});

export default app;
