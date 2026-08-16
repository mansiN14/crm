import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle2, GraduationCap, Mail, Phone, UserPlus, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Inquiry, Student } from '../../lib/supabase';
import { PRODUCT_CATALOG } from '../../lib/products';
import { DEGREE_LEVELS } from '../../lib/admissions';

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  new: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'New' },
  attended: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Attended' },
  ongoing: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Ongoing' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
  no_show: { bg: 'bg-red-100', text: 'text-red-700', label: 'No Show' },
};

const referenceLabels: Record<string, string> = {
  earlier_student: 'Earlier Student',
  bni: 'BNI',
  outside: 'Outside / Other',
};

function formatValue(value?: string | null) {
  return value && value.trim() ? value : 'Not provided';
}

function formatList(values?: string[]) {
  return values && values.length > 0 ? values.join(', ') : 'Not provided';
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.new;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-navy-900">{value}</p>
    </div>
  );
}

export function InquiryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchInquiry = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from<Inquiry>('inquiries')
          .select('*, assigned_counselor:users!assigned_counselor_id(*)')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setErrorMessage('Inquiry not found.');
          return;
        }

        setInquiry(data);

        const { data: studentData } = await supabase
          .from<Student>('students')
          .select('*')
          .eq('inquiry_id', data.id)
          .maybeSingle();
        setStudent(studentData || null);
      } catch (error) {
        console.error('Error fetching inquiry:', error);
        setErrorMessage((error as Error).message || 'Unable to load inquiry.');
      } finally {
        setLoading(false);
      }
    };

    fetchInquiry();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-navy-200 border-t-maroon-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (errorMessage || !inquiry) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/inquiries')}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-navy-900"
        >
          <ArrowLeft size={18} />
          Back to Inquiries
        </button>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          {errorMessage || 'Inquiry not found.'}
        </div>
      </div>
    );
  }

  const productLabel =
    PRODUCT_CATALOG.find((product) => product.key === inquiry.product_type)?.label || 'Not provided';
  const degreeLabel =
    DEGREE_LEVELS.find((degree) => degree.value === inquiry.degree_level)?.label || 'Not provided';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            onClick={() => navigate('/inquiries')}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-navy-900"
          >
            <ArrowLeft size={18} />
            Back to Inquiries
          </button>
          <h1 className="text-2xl font-bold text-navy-900">{inquiry.student_name}</h1>
          <p className="mt-1 text-gray-600">Inquiry details and conversion status</p>
        </div>
        {student ? (
          <Link
            to={`/students/${student.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-white transition-colors hover:bg-navy-800"
          >
            <GraduationCap size={18} />
            Open Student
          </Link>
        ) : (
          inquiry.attendance === 'yes' && inquiry.status === 'attended' && (
            <Link
              to={`/students?inquiry_id=${encodeURIComponent(inquiry.id)}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-white transition-colors hover:bg-navy-800"
            >
              <UserPlus size={18} />
              Create Student
            </Link>
          )
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Calendar className="text-maroon-600" size={20} />
            <div>
              <p className="text-sm text-gray-500">Inquiry Date</p>
              <p className="font-semibold text-navy-900">{inquiry.inquiry_date}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-green-600" size={20} />
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <div className="mt-1"><StatusBadge status={inquiry.status} /></div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Phone className="text-blue-600" size={20} />
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-semibold text-navy-900">{inquiry.contact_number}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Users className="text-purple-600" size={20} />
            <div>
              <p className="text-sm text-gray-500">Counselor</p>
              <p className="font-semibold text-navy-900">{inquiry.assigned_counselor?.name || 'Unassigned'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-navy-900">Student Interest</h2>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <DetailItem label="Product" value={productLabel} />
            <DetailItem label="Student Grade" value={formatValue(inquiry.student_grade)} />
            <DetailItem label="Countries" value={formatList(inquiry.countries || (inquiry.country ? [inquiry.country] : []))} />
            <DetailItem label="Colleges" value={formatList(inquiry.colleges)} />
            <DetailItem label="Programs" value={formatList(inquiry.programs)} />
            <DetailItem label="Degree" value={degreeLabel} />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-navy-900">Contact</h2>
          <div className="mt-6 space-y-5">
            <DetailItem label="Email" value={formatValue(inquiry.email)} />
            <DetailItem label="Attendance" value={inquiry.attendance === 'yes' ? 'Yes' : inquiry.attendance === 'no' ? 'No' : 'Pending'} />
            <div>
              <p className="text-sm font-medium text-gray-500">Quick Contact</p>
              <div className="mt-2 flex gap-2">
                <a href={`tel:${inquiry.contact_number}`} className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50">
                  <Phone size={18} />
                </a>
                {inquiry.email && (
                  <a href={`mailto:${inquiry.email}`} className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50">
                    <Mail size={18} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-navy-900">Reference</h2>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <DetailItem label="Source" value={inquiry.reference_source ? referenceLabels[inquiry.reference_source] : 'No reference'} />
            <DetailItem label="Reference Name" value={formatValue(inquiry.reference_name)} />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-navy-900">Notes</h2>
          <p className="mt-4 whitespace-pre-wrap text-gray-700">{formatValue(inquiry.notes)}</p>
        </div>
      </div>
    </div>
  );
}
