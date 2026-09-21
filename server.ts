import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initDatabase } from "./server/db.ts";
import { apiRouter } from "./server/api.ts";

async function startServer() {
  console.log("Initializing database...");
  await initDatabase();

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Mount API routes
  app.use("/api", apiRouter);

  // Dedicated 404 handler for all /api/* requests so they never fall through to Vite HTML
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `Endpoint API ${req.method} ${req.originalUrl} tidak ditemukan.` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
