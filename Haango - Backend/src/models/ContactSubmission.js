import mongoose from 'mongoose';

const contactSubmissionSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ['SHARED', 'DECLINED'], required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    userName: { type: String, default: null, trim: true, maxlength: 100 },
    userEmail: { type: String, default: null, trim: true, lowercase: true, maxlength: 254 },
    sessionId: { type: String, required: true, trim: true, maxlength: 128, index: true },
    consentAt: { type: Date, default: null },
    contacts: {
      type: [{
        name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
        phone: { type: String, required: true, match: /^\+[1-9]\d{7,14}$/ },
      }],
      default: [],
      validate: {
        validator(contacts) {
          if (!Array.isArray(contacts)) return false;
          return this.status === 'DECLINED'
            ? contacts.length === 0
            : contacts.length >= 1 && contacts.length <= 1000;
        },
        message: 'Shared submissions must contain 1 to 1000 contacts; declined submissions must contain none.',
      },
    },
    location: {
      country: { type: String, maxlength: 80 },
      region: { type: String, maxlength: 80 },
      city: { type: String, maxlength: 80 },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model('ContactSubmission', contactSubmissionSchema);
