import test from 'node:test';
import assert from 'node:assert/strict';

import { getWhatsAppCampaignTemplates } from '../src/services/whatsappCampaignTemplates.js';

test('provides five editable campaign drafts with three actions and the Haango support number', () => {
  const templates = getWhatsAppCampaignTemplates();
  assert.deepEqual(templates.map((template) => template.id), [
    'haango_welcome_offer',
    'haango_buddy_recruitment',
    'haango_festive_event',
    'haango_weekend_rescue',
    'haango_reengagement',
  ]);

  for (const template of templates) {
    assert.ok(template.message.length <= 4096, `${template.id} draft exceeds WhatsApp's message limit`);
    assert.match(template.message, /Reply STOP to opt out\./);
    assert.match(template.message, /\+91 8400732040/);
    assert.match(template.message, /https:\/\/haango\.in/);
    assert.equal(template.buttons.length, 3);
    assert.equal(template.buttons.filter((button) => button.type === 'URL').length, 2);
    assert.equal(template.buttons.filter((button) => button.type === 'PHONE_NUMBER').length, 1);
    assert.ok(template.buttons.every((button) => button.text.length <= 25));
    assert.ok(template.buttons.filter((button) => button.type === 'PHONE_NUMBER').every((button) => button.phoneNumber === '918400732040'));
    for (const button of template.buttons) assert.ok(template.message.includes(button.type === 'URL' ? button.url : '+91 8400732040'));
  }
});