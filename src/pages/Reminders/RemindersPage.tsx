import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Reminder, Student } from '../../lib/supabase';
import { getDueStatus } from '../../lib/dateUtils';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Search, Bell, Calendar, Clock, CheckCircle, X, Plus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [showModal, setShowModal] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);

  const sortReminders = useCallback((items: Reminder[]) =>
    [...items].sort((first, second) => {
      const priority = { overdue: 0, today: 1, soon: 2, upcoming: 3 };
      const firstPriority = priority[getDueStatus(first.reminder_date)];
      const secondPriority = priority[getDueStatus(second.reminder_date)];
      if (firstPriority !== secondPriority) return firstPriority - secondPriority;

      const firstValue = `${first.reminder_date || ''} ${first.reminder_time || ''}`;
      const secondValue = `${second.reminder_date || ''} ${second.reminder_time || ''}`;
      return firstValue.localeCompare(secondValue);
    }), []);

  const fetchReminders = useCallback(async () => {
    try {
      let query = supabase
        .from<Reminder[]>('reminders')
        .select('*, student:students(*), meeting:meetings(*), assignedUser:users(*)')
        .order('reminder_date', { ascending: true });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setReminders(sortReminders(data || []));
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  }, [sortReminders, statusFilter]);

  const fetchStudents = useCallback(async () => {
    const { data } = await supabase.from('students').select('*');
    setStudents(data || []);
  }, []);

  useEffect(() => {
    fetchReminders();
    fetchStudents();
  }, [fetchReminders, fetchStudents]);

  const filteredReminders = reminders.filter((reminder) =>
    reminder.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reminder.student?.student_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStatusChange = async (id: string, status: 'completed' | 'dismissed') => {
    await supabase.from('reminders').update({ status }).eq('id', id);
    fetchReminders();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Reminders</h1>
          <p className="text-gray-600 mt-1">Manage reminders and follow-ups</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          <span>Add Reminder</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search reminders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
          >
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="dismissed">Dismissed</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredReminders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Bell className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500">No reminders found</p>
          </div>
        ) : (
          filteredReminders.map((reminder) => {
            const dueStatus = getDueStatus(reminder.reminder_date);
            return (
            <article
              key={reminder.id}
              className={`rounded-xl border p-6 shadow-sm ${
                dueStatus === 'overdue'
                  ? 'border-red-200 bg-red-50'
                  : dueStatus === 'today'
                    ? 'border-yellow-200 bg-yellow-50'
                    : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    reminder.reminder_type === 'meeting' ? 'bg-blue-100 text-blue-600' :
                    reminder.reminder_type === 'payment' ? 'bg-orange-100 text-orange-600' :
                    reminder.reminder_type === 'follow_up' ? 'bg-purple-100 text-purple-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {reminder.reminder_type === 'meeting' ? <Calendar size={20} /> : <Bell size={20} />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-navy-900">{reminder.title}</p>
                    {reminder.student && (
                      <p className="text-sm text-gray-500">Student: {reminder.student.student_name}</p>
                    )}
                    {reminder.meeting && (
                      <p className="text-sm text-gray-500">Meeting #{reminder.meeting.meeting_number}</p>
                    )}
                    {reminder.description && (
                      <p className="text-sm text-gray-600 mt-1">{reminder.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {reminder.reminder_date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {reminder.reminder_time}
                      </span>
                    </div>
                    {reminder.student_id && (
                      <Link
                        to={`/students/${reminder.student_id}`}
                        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-maroon-600 hover:text-maroon-700"
                      >
                        <span>Open student</span>
                        <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    reminder.reminder_type === 'meeting' ? 'bg-blue-100 text-blue-700' :
                    reminder.reminder_type === 'payment' ? 'bg-orange-100 text-orange-700' :
                    reminder.reminder_type === 'follow_up' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {reminder.reminder_type.replace('_', ' ')}
                  </span>
                  {reminder.status === 'pending' && (
                    <DueStatusBadge status={dueStatus} />
                  )}
                  {reminder.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(reminder.id, 'completed')}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Mark Complete"
                      >
                        <CheckCircle size={18} />
                      </button>
                      <button
                        onClick={() => handleStatusChange(reminder.id, 'dismissed')}
                        className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Dismiss"
                      >
                        <X size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          );
          })
        )}
      </div>

      {showModal && (
        <ReminderModal
          students={students}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchReminders();
          }}
        />
      )}
    </div>
  );
}

function DueStatusBadge({ status }: { status: ReturnType<typeof getDueStatus> }) {
  const styles = {
    overdue: 'bg-red-100 text-red-700',
    today: 'bg-yellow-100 text-yellow-800',
    soon: 'bg-orange-100 text-orange-700',
    upcoming: 'bg-gray-100 text-gray-700',
  };

  const labels = {
    overdue: 'Overdue',
    today: 'Today',
    soon: 'Soon',
    upcoming: 'Upcoming',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function ReminderModal({
  students,
  onClose,
  onSave,
}: {
  students: Student[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reminder_date: '',
    reminder_time: '09:00',
    reminder_type: 'task' as const,
    student_id: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase.from('reminders').insert({
        ...formData,
        student_id: formData.student_id || null,
        status: 'pending',
      });
      if (error) throw error;
      onSave();
    } catch (error) {
      console.error('Error saving reminder:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-navy-900">New Reminder</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={formData.reminder_type}
              onChange={(e) => setFormData({ ...formData, reminder_type: e.target.value as typeof formData.reminder_type })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
            >
              <option value="task">Task</option>
              <option value="meeting">Meeting</option>
              <option value="follow_up">Follow Up</option>
              <option value="payment">Payment</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Student (Optional)</label>
            <select
              value={formData.student_id}
              onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
            >
              <option value="">None</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.student_name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
              <input
                type="date"
                value={formData.reminder_date}
                onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
              <input
                type="time"
                value={formData.reminder_time}
                onChange={(e) => setFormData({ ...formData, reminder_time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
