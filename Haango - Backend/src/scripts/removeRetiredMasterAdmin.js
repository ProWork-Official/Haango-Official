import mongoose from 'mongoose';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import OtpRequest from '../models/OtpRequest.js';
import PushSubscription from '../models/PushSubscription.js';
import { RETIRED_MASTER_ADMIN_EMAIL } from '../config/adminAccounts.js';
import { removeRetiredMasterAdmin } from '../utils/removeRetiredMasterAdmin.js';

const confirmationFlag = '--confirm-remove-retired-master-admin';

if (!process.argv.includes(confirmationFlag)) {
  console.error(`Refusing to remove the retired master admin. Re-run with ${confirmationFlag} to confirm.`);
  process.exitCode = 1;
} else {
  try {
    const { connectDatabase, getDbStatus } = await import('../config/database.js');
    const connected = await connectDatabase();
    if (!connected || getDbStatus() !== 'connected') {
      throw new Error('MongoDB connection is unavailable; no data was changed.');
    }

    const result = await removeRetiredMasterAdmin({ User, RefreshToken, OtpRequest, PushSubscription });
    if (!result.removed) {
      console.log('Target account not found; no records were changed.');
    } else {
      console.log(`Removed the retired master admin account (${RETIRED_MASTER_ADMIN_EMAIL}).`);
      console.log(`Deleted ${result.refreshTokens} refresh sessions, ${result.otpRequests} OTP requests, and ${result.pushSubscriptions} push subscriptions.`);
    }
  } catch (error) {
    console.error(`Unable to remove the retired master admin: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  }
}
