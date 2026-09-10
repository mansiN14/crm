import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { getEventAttemptId, handleInquiryCreated } from './whatsappAutomation.js';
import { mapAttendezWebhookPayload, updateLeadFromAttendezWebhook } from './attendezWebhook.js';

initializeApp();

const db = getFirestore();

export const sendWhatsAppForNewInquiry = onDocumentCreated('inquiries/{inquiryId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const result = await handleInquiryCreated(
    db,
    event.params.inquiryId,
    snapshot.data(),
    getEventAttemptId(event)
  );

  logger.info('WhatsApp automation processed inquiry', {
    inquiryId: event.params.inquiryId,
    action: result.action,
  });
});

export const attendezWebhook = onRequest(async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).send('Method Not Allowed');
    return;
  }

  const webhookSecret = process.env.ATTENDEZ_WEBHOOK_SECRET;
  if (webhookSecret && request.get('x-attendez-webhook-secret') !== webhookSecret) {
    response.status(401).send('Unauthorized');
    return;
  }

  const mapping = mapAttendezWebhookPayload(request.body);
  if (!mapping) {
    response.status(501).json({
      error: 'Attendez webhook payload mapping is not implemented. Add the provider-specific mapping after Attendez supplies webhook documentation.',
    });
    return;
  }

  const updated = await updateLeadFromAttendezWebhook(db, mapping);
  response.status(updated ? 200 : 404).json({ updated });
});
