import mongoose from 'mongoose';
import Blog from '../models/Blog.js';
import { notFound } from '../utils/errors.js';

function findBlogById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw notFound('Blog post not found');
  return Blog.findById(id);
}

export async function listBlogs() {
  return Blog.find().sort({ createdAt: -1 });
}

export async function getBlog(id) {
  const blog = await findBlogById(id);
  if (!blog) throw notFound('Blog post not found');
  return blog;
}

export async function createBlog(fields) {
  return Blog.create(fields);
}

export async function updateBlog(id, fields) {
  const blog = await findBlogById(id);
  if (!blog) throw notFound('Blog post not found');
  blog.set(fields);
  await blog.save();
  return blog;
}

export async function deleteBlog(id) {
  const blog = await findBlogById(id);
  if (!blog) throw notFound('Blog post not found');
  await blog.deleteOne();
  return { id: blog._id };
}
