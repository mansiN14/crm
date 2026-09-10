import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { CloudEvent } from 'firebase-functions/v2';
import type { FirestoreEvent } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import { randomUUID } from 'node:crypto';
import { normalizePhoneNumber } from './utils/phone.js';
import { sendWhatsAppMessage } from './services/attendezService.js';
import type { InquiryLead, PreparedWhatsAppSend } from './types.js';

export const BUSINESS_JATRA_SOURCE = 'business_jatra_2026';

export function hasWhatsAppConsent(lead: InquiryLead) {
  return lead.whatsapp_consent === true;
}

export function selectTemplateName(lead: InquiryLead) {
  const defaultTemplate = process.env.ATTENDEZ_TEMPLATE_NAME || 'BUSINESS_JATRA_WELCOME';

  if (lead.lead_source !== BUSINESS_JATRA_SOURCE) return defaultTemplate;

  const leadType = `${lead.academic_level || lead.product_type || ''}`.toLowerCase();
  const configuredByType: Record<string, string | undefined> = {
    student: process.env.ATTENDEZ_TEMPLATE_BUSINESS_JATRA_STUDENT,
    parent: process.env.ATTENDEZ_TEMPLATE_BUSINESS_JATRA_PARENT,
    business: process.env.ATTENDEZ_TEMPLATE_BUSINESS_JATRA_BUSINESS,
    institution: process.env.ATTENDEZ_TEMPLATE_BUSINESS_JATRA_BUSINESS,
  };

  const typeKey = Object.keys(configuredByType).find((key) => leadType.includes(key));
  return (typeKey && configuredByType[typeKey]) || defaultTemplate;
}

export function prepareWhatsAppSend(lead: InquiryLead): PreparedWhatsAppSend | { skipReason: string } {
  if (!hasWhatsAppConsent(lead)) {
    return { skipReason: 'WhatsApp consent not provided' };
  }

  const normalizedPhone = normalizePhoneNumber(lead.whatsapp_number || lead.contact_number);
  if (!normalizedPhone) {
    return { skipReason: 'Missing or invalid WhatsApp phone number' };
  }

  return {
    phone: normalizedPhone,
    templateName: selectTemplateName(lead),
    source: lead.lead_source || undefined,
    variables: {
      name: lead.student_name?.trim() || 'there',
      source: lead.lead_source || '',
    },
  };
}

export function shouldSkipForExistingStatus(lead: InquiryLead, attemptId: string) {
  const status = lead.whatsapp?.status;
  if (status === 'sent' || status === 'delivered' || status === 'read') return true;
  if (status === 'pending' && lead.whatsapp?.attemptId) return true;
  if (lead.whatsapp?.attemptId === attemptId) return true;
  return false;
}

function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown WhatsApp send error';
  return message.replace(/(api[_-]?key|token|authorization|bearer)\s*[:=]\s*\S+/gi, '$1=[redacted]').slice(0, 500);
}

export async function handleInquiryCreated(
  db: Firestore,
  inquiryId: string,
  lead: InquiryLead,
  attemptId: string
) {
  const inquiryRef = db.collection('inquiries').doc(inquiryId);

  const prepared = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(inquiryRef);
    if (!snapshot.exists) return { action: 'missing' as const };

    const currentLead = snapshot.data() as InquiryLead;
    if (shouldSkipForExistingStatus(currentLead, attemptId)) {
      return { action: 'already-handled' as const };
    }

    const sendPlan = prepareWhatsAppSend({ ...lead, ...currentLead });
    if ('skipReason' in sendPlan) {
      transaction.update(inquiryRef, {
        whatsapp: {
          consent: currentLead.whatsapp_consent === true,
          status: 'skipped',
          error: sendPlan.skipReason,
          skippedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
      });
      return { action: 'skipped' as const, reason: sendPlan.skipReason };
    }

    transaction.update(inquiryRef, {
      whatsapp: {
        consent: true,
        status: 'pending',
        attemptId,
        phone: sendPlan.phone,
        templateName: sendPlan.templateName,
        updatedAt: FieldValue.serverTimestamp(),
      },
    });

    return { action: 'send' as const, sendPlan, lead: currentLead };
  });

  if (prepared.action !== 'send') return prepared;

  try {
    const result = await sendWhatsAppMessage({
      phone: prepared.sendPlan.phone,
      name: prepared.sendPlan.variables.name,
      templateName: prepared.sendPlan.templateName,
      variables: prepared.sendPlan.variables,
      idempotencyKey: `${inquiryId}:${attemptId}`,
    });

    await inquiryRef.update({
      'whatsapp.status': 'sent',
      'whatsapp.messageId': result.messageId || null,
      'whatsapp.providerStatus': result.rawStatus || null,
      'whatsapp.sentAt': FieldValue.serverTimestamp(),
      'whatsapp.updatedAt': FieldValue.serverTimestamp(),
      'whatsapp.error': null,
    });

    return { action: 'sent' as const, messageId: result.messageId };
  } catch (error) {
    const message = safeErrorMessage(error);
    logger.error('Attendez WhatsApp send failed', { inquiryId, message });
    await inquiryRef.update({
      'whatsapp.status': 'failed',
      'whatsapp.failedAt': FieldValue.serverTimestamp(),
      'whatsapp.updatedAt': FieldValue.serverTimestamp(),
      'whatsapp.error': message,
    });
    return { action: 'failed' as const, error: message };
  }
}

export function getEventAttemptId(event: CloudEvent<unknown> | FirestoreEvent<unknown>) {
  return event.id || randomUUID();
}
