const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error('Missing Firebase environment variables');
}

const authBaseUrl = `https://identitytoolkit.googleapis.com/v1`;
const firestoreBaseUrl =
  `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
const sessionStorageKey = 'true-axis-firebase-session';

export type UserRole = 'admin' | 'counselor' | 'staff';

export interface FirebaseSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: {
    id: string;
    email?: string;
  };
}

type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT';
type AuthListener = (event: AuthEvent, session: FirebaseSession | null) => void;

const authListeners = new Set<AuthListener>();

function getStoredSession(): FirebaseSession | null {
  const raw = localStorage.getItem(sessionStorageKey);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as FirebaseSession;
  } catch {
    localStorage.removeItem(sessionStorageKey);
    return null;
  }
}

function setStoredSession(session: FirebaseSession | null) {
  if (session) {
    localStorage.setItem(sessionStorageKey, JSON.stringify(session));
  } else {
    localStorage.removeItem(sessionStorageKey);
  }
}

function notifyAuthListeners(event: AuthEvent, session: FirebaseSession | null) {
  authListeners.forEach((listener) => listener(event, session));
}

function authHeaders(): Record<string, string> {
  const session = getStoredSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function firebaseAuthRequest<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${authBaseUrl}/${endpoint}?key=${firebaseConfig.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Firebase authentication request failed');
  }
  return payload as T;
}

function toSession(payload: {
  idToken: string;
  refreshToken?: string;
  localId: string;
  email?: string;
  expiresIn?: string;
}): FirebaseSession {
  return {
    access_token: payload.idToken,
    refresh_token: payload.refreshToken,
    expires_at: payload.expiresIn
      ? Math.floor(Date.now() / 1000) + Number(payload.expiresIn)
      : undefined,
    user: {
      id: payload.localId,
      email: payload.email,
    },
  };
}

type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { timestampValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

function encodeValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, encodeValue(item)])
        ),
      },
    };
  }
  return { stringValue: String(value) };
}

function decodeValue(value: FirestoreValue): unknown {
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('stringValue' in value) return value.stringValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, decodeValue(item)])
    );
  }
  return null;
}

function encodeDocument(data: Record<string, unknown>) {
  return {
    fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encodeValue(value)])),
  };
}

function decodeDocument(document: { name: string; fields?: Record<string, FirestoreValue> }) {
  const id = document.name.split('/').pop() || '';
  return {
    id,
    ...Object.fromEntries(
      Object.entries(document.fields || {}).map(([key, value]) => [key, decodeValue(value)])
    ),
  };
}

function nowIso() {
  return new Date().toISOString();
}

function withTimestamps(data: Record<string, unknown>, isInsert: boolean) {
  const timestamp = nowIso();
  return {
    ...data,
    ...(isInsert && !data.created_at ? { created_at: timestamp } : {}),
    updated_at: timestamp,
  };
}

async function firestoreRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = authHeaders();
  if (!headers.Authorization) {
    throw new Error('Please sign in with a valid Firebase account before saving changes.');
  }

  const separator = path.includes('?') ? '&' : '?';
  const response = await fetch(`${firestoreBaseUrl}${path}${separator}key=${firebaseConfig.apiKey}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...init.headers,
    },
  });

  if (response.status === 204) return undefined as T;

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Firestore request failed');
  }
  return payload as T;
}

async function getCollection(collectionName: string): Promise<Record<string, unknown>[]> {
  const payload = await firestoreRequest<{ documents?: Array<{ name: string; fields?: Record<string, FirestoreValue> }> }>(
    `/${collectionName}`
  );
  return (payload.documents || []).map(decodeDocument);
}

async function getDocument(collectionName: string, id: string): Promise<Record<string, unknown> | null> {
  try {
    const payload = await firestoreRequest<{ name: string; fields?: Record<string, FirestoreValue> }>(
      `/${collectionName}/${id}`
    );
    return decodeDocument(payload);
  } catch (error) {
    if ((error as Error).message.includes('No document to read')) return null;
    return null;
  }
}

function relationRequested(selectClause: string, alias: string) {
  return selectClause.includes(`${alias}:`) || selectClause.includes(`${alias}(`);
}

async function hydrateRelations(
  table: string,
  rows: Record<string, unknown>[],
  selectClause: string
) {
  if (!selectClause || selectClause === '*') return rows;

  const attachById = async (sourceKey: string, targetTable: string, alias: string) => {
    if (!relationRequested(selectClause, alias)) return;

    const uniqueIds = Array.from(new Set(rows.map((row) => row[sourceKey]).filter(Boolean))) as string[];
    const relatedPairs = await Promise.all(uniqueIds.map(async (id) => [id, await getDocument(targetTable, id)]));
    const related = new Map(relatedPairs as Array<[string, Record<string, unknown> | null]>);
    rows.forEach((row) => {
      row[alias] = row[sourceKey] ? related.get(row[sourceKey] as string) || null : null;
    });
  };

  if (table === 'students') {
    await attachById('assigned_counselor_id', 'users', 'assigned_counselor');
    if (relationRequested(selectClause, 'education')) {
      const educationRows = await getCollection('student_education');
      rows.forEach((row) => {
        row.education =
          educationRows.find((education) => education.student_id === row.id) || null;
      });
    }
  }

  if (table === 'inquiries') await attachById('assigned_counselor_id', 'users', 'assigned_counselor');
  if (table === 'student_products') await attachById('mentor_id', 'users', 'mentor');
  if (table === 'meetings') {
    await attachById('student_id', 'students', 'student');
    await attachById('created_by', 'users', 'createdBy');
  }
  if (table === 'reminders') {
    await attachById('student_id', 'students', 'student');
    await attachById('meeting_id', 'meetings', 'meeting');
    await attachById('assigned_to', 'users', 'assignedUser');
  }
  if (table === 'quotations') {
    await attachById('student_id', 'students', 'student');
    await attachById('product_id', 'student_products', 'product');
  }
  if (table === 'payments') {
    await attachById('student_id', 'students', 'student');
    await attachById('quotation_id', 'quotations', 'quotation');
  }
  if (table === 'activity_logs') await attachById('user_id', 'users', 'user');

  return rows;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class FirebaseQueryBuilder<T = any> implements PromiseLike<QueryResponse<T>> {
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private filters: Array<{ field: string; op: 'eq' | 'in' | 'gte' | 'lt' | 'lte' | 'gt'; value: unknown }> = [];
  private orderBy?: { field: string; ascending: boolean };
  private limitCount?: number;
  private selected = '*';
  private selectOptions?: { count?: 'exact'; head?: boolean };
  private body?: Record<string, unknown> | Array<Record<string, unknown>>;
  private resultMode: 'many' | 'single' | 'maybeSingle' = 'many';
  private shouldReturnInsertedRows = false;

  constructor(private table: string) {}

  select(columns = '*', options?: { count?: 'exact'; head?: boolean }) {
    this.selected = columns;
    this.selectOptions = options;
    if (this.action === 'insert') this.shouldReturnInsertedRows = true;
    return this;
  }

  insert(data: Record<string, unknown> | Array<Record<string, unknown>>) {
    this.action = 'insert';
    this.body = data;
    return this;
  }

  update(data: Record<string, unknown>) {
    this.action = 'update';
    this.body = data;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(field: string, value: unknown) {
    this.filters.push({ field, op: 'eq', value });
    return this;
  }

  in(field: string, values: unknown[]) {
    this.filters.push({ field, op: 'in', value: values });
    return this;
  }

  gte(field: string, value: unknown) {
    this.filters.push({ field, op: 'gte', value });
    return this;
  }

  lt(field: string, value: unknown) {
    this.filters.push({ field, op: 'lt', value });
    return this;
  }

  lte(field: string, value: unknown) {
    this.filters.push({ field, op: 'lte', value });
    return this;
  }

  gt(field: string, value: unknown) {
    this.filters.push({ field, op: 'gt', value });
    return this;
  }

  order(field: string, options: { ascending?: boolean } = {}) {
    this.orderBy = { field, ascending: options.ascending ?? true };
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.resultMode = 'single';
    return this;
  }

  maybeSingle() {
    this.resultMode = 'maybeSingle';
    return this;
  }

  then<TResult1 = QueryResponse<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResponse<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private applyFilters(rows: Record<string, unknown>[]) {
    return rows.filter((row) =>
      this.filters.every((filter) => {
        if (filter.op === 'eq') return row[filter.field] === filter.value;
        if (filter.op === 'in') return (filter.value as unknown[]).includes(row[filter.field]);
        if (filter.op === 'gte') return (row[filter.field] as string | number) >= (filter.value as string | number);
        if (filter.op === 'lt') return (row[filter.field] as string | number) < (filter.value as string | number);
        if (filter.op === 'lte') return (row[filter.field] as string | number) <= (filter.value as string | number);
        if (filter.op === 'gt') return (row[filter.field] as string | number) > (filter.value as string | number);
        return true;
      })
    );
  }

  private applyOrdering(rows: Record<string, unknown>[]) {
    if (!this.orderBy) return rows;

    return [...rows].sort((a, b) => {
      const first = a[this.orderBy!.field];
      const second = b[this.orderBy!.field];
      if (first === second) return 0;
      if (first === null || first === undefined) return 1;
      if (second === null || second === undefined) return -1;
      return (first > second ? 1 : -1) * (this.orderBy!.ascending ? 1 : -1);
    });
  }

  private async execute(): Promise<QueryResponse<T>> {
    try {
      if (this.action === 'insert') return await this.executeInsert();
      if (this.action === 'update') return await this.executeUpdate();
      if (this.action === 'delete') return await this.executeDelete();
      return await this.executeSelect();
    } catch (error) {
      return { data: null, error: error as Error, count: null };
    }
  }

  private async executeSelect(): Promise<QueryResponse<T>> {
    let rows = this.applyOrdering(this.applyFilters(await getCollection(this.table)));
    const count = this.selectOptions?.count === 'exact' ? rows.length : null;
    if (this.limitCount !== undefined) rows = rows.slice(0, this.limitCount);
    rows = await hydrateRelations(this.table, rows, this.selected);

    if (this.selectOptions?.head) {
      return { data: null, error: null, count };
    }

    if (this.resultMode === 'single') {
      return { data: (rows[0] || null) as T, error: rows[0] ? null : new Error('No rows found'), count };
    }

    if (this.resultMode === 'maybeSingle') {
      return { data: (rows[0] || null) as T, error: null, count };
    }

    return { data: rows as T, error: null, count };
  }

  private async executeInsert(): Promise<QueryResponse<T>> {
    const items = Array.isArray(this.body) ? this.body : [this.body as Record<string, unknown>];
    const inserted = await Promise.all(
      items.map(async (item) => {
        const id = (item.id as string | undefined) || crypto.randomUUID();
        const data = withTimestamps({ ...item, id }, true);
        await firestoreRequest(`/${this.table}?documentId=${encodeURIComponent(id)}`, {
          method: 'POST',
          body: JSON.stringify(encodeDocument(data)),
        });
        return data;
      })
    );

    const data = this.resultMode === 'single' ? inserted[0] : inserted;
    return { data: (this.shouldReturnInsertedRows ? data : null) as T, error: null, count: null };
  }

  private async executeUpdate(): Promise<QueryResponse<T>> {
    const rows = this.applyFilters(await getCollection(this.table));
    const data = withTimestamps(this.body as Record<string, unknown>, false);
    const updateMask = Object.keys(data)
      .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
      .join('&');

    await Promise.all(
      rows.map((row) =>
        firestoreRequest(`/${this.table}/${row.id}?${updateMask}`, {
          method: 'PATCH',
          body: JSON.stringify(encodeDocument(data)),
        })
      )
    );

    return { data: null, error: null, count: rows.length };
  }

  private async executeDelete(): Promise<QueryResponse<T>> {
    const rows = this.applyFilters(await getCollection(this.table));
    await Promise.all(
      rows.map((row) =>
        firestoreRequest(`/${this.table}/${row.id}`, {
          method: 'DELETE',
        })
      )
    );

    return { data: null, error: null, count: rows.length };
  }
}

interface QueryResponse<T> {
  data: T | null;
  error: Error | null;
  count: number | null;
}

async function generateQuotationNumber() {
  const yearPart = String(new Date().getFullYear()).slice(-2);
  const quotations = await getCollection('quotations');
  const nextNumber =
    quotations
      .map((quotation) => String(quotation.quotation_number || ''))
      .filter((number) => number.startsWith(`QT${yearPart}`))
      .map((number) => Number(number.slice(4)))
      .filter(Number.isFinite)
      .reduce((max, current) => Math.max(max, current), 0) + 1;

  return `QT${yearPart}${String(nextNumber).padStart(4, '0')}`;
}

export const supabase = {
  auth: {
    async getSession() {
      return { data: { session: getStoredSession() }, error: null };
    },
    onAuthStateChange(listener: AuthListener) {
      authListeners.add(listener);
      return {
        data: {
          subscription: {
            unsubscribe: () => authListeners.delete(listener),
          },
        },
      };
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const payload = await firebaseAuthRequest<{
        idToken: string;
        refreshToken: string;
        localId: string;
        email: string;
        expiresIn: string;
      }>('accounts:signInWithPassword', { email, password, returnSecureToken: true });
      const session = toSession(payload);
      setStoredSession(session);
      notifyAuthListeners('SIGNED_IN', session);
      return { data: { user: session.user, session }, error: null };
    },
    async signUp({ email, password }: { email: string; password: string }) {
      const payload = await firebaseAuthRequest<{
        idToken: string;
        refreshToken: string;
        localId: string;
        email: string;
        expiresIn: string;
      }>('accounts:signUp', { email, password, returnSecureToken: true });
      const session = toSession(payload);
      setStoredSession(session);
      notifyAuthListeners('SIGNED_IN', session);
      return { data: { user: session.user, session }, error: null };
    },
    async signOut() {
      setStoredSession(null);
      notifyAuthListeners('SIGNED_OUT', null);
      return { error: null };
    },
    async resetPasswordForEmail(email: string) {
      await firebaseAuthRequest('accounts:sendOobCode', {
        requestType: 'PASSWORD_RESET',
        email,
      });
      return { data: {}, error: null };
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from<T = any>(table: string) {
    return new FirebaseQueryBuilder<T>(table);
  },
  async rpc(functionName: string) {
    if (functionName === 'generate_quotation_number') {
      return { data: await generateQuotationNumber(), error: null };
    }
    return { data: null, error: new Error(`Unsupported Firebase RPC: ${functionName}`) };
  },
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Inquiry {
  id: string;
  inquiry_date: string;
  student_name: string;
  contact_number: string;
  email?: string;
  product_type?: ProductType;
  student_grade?: string;
  reference_source?: 'earlier_student' | 'bni' | 'outside';
  reference_name?: string;
  country?: string;
  countries?: string[];
  colleges?: string[];
  programs?: string[];
  degree_level?: 'ug' | 'pg' | 'phd';
  attendance: 'yes' | 'no' | 'pending';
  status: 'new' | 'attended' | 'ongoing' | 'completed' | 'no_show';
  assigned_counselor_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  assigned_counselor?: User;
}

export interface Student {
  id: string;
  inquiry_id?: string;
  student_name: string;
  father_name?: string;
  mother_name?: string;
  date_of_birth?: string;
  mobile_number: string;
  email?: string;
  address?: string;
  notes?: string;
  status: 'ongoing' | 'completed' | 'inactive';
  assigned_counselor_id?: string;
  created_at: string;
  updated_at: string;
  assigned_counselor?: User;
  education?: StudentEducation;
  products?: StudentProduct[];
  meetings?: Meeting[];
  payments?: Payment[];
}

export interface StudentEducation {
  id: string;
  student_id: string;
  school_name?: string;
  school_board?: string;
  board_major_subject?: string;
  board_subject_percentage?: number;
  eighth_percentage?: number;
  ninth_percentage?: number;
  tenth_percentage?: number;
  eleventh_percentage?: number;
  twelfth_percentage?: number;
  diploma?: string;
  diploma_percentage?: number;
  graduation?: string;
  graduation_percentage?: number;
  post_graduation?: string;
  post_graduation_percentage?: number;
  current_grade?: string;
  current_stream?: string;
  created_at: string;
  updated_at: string;
}

export type ProductType = 'career_counselling' | 'college_admissions' | 'mentoring' | 'psychometric_test';

export interface WorkflowCompletion {
  completed_at: string;
  completed_by?: string;
}

export interface CounsellingSession {
  date?: string;
  discussion_notes?: string;
  observations?: string;
  next_action?: string;
  next_meeting_date?: string;
  completed?: boolean;
}

export interface ReviewSession {
  id: string;
  title: string;
  date?: string;
  discussion?: string;
  progress?: string;
  action_items?: string;
  completed?: boolean;
}

export interface StudentProduct {
  id: string;
  student_id: string;
  product_type: ProductType;
  interests?: string;
  strengths?: string;
  preferred_career?: string;
  goals?: string;
  career_notes?: string;
  workflow_completions?: Record<string, WorkflowCompletion>;
  orientation_date?: string;
  orientation_counselor_id?: string;
  orientation_notes?: string;
  student_goal?: string;
  orientation_outcome?: string;
  orientation_completed?: boolean;
  test_link_sent_at?: string;
  test_link?: string;
  test_status?: 'pending' | 'sent' | 'completed' | 'cancelled';
  counselling_sessions?: CounsellingSession[];
  roadmap_pdf_url?: string;
  roadmap_notes?: string;
  roadmap_delivered?: boolean;
  closure_date?: string;
  final_notes?: string;
  counselor_remarks?: string;
  formal_closure_completed?: boolean;
  review_sessions?: ReviewSession[];
  country?: string;
  countries?: string[];
  colleges?: string[];
  programs?: string[];
  degree_level?: 'ug' | 'pg' | 'phd';
  university_name?: string;
  course_name?: string;
  intake_year?: number;
  scholarship_required?: boolean;
  application_status?: string;
  admissions_notes?: string;
  mentor_id?: string;
  duration?: string;
  mentoring_goals?: string;
  mentoring_notes?: string;
  test_date?: string;
  report_generated?: boolean;
  psychometric_notes?: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  mentor?: User;
}

export interface Meeting {
  id: string;
  student_id: string;
  meeting_number: number;
  meeting_date: string;
  meeting_time?: string;
  discussion_notes?: string;
  outcome?: string;
  next_action?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  createdBy?: User;
  student?: Student;
}

export interface Reminder {
  id: string;
  student_id?: string;
  meeting_id?: string;
  reminder_date: string;
  reminder_time: string;
  title: string;
  description?: string;
  reminder_type: 'meeting' | 'follow_up' | 'payment' | 'task';
  status: 'pending' | 'completed' | 'dismissed';
  assigned_to?: string;
  created_at: string;
  student?: Student;
  meeting?: Meeting;
  assignedUser?: User;
}

export interface Quotation {
  id: string;
  quotation_number: string;
  customer_name: string;
  student_id?: string;
  product_name: string;
  product_id?: string;
  amount: number;
  discount: number;
  gst_percentage: number;
  total_amount: number;
  quotation_date: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  created_by?: string;
  created_at: string;
  updated_at: string;
  student?: Student;
  product?: StudentProduct;
}

export interface Payment {
  id: string;
  student_id: string;
  quotation_id?: string;
  payment_number: number;
  total_amount: number;
  amount_paid: number;
  payment_date?: string;
  due_date: string;
  status: 'paid' | 'pending' | 'overdue';
  payment_mode?: string;
  transaction_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  student?: Student;
  quotation?: Quotation;
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  created_at: string;
  user?: User;
}
