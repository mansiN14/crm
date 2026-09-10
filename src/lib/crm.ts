export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'follow_up_required'
  | 'counselling_scheduled'
  | 'counselling_completed'
  | 'assessment_pending'
  | 'program_selected'
  | 'application_started'
  | 'converted'
  | 'lost'
  | 'not_interested'
  | 'attended'
  | 'ongoing'
  | 'completed'
  | 'no_show';

export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent';

export const LEAD_STATUSES: Array<{ value: LeadStatus; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'follow_up_required', label: 'Follow-up Required' },
  { value: 'counselling_scheduled', label: 'Counselling Scheduled' },
  { value: 'counselling_completed', label: 'Counselling Completed' },
  { value: 'assessment_pending', label: 'Assessment Pending' },
  { value: 'program_selected', label: 'Program Selected' },
  { value: 'application_started', label: 'Application Started' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'attended', label: 'Attended' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'no_show', label: 'No Show' },
];

export const LEAD_PRIORITIES: Array<{ value: LeadPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const LEAD_SOURCES = [
  'Website',
  'WhatsApp',
  'Phone call',
  'Walk-in',
  'Instagram',
  'Referral',
  'School event',
  'business_jatra_2026',
  'BNI',
  'Existing student',
  'Other',
];

export const ACADEMIC_LEVELS = [
  'School',
  'Diploma',
  'Undergraduate',
  'Postgraduate',
  'PhD',
  'Working professional',
];

export const BUDGET_RANGES = [
  'Under 10L',
  '10L - 25L',
  '25L - 50L',
  '50L - 1Cr',
  '1Cr+',
  'Not discussed',
];

export function getLeadStatusLabel(status?: string) {
  return LEAD_STATUSES.find((item) => item.value === status)?.label || 'New';
}

export function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, '');
}

export function isValidPhone(value: string) {
  const normalized = normalizePhone(value);
  return /^\+?\d{7,15}$/.test(normalized);
}

export function isValidEmail(value: string) {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
