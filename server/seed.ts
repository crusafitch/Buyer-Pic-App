import { db } from "./db";
import { overlays } from "@shared/schema";

const initialOverlays = [
  {
    name: "Red White & Blue Sales Event",
    imageUrl: "/uploads/overlays/red-white-blue.png",
    isActive: true,
  },
  {
    name: "Back to School Savings",
    imageUrl: "/uploads/overlays/back-to-school.png",
    isActive: true,
  },
  {
    name: "Rocktober Event",
    imageUrl: "/uploads/overlays/rocktober.png",
    isActive: true,
  },
];

async function seed() {
  console.log("Seeding overlays...");
  
  for (const overlay of initialOverlays) {
    await db.insert(overlays).values(overlay).onConflictDoNothing();
  }
  
  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
