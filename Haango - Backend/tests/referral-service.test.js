import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getReferralProgress,
  getReferralRewardReference,
  isQualifyingReferralBooking,
  MINIMUM_REFERRAL_BOOKING,
  REFERRAL_REWARD,
} from '../src/services/referralService.js';

test('referral reward uses the ₹100 amount and ₹500 minimum booking threshold', () => {
  assert.equal(REFERRAL_REWARD, 100);
  assert.equal(MINIMUM_REFERRAL_BOOKING, 500);
  assert.equal(isQualifyingReferralBooking({ bookingStatus: 'COMPLETED', totalAmount: 500 }), true);
  assert.equal(isQualifyingReferralBooking({ bookingStatus: 'COMPLETED', totalAmount: 499 }), false);
  assert.equal(isQualifyingReferralBooking({ bookingStatus: 'ONGOING', totalAmount: 500 }), false);
});

test('referral progress advances from signup to eligible to claimed', () => {
  assert.equal(getReferralProgress(null), 'SIGNED_UP');
  assert.equal(getReferralProgress({ _id: 'booking-id' }), 'ELIGIBLE_TO_CLAIM');
  assert.equal(getReferralProgress({ _id: 'booking-id' }, { _id: 'transaction-id' }), 'CLAIMED');
});

test('claim transaction reference is stable per referred account', () => {
  assert.equal(getReferralRewardReference('user-123'), 'referral-first-booking-user-123');
});