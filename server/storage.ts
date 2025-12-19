import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  overlays,
  submissions,
  type User,
  type InsertUser,
  type Overlay,
  type InsertOverlay,
  type Submission,
  type InsertSubmission,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getOverlays(): Promise<Overlay[]>;
  getActiveOverlays(): Promise<Overlay[]>;
  getOverlay(id: string): Promise<Overlay | undefined>;
  createOverlay(overlay: InsertOverlay): Promise<Overlay>;
  updateOverlay(id: string, overlay: Partial<InsertOverlay>): Promise<Overlay | undefined>;
  deleteOverlay(id: string): Promise<boolean>;
  
  getSubmissions(): Promise<Submission[]>;
  getSubmission(id: string): Promise<Submission | undefined>;
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  updateSubmissionStatus(id: string, status: string): Promise<Submission | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getOverlays(): Promise<Overlay[]> {
    return db.select().from(overlays).orderBy(desc(overlays.createdAt));
  }

  async getActiveOverlays(): Promise<Overlay[]> {
    return db.select().from(overlays).where(eq(overlays.isActive, true)).orderBy(desc(overlays.createdAt));
  }

  async getOverlay(id: string): Promise<Overlay | undefined> {
    const [overlay] = await db.select().from(overlays).where(eq(overlays.id, id));
    return overlay;
  }

  async createOverlay(overlay: InsertOverlay): Promise<Overlay> {
    const [newOverlay] = await db.insert(overlays).values(overlay).returning();
    return newOverlay;
  }

  async updateOverlay(id: string, overlay: Partial<InsertOverlay>): Promise<Overlay | undefined> {
    const [updated] = await db
      .update(overlays)
      .set({ ...overlay, updatedAt: new Date() })
      .where(eq(overlays.id, id))
      .returning();
    return updated;
  }

  async deleteOverlay(id: string): Promise<boolean> {
    const result = await db.delete(overlays).where(eq(overlays.id, id)).returning();
    return result.length > 0;
  }

  async getSubmissions(): Promise<Submission[]> {
    return db.select().from(submissions).orderBy(desc(submissions.createdAt));
  }

  async getSubmission(id: string): Promise<Submission | undefined> {
    const [submission] = await db.select().from(submissions).where(eq(submissions.id, id));
    return submission;
  }

  async createSubmission(submission: InsertSubmission): Promise<Submission> {
    const [newSubmission] = await db.insert(submissions).values(submission).returning();
    return newSubmission;
  }

  async updateSubmissionStatus(id: string, status: string): Promise<Submission | undefined> {
    const [updated] = await db
      .update(submissions)
      .set({ status })
      .where(eq(submissions.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
