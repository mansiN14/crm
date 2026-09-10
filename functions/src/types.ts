export type WhatsAppStatus = 'pending' | 'sent' | 'failed' | 'skipped' | 'delivered' | 'read';

export interface LeadWhatsAppState {
  status?: WhatsAppStatus;
  messageId?: string;
  attemptId?: string;
  phone?: string;
  templateName?: string;
  sentAt?: FirebaseFirestore.Timestamp;
  deliveredAt?: FirebaseFirestore.Timestamp;
  readAt?: FirebaseFirestore.Timestamp;
  failedAt?: FirebaseFirestore.Timestamp;
  skippedAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
  error?: string;
}

export interface InquiryLead {
  student_name?: string;
  contact_number?: string;
  whatsapp_number?: string | null;
  whatsapp_consent?: boolean;
  whatsapp?: LeadWhatsAppState;
  lead_source?: string | null;
  academic_level?: string | null;
  product_type?: string | null;
}

export interface PreparedWhatsAppSend {
  phone: string;
  templateName: string;
  variables: Record<string, string>;
  source?: string;
}
