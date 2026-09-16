import mongoose from 'mongoose';
import { env } from './environment.js';

let isConnected = false;

export async function connectDatabase() {
  if (!env.mongodbUri) {
    console.warn('⚠ MONGODB_URI not configured. Backend will start but database operations will fail.');
    console.warn('  Set MONGODB_URI in backend/.env to connect to MongoDB Atlas.');
    return false;
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.mongodbUri);
    isConnected = true;
    console.log('✓ MongoDB connected');

    mongoose.connection.on('error', (err) => {
      console.error('✗ MongoDB connection error:', err.message);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠ MongoDB disconnected');
      isConnected = false;
    });

    return true;
  } catch (err) {
    console.error('✗ MongoDB connection failed:', err.message);
    return false;
  }
}

export function getDbStatus() {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
}
