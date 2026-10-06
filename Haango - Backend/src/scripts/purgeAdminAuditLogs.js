import mongoose from 'mongoose';
import { connectDatabase, getDbStatus } from '../config/database.js';

const confirmationFlag = '--confirm-purge-admin-audit-logs';
const collectionName = 'adminauditlogs';

if (!process.argv.includes(confirmationFlag)) {
  console.error(`Refusing to purge audit history. Re-run with ${confirmationFlag} to confirm.`);
  process.exitCode = 1;
} else {
  try {
    const connected = await connectDatabase();
    if (!connected || getDbStatus() !== 'connected') {
      throw new Error('MongoDB connection is unavailable; no data was changed.');
    }

    const collections = await mongoose.connection.db.listCollections({ name: collectionName }, { nameOnly: true }).toArray();
    if (!collections.length) {
      console.log(`Collection ${collectionName} does not exist; nothing to purge.`);
    } else {
      await mongoose.connection.dropCollection(collectionName);
      console.log(`Dropped ${collectionName}.`);
    }
  } catch (error) {
    console.error(`Unable to purge ${collectionName}: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  }
}