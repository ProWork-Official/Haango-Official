import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    subtitle: { type: String, trim: true, maxlength: 300, default: '' },
    slug: { type: String, trim: true, lowercase: true, maxlength: 180, unique: true, sparse: true, index: true },
    metaTitle: { type: String, trim: true, maxlength: 160, default: '' },
    metaDescription: { type: String, trim: true, maxlength: 320, default: '' },
    introduction: { type: String, trim: true, maxlength: 5000, default: '' },
    body: { type: String, required: true, trim: true, maxlength: 50000 },
    image: { type: String, required: true, maxlength: 2_000_000 },
    contentBlocks: {
      type: [{
        type: { type: String, enum: ['text', 'heading', 'image'], required: true },
        text: { type: String, trim: true, maxlength: 12000, default: '' },
        image: { type: String, maxlength: 2_000_000, default: '' },
        alt: { type: String, trim: true, maxlength: 240, default: '' },
        level: { type: Number, enum: [2, 3], default: 2 },
      }],
      default: [],
    },
  },
  { timestamps: true }
);

blogSchema.index({ createdAt: -1 });

export default mongoose.model('Blog', blogSchema);
