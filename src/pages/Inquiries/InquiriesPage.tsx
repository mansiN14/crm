import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';
import type { Inquiry, User } from '../../lib/supabase';
import { PRODUCT_CATALOG } from '../../lib/products';
import { ADMISSION_COUNTRIES, ADMISSION_PROGRAMS, DEGREE_LEVELS, getCollegesForCountries } from '../../lib/admissions';
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
  const [showModal, setShowModal] = useState(false);
  const [editingInquiry, setEditingInquiry] = useState<Inquiry | null>(null);
  const [counselors, setCounselors] = useState<User[]>([]);

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
    const matchesSearch =
      inquiry.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inquiry.contact_number.includes(searchQuery) ||
      inquiry.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inquiry.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this inquiry?')) return;
    await supabase.from('inquiries').delete().eq('id', id);
    fetchInquiries();
  };

  const canDelete = user?.role === 'admin';
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
      value: inquiries.filter((inquiry) => inquiry.status === 'new' && daysBetween(inquiry.inquiry_date) >= 7).length,
      icon: Clock,
    },
  ];

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
            <option value="new">New</option>
            <option value="attended">Attended</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="no_show">No Show</option>
          </select>
        </div>
      </div>

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
              onCreateStudent={() => navigate(`/students?inquiry_id=${encodeURIComponent(inquiry.id)}`)}
              onDelete={() => handleDelete(inquiry.id)}
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
                    <StatusBadge status={inquiry.status} />
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
                      {inquiry.attendance === 'yes' && inquiry.status === 'attended' && (
                        <button
                          onClick={() => navigate(`/students?inquiry_id=${encodeURIComponent(inquiry.id)}`)}
                          className="p-2 text-maroon-600 hover:text-maroon-700 hover:bg-maroon-50 rounded-lg transition-colors"
                          title="Create Student"
                        >
                          <UserPlus size={18} />
                        </button>
                      )}
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
}: {
  inquiry: Inquiry;
  canDelete: boolean;
  onView: () => void;
  onEdit: () => void;
  onCreateStudent: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-navy-900">{inquiry.student_name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={inquiry.status} />
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
        {inquiry.attendance === 'yes' && inquiry.status === 'attended' ? (
          <button
            onClick={onCreateStudent}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-maroon-100 px-3 py-2 text-sm font-medium text-maroon-700 transition-colors hover:bg-maroon-50"
          >
            <UserPlus size={16} />
            Student
          </button>
        ) : (
          <button
            onClick={onView}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Eye size={16} />
            Details
          </button>
        )}
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
    attended: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Attended' },
    ongoing: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Ongoing' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
    no_show: { bg: 'bg-red-100', text: 'text-red-700', label: 'No Show' },
  };

  const config = statusConfig[status] || statusConfig.new;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
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
    product_type: inquiry?.product_type || '',
    student_grade: inquiry?.student_grade || '',
    reference_source: (inquiry?.reference_source || '') as '' | 'earlier_student' | 'bni' | 'outside',
    reference_name: inquiry?.reference_name || '',
    countries: inquiry?.countries || (inquiry?.country ? [inquiry.country] : []),
    colleges: inquiry?.colleges || [],
    programs: inquiry?.programs || [],
    degree_level: inquiry?.degree_level || '',
    attendance: inquiry?.attendance || 'pending' as 'yes' | 'no' | 'pending',
    status: inquiry?.status || 'new' as 'new' | 'attended' | 'ongoing' | 'completed' | 'no_show',
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
      const isCollegeAdmission = formData.product_type === 'college_admissions';
      const data = {
        inquiry_date: formData.inquiry_date,
        student_name: formData.student_name.trim(),
        contact_number: formData.contact_number.trim(),
        email: formData.email.trim() || null,
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
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'new' | 'attended' | 'ongoing' | 'completed' | 'no_show' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              >
                <option value="new">New Inquiry</option>
                <option value="attended">Attended</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
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
