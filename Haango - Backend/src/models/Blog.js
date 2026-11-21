import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, required: true, trim: true, maxlength: 50000 },
    image: { type: String, required: true, maxlength: 2_000_000 },
  },
  { timestamps: true }
);

blogSchema.index({ createdAt: -1 });

export default mongoose.model('Blog', blogSchema);
