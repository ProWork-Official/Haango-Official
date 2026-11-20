import test from 'node:test';
import assert from 'node:assert/strict';
import User from '../src/models/User.js';
import EmailUnsubscribe from '../src/models/EmailUnsubscribe.js';

import { getAdminCampaignTemplates, previewAdminCampaignEmail } from '../src/services/emailService.js';
import { previewCampaign, sendCampaign, sendCampaignToRecipients } from '../src/services/adminEmailService.js';
import { getEmailFromCampaignAttributionToken } from '../src/utils/campaignAttributionToken.js';

test('campaign preview uses the same promo copy, subject, and HTML format as delivery', () => {
  const preview = previewCampaign({ templateId: 'customer_promo', promoCode: 'SAVE25' });

  assert.equal(preview.subject, 'A little credit for your next Haango plan');
  assert.match(preview.text, /Hello there,/);
  assert.match(preview.text, /Use code SAVE25 to claim ₹100 credit/);
  assert.match(preview.text, /Your promo code: SAVE25/);
  assert.match(preview.html, /Your next plan comes with a little extra/);
  assert.match(preview.html, /Your promo code: SAVE25/);
  assert.match(preview.html, /Claim your ₹100 credit/);
  assert.match(preview.html, /src="data:image\/png;base64,[A-Za-z0-9+/=]+"/);
  assert.doesNotMatch(preview.html, /src="cid:haango-logo"/);
  assert.match(preview.text, /Unsubscribe from Haango campaign emails:/);
  assert.match(preview.html, />Unsubscribe<\/a>/);
  assert.match(preview.html, /href="http:\/\/localhost:5173\/unsubscribe"/);
});

test('campaign preview includes both customer signup callouts', () => {
  const preview = previewCampaign({ templateId: 'customer_signup' });

  assert.match(preview.text, /User Coupons: WELCOME100/);
  assert.match(preview.text, /Buddy Coupon: BUDDYBONUS75/);
  assert.match(preview.html, /User Coupons: WELCOME100/);
  assert.match(preview.html, /Buddy Coupon: BUDDYBONUS75/);
});

test('wallet credit campaign preview uses the configured credit amount', () => {
  const preview = previewCampaign({ templateId: 'customer_wallet_credit', creditAmount: 250 });

  assert.match(preview.text, /We’ve added ₹250 to your Haango wallet/);
  assert.match(preview.text, /Wallet Credit Added: ₹250/);
  assert.match(preview.html, /We’ve added ₹250 to your Haango wallet/);
  assert.match(preview.html, /Wallet Credit Added: ₹250/);
});

test('wallet credit campaign preview defaults the credit amount to ₹100', () => {
  const preview = previewCampaign({ templateId: 'customer_wallet_credit' });

  assert.match(preview.text, /We’ve added ₹100 to your Haango wallet/);
  assert.match(preview.html, /Wallet Credit Added: ₹100/);
});

test('wallet credit campaign sends the configured amount to the email template', async (t) => {
  t.mock.method(EmailUnsubscribe, 'find', () => ({
    select: () => ({ lean: async () => [] }),
  }));
  t.mock.method(User, 'find', () => ({
    select: () => ({ lean: async () => [] }),
  }));
  let sentMessage;
  await sendCampaign({
    templateId: 'customer_wallet_credit',
    recipientMode: 'BULK',
    recipientEmails: ['customer@gmail.com'],
    creditAmount: 250,
    sender: async (message) => { sentMessage = message; },
  });

  assert.equal(sentMessage.variables.creditAmount, 250);
  assert.match(sentMessage.variables.unsubscribeUrl, /\/unsubscribe#token=[A-Za-z0-9_.-]+$/);
});

test('campaign preview reflects the selected milestone in both subject and body', () => {
  const preview = previewAdminCampaignEmail({ templateId: 'buddy_milestone', milestone: 18 });

  assert.equal(preview.subject, '🔥 You just hit 18 completed bookings! Keep it up.');
  assert.match(preview.text, /18 completed bookings/);
  assert.match(preview.html, /18 completed bookings/);
  assert.match(preview.html, /You just reached 18 completed bookings!/);
});

test('all campaign CTA links identify Gmail and preserve referral query parameters', () => {
  for (const { id } of getAdminCampaignTemplates()) {
    const preview = previewAdminCampaignEmail({
      templateId: id,
      referralCode: id === 'buddy_referral_bonus' ? 'BUDDY123' : undefined,
    });
    const ctaUrl = new URL(preview.text.match(/https?:\/\/\S+/g).find((url) => url.includes('utm_source=gmail')));

    assert.equal(ctaUrl.searchParams.get('utm_source'), 'gmail', `${id} text CTA`);
    assert.match(preview.html, /utm_source=gmail/, `${id} HTML CTA`);
    if (id === 'buddy_referral_bonus') {
      assert.equal(ctaUrl.searchParams.get('signupCode'), 'BUDDY123');
    }
  }
});

test('delivered campaign CTA carries an opaque recipient token in its website link', async () => {
  let sentMessage;
  await sendCampaignToRecipients({
    recipients: [{ email: 'guest@example.com', name: 'Guest' }],
    templateId: 'customer_promo',
    sender: async (message) => { sentMessage = message; },
  });

  const token = sentMessage.variables.campaignAttributionToken;
  const preview = previewAdminCampaignEmail({
    templateId: 'customer_promo',
    campaignAttributionToken: token,
  });
  const ctaUrl = new URL(preview.text.match(/https?:\/\/\S+/g).find((url) => url.includes('campaign_link=')));

  assert.equal(getEmailFromCampaignAttributionToken(ctaUrl.searchParams.get('campaign_link')), 'guest@example.com');
  assert.doesNotMatch(ctaUrl.toString(), /guest@example\.com/);
  assert.match(preview.html, /campaign_link=/);
  assert.equal(ctaUrl.searchParams.get('utm_source'), 'gmail');
});

test('campaign preview rejects unknown template identifiers', () => {
  assert.throws(
    () => previewCampaign({ templateId: 'not_a_template' }),
    /Select a valid email template/,
  );
});

test('signup templates are grouped under the first Non customer category', () => {
  const templates = getAdminCampaignTemplates();
  const categories = [...new Set(templates.map(({ category }) => category))];

  assert.equal(categories[0], 'Non customer');
  assert.deepEqual(
    templates.filter(({ category }) => category === 'Non customer').map(({ title }) => title),
    ['Welcome bonus & signup options', 'Find Your Perfect Buddy on Haango'],
  );
});
