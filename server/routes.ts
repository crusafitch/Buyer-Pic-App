import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import multer from "multer";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import { Resend } from "resend";
import { storage } from "./storage";
import { insertOverlaySchema, insertSubmissionSchema } from "@shared/schema";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const googleChatWebhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL || null;

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "image/png", "image/jpeg", "image/webp",
      "video/mp4", "video/quicktime", "video/x-m4v"
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only images and videos are allowed"));
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 },
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

  app.post("/api/submissions", uploadSubmission.single("media"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Media file is required" });
      }

      const mediaUrl = `/uploads/submissions/${req.file.filename}`;
      const mediaType = req.body.mediaType || "photo";
      const caption = req.body.caption || "";
      const clientName = req.body.clientName || "Unknown Client";
      const companyName = req.body.companyName || "Unknown Company";
      
      const submission = await storage.createSubmission({
        photoUrl: mediaUrl,
        overlayId: req.body.overlayId || null,
        caption: caption || null,
        clientId: req.body.clientId || null,
        mediaType,
      });

      const isVideo = mediaType === "video";
      
      if (googleChatWebhookUrl) {
        try {
          const baseUrl = process.env.REPLIT_DEV_DOMAIN 
            ? `https://${process.env.REPLIT_DEV_DOMAIN}:5000`
            : `http://localhost:5000`;
          const mediaFullUrl = `${baseUrl}${mediaUrl}`;
          
          const chatMessage = {
            text: `*New ${isVideo ? "Video" : "Photo"} Submission*\n\n` +
              `*Client:* ${clientName}\n` +
              `*Company:* ${companyName}\n` +
              `*Type:* ${isVideo ? "Video" : "Photo"}\n` +
              `*Caption:* ${caption || "No caption provided"}\n\n` +
              `View media: ${mediaFullUrl}`,
          };

          const chatResponse = await fetch(googleChatWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(chatMessage),
          });

          if (chatResponse.ok) {
            console.log("Google Chat notification sent for submission:", submission.id);
          } else {
            console.error("Failed to send Google Chat notification:", await chatResponse.text());
          }
        } catch (chatError) {
          console.error("Failed to send Google Chat notification:", chatError);
        }
      } else if (resend) {
        try {
          const fileBuffer = fs.readFileSync(req.file.path);
          const fileExtension = path.extname(req.file.originalname) || (isVideo ? ".mp4" : ".jpg");
          const fileName = `submission-${submission.id}${fileExtension}`;
          
          await resend.emails.send({
            from: "Photo Portal <onboarding@resend.dev>",
            to: "buyerpics@gowithbigtime.com",
            subject: `New ${isVideo ? "Video" : "Photo"} Submission from ${clientName} (${companyName})`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563EB;">New Submission from Photo Portal</h2>
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Client:</strong> ${clientName}</p>
                  <p><strong>Company:</strong> ${companyName}</p>
                  <p><strong>Type:</strong> ${isVideo ? "Video" : "Photo"}</p>
                  ${caption ? `<p><strong>Caption:</strong> ${caption}</p>` : "<p><em>No caption provided</em></p>"}
                </div>
                <p style="color: #6b7280; font-size: 14px;">The ${isVideo ? "video" : "photo"} is attached to this email.</p>
              </div>
            `,
            attachments: [
              {
                filename: fileName,
                content: fileBuffer,
              },
            ],
          });
          console.log("Email sent successfully for submission:", submission.id);
        } catch (emailError) {
          console.error("Failed to send email notification:", emailError);
        }
      } else {
        console.log("No notification method configured (GOOGLE_CHAT_WEBHOOK_URL or RESEND_API_KEY)");
      }

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

  app.post("/api/generate-caption", uploadSubmission.single("image"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Image file is required" });
      }

      const { companyName, userName, context } = req.body;

      const imageBuffer = fs.readFileSync(req.file.path);
      const base64Image = imageBuffer.toString("base64");
      const mimeType = req.file.mimetype;

      const systemPrompt = `You are a marketing copywriter for an advertising agency. Generate engaging, professional social media captions for customer photos submitted by business clients.

Guidelines:
- Keep captions concise (under 150 characters)
- Use a friendly, professional tone
- Highlight the customer experience and brand positively
- Include a subtle call-to-action when appropriate
- Do not use hashtags unless specifically requested
- Make the caption suitable for Instagram, Facebook, or LinkedIn`;

      const userPrompt = `Generate a social media caption for this customer photo.
${companyName ? `Business: ${companyName}` : ""}
${userName ? `Submitted by: ${userName}` : ""}
${context ? `Additional context: ${context}` : ""}

Analyze the image and create an engaging caption that highlights the positive customer experience.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64Image}` },
              },
            ],
          },
        ],
        max_tokens: 200,
      });

      fs.unlinkSync(req.file.path);

      const caption = response.choices[0]?.message?.content?.trim() || "";
      res.json({ caption });
    } catch (error) {
      console.error("Error generating caption:", error);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: "Failed to generate caption" });
    }
  });

  // Helper function to fetch article image from a blog post URL
  async function fetchArticleImage(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BigTimeBuyerPic/1.0)' }
      });
      if (!response.ok) return "";
      const html = await response.text();
      
      // First try og:image
      let imageUrl = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
                     html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
      if (imageUrl && imageUrl.trim()) return imageUrl.startsWith('http') ? imageUrl : `https://www.gowithbigtime.com${imageUrl}`;
      
      // Look for article image with class img-fluid (Big Time blog format)
      const articleImg = html.match(/<img[^>]+class=["'][^"']*img-fluid[^"']*rounded[^"']*["'][^>]+src=["']([^"']+)["']/i)?.[1] ||
                        html.match(/<img[^>]+src=["']([^"']+)["'][^>]+class=["'][^"']*img-fluid[^"']*rounded[^"']*["']/i)?.[1];
      if (articleImg) {
        return articleImg.startsWith('http') ? articleImg : `https://www.gowithbigtime.com${articleImg}`;
      }
      
      // Look for any uploads/files image (blog content images)
      const uploadsImg = html.match(/src=["']([^"']*\/uploads\/files\/[^"']+\.(jpg|jpeg|png|webp))[^"']*["']/i)?.[1];
      if (uploadsImg) {
        return uploadsImg.startsWith('http') ? uploadsImg : `https://www.gowithbigtime.com${uploadsImg}`;
      }
      
      return "";
    } catch {
      return "";
    }
  }

  // News/Blog RSS feed endpoint
  app.get("/api/news", async (_req: Request, res: Response) => {
    try {
      const rssUrl = "https://www.gowithbigtime.com/blog-rss?blog=Default%20Blog";
      const response = await fetch(rssUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch RSS: ${response.status}`);
      }
      
      const rssText = await response.text();
      
      // Parse RSS XML
      const items: Array<{
        title: string;
        link: string;
        description: string;
        pubDate: string;
        imageUrl: string;
      }> = [];
      
      // Simple RSS parsing
      const itemMatches = rssText.match(/<item>([\s\S]*?)<\/item>/g) || [];
      
      for (const itemXml of itemMatches) {
        const title = itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/)?.[1] || 
                     itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/)?.[2] || "";
        const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "";
        const description = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/)?.[1] ||
                           itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/)?.[2] || "";
        const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "";
        
        items.push({
          title: title.trim(),
          link: link.trim(),
          description: description.trim(),
          pubDate: pubDate.trim(),
          imageUrl: "",
        });
      }
      
      // Fetch article images for each post in parallel
      const imagePromises = items.map(item => fetchArticleImage(item.link));
      const images = await Promise.all(imagePromises);
      items.forEach((item, index) => {
        item.imageUrl = images[index];
      });
      
      res.json(items);
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
