import EmailUnsubscribe from '../models/EmailUnsubscribe.js';
import { getEmailFromUnsubscribeToken } from '../utils/emailUnsubscribeToken.js';
import { success } from '../utils/response.js';

export async function unsubscribe(req, res, next) {
  try {
    const email = getEmailFromUnsubscribeToken(req.body?.token);
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'This unsubscribe link is invalid. Please contact support for help.',
        errorCode: 'INVALID_UNSUBSCRIBE_LINK',
      });
    }

    await EmailUnsubscribe.findOneAndUpdate(
      { email },
      { $set: { optedOutAt: new Date() }, $setOnInsert: { email } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return res.json(success({ unsubscribed: true }));
  } catch (error) {
    return next(error);
  }
}

export async function getPreferences(req, res, next) {
  try {
    const preference = await EmailUnsubscribe.findOne({ email: req.user.email })
      .select('optedOutAt')
      .lean();
    return res.json(success({ subscribed: !preference?.optedOutAt }));
  } catch (error) {
    return next(error);
  }
}

export async function resubscribe(req, res, next) {
  try {
    await EmailUnsubscribe.findOneAndUpdate(
      { email: req.user.email },
      { $set: { optedOutAt: null } },
    );
    return res.json(success({ subscribed: true }));
  } catch (error) {
    return next(error);
  }
}

export default { unsubscribe, getPreferences, resubscribe };
