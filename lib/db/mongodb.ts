import mongoose from 'mongoose';

const SHARED_EROGRAM_DB = 'erogram';

const baseOptions: mongoose.ConnectOptions = {
  family: 4,
  maxPoolSize: 10,
  minPoolSize: 0,
  maxIdleTimeMS: 10000,
  serverSelectionTimeoutMS: 8000,
  connectTimeoutMS: 8000,
  socketTimeoutMS: 20000,
  bufferCommands: false,
};

function mongoDbName(): string {
  const dbName = process.env.MONGODB_DB?.trim() || '';
  if (!dbName) {
    throw new Error('MONGODB_DB is required and must be a dedicated database (not the shared Erogram DB).');
  }
  if (dbName === SHARED_EROGRAM_DB) {
    throw new Error('MONGODB_DB must not be "erogram". Use a dedicated database such as "slutbot".');
  }
  return dbName;
}

function connectOptions(): mongoose.ConnectOptions {
  return { ...baseOptions, dbName: mongoDbName() };
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const g = global as typeof globalThis & { __mongoose: MongooseCache };
if (!g.__mongoose) {
  g.__mongoose = { conn: null, promise: null };
}

function mongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
  }
  return uri;
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return g.__mongoose.conn ?? mongoose;
  }

  if ((mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) && !g.__mongoose.promise) {
    g.__mongoose.conn = null;
  }

  if (!g.__mongoose.promise) {
    g.__mongoose.promise = mongoose
      .connect(mongoUri(), connectOptions())
      .then((m) => {
        g.__mongoose.conn = m;
        return m;
      })
      .catch((err) => {
        g.__mongoose.promise = null;
        g.__mongoose.conn = null;
        throw err;
      });
  }

  return await g.__mongoose.promise;
}

export default connectDB;
