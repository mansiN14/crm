export interface SendWhatsAppMessageInput {
  phone: string;
  name: string;
  templateName: string;
  variables: Record<string, string>;
  idempotencyKey: string;
}

export interface SendWhatsAppMessageResult {
  messageId?: string;
  rawStatus?: string;
}

export class AttendezConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttendezConfigurationError';
  }
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new AttendezConfigurationError(`Missing server-side Attendez configuration: ${name}`);
  return value;
}

export async function sendWhatsAppMessage(
  input: SendWhatsAppMessageInput
): Promise<SendWhatsAppMessageResult> {
  const apiUrl = requireEnv('ATTENDEZ_API_URL');
  const apiKey = requireEnv('ATTENDEZ_API_KEY');

  void apiUrl;
  void apiKey;
  void input;

  throw new AttendezConfigurationError(
    'Attendez API contract is not implemented yet. Add the provider endpoint path, auth headers, and request/response mapping in functions/src/services/attendezService.ts after Attendez supplies its API documentation.'
  );

  /*
   * TODO: Insert the real Attendez request here when the provider supplies:
   * - exact endpoint URL/path
   * - authentication method and required headers
   * - template/message payload shape
   * - idempotency support, if available
   * - success response fields, especially message ID
   * - safe error response fields
   */
}
