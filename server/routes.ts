import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { insertOverlaySchema, insertSubmissionSchema } from "@shared/schema";

const uploadsDir = path.resolve(process.cwd(), "uploads");
const overlaysDir = path.resolve(uploadsDir, "overlays");
const submissionsDir = path.resolve(uploadsDir, "submissions");

if (!fs.existsSync(overlaysDir)) {
  fs.mkdirSync(overlaysDir, { recursive: true });
}
if (!fs.existsSync(submissionsDir)) {
  fs.mkdirSync(submissionsDir, { recursive: true });
}

const overlayStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, overlaysDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const submissionStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, submissionsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadOverlay = multer({
  storage: overlayStorage,
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG, JPEG, and WebP images are allowed"));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const uploadSubmission = multer({
  storage: submissionStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/uploads", (req, res, next) => {
    res.setHeader("Cache-Control", "public, max-age=31536000");
    next();
  }, require("express").static(uploadsDir));

  app.get("/api/overlays", async (_req: Request, res: Response) => {
    try {
      const overlays = await storage.getActiveOverlays();
      res.json(overlays);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch overlays" });
    }
  });

  app.get("/api/admin/overlays", async (_req: Request, res: Response) => {
    try {
      const overlays = await storage.getOverlays();
      res.json(overlays);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch overlays" });
    }
  });

  app.get("/api/overlays/:id", async (req: Request, res: Response) => {
    try {
      const overlay = await storage.getOverlay(req.params.id);
      if (!overlay) {
        return res.status(404).json({ error: "Overlay not found" });
      }
      res.json(overlay);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch overlay" });
    }
  });

  app.post("/api/admin/overlays", uploadOverlay.single("image"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Image file is required" });
      }

      const name = req.body.name;
      if (!name) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Name is required" });
      }

      const imageUrl = `/uploads/overlays/${req.file.filename}`;
      const overlay = await storage.createOverlay({
        name,
        imageUrl,
        isActive: req.body.isActive !== "false",
      });

      res.status(201).json(overlay);
    } catch (error) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: "Failed to create overlay" });
    }
  });

  app.put("/api/admin/overlays/:id", async (req: Request, res: Response) => {
    try {
      const { name, isActive } = req.body;
      const overlay = await storage.updateOverlay(req.params.id, {
        name,
        isActive,
      });
      if (!overlay) {
        return res.status(404).json({ error: "Overlay not found" });
      }
      res.json(overlay);
    } catch (error) {
      res.status(500).json({ error: "Failed to update overlay" });
    }
  });

  app.delete("/api/admin/overlays/:id", async (req: Request, res: Response) => {
    try {
      const overlay = await storage.getOverlay(req.params.id);
      if (!overlay) {
        return res.status(404).json({ error: "Overlay not found" });
      }

      const imagePath = path.resolve(process.cwd(), overlay.imageUrl.substring(1));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      await storage.deleteOverlay(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete overlay" });
    }
  });

  app.get("/api/submissions", async (_req: Request, res: Response) => {
    try {
      const submissions = await storage.getSubmissions();
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  app.post("/api/submissions", uploadSubmission.single("photo"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Photo file is required" });
      }

      const photoUrl = `/uploads/submissions/${req.file.filename}`;
      const submission = await storage.createSubmission({
        photoUrl,
        overlayId: req.body.overlayId || null,
        caption: req.body.caption || null,
        clientId: req.body.clientId || null,
      });

      res.status(201).json(submission);
    } catch (error) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: "Failed to create submission" });
    }
  });

  app.put("/api/admin/submissions/:id/status", async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      if (!["pending", "posted", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const submission = await storage.updateSubmissionStatus(req.params.id, status);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }
      res.json(submission);
    } catch (error) {
      res.status(500).json({ error: "Failed to update submission status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
