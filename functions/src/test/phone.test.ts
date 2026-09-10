import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizePhoneNumber } from '../utils/phone.js';

describe('normalizePhoneNumber', () => {
  it('normalizes Indian mobile numbers to E.164', () => {
    assert.equal(normalizePhoneNumber('9876543210'), '+919876543210');
    assert.equal(normalizePhoneNumber('+919876543210'), '+919876543210');
    assert.equal(normalizePhoneNumber('919876543210'), '+919876543210');
  });

  it('does not blindly rewrite international numbers to India', () => {
    assert.equal(normalizePhoneNumber('+14155552671'), '+14155552671');
    assert.equal(normalizePhoneNumber('14155552671'), '+14155552671');
  });

  it('rejects malformed phone numbers', () => {
    assert.equal(normalizePhoneNumber('abc'), null);
    assert.equal(normalizePhoneNumber('123'), null);
    assert.equal(normalizePhoneNumber('+1234567890123456'), null);
  });
});
