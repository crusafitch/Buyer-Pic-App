import { eq, desc, and } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  overlays,
  submissions,
  userOverlays,
  type User,
  type InsertUser,
  type Overlay,
  type InsertOverlay,
  type Submission,
  type InsertSubmission,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  
  getUserOverlays(userId: string): Promise<Overlay[]>;
  assignOverlayToUser(userId: string, overlayId: string): Promise<void>;
  removeOverlayFromUser(userId: string, overlayId: string): Promise<void>;
  setUserOverlays(userId: string, overlayIds: string[]): Promise<void>;
  
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserOverlays(userId: string): Promise<Overlay[]> {
    const assignments = await db
      .select({ overlay: overlays })
      .from(userOverlays)
      .innerJoin(overlays, eq(userOverlays.overlayId, overlays.id))
      .where(and(eq(userOverlays.userId, userId), eq(overlays.isActive, true)));
    return assignments.map(a => a.overlay);
  }

  async assignOverlayToUser(userId: string, overlayId: string): Promise<void> {
    await db.insert(userOverlays).values({ userId, overlayId }).onConflictDoNothing();
  }

  async removeOverlayFromUser(userId: string, overlayId: string): Promise<void> {
    await db.delete(userOverlays).where(
      and(eq(userOverlays.userId, userId), eq(userOverlays.overlayId, overlayId))
    );
  }

  async setUserOverlays(userId: string, overlayIds: string[]): Promise<void> {
    await db.delete(userOverlays).where(eq(userOverlays.userId, userId));
    if (overlayIds.length > 0) {
      await db.insert(userOverlays).values(
        overlayIds.map(overlayId => ({ userId, overlayId }))
      );
    }
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
