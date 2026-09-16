import crypto from 'node:crypto';
import Booking from '../models/Booking.js';
import Wallet from '../models/Wallet.js';
import Withdrawal from '../models/Withdrawal.js';
import User from '../models/User.js';
import { env } from '../config/environment.js';
import { badRequest, forbidden, notFound } from '../utils/errors.js';
import { recordAdminAction } from './adminAuditService.js';

const MIN_WITHDRAWAL = 100;
const ACTIVE_WITHDRAWAL_STATUSES = ['PENDING', 'PROCESSING', 'PAID'];

function assertRazorpayXConfigured() {
  if (!env.razorpayXKeyId || !env.razorpayXKeySecret || !env.razorpayXAccountNumber) {
    throw badRequest('Automatic payouts are not configured. Add RazorpayX payout credentials.', 'PAYOUT_NOT_CONFIGURED');
  }
}

async function razorpayXRequest(path, options = {}) {
  assertRazorpayXConfigured();
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${env.razorpayXKeyId}:${env.razorpayXKeySecret}`).toString('base64')}`,
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw badRequest(payload?.error?.description || 'RazorpayX payout request failed', 'PAYOUT_PROVIDER_ERROR');
  }
  return payload;
}

function maskAccountNumber(accountNumber) {
  const value = String(accountNumber || '');
  return value.length > 4 ? `•••• ${value.slice(-4)}` : value;
}

function maskUpiId(upiId) {
  const value = String(upiId || '');
  const [name, domain] = value.split('@');
  return name && domain ? `${name.slice(0, 2)}•••@${domain}` : value;
}

function toSafeWallet(wallet) {
  if (!wallet) return null;
  return {
    id: wallet._id,
    payoutMethod: wallet.payoutMethod,
    accountHolderName: wallet.accountHolderName,
    bankName: wallet.bankName,
    ifscCode: wallet.ifscCode,
    upiId: wallet.upiId,
    destinationMasked: wallet.payoutMethod === 'UPI'
      ? maskUpiId(wallet.upiId)
      : maskAccountNumber(wallet.accountNumber),
    isVerified: wallet.isVerified,
  };
}

async function getWalletDocument(userId) {
  return Wallet.findOne({ userId }).select('+accountNumber');
}

async function getEarnings(userId) {
  const [earningsResult, withdrawalsResult] = await Promise.all([
    Booking.aggregate([
      {
        $match: {
          buddyId: userId,
          paymentStatus: 'PAID',
          bookingStatus: 'COMPLETED',
        },
      },
      {
        $group: {
          _id: null,
          totalEarned: { $sum: { $multiply: [{ $multiply: ['$buddyRate', '$duration'] }, 0.8] } },
        },
      },
    ]),
    Withdrawal.aggregate([
      { $match: { userId, status: { $in: ACTIVE_WITHDRAWAL_STATUSES } } },
      { $group: { _id: null, totalWithdrawn: { $sum: '$amount' } } },
    ]),
  ]);

  const totalEarned = earningsResult[0]?.totalEarned || 0;
  const totalWithdrawn = withdrawalsResult[0]?.totalWithdrawn || 0;
  return {
    totalEarned,
    totalWithdrawn,
    availableBalance: Math.max(0, totalEarned - totalWithdrawn),
  };
}

export async function getWalletSummary(userId) {
  const [wallet, earnings, withdrawals] = await Promise.all([
    getWalletDocument(userId),
    getEarnings(userId),
    Withdrawal.find({ userId }).sort({ createdAt: -1 }).limit(20),
  ]);

  return {
    wallet: toSafeWallet(wallet),
    ...earnings,
    withdrawals,
    minimumWithdrawal: MIN_WITHDRAWAL,
  };
}

export async function savePayoutDetails(userId, data) {
  const payoutMethod = String(data.payoutMethod || '').toUpperCase();
  const accountHolderName = String(data.accountHolderName || '').trim();
  const bankName = String(data.bankName || '').trim();
  const accountNumber = String(data.accountNumber || '').replace(/\s/g, '');
  const ifscCode = String(data.ifscCode || '').trim().toUpperCase();
  const upiId = String(data.upiId || '').trim().toLowerCase();

  if (!['BANK', 'UPI'].includes(payoutMethod)) {
    throw badRequest('Choose a valid payout method', 'INVALID_PAYOUT_METHOD');
  }
  if (accountHolderName.length < 2) throw badRequest('Account holder name is required', 'INVALID_ACCOUNT_HOLDER');

  if (payoutMethod === 'BANK') {
    if (!bankName || !/^\d{6,30}$/.test(accountNumber)) {
      throw badRequest('Enter a valid bank name and account number', 'INVALID_BANK_DETAILS');
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
      throw badRequest('Enter a valid IFSC code', 'INVALID_IFSC');
    }
  }

  if (payoutMethod === 'UPI' && !/^[\w.-]{2,}@[\w.-]{2,}$/.test(upiId)) {
    throw badRequest('Enter a valid UPI ID', 'INVALID_UPI_ID');
  }

  const wallet = await Wallet.findOneAndUpdate(
    { userId },
    {
      userId,
      payoutMethod,
      accountHolderName,
      bankName: payoutMethod === 'BANK' ? bankName : '',
      accountNumber: payoutMethod === 'BANK' ? accountNumber : '',
      ifscCode: payoutMethod === 'BANK' ? ifscCode : '',
      upiId: payoutMethod === 'UPI' ? upiId : '',
      razorpayXContactId: '',
      razorpayXBankFundAccountId: '',
      razorpayXUpiFundAccountId: '',
      isVerified: false,
    },
    { upsert: true, new: true, runValidators: true }
  ).select('+accountNumber');

  return toSafeWallet(wallet);
}

async function ensureRazorpayXFundAccount(wallet, user) {
  assertRazorpayXConfigured();

  let contactId = wallet.razorpayXContactId;
  if (!contactId) {
    const contact = await razorpayXRequest('/contacts', {
      method: 'POST',
      body: JSON.stringify({
        name: wallet.accountHolderName,
        email: user.email,
        contact: user.phone,
        type: 'vendor',
        reference_id: `haango_${String(user._id).slice(-24)}`,
      }),
    });
    contactId = contact.id;
    wallet.razorpayXContactId = contactId;
    await wallet.save();
  }

  const fundAccountField = wallet.payoutMethod === 'UPI'
    ? 'razorpayXUpiFundAccountId'
    : 'razorpayXBankFundAccountId';
  let fundAccountId = wallet[fundAccountField];
  if (!fundAccountId) {
    const account = wallet.payoutMethod === 'UPI'
      ? { account_type: 'vpa', vpa: { address: wallet.upiId } }
      : {
        account_type: 'bank_account',
        bank_account: {
          name: wallet.accountHolderName,
          ifsc: wallet.ifscCode,
          account_number: wallet.accountNumber,
        },
      };
    const fundAccount = await razorpayXRequest('/fund_accounts', {
      method: 'POST',
      body: JSON.stringify({ contact_id: contactId, ...account }),
    });
    fundAccountId = fundAccount.id;
    wallet[fundAccountField] = fundAccountId;
    await wallet.save();
  }

  return { contactId, fundAccountId };
}

async function createAutomaticPayout(withdrawal, wallet, user) {
  const { contactId, fundAccountId } = await ensureRazorpayXFundAccount(wallet, user);
  const payout = await razorpayXRequest('/payouts', {
    method: 'POST',
    body: JSON.stringify({
      account_number: env.razorpayXAccountNumber,
      fund_account_id: fundAccountId,
      amount: Math.round(withdrawal.amount * 100),
      currency: 'INR',
      mode: wallet.payoutMethod === 'UPI' ? 'UPI' : 'IMPS',
      purpose: 'payout',
      queue_if_low_balance: true,
      reference_id: `wd_${String(withdrawal._id).slice(-24)}`,
      narration: 'Haango companion earnings',
    }),
  });

  withdrawal.status = payout.status === 'processed' ? 'PAID' : 'PROCESSING';
  withdrawal.razorpayXContactId = contactId;
  withdrawal.razorpayXFundAccountId = fundAccountId;
  withdrawal.razorpayXPayoutId = payout.id;
  withdrawal.transactionReference = payout.utr || '';
  await withdrawal.save();
  return withdrawal;
}

export async function requestWithdrawal(userId, amount) {
  const wallet = await getWalletDocument(userId);
  if (!wallet?.payoutMethod) throw badRequest('Set up your payout details before withdrawing', 'PAYOUT_DETAILS_REQUIRED');

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < MIN_WITHDRAWAL) {
    throw badRequest(`Minimum withdrawal is ₹${MIN_WITHDRAWAL}`, 'MINIMUM_WITHDRAWAL');
  }

  const { availableBalance } = await getEarnings(userId);
  if (numericAmount > availableBalance) throw badRequest('Withdrawal amount exceeds your available balance', 'INSUFFICIENT_BALANCE');

  const destinationMasked = wallet.payoutMethod === 'UPI'
    ? maskUpiId(wallet.upiId)
    : maskAccountNumber(wallet.accountNumber);

  const user = await User.findById(userId).select('name email phone');
  if (!user) throw notFound('User not found');

  const withdrawal = await Withdrawal.create({
    userId,
    amount: Math.round(numericAmount),
    payoutMethod: wallet.payoutMethod,
    destinationMasked,
  });

  try {
    return await createAutomaticPayout(withdrawal, wallet, user);
  } catch (error) {
    withdrawal.status = 'REJECTED';
    withdrawal.failureReason = error.message || 'Automatic payout failed';
    await withdrawal.save();
    throw error;
  }
}

export async function handlePayoutWebhook(body, signature, rawBody) {
  assertRazorpayXConfigured();
  if (!env.razorpayXWebhookSecret) {
    throw badRequest('RazorpayX webhook secret is not configured', 'PAYOUT_WEBHOOK_NOT_CONFIGURED');
  }
  const expectedSignature = crypto.createHmac('sha256', env.razorpayXWebhookSecret)
    .update(rawBody || JSON.stringify(body))
    .digest('hex');
  if (expectedSignature !== signature) throw badRequest('Invalid RazorpayX webhook signature', 'INVALID_PAYOUT_WEBHOOK');

  const payout = body?.payload?.payout?.entity;
  if (!payout?.id) return;
  const withdrawal = await Withdrawal.findOne({ razorpayXPayoutId: payout.id });
  if (!withdrawal) return;

  if (body.event === 'payout.processed') {
    withdrawal.status = 'PAID';
    withdrawal.transactionReference = payout.utr || withdrawal.transactionReference;
  } else if (['payout.failed', 'payout.reversed'].includes(body.event)) {
    withdrawal.status = 'REJECTED';
    withdrawal.failureReason = payout.failure_reason || body.event;
  } else if (['payout.pending', 'payout.queued', 'payout.processing'].includes(body.event)) {
    withdrawal.status = 'PROCESSING';
  }
  await withdrawal.save();
}

export async function getAllWithdrawals(filters = {}) {
  const query = {};
  if (filters.status) query.status = filters.status;
  return Withdrawal.find(query)
    .populate('userId', 'name email phone')
    .sort({ createdAt: -1 })
    .limit(Number(filters.limit) || 50);
}

export async function updateWithdrawal(withdrawalId, status, adminNote, transactionReference, actor, request) {
  if (!['PROCESSING', 'PAID', 'REJECTED'].includes(status)) {
    throw badRequest('Invalid withdrawal status', 'INVALID_WITHDRAWAL_STATUS');
  }
  const withdrawal = await Withdrawal.findById(withdrawalId);
  if (!withdrawal) throw notFound('Withdrawal not found');
  if (withdrawal.status === 'PAID') throw badRequest('Paid withdrawal cannot be changed', 'WITHDRAWAL_ALREADY_PAID');

  withdrawal.status = status;
  if (adminNote !== undefined) withdrawal.adminNote = String(adminNote).trim();
  if (transactionReference !== undefined) withdrawal.transactionReference = String(transactionReference).trim();
  await withdrawal.save();
  await recordAdminAction({ actor, request, action: 'WITHDRAWAL_DECISION', targetType: 'Withdrawal', targetId: withdrawal._id, metadata: { status } });
  return withdrawal;
}

export function assertWalletOwner(walletUserId, userId) {
  if (String(walletUserId) !== String(userId)) throw forbidden('Not your wallet');
}
