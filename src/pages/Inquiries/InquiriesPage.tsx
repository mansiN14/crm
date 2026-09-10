import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';
import type { Inquiry, ProductType, User } from '../../lib/supabase';
import { PRODUCT_CATALOG } from '../../lib/products';
import { ADMISSION_COUNTRIES, ADMISSION_PROGRAMS, DEGREE_LEVELS, getCollegesForCountries } from '../../lib/admissions';
import {
  ACADEMIC_LEVELS,
  BUDGET_RANGES,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  getLeadStatusLabel,
  isValidEmail,
  isValidPhone,
  normalizePhone,
  type LeadPriority,
  type LeadStatus,
} from '../../lib/crm';
import { daysBetween } from '../../lib/dateUtils';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  UserPlus,
  X,
  Calendar,
  Phone,
  Mail,
  MessageCircle,
  Users,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function InquiriesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingInquiry, setEditingInquiry] = useState<Inquiry | null>(null);
  const [counselors, setCounselors] = useState<User[]>([]);
  const [convertingInquiryId, setConvertingInquiryId] = useState<string | null>(null);
  const [conversionMessage, setConversionMessage] = useState('');

  useEffect(() => {
    fetchInquiries();
    fetchCounselors();
  }, []);

  const fetchInquiries = async () => {
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*, assigned_counselor:users!assigned_counselor_id(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInquiries(data || []);
    } catch (error) {
      console.error('Error fetching inquiries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCounselors = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .in('role', ['admin', 'counselor']);
    setCounselors(data || []);
  };

  const filteredInquiries = inquiries.filter((inquiry) => {
    const searchable = [
      inquiry.student_name,
      inquiry.contact_number,
      inquiry.whatsapp_number,
      inquiry.email,
      inquiry.city,
      inquiry.preferred_course,
      inquiry.lead_source,
    ].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch =
      searchable.includes(searchQuery.toLowerCase()) ||
      normalizePhone(inquiry.contact_number || '').includes(normalizePhone(searchQuery));
    const matchesStatus = statusFilter === 'all' || inquiry.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || (inquiry.priority || 'medium') === priorityFilter;
    const matchesSource = sourceFilter === 'all' || inquiry.lead_source === sourceFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesSource;
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this inquiry?')) return;
    await supabase.from('inquiries').delete().eq('id', id);
    fetchInquiries();
  };

  const handleQuickCreateStudent = async (inquiry: Inquiry) => {
    if (convertingInquiryId) return;

    setConvertingInquiryId(inquiry.id);
    setConversionMessage('');

    try {
      const { data: existingStudent, error: existingStudentError } = await supabase
        .from('students')
        .select('id')
        .eq('inquiry_id', inquiry.id)
        .maybeSingle();

      if (existingStudentError) throw existingStudentError;

      if (existingStudent?.id) {
        navigate(`/students/${existingStudent.id}`);
        return;
      }

      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          student_name: inquiry.student_name,
          mobile_number: inquiry.contact_number,
          email: inquiry.email || null,
          status: 'ongoing',
          assigned_counselor_id: inquiry.assigned_counselor_id || null,
          inquiry_id: inquiry.id,
          notes: inquiry.notes || null,
        })
        .select()
        .single();

      if (studentError) throw studentError;
      if (!student?.id) throw new Error('Student was created but no student ID was returned.');

      await supabase.from('student_education').insert({
        student_id: student.id,
        current_grade: inquiry.student_grade || null,
      });

      if (inquiry.product_type) {
        await supabase.from('student_products').insert({
          student_id: student.id,
          product_type: inquiry.product_type as ProductType,
          status: 'active',
          ...(inquiry.product_type === 'college_admissions'
            ? {
                countries: inquiry.countries || [],
                colleges: inquiry.colleges || [],
                programs: inquiry.programs || [],
                degree_level: inquiry.degree_level || null,
              }
            : {}),
        });
      }

      await supabase
        .from('inquiries')
        .update({ attendance: 'yes', status: 'ongoing' })
        .eq('id', inquiry.id);

      const { error: logError } = await supabase.from('activity_logs').insert({
        action: 'Converted inquiry to student',
        entity_type: 'student',
        entity_id: student.id,
        details: { inquiry_id: inquiry.id, student_name: inquiry.student_name },
      });

      if (logError) {
        console.warn('Student created, but activity log failed:', logError);
      }

      await fetchInquiries();
      navigate(`/students/${student.id}`);
    } catch (error) {
      console.error('Error converting inquiry to student:', error);
      setConversionMessage((error as Error).message || 'Unable to create student from inquiry.');
    } finally {
      setConvertingInquiryId(null);
    }
  };

  const canDelete = user?.role === 'admin' || user?.role === 'counselor';
  const funnelStats = [
    { label: 'New', value: inquiries.filter((inquiry) => inquiry.status === 'new').length, icon: Users },
    { label: 'Attended', value: inquiries.filter((inquiry) => inquiry.status === 'attended').length, icon: CheckCircle2 },
    {
      label: 'Student Created',
      value: inquiries.filter((inquiry) => inquiry.status === 'ongoing' || inquiry.status === 'completed').length,
      icon: GraduationCapIcon,
    },
    {
      label: 'Stale Leads',
      value: inquiries.filter((inquiry) =>
        ['new', 'contacted', 'follow_up_required'].includes(inquiry.status) &&
        daysBetween(inquiry.last_contacted || inquiry.inquiry_date) >= 7
      ).length,
      icon: Clock,
    },
  ];
  const activeSources = Array.from(new Set(inquiries.map((item) => item.lead_source).filter(Boolean))) as string[];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Inquiries</h1>
          <p className="text-gray-600 mt-1">Manage student inquiries and initial contacts</p>
        </div>
        <button
          onClick={() => {
            setEditingInquiry(null);
            setShowModal(true);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-white transition-colors hover:bg-navy-800 sm:w-auto"
        >
          <Plus size={20} />
          <span>New Inquiry</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {funnelStats.map((item) => (
          <div key={item.label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-100 text-navy-700">
                <item.icon size={19} />
              </div>
              <div>
                <p className="text-sm text-gray-600">{item.label}</p>
                <p className="text-2xl font-bold text-navy-900">{item.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-navy-500 focus:ring-2 focus:ring-navy-500 sm:w-52"
          >
            <option value="all">All Status</option>
            {LEAD_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-navy-500 focus:ring-2 focus:ring-navy-500 sm:w-44"
          >
            <option value="all">All Priority</option>
            {LEAD_PRIORITIES.map((priority) => (
              <option key={priority.value} value={priority.value}>{priority.label}</option>
            ))}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-navy-500 focus:ring-2 focus:ring-navy-500 sm:w-48"
          >
            <option value="all">All Sources</option>
            {[...new Set([...LEAD_SOURCES, ...activeSources])].map((source) => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
        </div>
      </div>

      {conversionMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {conversionMessage}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-200 md:hidden">
          {filteredInquiries.map((inquiry) => (
            <InquiryMobileCard
              key={inquiry.id}
              inquiry={inquiry}
              canDelete={canDelete}
              onView={() => navigate(`/inquiries/${inquiry.id}`)}
              onEdit={() => {
                setEditingInquiry(inquiry);
                setShowModal(true);
              }}
              onCreateStudent={() => handleQuickCreateStudent(inquiry)}
              onDelete={() => handleDelete(inquiry.id)}
              isConverting={convertingInquiryId === inquiry.id}
            />
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[920px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy-900">Student Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy-900">Contact</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy-900">Inquiry Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy-900">Attendance</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy-900">WhatsApp</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy-900">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy-900">Counselor</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-navy-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInquiries.map((inquiry) => (
                <tr key={inquiry.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-navy-900">{inquiry.student_name}</p>
                    {inquiry.email && (
                      <p className="text-sm text-gray-500">{inquiry.email}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-700">{inquiry.contact_number}</p>
                    {inquiry.whatsapp_number && (
                      <p className="text-sm text-gray-500">WA: {inquiry.whatsapp_number}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-700">{inquiry.inquiry_date}</p>
                    <InquiryAgeBadge inquiry={inquiry} />
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      inquiry.attendance === 'yes' ? 'bg-green-100 text-green-700' :
                      inquiry.attendance === 'no' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {inquiry.attendance === 'yes' ? 'Yes' : inquiry.attendance === 'no' ? 'No' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <WhatsAppStatusBadge inquiry={inquiry} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={inquiry.status} />
                    <PriorityBadge priority={inquiry.priority || 'medium'} />
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-700">{inquiry.assigned_counselor?.name || 'Unassigned'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/inquiries/${inquiry.id}`)}
                        className="p-2 text-gray-600 hover:text-navy-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingInquiry(inquiry);
                          setShowModal(true);
                        }}
                        className="p-2 text-gray-600 hover:text-navy-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleQuickCreateStudent(inquiry)}
                        disabled={convertingInquiryId === inquiry.id}
                        className="p-2 text-maroon-600 transition-colors hover:bg-maroon-50 hover:text-maroon-700 disabled:cursor-not-allowed disabled:opacity-50"
                        title={convertingInquiryId === inquiry.id ? 'Creating student...' : 'Create Student'}
                      >
                        <UserPlus size={18} />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(inquiry.id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredInquiries.length === 0 && (
          <div className="p-12 text-center">
            <Users className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500">No inquiries found</p>
          </div>
        )}
      </div>

      {showModal && (
        <InquiryModal
          inquiry={editingInquiry}
          counselors={counselors}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchInquiries();
          }}
        />
      )}
    </div>
  );
}

function GraduationCapIcon({ size = 20 }: { size?: number }) {
  return <UserPlus size={size} />;
}

function InquiryAgeBadge({ inquiry }: { inquiry: Inquiry }) {
  const age = daysBetween(inquiry.inquiry_date);
  const isStale = inquiry.status === 'new' && age >= 7;

  return (
    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
      isStale ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
    }`}>
      {age === 0 ? 'Today' : `${age} day${age === 1 ? '' : 's'} old`}
    </span>
  );
}

function InquiryMobileCard({
  inquiry,
  canDelete,
  onView,
  onEdit,
  onCreateStudent,
  onDelete,
  isConverting,
}: {
  inquiry: Inquiry;
  canDelete: boolean;
  onView: () => void;
  onEdit: () => void;
  onCreateStudent: () => void;
  onDelete: () => void;
  isConverting: boolean;
}) {
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-navy-900">{inquiry.student_name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={inquiry.status} />
            <PriorityBadge priority={inquiry.priority || 'medium'} />
            <WhatsAppStatusBadge inquiry={inquiry} />
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
              inquiry.attendance === 'yes' ? 'bg-green-100 text-green-700' :
              inquiry.attendance === 'no' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {inquiry.attendance === 'yes' ? 'Attended' : inquiry.attendance === 'no' ? 'No show' : 'Pending'}
            </span>
          </div>
        </div>
        <button
          onClick={onView}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-navy-900"
          title="View"
          aria-label={`View ${inquiry.student_name}`}
        >
          <Eye size={18} />
        </button>
      </div>

      <div className="mt-4 space-y-2 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Phone size={15} className="shrink-0 text-gray-400" />
          <span className="break-all">{inquiry.contact_number}</span>
        </div>
        {inquiry.email && (
          <div className="flex items-center gap-2">
            <Mail size={15} className="shrink-0 text-gray-400" />
            <span className="break-all">{inquiry.email}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Calendar size={15} className="shrink-0 text-gray-400" />
          <span>{inquiry.inquiry_date}</span>
          <InquiryAgeBadge inquiry={inquiry} />
        </div>
        <p>Counselor: <span className="font-medium text-navy-900">{inquiry.assigned_counselor?.name || 'Unassigned'}</span></p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={onEdit}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Edit2 size={16} />
          Edit
        </button>
        <button
          onClick={onView}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Eye size={16} />
          Details
        </button>
        <button
          onClick={onCreateStudent}
          disabled={isConverting}
          className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg border border-maroon-100 px-3 py-2 text-sm font-medium text-maroon-700 transition-colors hover:bg-maroon-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UserPlus size={16} />
          {isConverting ? 'Creating...' : 'Create Student'}
        </button>
        {canDelete && (
          <button
            onClick={onDelete}
            className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg border border-red-100 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
          >
            <Trash2 size={16} />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    new: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'New' },
    contacted: { bg: 'bg-sky-100', text: 'text-sky-700', label: 'Contacted' },
    follow_up_required: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Follow-up Required' },
    counselling_scheduled: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Counselling Scheduled' },
    counselling_completed: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Counselling Completed' },
    assessment_pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Assessment Pending' },
    program_selected: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Program Selected' },
    application_started: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Application Started' },
    converted: { bg: 'bg-green-100', text: 'text-green-700', label: 'Converted' },
    lost: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Lost' },
    not_interested: { bg: 'bg-stone-100', text: 'text-stone-700', label: 'Not Interested' },
    attended: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Attended' },
    ongoing: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Ongoing' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
    no_show: { bg: 'bg-red-100', text: 'text-red-700', label: 'No Show' },
  };

  const config = statusConfig[status] || statusConfig.new;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label || getLeadStatusLabel(status)}
    </span>
  );
}

function WhatsAppStatusBadge({ inquiry }: { inquiry: Inquiry }) {
  const status = inquiry.whatsapp?.status || (inquiry.whatsapp_consent ? 'pending' : 'skipped');
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'WA Pending' },
    sent: { bg: 'bg-green-100', text: 'text-green-700', label: 'WA Sent' },
    delivered: { bg: 'bg-sky-100', text: 'text-sky-700', label: 'WA Delivered' },
    read: { bg: 'bg-violet-100', text: 'text-violet-700', label: 'WA Read' },
    failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'WA Failed' },
    skipped: { bg: 'bg-gray-100', text: 'text-gray-600', label: inquiry.whatsapp_consent ? 'WA Skipped' : 'No WA Consent' },
  };
  const selected = config[status] || config.skipped;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${selected.bg} ${selected.text}`}
      title={inquiry.whatsapp?.error || selected.label}
    >
      <MessageCircle size={13} />
      {selected.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: LeadPriority }) {
  const styles: Record<LeadPriority, string> = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-blue-50 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[priority]}`}>
      {LEAD_PRIORITIES.find((item) => item.value === priority)?.label || 'Medium'}
    </span>
  );
}

function InquiryModal({
  inquiry,
  counselors,
  onClose,
  onSave,
}: {
  inquiry: Inquiry | null;
  counselors: User[];
  onClose: () => void;
  onSave: () => void;
}) {
  const gradeOptions = [
    '8th Grade',
    '9th Grade',
    '10th Grade',
    '11th Grade',
    '12th Grade',
    'Diploma',
    'Graduation',
    'Post Graduate',
  ];
  const referenceSourceOptions = [
    { value: 'earlier_student', label: 'Earlier Student', fieldLabel: 'Earlier Student Name', placeholder: 'Type earlier student name' },
    { value: 'bni', label: 'BNI', fieldLabel: 'BNI Reference Given By', placeholder: 'Type BNI member name' },
    { value: 'outside', label: 'Outside / Other', fieldLabel: 'Outside Reference Details', placeholder: 'Type outside reference or source' },
  ] as const;

  const [formData, setFormData] = useState({
    inquiry_date: inquiry?.inquiry_date || new Date().toISOString().split('T')[0],
    student_name: inquiry?.student_name || '',
    contact_number: inquiry?.contact_number || '',
    email: inquiry?.email || '',
    whatsapp_number: inquiry?.whatsapp_number || '',
    whatsapp_consent: inquiry?.whatsapp_consent || false,
    city: inquiry?.city || '',
    state: inquiry?.state || '',
    lead_source: inquiry?.lead_source || '',
    interested_service: inquiry?.interested_service || '',
    academic_level: inquiry?.academic_level || '',
    preferred_destination: inquiry?.preferred_destination || '',
    preferred_course: inquiry?.preferred_course || '',
    budget_range: inquiry?.budget_range || '',
    priority: (inquiry?.priority || 'medium') as LeadPriority,
    last_contacted: inquiry?.last_contacted || '',
    next_follow_up_date: inquiry?.next_follow_up_date || '',
    next_follow_up_time: inquiry?.next_follow_up_time || '',
    product_type: inquiry?.product_type || '',
    student_grade: inquiry?.student_grade || '',
    reference_source: (inquiry?.reference_source || '') as '' | 'earlier_student' | 'bni' | 'outside',
    reference_name: inquiry?.reference_name || '',
    countries: inquiry?.countries || (inquiry?.country ? [inquiry.country] : []),
    colleges: inquiry?.colleges || [],
    programs: inquiry?.programs || [],
    degree_level: inquiry?.degree_level || '',
    attendance: inquiry?.attendance || 'pending' as 'yes' | 'no' | 'pending',
    status: (inquiry?.status || 'new') as LeadStatus,
    assigned_counselor_id: inquiry?.assigned_counselor_id || '',
    notes: inquiry?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [customCollege, setCustomCollege] = useState('');
  const collegeOptions = getCollegesForCountries(formData.countries);
  const allCollegeOptions = getCollegesForCountries(ADMISSION_COUNTRIES);
  const displayedCollegeOptions = [
    ...collegeOptions,
    ...formData.colleges.filter((college) => !collegeOptions.includes(college)),
  ];
  const selectedReferenceSource = referenceSourceOptions.find(
    (option) => option.value === formData.reference_source
  );

  const toggleArrayValue = (field: 'countries' | 'colleges' | 'programs', value: string) => {
    setFormData((current) => {
      const currentValues = current[field];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      if (field === 'countries') {
        const availableColleges = getCollegesForCountries(nextValues);
        return {
          ...current,
          countries: nextValues,
          colleges: current.colleges.filter(
            (college) => availableColleges.includes(college) || !allCollegeOptions.includes(college)
          ),
        };
      }

      return { ...current, [field]: nextValues };
    });
  };

  const addCustomCollege = () => {
    const trimmedCollege = customCollege.trim();
    if (!trimmedCollege) return;

    setFormData((current) => {
      const alreadySelected = current.colleges.some(
        (college) => college.toLowerCase() === trimmedCollege.toLowerCase()
      );

      return alreadySelected
        ? current
        : { ...current, colleges: [...current.colleges, trimmedCollege] };
    });
    setCustomCollege('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');

    try {
      if (!isValidPhone(formData.contact_number)) {
        throw new Error('Enter a valid phone number with 7 to 15 digits.');
      }
      if (formData.whatsapp_number && !isValidPhone(formData.whatsapp_number)) {
        throw new Error('Enter a valid WhatsApp number with 7 to 15 digits.');
      }
      if (!isValidEmail(formData.email)) {
        throw new Error('Enter a valid email address.');
      }
      if (formData.next_follow_up_time && !formData.next_follow_up_date) {
        throw new Error('Select a next follow-up date when adding a follow-up time.');
      }

      const duplicate = await supabase
        .from<Inquiry[]>('inquiries')
        .select('*');

      const normalizedContact = normalizePhone(formData.contact_number);
      const duplicateLead = (duplicate.data || []).find((item) =>
        item.id !== inquiry?.id && normalizePhone(item.contact_number || '') === normalizedContact
      );
      if (duplicateLead) {
        throw new Error(`A lead already exists for this phone number: ${duplicateLead.student_name}.`);
      }

      const isCollegeAdmission = formData.product_type === 'college_admissions';
      const data = {
        inquiry_date: formData.inquiry_date,
        student_name: formData.student_name.trim(),
        contact_number: normalizePhone(formData.contact_number),
        email: formData.email.trim() || null,
        whatsapp_number: formData.whatsapp_number ? normalizePhone(formData.whatsapp_number) : null,
        whatsapp_consent: formData.whatsapp_consent,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        lead_source: formData.lead_source || null,
        interested_service: formData.interested_service.trim() || null,
        academic_level: formData.academic_level || null,
        preferred_destination: formData.preferred_destination.trim() || null,
        preferred_course: formData.preferred_course.trim() || null,
        budget_range: formData.budget_range || null,
        priority: formData.priority,
        last_contacted: formData.last_contacted || null,
        next_follow_up_date: formData.next_follow_up_date || null,
        next_follow_up_time: formData.next_follow_up_time || null,
        product_type: formData.product_type || null,
        student_grade: formData.student_grade || null,
        reference_source: formData.reference_source || null,
        reference_name: formData.reference_source ? formData.reference_name.trim() || null : null,
        countries: isCollegeAdmission ? formData.countries : [],
        colleges: isCollegeAdmission ? formData.colleges : [],
        programs: isCollegeAdmission ? formData.programs : [],
        degree_level: isCollegeAdmission ? formData.degree_level || null : null,
        attendance: formData.attendance,
        status: formData.attendance === 'no' ? 'no_show' : formData.status,
        assigned_counselor_id: formData.assigned_counselor_id || null,
        notes: formData.notes.trim() || null,
      };

      let savedInquiryId = inquiry?.id;

      if (inquiry) {
        const { error } = await supabase.from('inquiries').update(data).eq('id', inquiry.id);
        if (error) throw error;
      } else {
        const { data: insertedInquiry, error } = await supabase
          .from<Inquiry>('inquiries')
          .insert(data)
          .select()
          .single();

        if (error) throw error;
        savedInquiryId = insertedInquiry?.id;
      }

      const { error: logError } = await supabase.from('activity_logs').insert({
        action: inquiry ? 'Updated inquiry' : 'Created new inquiry',
        entity_type: 'inquiry',
        entity_id: savedInquiryId,
        details: { student_name: formData.student_name },
      });

      if (logError) {
        console.warn('Inquiry saved, but activity log failed:', logError);
      }

      onSave();
    } catch (error) {
      console.error('Error saving inquiry:', error);
      setErrorMessage((error as Error).message || 'Unable to save inquiry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-navy-900">
            {inquiry ? 'Edit Inquiry' : 'New Inquiry'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Inquiry Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="date"
                value={formData.inquiry_date}
                onChange={(e) => setFormData({ ...formData, inquiry_date: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Student Name</label>
            <input
              type="text"
              value={formData.student_name}
              onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="tel"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="tel"
                value={formData.whatsapp_number}
                onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              />
            </div>
            <label className="mt-3 flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formData.whatsapp_consent}
                onChange={(e) => setFormData({ ...formData, whatsapp_consent: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-navy-900 focus:ring-navy-500"
              />
              <span>WhatsApp consent received</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lead Source</label>
              <select
                value={formData.lead_source}
                onChange={(e) => setFormData({ ...formData, lead_source: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              >
                <option value="">Select source</option>
                {LEAD_SOURCES.map((source) => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as LeadPriority })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              >
                {LEAD_PRIORITIES.map((priority) => (
                  <option key={priority.value} value={priority.value}>{priority.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Interested Service</label>
              <input
                type="text"
                value={formData.interested_service}
                onChange={(e) => setFormData({ ...formData, interested_service: e.target.value })}
                placeholder="e.g., overseas admissions, Compass"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Academic Level</label>
              <select
                value={formData.academic_level}
                onChange={(e) => setFormData({ ...formData, academic_level: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              >
                <option value="">Select level</option>
                {ACADEMIC_LEVELS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reference Given By</label>
              <select
                value={formData.reference_source}
                onChange={(e) => {
                  const referenceSource = e.target.value as '' | 'earlier_student' | 'bni' | 'outside';
                  setFormData({
                    ...formData,
                    reference_source: referenceSource,
                    reference_name: referenceSource ? formData.reference_name : '',
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              >
                <option value="">No reference</option>
                {referenceSourceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {selectedReferenceSource && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedReferenceSource.fieldLabel}
                </label>
                <input
                  type="text"
                  value={formData.reference_name}
                  onChange={(e) => setFormData({ ...formData, reference_name: e.target.value })}
                  placeholder={selectedReferenceSource.placeholder}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                  required
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Selection</label>
            <select
              value={formData.product_type}
              onChange={(e) => {
                const productType = e.target.value;
                setFormData({
                  ...formData,
                  product_type: productType,
                  ...(productType === 'college_admissions'
                    ? {}
                    : { countries: [], colleges: [], programs: [], degree_level: '' }),
                });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              required
            >
              <option value="">Select product</option>
              {PRODUCT_CATALOG.map((product) => (
                <option key={product.key} value={product.key}>
                  {product.label}
                </option>
              ))}
            </select>
          </div>

          {formData.product_type === 'college_admissions' && (
            <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <CheckboxGroup
                label="Interest of Countries"
                options={ADMISSION_COUNTRIES}
                selected={formData.countries}
                onToggle={(value) => toggleArrayValue('countries', value)}
              />

              <CheckboxGroup
                label="Interest of College"
                options={displayedCollegeOptions}
                selected={formData.colleges}
                onToggle={(value) => toggleArrayValue('colleges', value)}
                emptyText="Select one or more countries first"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Other University</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCollege}
                    onChange={(e) => setCustomCollege(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomCollege();
                      }
                    }}
                    placeholder="Type university name"
                    className="min-w-0 flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                  />
                  <button
                    type="button"
                    onClick={addCustomCollege}
                    className="shrink-0 px-4 py-2 bg-navy-900 text-white rounded-lg hover:bg-navy-800 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              <CheckboxGroup
                label="Interest of Program"
                options={ADMISSION_PROGRAMS}
                selected={formData.programs}
                onToggle={(value) => toggleArrayValue('programs', value)}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Degree Looking For</label>
                <select
                  value={formData.degree_level}
                  onChange={(e) => setFormData({ ...formData, degree_level: e.target.value as '' | 'ug' | 'pg' | 'phd' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                  required
                >
                  <option value="">Select degree</option>
                  {DEGREE_LEVELS.map((degree) => (
                    <option key={degree.value} value={degree.value}>
                      {degree.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Destination</label>
              <input
                type="text"
                value={formData.preferred_destination}
                onChange={(e) => setFormData({ ...formData, preferred_destination: e.target.value })}
                placeholder="Country or city preference"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Course</label>
              <input
                type="text"
                value={formData.preferred_course}
                onChange={(e) => setFormData({ ...formData, preferred_course: e.target.value })}
                placeholder="Course or career interest"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Budget Range</label>
            <select
              value={formData.budget_range}
              onChange={(e) => setFormData({ ...formData, budget_range: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
            >
              <option value="">Select budget</option>
              {BUDGET_RANGES.map((range) => (
                <option key={range} value={range}>{range}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Student Grade</label>
            <select
              value={formData.student_grade}
              onChange={(e) => setFormData({ ...formData, student_grade: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              required
            >
              <option value="">Select grade</option>
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Attendance</label>
            <select
              value={formData.attendance}
              onChange={(e) => setFormData({ ...formData, attendance: e.target.value as 'yes' | 'no' | 'pending' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
            >
              <option value="pending">Pending</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          {formData.attendance !== 'no' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as LeadStatus })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              >
                {LEAD_STATUSES.filter((status) => status.value !== 'no_show').map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Counselor</label>
            <select
              value={formData.assigned_counselor_id}
              onChange={(e) => setFormData({ ...formData, assigned_counselor_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
            >
              <option value="">Unassigned</option>
              {counselors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.role})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Contacted</label>
              <input
                type="date"
                value={formData.last_contacted}
                onChange={(e) => setFormData({ ...formData, last_contacted: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Next Follow-up</label>
              <input
                type="date"
                value={formData.next_follow_up_date}
                onChange={(e) => setFormData({ ...formData, next_follow_up_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
              <input
                type="time"
                value={formData.next_follow_up_time}
                onChange={(e) => setFormData({ ...formData, next_follow_up_time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Inquiry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
  emptyText,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  emptyText?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      {options.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-sm text-gray-500">
          {emptyText || 'No options available'}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {options.map((option) => (
            <label key={option} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => onToggle(option)}
                className="w-4 h-4 rounded border-gray-300 text-navy-900 focus:ring-navy-500"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
