export const toDateKey = (date = new Date()) => date.toISOString().split('T')[0];

export function daysBetween(dateKey: string, comparisonDateKey = toDateKey()) {
  const first = new Date(`${dateKey}T00:00:00`);
  const second = new Date(`${comparisonDateKey}T00:00:00`);

  if (Number.isNaN(first.getTime()) || Number.isNaN(second.getTime())) return 0;

  return Math.floor((second.getTime() - first.getTime()) / 86_400_000);
}

export function getDueStatus(dateKey?: string) {
  if (!dateKey) return 'upcoming' as const;

  const days = daysBetween(dateKey);
  if (days > 0) return 'overdue' as const;
  if (days === 0) return 'today' as const;
  if (days >= -3) return 'soon' as const;
  return 'upcoming' as const;
}

export function formatDateLabel(dateKey?: string) {
  if (!dateKey) return 'Not scheduled';

  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
