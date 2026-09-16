import * as messageService from '../services/messageService.js';
import { success } from '../utils/response.js';

export async function getMessages(req, res, next) {
  try {
    const messages = await messageService.getConversationMessages(req.params.bookingId, req.user._id);
    res.json(success(messages));
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req, res, next) {
  try {
    const message = await messageService.sendMessage(req.params.bookingId, req.user._id, req.body.message);
    res.status(201).json(success(message));
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req, res, next) {
  try {
    const message = await messageService.markMessageAsRead(req.params.id, req.user._id);
    res.json(success(message));
  } catch (err) {
    next(err);
  }
}

export async function getConversations(_req, res, next) {
  try {
    const conversations = await messageService.getConversations(_req.user._id);
    res.json(success(conversations));
  } catch (err) {
    next(err);
  }
}
