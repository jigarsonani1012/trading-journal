import mongoose from "mongoose";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

let retries = 0;

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set in environment variables.");

  mongoose.connection.on("connected", () =>
    console.log("✅ MongoDB connected successfully.")
  );
  mongoose.connection.on("error", (err) =>
    console.error("❌ MongoDB connection error:", err)
  );
  mongoose.connection.on("disconnected", () =>
    console.warn("⚠️  MongoDB disconnected.")
  );

  // Graceful shutdown
  process.on("SIGINT", async () => {
    await mongoose.connection.close();
    console.log("🔒 MongoDB connection closed on app termination.");
    process.exit(0);
  });

  await tryConnect(uri);
}

async function tryConnect(uri: string): Promise<void> {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  } catch (err) {
    retries++;
    if (retries < MAX_RETRIES) {
      console.warn(
        `⚠️  MongoDB connection failed. Retry ${retries}/${MAX_RETRIES} in ${RETRY_DELAY_MS / 1000}s...`
      );
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      return tryConnect(uri);
    }
    console.error("❌ Max retries reached. Could not connect to MongoDB.");
    throw err;
  }
}
