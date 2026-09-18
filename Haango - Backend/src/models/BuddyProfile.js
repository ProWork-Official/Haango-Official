import mongoose from 'mongoose';

const availabilitySchema = new mongoose.Schema(
  {
    day: { type: String, required: true, trim: true },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    isAvailable: { type: Boolean, default: true },
  },
  { _id: false }
);

const buddyProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    displayName: { type: String, trim: true, maxlength: 100, default: '' },
    age: { type: Number, min: 18, max: 120, default: null },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'],
      default: 'PREFER_NOT_TO_SAY',
    },
    about: { type: String, trim: true, maxlength: 2000, default: '' },
    summary: { type: String, trim: true, maxlength: 300, default: '' },
    tagline: { type: String, trim: true, maxlength: 300, default: '' },
    city: { type: String, trim: true, maxlength: 100, default: '', index: true },
    location: { type: String, trim: true, maxlength: 100, default: '' },
    languages: [{ type: String, trim: true }],
    hobbies: [{ type: String, trim: true }],
    interests: [{ type: String, trim: true }],
    activities: [{ type: String, trim: true }],
    hourlyRate: { type: Number, min: 0, default: 300 },
    availability: { type: [availabilitySchema], default: [] },
    responseTime: { type: String, trim: true, maxlength: 200, default: '' },
    showOnFindCompanions: { type: Boolean, default: true, index: true },
    girlsOnly: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true, index: true },
    available: { type: Boolean, default: true },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'SUSPENDED'],
      default: 'PENDING',
      index: true,
    },
    verified: { type: Boolean, default: false },
    profileCompletion: { type: Number, min: 0, max: 100, default: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviewCount: { type: Number, min: 0, default: 0 },
    completedBookings: { type: Number, min: 0, default: 0 },
    profileImages: [{ type: String, trim: true }],
    gallery: [{ type: String, trim: true }],
    reviews: [{ type: mongoose.Schema.Types.Mixed }],
  },
  { timestamps: true }
);

buddyProfileSchema.methods.toPublicObject = function toPublicObject() {
  const profile = this.toObject();
  const user = profile.userId && typeof profile.userId === 'object' ? profile.userId : null;
  const gallery = Array.isArray(profile.profileImages) && profile.profileImages.length
    ? profile.profileImages
    : Array.isArray(profile.gallery) && profile.gallery.length
      ? profile.gallery
      : (user?.profileImage ? [user.profileImage] : []);
  const interests = Array.isArray(profile.interests) && profile.interests.length
    ? profile.interests
    : (Array.isArray(profile.hobbies) ? profile.hobbies : []);

  return {
    ...profile,
    id: profile._id,
    name: profile.displayName || user?.name || 'Buddy',
    tagline: profile.tagline || profile.summary || '',
    gallery,
    profileImages: gallery,
    interests,
    hobbies: interests,
    activities: Array.isArray(profile.activities) ? profile.activities : [],
    verified: profile.verificationStatus === 'VERIFIED' || Boolean(profile.verified),
    available: profile.isAvailable !== false && profile.available !== false,
    location: profile.location || profile.city || user?.city || 'Unknown city',
    pricePerHour: Number(profile.hourlyRate ?? 300),
  };
};

export default mongoose.model('BuddyProfile', buddyProfileSchema);