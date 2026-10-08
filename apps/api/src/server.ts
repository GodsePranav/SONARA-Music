import mongoose from "mongoose";
import { createClient } from "redis";
import { app } from "./app.js";
import { env } from "./config.js";

async function start(): Promise<void> {
  const previewMemory = process.argv.includes("--preview-memory");
  if (previewMemory && env.NODE_ENV !== "development") {
    throw new Error("The in-memory preview database is only available in development.");
  }

  let memoryMongo: { stop: () => Promise<boolean> } | null = null;
  if (previewMemory) {
    const { MongoMemoryServer } = await import("mongodb-memory-server-core");
    const instance = await MongoMemoryServer.create({
      binary: { version: "7.0.14" },
    });
    memoryMongo = instance;
    await mongoose.connect(instance.getUri("sonara"));
    console.info("Using a temporary in-memory MongoDB for local preview.");
  } else {
    await mongoose.connect(env.MONGODB_URI);
  }

  const redis = previewMemory ? null : createClient({ url: env.REDIS_URL });
  if (redis) {
    redis.on("error", (error: Error) =>
      console.error("Redis client error", error.message),
    );
    await redis.connect();
  }
  const server = app.listen(env.API_PORT, () =>
    console.info(`SONARA API listening on ${env.API_PORT}`),
  );
  const shutdown = async (): Promise<void> => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await Promise.allSettled([
      mongoose.disconnect(),
      ...(redis ? [redis.quit()] : []),
      ...(memoryMongo ? [memoryMongo.stop()] : []),
    ]);
  };
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
}

start().catch((error: unknown) => {
  console.error("Unable to start SONARA API", error);
  process.exitCode = 1;
});
