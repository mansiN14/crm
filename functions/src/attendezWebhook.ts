import type { Firestore } from 'firebase-admin/firestore';

export interface AttendezWebhookMapping {
  messageId: string;
  status: 'delivered' | 'read' | 'failed';
  error?: string;
}

export function mapAttendezWebhookPayload(_body: unknown): AttendezWebhookMapping | null {
  void _body;
  /*
   * TODO: Map Attendez's real webhook payload to:
   * { messageId, status, error? }
   *
   * This is intentionally unimplemented until Attendez provides webhook docs.
   */
  return null;
}

export async function updateLeadFromAttendezWebhook(
  db: Firestore,
  mapping: AttendezWebhookMapping
) {
  const snapshot = await db
    .collection('inquiries')
    .where('whatsapp.messageId', '==', mapping.messageId)
    .limit(1)
    .get();

  if (snapshot.empty) return false;

  const field =
    mapping.status === 'read'
      ? 'readAt'
      : mapping.status === 'delivered'
        ? 'deliveredAt'
        : 'failedAt';

  await snapshot.docs[0].ref.update({
    'whatsapp.status': mapping.status,
    [`whatsapp.${field}`]: new Date(),
    'whatsapp.updatedAt': new Date(),
    ...(mapping.error ? { 'whatsapp.error': mapping.error.slice(0, 500) } : {}),
  });

  return true;
}
