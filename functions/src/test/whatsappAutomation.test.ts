import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BUSINESS_JATRA_SOURCE,
  prepareWhatsAppSend,
  shouldSkipForExistingStatus,
} from '../whatsappAutomation.js';

describe('prepareWhatsAppSend', () => {
  it('prepares a send attempt for a valid consenting lead', () => {
    const plan = prepareWhatsAppSend({
      student_name: 'Aarav',
      contact_number: '9876543210',
      whatsapp_consent: true,
      lead_source: BUSINESS_JATRA_SOURCE,
    });

    assert.equal('skipReason' in plan, false);
    if ('skipReason' in plan) return;

    assert.equal(plan.phone, '+919876543210');
    assert.equal(plan.variables.name, 'Aarav');
    assert.equal(plan.templateName, 'BUSINESS_JATRA_WELCOME');
  });

  it('skips when consent is not explicitly true', () => {
    const plan = prepareWhatsAppSend({
      student_name: 'Aarav',
      contact_number: '9876543210',
    });

    assert.deepEqual(plan, { skipReason: 'WhatsApp consent not provided' });
  });

  it('skips safely when phone is missing', () => {
    const plan = prepareWhatsAppSend({
      student_name: 'Aarav',
      whatsapp_consent: true,
    });

    assert.deepEqual(plan, { skipReason: 'Missing or invalid WhatsApp phone number' });
  });

  it('skips safely when phone is malformed', () => {
    const plan = prepareWhatsAppSend({
      student_name: 'Aarav',
      contact_number: 'abc',
      whatsapp_consent: true,
    });

    assert.deepEqual(plan, { skipReason: 'Missing or invalid WhatsApp phone number' });
  });
});

describe('shouldSkipForExistingStatus', () => {
  it('prevents duplicate sends for successful messages', () => {
    assert.equal(shouldSkipForExistingStatus({ whatsapp: { status: 'sent' } }, 'event-1'), true);
  });

  it('prevents duplicate sends while a prior attempt is pending', () => {
    assert.equal(
      shouldSkipForExistingStatus({ whatsapp: { status: 'pending', attemptId: 'event-1' } }, 'event-2'),
      true
    );
  });

  it('allows a first send attempt', () => {
    assert.equal(shouldSkipForExistingStatus({}, 'event-1'), false);
  });
});
