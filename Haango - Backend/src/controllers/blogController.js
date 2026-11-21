import * as blogService from '../services/blogService.js';
import { success } from '../utils/response.js';

export async function listBlogs(_req, res, next) {
  try {
    res.json(success(await blogService.listBlogs()));
  } catch (err) {
    next(err);
  }
}

export async function getBlog(req, res, next) {
  try {
    res.json(success(await blogService.getBlog(req.params.id)));
  } catch (err) {
    next(err);
  }
}

export async function createBlog(req, res, next) {
  try {
    res.status(201).json(success(await blogService.createBlog(req.body)));
  } catch (err) {
    next(err);
  }
}

export async function updateBlog(req, res, next) {
  try {
    res.json(success(await blogService.updateBlog(req.params.id, req.body)));
  } catch (err) {
    next(err);
  }
}

export async function deleteBlog(req, res, next) {
  try {
    res.json(success(await blogService.deleteBlog(req.params.id)));
  } catch (err) {
    next(err);
  }
}
