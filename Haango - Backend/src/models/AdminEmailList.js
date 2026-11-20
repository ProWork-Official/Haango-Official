import mongoose from 'mongoose';
import { MAX_BULK_EMAIL_RECIPIENTS } from '../utils/emailRecipientList.js';

const adminEmailListSchema = new mongoose.Schema(
  {
    listNumber: { type: Number, required: true, unique: true, min: 1, index: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    isDeleted: { type: Boolean, default: false, index: true },
    emails: {
      type: [{
        type: String,
        trim: true,
        lowercase: true,
        match: [/^[^\s@]+@gmail\.com$/, 'List addresses must be Gmail addresses'],
      }],
      validate: {
        validator: (emails) => emails.length <= MAX_BULK_EMAIL_RECIPIENTS,
        message: `A list can contain no more than ${MAX_BULK_EMAIL_RECIPIENTS} addresses.`,
      },
      default: [],
    },
  },
  { timestamps: true },
);

export default mongoose.model('AdminEmailList', adminEmailListSchema);
