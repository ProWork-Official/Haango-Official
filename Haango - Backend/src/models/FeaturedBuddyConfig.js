import mongoose from 'mongoose';

const featuredBuddyConfigSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'home-hero' },
    pinnedBuddyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BuddyProfile' }],
    selectedBuddyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BuddyProfile' }],
    selectedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('FeaturedBuddyConfig', featuredBuddyConfigSchema);
