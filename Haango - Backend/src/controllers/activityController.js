import Activity from '../models/Activity.js';
import { success } from '../utils/response.js';
import { notFound } from '../utils/errors.js';

const bookingActivities = [
  {
    name: 'Movie Night',
    slug: 'movie',
    emoji: '🎬',
    description: 'Catch the latest blockbuster or a cult classic together.',
    order: 1,
  },
  {
    name: 'Coffee & Conversations',
    slug: 'coffee',
    emoji: '☕',
    description: 'Flat whites, filter coffee, and no awkward silences.',
    order: 2,
  },
  {
    name: 'Lunch / Dinner',
    slug: 'dining',
    emoji: '🍽️',
    description: 'Good food, better company, zero solo-table awkwardness.',
    order: 3,
  },
  {
    name: 'Gaming',
    slug: 'gaming',
    emoji: '🎮',
    description: 'Co-op, competitive, or just chilling together.',
    order: 4,
  },
  {
    name: 'Shopping',
    slug: 'shopping',
    emoji: '🛍️',
    description: 'A second opinion that actually has taste.',
    order: 5,
  },
  {
    name: 'Date',
    slug: 'date',
    emoji: '💐',
    description: 'Plan a relaxed date with good company.',
    order: 8,
  },
  {
    name: 'City Travel',
    slug: 'city-travel',
    emoji: '🚶',
    description: 'Explore the city and discover new places together.',
    order: 9,
  },
];

export async function getActivities(_req, res, next) {
  try {
    await Promise.all(bookingActivities.map((activity) => Activity.updateOne(
      { slug: activity.slug },
      { $setOnInsert: activity },
      { upsert: true },
    )));
    const activities = await Activity.find({ isActive: true }).sort({ order: 1 });
    res.json(success(activities));
  } catch (err) {
    next(err);
  }
}

export async function getActivityById(req, res, next) {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) throw notFound('Activity not found');
    res.json(success(activity));
  } catch (err) {
    next(err);
  }
}
