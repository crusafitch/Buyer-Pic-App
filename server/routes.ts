import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import multer from "multer";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import { Resend } from "resend";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { insertOverlaySchema, insertSubmissionSchema } from "@shared/schema";

const JWT_SECRET = process.env.SESSION_SECRET;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

interface AuthRequest extends Request {
  user?: { id: string; email: string; name: string; dealership: string };
}

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

  const verifyAdminApiKey = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers["x-admin-api-key"];
    if (!ADMIN_API_KEY) {
      return res.status(500).json({ error: "Admin API key not configured" });
    }
    if (apiKey !== ADMIN_API_KEY) {
      return res.status(401).json({ error: "Invalid admin API key" });
    }
    next();
  };

  const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET!) as unknown as { id: string; email: string; name: string; dealership: string };
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: "Invalid token" });
    }
  };

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      if (!JWT_SECRET) {
        return res.status(500).json({ error: "Authentication not configured" });
      }
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (!user.isActive) {
        return res.status(401).json({ error: "Account is deactivated" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, dealership: user.dealership },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          dealership: user.dealership,
          phone: user.phone,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/auth/me", verifyToken, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const overlays = await storage.getUserOverlays(user.id);
      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          dealership: user.dealership,
          phone: user.phone,
        },
        overlays,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/admin/users", verifyAdminApiKey, async (req: Request, res: Response) => {
    try {
      const { email, password, name, dealership, phone, isActive } = req.body;
      if (!email || !password || !name || !dealership) {
        return res.status(400).json({ error: "Email, password, name, and dealership are required" });
      }

      const existingUser = await storage.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        return res.status(409).json({ error: "User with this email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        dealership,
        phone: phone || null,
        isActive: isActive !== false,
      });

      res.status(201).json({
        id: user.id,
        email: user.email,
        name: user.name,
        dealership: user.dealership,
        phone: user.phone,
        isActive: user.isActive,
      });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.put("/api/admin/users/:id", verifyAdminApiKey, async (req: Request, res: Response) => {
    try {
      const { email, password, name, dealership, phone, isActive } = req.body;
      const updateData: Record<string, unknown> = {};

      if (email) updateData.email = email.toLowerCase();
      if (password) updateData.password = await bcrypt.hash(password, 10);
      if (name) updateData.name = name;
      if (dealership) updateData.dealership = dealership;
      if (phone !== undefined) updateData.phone = phone;
      if (isActive !== undefined) updateData.isActive = isActive;

      const user = await storage.updateUser(req.params.id, updateData);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        dealership: user.dealership,
        phone: user.phone,
        isActive: user.isActive,
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", verifyAdminApiKey, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.get("/api/admin/users", verifyAdminApiKey, async (_req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        dealership: u.dealership,
        phone: u.phone,
        isActive: u.isActive,
        createdAt: u.createdAt,
      })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/users/:id", verifyAdminApiKey, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const overlays = await storage.getUserOverlays(user.id);
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        dealership: user.dealership,
        phone: user.phone,
        isActive: user.isActive,
        overlays: overlays.map(o => o.id),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.put("/api/admin/users/:id/overlays", verifyAdminApiKey, async (req: Request, res: Response) => {
    try {
      const { overlayIds } = req.body;
      if (!Array.isArray(overlayIds)) {
        return res.status(400).json({ error: "overlayIds must be an array" });
      }

      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.setUserOverlays(user.id, overlayIds);
      res.json({ success: true, overlayIds });
    } catch (error) {
      console.error("Set user overlays error:", error);
      res.status(500).json({ error: "Failed to set user overlays" });
    }
  });

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
      
      console.log("Submission received - clientName:", req.body.clientName, "companyName:", req.body.companyName);
      
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
          
          const chatMessage = isVideo ? {
            text: `*New Video Submission*\n\n` +
              `*Submitted by:* ${clientName}\n` +
              `*Dealership:* ${companyName}\n` +
              `*AI Caption:* ${caption || "No caption provided"}\n\n` +
              `View video: ${mediaFullUrl}`,
          } : {
            cards: [{
              header: {
                title: "New Photo Submission",
                subtitle: `From ${clientName} at ${companyName}`,
              },
              sections: [
                {
                  widgets: [
                    {
                      image: {
                        imageUrl: mediaFullUrl,
                      },
                    },
                  ],
                },
                {
                  widgets: [
                    {
                      keyValue: {
                        topLabel: "Submitted by",
                        content: clientName,
                      },
                    },
                    {
                      keyValue: {
                        topLabel: "Dealership",
                        content: companyName,
                      },
                    },
                    {
                      keyValue: {
                        topLabel: "AI Caption",
                        content: caption || "No caption provided",
                        contentMultiline: true,
                      },
                    },
                  ],
                },
                {
                  widgets: [
                    {
                      buttons: [
                        {
                          textButton: {
                            text: "VIEW FULL IMAGE",
                            onClick: {
                              openLink: {
                                url: mediaFullUrl,
                              },
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            }],
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
