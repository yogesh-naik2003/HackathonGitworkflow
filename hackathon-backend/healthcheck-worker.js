// Environment variables are loaded via docker-compose's env_file
const mongoose = require("mongoose");
const Redis = require("ioredis");

async function checkWorkerHealth() {
  let redisClient;
  try {
    // 1. Check MongoDB connection
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Worker Health Check: MongoDB Connected.');
    await mongoose.disconnect(); // Disconnect immediately

    // 2. Check Redis (BullMQ) connection
    let redisClientOptions;
    if (process.env.REDIS_URL) {
      redisClientOptions = { url: process.env.REDIS_URL };
    } else {
      redisClientOptions = {
          host: process.env.REDIS_HOST || 'redis',
          port: parseInt(process.env.REDIS_PORT || '6379'),
      };
    }
    // Common options for both URL and host/port
    redisClientOptions = { ...redisClientOptions, connectTimeout: 5000, maxRetriesPerRequest: null, enableOfflineQueue: false };
    redisClient = new Redis(redisClientOptions);

    // Explicitly wait for the 'ready' event to confirm successful connection
    await new Promise((resolve, reject) => {
      redisClient.on('ready', resolve);
      redisClient.on('error', reject);
      // Also add a timeout in case 'ready' never fires
      setTimeout(() => reject(new Error('Redis connection timed out in health check')), redisOptions.connectTimeout + 1000); // 1 second buffer
    });

    await redisClient.ping();
    console.log('Worker Health Check: Redis Connected.');
    await redisClient.disconnect();

    process.exit(0); // Success
  } catch (error) {
    console.error('Worker Health Check failed:', error.message);
    if (redisClient) redisClient.disconnect(); // Ensure client is closed on error
    process.exit(1); // Failure
  }
}

checkWorkerHealth();