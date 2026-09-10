import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Inquiry, Student, StudentProduct, Meeting, Payment, User, ProductType, Quotation, Reminder } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';
import { PRODUCT_CATALOG, getProductLabel } from '../../lib/products';
import { ADMISSION_COUNTRIES, ADMISSION_PROGRAMS, DEGREE_LEVELS, getCollegesForCountries } from '../../lib/admissions';
import { StudentModal } from './StudentsPage';
import {
  ArrowLeft,
  Edit2,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  GraduationCap,
  BookOpen,
  Plus,
  CreditCard,
  Package,
  Users,
  Send,
  FileText,
  Save,
  X,
  Bell,
} from 'lucide-react';

type CareerStageKey =
  | 'inquiry'
  | 'orientation'
  | 'send_test_link'
  | 'test_completed'
  | 'quotation'
  | 'payment'
  | 'session_1'
  | 'session_2'
  | 'career_roadmap'
  | 'formal_closure'
  | 'review_1'
  | 'review_2'
  | 'review_3'
  | 'future_engagement';

const CAREER_WORKFLOW_STAGES: Array<{ key: CareerStageKey; label: string }> = [
  { key: 'inquiry', label: 'Inquiry' },
  { key: 'orientation', label: 'Orientation Meeting' },
  { key: 'send_test_link', label: 'Send Psychometric Test Link' },
  { key: 'test_completed', label: 'Test Completed' },
  { key: 'quotation', label: 'Generate Quotation' },
  { key: 'payment', label: 'Payment Received' },
  { key: 'session_1', label: 'Counselling Session #1' },
  { key: 'session_2', label: 'Counselling Session #2' },
  { key: 'career_roadmap', label: 'Career Roadmap' },
  { key: 'formal_closure', label: 'Formal Closure' },
  { key: 'review_1', label: 'Review Session #1' },
  { key: 'review_2', label: 'Review Session #2' },
  { key: 'review_3', label: 'Review Session #3' },
  { key: 'future_engagement', label: 'Future Engagement' },
];

const todayDate = () => new Date().toISOString().split('T')[0];
const COMPANY_EMAIL = 'vijay@thetrueaxis.in';
const SCHOOL_GRADES = ['8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'];
const isSchoolGrade = (grade?: string) => Boolean(grade && SCHOOL_GRADES.includes(grade));
const formatCurrency = (amount: string | number) => `₹${Number(amount || 0).toLocaleString()}`;

function getPaymentAmountSource(payments: Payment[]) {
  return payments.find((payment) => Number(payment.total_amount || 0) > 0) || null;
}

export function StudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'products' | 'meetings' | 'payments'>('overview');
  const [products, setProducts] = useState<StudentProduct[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [counselors, setCounselors] = useState<User[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [savingStatus, setSavingStatus] = useState<Student['status'] | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchStudent = useCallback(async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('students')
        .select('*, education:student_education(*), assigned_counselor:users!assigned_counselor_id(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      setStudent(data);
      setNotesDraft(data?.notes || '');
    } catch (error) {
      console.error('Error fetching student:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchRelatedData = useCallback(async () => {
    if (!id) return;

    const [productsRes, meetingsRes, paymentsRes, quotationsRes, remindersRes] = await Promise.all([
      supabase.from('student_products').select('*, mentor:users(*)').eq('student_id', id),
      supabase.from('meetings').select('*, createdBy:users(*)').eq('student_id', id).order('meeting_date', { ascending: false }),
      supabase.from('payments').select('*').eq('student_id', id).order('due_date', { ascending: false }),
      supabase.from('quotations').select('*').eq('student_id', id).order('created_at', { ascending: false }),
      supabase.from('reminders').select('*').eq('student_id', id).order('reminder_date', { ascending: false }),
    ]);

    setProducts(productsRes.data || []);
    setMeetings(meetingsRes.data || []);
    setPayments(paymentsRes.data || []);
    setQuotations(quotationsRes.data || []);
    setReminders(remindersRes.data || []);
  }, [id]);

  const fetchCounselors = useCallback(async () => {
    const { data } = await supabase.from('users').select('*').in('role', ['admin', 'counselor']);
    setCounselors(data || []);
  }, []);

  const fetchInquiries = useCallback(async () => {
    const { data } = await supabase.from('inquiries').select('*').order('created_at', { ascending: false });
    setInquiries(data || []);
  }, []);

  useEffect(() => {
    if (id) {
      fetchStudent();
      fetchRelatedData();
      fetchCounselors();
      fetchInquiries();
    }
  }, [fetchCounselors, fetchInquiries, fetchRelatedData, fetchStudent, id]);

  const updateStudentStatus = async (status: Student['status']) => {
    if (!id || !student || student.status === status) return;

    try {
      setSavingStatus(status);
      const { error } = await supabase.from('students').update({ status }).eq('id', id);
      if (error) throw error;
      await fetchStudent();
    } catch (error) {
      console.error('Error updating student status:', error);
    } finally {
      setSavingStatus(null);
    }
  };

  const saveStudentNotes = async () => {
    if (!id || !student) return;

    try {
      setSavingNotes(true);
      const notes = notesDraft.trim();
      const { error } = await supabase
        .from('students')
        .update({ notes: notes || null })
        .eq('id', id);

      if (error) throw error;
      setStudent({ ...student, notes: notes || undefined });
      setNotesDraft(notes);
    } catch (error) {
      console.error('Error saving student notes:', error);
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-navy-200 border-t-maroon-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Student not found</p>
        <button onClick={() => navigate('/students')} className="mt-4 text-maroon-600 hover:text-maroon-700">
          Back to Students
        </button>
      </div>
    );
  }

  const activeQuotation = quotations[0] || null;
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0);
  const totalDue = activeQuotation
    ? Math.max(Number(activeQuotation.total_amount) - totalPaid, 0)
    : payments.reduce(
        (sum, payment) => sum + Math.max(Number(payment.total_amount || 0) - Number(payment.amount_paid || 0), 0),
        0
      );
  const feeBalance = Math.max(activeQuotation ? Number(activeQuotation.total_amount) - totalPaid : totalDue, 0);

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/students')}
        className="flex items-center gap-2 text-gray-600 hover:text-navy-900 transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back to Students</span>
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-navy-900 to-navy-800 px-4 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                <GraduationCap className="text-white" size={40} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{student.student_name}</h1>
                <p className="text-navy-200 mt-1">Status: <span className="capitalize">{student.status}</span></p>
              </div>
            </div>
            <button
              onClick={() => setShowEditProfileModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              <Edit2 size={18} />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Counselling Fee</p>
              <p className="text-2xl font-bold text-navy-900">
                ₹{activeQuotation ? Number(activeQuotation.total_amount).toLocaleString() : '0'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Paid</p>
              <p className="text-2xl font-bold text-green-600">₹{totalPaid.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-orange-600">₹{feeBalance.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Payments</p>
              <p className="text-2xl font-bold text-navy-900">{payments.length}</p>
            </div>
          </div>

          {student.status === 'ongoing' && (
            <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold text-navy-900">File closure actions</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Use <span className="font-medium text-navy-900">Close File</span> when counselling,
                    fees, and meetings are finished. Use <span className="font-medium text-navy-900">Keep in Contact List</span>
                    when the current counselling is complete but the student wants future follow-up.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => updateStudentStatus('completed')}
                    disabled={savingStatus !== null}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white transition-colors"
                  >
                    <CheckCircle2 size={18} />
                    <span>{savingStatus === 'completed' ? 'Closing...' : 'Close File'}</span>
                  </button>
                  <button
                    onClick={() => updateStudentStatus('inactive')}
                    disabled={savingStatus !== null}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    <Users size={18} />
                    <span>{savingStatus === 'inactive' ? 'Saving...' : 'Keep in Contact List'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-b border-gray-200">
        <div className="flex gap-3 overflow-x-auto">
          {['overview', 'timeline', 'products', 'meetings', 'payments'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'text-navy-900 border-b-2 border-navy-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-navy-900 mb-4 flex items-center gap-2">
              <GraduationCap size={20} className="text-maroon-600" />
              Personal Details
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Father's Name</p>
                  <p className="text-navy-900">{student.father_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Mother's Name</p>
                  <p className="text-navy-900">{student.mother_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="text-navy-900">{student.date_of_birth || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Counselor</p>
                  <p className="text-navy-900">{student.assigned_counselor?.name || 'Unassigned'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-navy-900">
                <Phone size={16} className="text-gray-400" />
                <span>{student.mobile_number}</span>
              </div>
              {student.email && (
                <div className="flex items-center gap-2 text-navy-900">
                  <Mail size={16} className="text-gray-400" />
                  <span>{student.email}</span>
                </div>
              )}
              {student.address && (
                <div className="flex items-start gap-2 text-navy-900">
                  <MapPin size={16} className="text-gray-400 mt-1" />
                  <span>{student.address}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-navy-900 mb-4 flex items-center gap-2">
              <BookOpen size={20} className="text-maroon-600" />
              Education Details
            </h2>
            {student.education ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-2">School Education</p>
                  {(student.education.school_name || student.education.school_board) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">School Name</p>
                        <p className="text-navy-900">{student.education.school_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">School Board</p>
                        <p className="text-navy-900">{student.education.school_board || 'N/A'}</p>
                      </div>
                    </div>
                  )}
                  {(student.education.board_major_subject || student.education.board_subject_percentage) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Main Major Subject</p>
                        <p className="text-navy-900">{student.education.board_major_subject || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Major Subject Percentage</p>
                        <p className="text-navy-900">
                          {student.education.board_subject_percentage ? `${student.education.board_subject_percentage}%` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {['eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'].map((grade) => {
                      const pct = student.education?.[`${grade}_percentage` as keyof typeof student.education];
                      return (
                        <div key={grade} className="text-center">
                          <p className="text-xs text-gray-400 capitalize">{grade.replace('th', '')}th</p>
                          <p className="font-semibold text-navy-900">{pct ? `${pct}%` : '-'}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {student.education.diploma && (
                    <div>
                      <p className="text-sm text-gray-500">Diploma</p>
                      <p className="text-navy-900">{student.education.diploma} ({student.education.diploma_percentage}%)</p>
                    </div>
                  )}
                  {student.education.graduation && (
                    <div>
                      <p className="text-sm text-gray-500">Graduation</p>
                      <p className="text-navy-900">{student.education.graduation} ({student.education.graduation_percentage}%)</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Current Grade</p>
                    <p className="text-navy-900">{student.education.current_grade || 'N/A'}</p>
                  </div>
                  {!isSchoolGrade(student.education.current_grade) && (
                    <div>
                      <p className="text-sm text-gray-500">Current Stream</p>
                      <p className="text-navy-900">{student.education.current_stream || 'N/A'}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No education details available</p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <h2 className="text-lg font-semibold text-navy-900 flex items-center gap-2">
                <FileText size={20} className="text-maroon-600" />
                Profile Notes
              </h2>
              <button
                onClick={saveStudentNotes}
                disabled={savingNotes || notesDraft.trim() === (student.notes || '').trim()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-navy-900 hover:bg-navy-800 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <Save size={16} />
                <span>{savingNotes ? 'Saving...' : 'Save Notes'}</span>
              </button>
            </div>
            <textarea
              value={notesDraft}
              onChange={(event) => setNotesDraft(event.target.value)}
              rows={5}
              placeholder="Add general notes for this student profile..."
              className="w-full resize-y rounded-lg border border-gray-300 px-4 py-3 text-navy-900 focus:border-navy-500 focus:ring-2 focus:ring-navy-500"
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-navy-900 flex items-center gap-2">
                <CreditCard size={20} className="text-maroon-600" />
                Counselling Fees
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFeeModal(true)}
                  className="text-sm font-medium text-maroon-600 hover:text-maroon-700"
                >
                  Add / edit fee
                </button>
                <button
                  onClick={() => setActiveTab('payments')}
                  className="text-sm font-medium text-navy-900 hover:text-navy-700"
                >
                  Add payment
                </button>
              </div>
            </div>

            {activeQuotation ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FeeSummary label="Product" value={activeQuotation.product_name} />
                <FeeSummary label="Base Amount" value={`₹${Number(activeQuotation.amount).toLocaleString()}`} />
                <FeeSummary label="Discount" value={`₹${Number(activeQuotation.discount).toLocaleString()}`} />
                <FeeSummary label="Grand Total" value={`₹${Number(activeQuotation.total_amount).toLocaleString()}`} />
                <div className="md:col-span-2 lg:col-span-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-lg bg-gray-50 p-4">
                  <div>
                    <p className="text-sm text-gray-500">GST</p>
                    <p className="font-medium text-navy-900">{activeQuotation.gst_percentage}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-medium text-navy-900 capitalize">{activeQuotation.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Balance</p>
                    <p className="font-medium text-orange-600">₹{feeBalance.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 p-6 text-gray-500">
                No counselling fee has been added yet. Use the button below to create a fee quotation.
              </div>
            )}

            <div className="mt-4 flex flex-wrap justify-end gap-3">
              <button
                onClick={() => setShowFeeModal(true)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Edit counselling fee
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-lg transition-colors"
              >
                Create payment record
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <TimelineTab
          student={student}
          products={products}
          meetings={meetings}
          payments={payments}
          quotations={quotations}
          reminders={reminders}
        />
      )}

      {activeTab === 'products' && (
        <ProductsTab
          studentId={id!}
          studentName={student.student_name}
          studentEmail={student.email}
          products={products}
          counselors={counselors}
          quotations={quotations}
          payments={payments}
          currentUser={user}
          onOpenQuotation={() => setShowFeeModal(true)}
          onOpenPayments={() => setActiveTab('payments')}
          onRefresh={fetchRelatedData}
        />
      )}

      {activeTab === 'meetings' && (
        <MeetingsTab studentId={id!} meetings={meetings} onRefresh={fetchRelatedData} />
      )}

      {activeTab === 'payments' && (
        <PaymentsTab
          studentId={id!}
          payments={payments}
          latestQuotation={activeQuotation}
          onRefresh={fetchRelatedData}
        />
      )}

      {showFeeModal && (
        <FeeModal
          studentId={id!}
          studentName={student.student_name}
          products={products}
          quotation={activeQuotation}
          paymentAmountSource={getPaymentAmountSource(payments)}
          onClose={() => setShowFeeModal(false)}
          onSave={() => {
            setShowFeeModal(false);
            fetchRelatedData();
          }}
        />
      )}

      {showEditProfileModal && (
        <StudentModal
          student={student}
          inquiries={inquiries}
          counselors={counselors}
          onClose={() => setShowEditProfileModal(false)}
          onSave={() => {
            setShowEditProfileModal(false);
            fetchStudent();
            fetchRelatedData();
          }}
        />
      )}
    </div>
  );
}

type TimelineItem = {
  id: string;
  date: string;
  title: string;
  detail: string;
  kind: 'profile' | 'product' | 'meeting' | 'payment' | 'quotation' | 'reminder';
};

function TimelineTab({
  student,
  products,
  meetings,
  payments,
  quotations,
  reminders,
}: {
  student: Student;
  products: StudentProduct[];
  meetings: Meeting[];
  payments: Payment[];
  quotations: Quotation[];
  reminders: Reminder[];
}) {
  const items: TimelineItem[] = [
    {
      id: `student-${student.id}`,
      date: student.created_at,
      title: 'Student profile created',
      detail: student.assigned_counselor?.name ? `Assigned to ${student.assigned_counselor.name}` : 'No counselor assigned',
      kind: 'profile' as const,
    },
    ...products.map((product) => ({
      id: `product-${product.id}`,
      date: product.created_at,
      title: getProductLabel(product.product_type),
      detail: `Product ${product.status}`,
      kind: 'product' as const,
    })),
    ...meetings.map((meeting) => ({
      id: `meeting-${meeting.id}`,
      date: `${meeting.meeting_date}T${meeting.meeting_time || '00:00'}`,
      title: `Meeting #${meeting.meeting_number}`,
      detail: meeting.outcome || meeting.next_action || meeting.discussion_notes || 'Meeting scheduled',
      kind: 'meeting' as const,
    })),
    ...payments.map((payment) => ({
      id: `payment-${payment.id}`,
      date: payment.payment_date || payment.due_date,
      title: `Payment #${payment.payment_number}`,
      detail: `${formatCurrency(payment.amount_paid)} paid, ${formatCurrency(Number(payment.total_amount || 0) - Number(payment.amount_paid || 0))} balance`,
      kind: 'payment' as const,
    })),
    ...quotations.map((quotation) => ({
      id: `quotation-${quotation.id}`,
      date: quotation.quotation_date || quotation.created_at,
      title: `Quotation #${quotation.quotation_number}`,
      detail: `${quotation.product_name} - ${formatCurrency(quotation.total_amount)} - ${quotation.status}`,
      kind: 'quotation' as const,
    })),
    ...reminders.map((reminder) => ({
      id: `reminder-${reminder.id}`,
      date: `${reminder.reminder_date}T${reminder.reminder_time || '00:00'}`,
      title: reminder.title,
      detail: `${reminder.reminder_type.replace('_', ' ')} - ${reminder.status}`,
      kind: 'reminder' as const,
    })),
  ].sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime());

  const iconConfig = {
    profile: { icon: GraduationCap, className: 'bg-navy-100 text-navy-700' },
    product: { icon: Package, className: 'bg-blue-100 text-blue-700' },
    meeting: { icon: Calendar, className: 'bg-purple-100 text-purple-700' },
    payment: { icon: CreditCard, className: 'bg-green-100 text-green-700' },
    quotation: { icon: FileText, className: 'bg-orange-100 text-orange-700' },
    reminder: { icon: Bell, className: 'bg-red-100 text-red-700' },
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-navy-900">Student Timeline</h2>
        <p className="mt-1 text-sm text-gray-600">Meetings, payments, reminders, quotations, and profile milestones in one place.</p>
      </div>
      {items.length === 0 ? (
        <div className="p-12 text-center text-gray-500">No timeline activity yet</div>
      ) : (
        <div className="p-6">
          <div className="relative">
            <div className="absolute bottom-0 left-5 top-0 w-px bg-gray-200" />
            <div className="space-y-5">
              {items.map((item) => {
                const config = iconConfig[item.kind];
                const Icon = config.icon;

                return (
                  <div key={item.id} className="relative flex gap-4">
                    <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${config.className}`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-semibold text-navy-900">{item.title}</p>
                        <p className="text-sm text-gray-500">{formatTimelineDate(item.date)}</p>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{item.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimelineDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: value.includes('T') ? 'numeric' : undefined,
    minute: value.includes('T') ? '2-digit' : undefined,
  });
}

function ProductsTab({
  studentId,
  studentName,
  studentEmail,
  products,
  counselors,
  quotations,
  payments,
  currentUser,
  onOpenQuotation,
  onOpenPayments,
  onRefresh,
}: {
  studentId: string;
  studentName: string;
  studentEmail?: string;
  products: StudentProduct[];
  counselors: User[];
  quotations: Quotation[];
  payments: Payment[];
  currentUser: User | null;
  onOpenQuotation: () => void;
  onOpenPayments: () => void;
  onRefresh: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StudentProduct | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditingProduct(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          <span>Add Product</span>
        </button>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Package className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500">No products assigned yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${
                product.product_type === 'career_counselling' ? 'lg:col-span-2' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-lg font-semibold text-navy-900">
                    {getProductLabel(product.product_type)}
                  </h3>
                  <span className={`mt-2 inline-flex text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                    product.status === 'completed' ? 'bg-green-100 text-green-700' :
                    product.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {product.status}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setEditingProduct(product);
                    setShowModal(true);
                  }}
                  className="p-2 text-gray-600 hover:text-navy-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit2 size={16} />
                </button>
              </div>

              {product.product_type === 'career_counselling' && (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <ProductInfoBlock label="Interests" value={product.interests} />
                    <ProductInfoBlock label="Strengths" value={product.strengths} />
                    <ProductInfoBlock label="Preferred Career" value={product.preferred_career} />
                  </div>
                  <CareerCounsellingWorkflow
                    product={product}
                    studentId={studentId}
                    studentName={studentName}
                    studentEmail={studentEmail}
                    counselors={counselors}
                    quotations={quotations}
                    payments={payments}
                    currentUser={currentUser}
                    onOpenQuotation={onOpenQuotation}
                    onOpenPayments={onOpenPayments}
                    onAddProduct={() => {
                      setEditingProduct(null);
                      setShowModal(true);
                    }}
                    onRefresh={onRefresh}
                  />
                </>
              )}

              {product.product_type === 'college_admissions' && (
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-500">Countries:</span> {formatList(product.countries) || product.country || 'N/A'}</p>
                  <p><span className="text-gray-500">Colleges:</span> {formatList(product.colleges) || product.university_name || 'N/A'}</p>
                  <p><span className="text-gray-500">Programs:</span> {formatList(product.programs) || product.course_name || 'N/A'}</p>
                  <p><span className="text-gray-500">Degree:</span> {formatDegree(product.degree_level) || 'N/A'}</p>
                  <p><span className="text-gray-500">Intake:</span> {product.intake_year || 'N/A'}</p>
                </div>
              )}

              {product.product_type === 'mentoring' && (
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-500">Mentor:</span> {product.mentor?.name || 'N/A'}</p>
                  <p><span className="text-gray-500">Duration:</span> {product.duration || 'N/A'}</p>
                  <p><span className="text-gray-500">Goals:</span> {product.mentoring_goals || 'N/A'}</p>
                </div>
              )}

              {product.product_type === 'psychometric_test' && (
                <PsychometricTestPanel
                  product={product}
                  studentName={studentName}
                  studentEmail={studentEmail}
                  currentUser={currentUser}
                  onRefresh={onRefresh}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ProductModal
          studentId={studentId}
          product={editingProduct}
          counselors={counselors}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

function CareerCounsellingWorkflow({
  product,
  studentId,
  studentName,
  studentEmail,
  counselors,
  quotations,
  payments,
  currentUser,
  onOpenQuotation,
  onOpenPayments,
  onAddProduct,
  onRefresh,
}: {
  product: StudentProduct;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  counselors: User[];
  quotations: Quotation[];
  payments: Payment[];
  currentUser: User | null;
  onOpenQuotation: () => void;
  onOpenPayments: () => void;
  onAddProduct: () => void;
  onRefresh: () => void;
}) {
  const [savingStage, setSavingStage] = useState<CareerStageKey | null>(null);
  const [orientation, setOrientation] = useState({
    orientation_date: product.orientation_date || '',
    orientation_counselor_id: product.orientation_counselor_id || '',
    orientation_notes: product.orientation_notes || '',
    student_goal: product.student_goal || '',
    orientation_outcome: product.orientation_outcome || '',
  });
  const [testLink, setTestLink] = useState(product.test_link || '');
  const [sessions, setSessions] = useState(() => {
    const existing = product.counselling_sessions || [];
    return [0, 1].map((index) => ({
      date: existing[index]?.date || '',
      discussion_notes: existing[index]?.discussion_notes || '',
      observations: existing[index]?.observations || '',
      next_action: existing[index]?.next_action || '',
      next_meeting_date: existing[index]?.next_meeting_date || '',
      completed: existing[index]?.completed || false,
    }));
  });
  const [roadmap, setRoadmap] = useState({
    roadmap_pdf_url: product.roadmap_pdf_url || '',
    roadmap_notes: product.roadmap_notes || '',
  });
  const [closure, setClosure] = useState({
    closure_date: product.closure_date || '',
    final_notes: product.final_notes || '',
    counselor_remarks: product.counselor_remarks || '',
  });
  const [reviews, setReviews] = useState(() => normalizeReviewSessions(product.review_sessions));

  const relatedQuotation =
    quotations.find((quotation) => quotation.product_id === product.id) ||
    quotations.find((quotation) => quotation.product_name === getProductLabel(product.product_type));
  const quotationAccepted = relatedQuotation?.status === 'accepted';
  const paidForQuotation = payments
    .filter((payment) => !relatedQuotation || !payment.quotation_id || payment.quotation_id === relatedQuotation.id)
    .reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0);
  const paymentReceived = Boolean(
    relatedQuotation && paidForQuotation >= Number(relatedQuotation.total_amount || 0)
  );
  const completions = product.workflow_completions || {};
  const completed: Record<CareerStageKey, boolean> = {
    inquiry: true,
    orientation: Boolean(product.orientation_completed),
    send_test_link: product.test_status === 'sent' || product.test_status === 'completed',
    test_completed: product.test_status === 'completed',
    quotation: quotationAccepted,
    payment: paymentReceived,
    session_1: Boolean(product.counselling_sessions?.[0]?.completed),
    session_2: Boolean(product.counselling_sessions?.[1]?.completed),
    career_roadmap: Boolean(product.roadmap_delivered),
    formal_closure: Boolean(product.formal_closure_completed),
    review_1: Boolean(product.review_sessions?.[0]?.completed),
    review_2: Boolean(product.review_sessions?.[1]?.completed),
    review_3: Boolean(product.review_sessions?.[2]?.completed),
    future_engagement: product.status === 'completed',
  };
  const currentStage = CAREER_WORKFLOW_STAGES.find((stage) => !completed[stage.key])?.key || 'future_engagement';
  const stageIndex = CAREER_WORKFLOW_STAGES.findIndex((stage) => stage.key === currentStage);
  const canUse = (key: CareerStageKey) => CAREER_WORKFLOW_STAGES.findIndex((stage) => stage.key === key) <= stageIndex;
  const completedCount = CAREER_WORKFLOW_STAGES.filter((stage) => completed[stage.key]).length;
  const progressPercent = Math.round((completedCount / CAREER_WORKFLOW_STAGES.length) * 100);
  const currentStageLabel = CAREER_WORKFLOW_STAGES.find((stage) => stage.key === currentStage)?.label || 'Completed';

  const saveStage = async (stage: CareerStageKey, data: Record<string, unknown>, action: string) => {
    setSavingStage(stage);
    try {
      const completed_at = new Date().toISOString();
      const nextCompletions = {
        ...completions,
        [stage]: { completed_at, completed_by: currentUser?.id },
      };

      await supabase
        .from('student_products')
        .update({ ...data, workflow_completions: nextCompletions })
        .eq('id', product.id);

      await supabase.from('activity_logs').insert({
        user_id: currentUser?.id || null,
        action,
        entity_type: 'student_product',
        entity_id: product.id,
        details: {
          student_id: studentId,
          product_type: product.product_type,
          stage,
          completed_at,
        },
      });

      onRefresh();
    } catch (error) {
      console.error('Error saving workflow stage:', error);
    } finally {
      setSavingStage(null);
    }
  };

  const updateSession = (index: number, field: string, value: string) => {
    setSessions((current) =>
      current.map((session, sessionIndex) =>
        sessionIndex === index ? { ...session, [field]: value } : session
      )
    );
  };

  const updateReview = (index: number, field: string, value: string | boolean) => {
    setReviews((current) =>
      current.map((review, reviewIndex) =>
        reviewIndex === index ? { ...review, [field]: value } : review
      )
    );
  };

  const addReviewSession = () => {
    setReviews((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        title: `Review Session #${current.length + 1}`,
        date: '',
        discussion: '',
        progress: '',
        action_items: '',
        completed: false,
      },
    ]);
  };

  const sendTestLinkEmail = () => {
    if (!studentEmail || !testLink) return;

    openTestLinkEmailDraft({
      to: studentEmail,
      studentName,
      testLink,
      productLabel: 'Career Counselling Psychometric Test',
      counselorName: currentUser?.name,
    });

    saveStage(
      'send_test_link',
      { test_link: testLink, test_link_sent_at: todayDate(), test_status: 'sent' },
      'Sent Psychometric Test Link'
    );
  };

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
      <div className="border-b border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Career Counselling Workflow</p>
            <h4 className="mt-1 text-xl font-semibold text-navy-900">{currentStageLabel}</h4>
            <p className="mt-1 text-sm text-gray-600">
              {completedCount} of {CAREER_WORKFLOW_STAGES.length} stages completed
            </p>
          </div>
          <div className="w-full lg:max-w-sm">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-navy-900">Overall progress</span>
              <span className="text-gray-600">{progressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-navy-900 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 p-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="space-y-2">
          {CAREER_WORKFLOW_STAGES.map((stage, index) => {
            const isComplete = completed[stage.key];
            const isCurrent = stage.key === currentStage;
            return (
              <div
                key={stage.key}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                  isComplete
                    ? 'border-green-200 bg-green-50 text-green-800'
                    : isCurrent
                      ? 'border-navy-200 bg-navy-50 text-navy-900 shadow-sm'
                      : 'border-transparent bg-white text-gray-500'
                }`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  isComplete
                    ? 'bg-green-600 text-white'
                    : isCurrent
                      ? 'bg-navy-900 text-white'
                      : 'bg-gray-100 text-gray-500'
                }`}>
                  {isComplete ? <CheckCircle2 size={15} /> : index + 1}
                </span>
                <span className="font-medium leading-snug">{stage.label}</span>
              </div>
            );
          })}
          </div>
        </aside>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

      <WorkflowSection title="Orientation" locked={!canUse('orientation')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField label="Orientation Date" type="date" value={orientation.orientation_date} onChange={(v) => setOrientation({ ...orientation, orientation_date: v })} required />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Counselor</label>
            <select
              value={orientation.orientation_counselor_id}
              onChange={(e) => setOrientation({ ...orientation, orientation_counselor_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
            >
              <option value="">Select counselor</option>
              {counselors.map((counselor) => (
                <option key={counselor.id} value={counselor.id}>{counselor.name}</option>
              ))}
            </select>
          </div>
        </div>
        <InputField label="Discussion Notes" value={orientation.orientation_notes} onChange={(v) => setOrientation({ ...orientation, orientation_notes: v })} textarea />
        <InputField label="Student Goal" value={orientation.student_goal} onChange={(v) => setOrientation({ ...orientation, student_goal: v })} textarea />
        <InputField label="Outcome" value={orientation.orientation_outcome} onChange={(v) => setOrientation({ ...orientation, orientation_outcome: v })} textarea />
        <WorkflowButton
          disabled={!canUse('orientation') || !orientation.orientation_date}
          saving={savingStage === 'orientation'}
          label="Mark Orientation Completed"
          onClick={() => saveStage('orientation', { ...orientation, orientation_completed: true }, 'Completed Orientation')}
        />
      </WorkflowSection>

      <WorkflowSection title="Psychometric Test" locked={!canUse('send_test_link')}>
        <InputField label="Test Link" value={testLink} onChange={setTestLink} placeholder="https://..." />
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          <p className="font-medium text-navy-900">Email draft</p>
          <p className="mt-1">
            {studentEmail
              ? `A Gmail draft will open from ${COMPANY_EMAIL} to ${studentEmail}. Review it, then click Send in Gmail.`
              : 'Add an email address to the student profile before sending the link.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <WorkflowButton
            disabled={!canUse('send_test_link') || !testLink || !studentEmail}
            saving={savingStage === 'send_test_link'}
            icon={<Send size={16} />}
            label="Open Gmail Draft"
            onClick={sendTestLinkEmail}
          />
          <WorkflowButton
            disabled={!canUse('test_completed') || !(product.test_status === 'sent' || product.test_status === 'completed')}
            saving={savingStage === 'test_completed'}
            label="Mark Test Completed"
            onClick={() => saveStage('test_completed', { test_status: 'completed' }, 'Completed Psychometric Test')}
          />
        </div>
        <p className="text-xs text-gray-500">Status: {product.test_status || 'pending'}{product.test_link_sent_at ? `, sent on ${product.test_link_sent_at}` : ''}</p>
      </WorkflowSection>

      <WorkflowSection title="Quotation" locked={!canUse('quotation')}>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          {relatedQuotation ? (
            <p>Linked quotation #{relatedQuotation.quotation_number}: <span className="font-medium capitalize">{relatedQuotation.status}</span></p>
          ) : (
            <p>No quotation linked yet. Use the existing quotation functionality for this student.</p>
          )}
        </div>
        <WorkflowButton disabled={!canUse('quotation')} icon={<FileText size={16} />} label="Open Quotation" onClick={onOpenQuotation} />
      </WorkflowSection>

      <WorkflowSection title="Payment" locked={!canUse('payment')}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Received</p>
            <p className="mt-1 text-lg font-semibold text-green-700">₹{paidForQuotation.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Required</p>
            <p className="mt-1 text-lg font-semibold text-navy-900">₹{Number(relatedQuotation?.total_amount || 0).toLocaleString()}</p>
          </div>
        </div>
        <WorkflowButton disabled={!canUse('payment') || !quotationAccepted} icon={<CreditCard size={16} />} label="Open Payments" onClick={onOpenPayments} />
      </WorkflowSection>

      {[0, 1].map((index) => {
        const key = `session_${index + 1}` as CareerStageKey;
        return (
          <WorkflowSection key={key} title={`Counselling Session #${index + 1}`} locked={!canUse(key)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputField label="Date" type="date" value={sessions[index].date || ''} onChange={(v) => updateSession(index, 'date', v)} />
              <InputField label="Next Meeting Date" type="date" value={sessions[index].next_meeting_date || ''} onChange={(v) => updateSession(index, 'next_meeting_date', v)} />
            </div>
            <InputField label="Discussion Notes" value={sessions[index].discussion_notes || ''} onChange={(v) => updateSession(index, 'discussion_notes', v)} textarea />
            <InputField label="Observations" value={sessions[index].observations || ''} onChange={(v) => updateSession(index, 'observations', v)} textarea />
            <InputField label="Next Action" value={sessions[index].next_action || ''} onChange={(v) => updateSession(index, 'next_action', v)} />
            <WorkflowButton
              disabled={!canUse(key) || !sessions[index].date}
              saving={savingStage === key}
              label={`Complete Session #${index + 1}`}
              onClick={() => {
                const nextSessions = sessions.map((session, sessionIndex) =>
                  sessionIndex === index ? { ...session, completed: true } : session
                );
                saveStage(key, { counselling_sessions: nextSessions }, `Completed Counselling Session #${index + 1}`);
              }}
            />
          </WorkflowSection>
        );
      })}

      <WorkflowSection title="Career Roadmap" locked={!canUse('career_roadmap')}>
        <InputField label="Roadmap PDF" value={roadmap.roadmap_pdf_url} onChange={(v) => setRoadmap({ ...roadmap, roadmap_pdf_url: v })} placeholder="Paste uploaded PDF URL or filename" />
        <InputField label="Roadmap Notes" value={roadmap.roadmap_notes} onChange={(v) => setRoadmap({ ...roadmap, roadmap_notes: v })} textarea />
        <WorkflowButton
          disabled={!canUse('career_roadmap') || (!roadmap.roadmap_pdf_url && !roadmap.roadmap_notes)}
          saving={savingStage === 'career_roadmap'}
          label="Mark Roadmap Delivered"
          onClick={() => saveStage('career_roadmap', { ...roadmap, roadmap_delivered: true }, 'Delivered Career Roadmap')}
        />
      </WorkflowSection>

      <WorkflowSection title="Formal Closure" locked={!canUse('formal_closure')}>
        <InputField label="Closure Date" type="date" value={closure.closure_date} onChange={(v) => setClosure({ ...closure, closure_date: v })} />
        <InputField label="Final Notes" value={closure.final_notes} onChange={(v) => setClosure({ ...closure, final_notes: v })} textarea />
        <InputField label="Counselor Remarks" value={closure.counselor_remarks} onChange={(v) => setClosure({ ...closure, counselor_remarks: v })} textarea />
        <WorkflowButton
          disabled={!canUse('formal_closure') || !closure.closure_date}
          saving={savingStage === 'formal_closure'}
          label="Complete Formal Closure"
          onClick={() => saveStage('formal_closure', { ...closure, formal_closure_completed: true }, 'Completed Formal Closure')}
        />
      </WorkflowSection>

      <WorkflowSection title="Review Sessions" locked={!canUse('review_1')} className="xl:col-span-2">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {reviews.map((review, index) => {
            const key = `review_${index + 1}` as CareerStageKey;
            const builtInKey = index < 3 ? key : 'review_3';
            return (
              <div key={review.id} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h5 className="font-medium text-navy-900">{review.title}</h5>
                  {review.completed && <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">Completed</span>}
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <InputField label="Date" type="date" value={review.date || ''} onChange={(v) => updateReview(index, 'date', v)} />
                  <InputField label="Progress" value={review.progress || ''} onChange={(v) => updateReview(index, 'progress', v)} />
                </div>
                <InputField label="Discussion" value={review.discussion || ''} onChange={(v) => updateReview(index, 'discussion', v)} textarea />
                <InputField label="Action Items" value={review.action_items || ''} onChange={(v) => updateReview(index, 'action_items', v)} textarea />
                <WorkflowButton
                  disabled={index < 3 ? !canUse(key) || !review.date : !canUse('future_engagement') || !review.date}
                  saving={savingStage === builtInKey}
                  label={`Complete ${review.title}`}
                  onClick={() => {
                    const nextReviews = reviews.map((item, reviewIndex) =>
                      reviewIndex === index ? { ...item, completed: true } : item
                    );
                    saveStage(builtInKey, { review_sessions: nextReviews }, `Completed ${review.title}`);
                  }}
                />
              </div>
            );
          })}
        </div>
        <button type="button" onClick={addReviewSession} className="text-sm font-medium text-maroon-600 hover:text-maroon-700">
          Add another review session
        </button>
      </WorkflowSection>

      <WorkflowSection title="Future Engagement" locked={!canUse('future_engagement')} className="xl:col-span-2">
        <p className="text-sm text-gray-600">Assign another service to this same student profile without duplicating the student record.</p>
        <div className="flex flex-wrap gap-3">
          <WorkflowButton
            disabled={!canUse('future_engagement')}
            saving={savingStage === 'future_engagement'}
            label="Mark Career Counselling Completed"
            onClick={() => saveStage('future_engagement', { status: 'completed' }, 'Moved to Future Engagement')}
          />
          <WorkflowButton
            disabled={!canUse('future_engagement')}
            icon={<Plus size={16} />}
            label="Assign Another Service"
            onClick={onAddProduct}
          />
        </div>
      </WorkflowSection>
        </div>
      </div>
    </div>
  );
}

function ProductInfoBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-navy-900">{value || 'Not recorded'}</p>
    </div>
  );
}

function PsychometricTestPanel({
  product,
  studentName,
  studentEmail,
  currentUser,
  onRefresh,
}: {
  product: StudentProduct;
  studentName: string;
  studentEmail?: string;
  currentUser: User | null;
  onRefresh: () => void;
}) {
  const [testLink, setTestLink] = useState(product.test_link || '');
  const [saving, setSaving] = useState(false);

  const handleOpenGmailDraft = async () => {
    if (!studentEmail || !testLink) return;

    openTestLinkEmailDraft({
      to: studentEmail,
      studentName,
      testLink,
      productLabel: 'Psychometric Test',
      counselorName: currentUser?.name,
    });

    setSaving(true);
    try {
      await supabase
        .from('student_products')
        .update({ test_link: testLink, test_link_sent_at: todayDate(), test_status: 'sent' })
        .eq('id', product.id);

      await supabase.from('activity_logs').insert({
        user_id: currentUser?.id || null,
        action: 'Sent Psychometric Test Link',
        entity_type: 'student_product',
        entity_id: product.id,
        details: {
          student_id: product.student_id,
          product_type: product.product_type,
          sent_to: studentEmail,
        },
      });

      onRefresh();
    } catch (error) {
      console.error('Error saving psychometric test link:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ProductInfoBlock label="Test Date" value={product.test_date} />
        <ProductInfoBlock label="Status" value={product.test_status || 'pending'} />
        <ProductInfoBlock label="Report" value={product.report_generated ? 'Generated' : 'Pending'} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
        <InputField label="Test Link" value={testLink} onChange={setTestLink} placeholder="https://..." />
        <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700">
          <p className="font-medium text-navy-900">Email draft</p>
          <p className="mt-1">
            {studentEmail
              ? `A Gmail draft will open from ${COMPANY_EMAIL} to ${studentEmail}. Review it, then click Send in Gmail.`
              : 'Add an email address to the student profile before sending the link.'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenGmailDraft}
          disabled={!studentEmail || !testLink || saving}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800 disabled:bg-gray-200 disabled:text-gray-500"
        >
          <Send size={16} />
          <span>{saving ? 'Saving...' : 'Open Gmail Draft'}</span>
        </button>
        <p className="text-xs text-gray-500">
          Status: {product.test_status || 'pending'}{product.test_link_sent_at ? `, sent on ${product.test_link_sent_at}` : ''}
        </p>
      </div>
    </div>
  );
}

function openTestLinkEmailDraft({
  to,
  studentName,
  testLink,
  productLabel,
  counselorName,
}: {
  to: string;
  studentName: string;
  testLink: string;
  productLabel: string;
  counselorName?: string;
}) {
  const subject = `${productLabel} Link`;
  const body = [
    `Dear ${studentName},`,
    '',
    `Please use the link below to complete your ${productLabel.toLowerCase()}:`,
    testLink,
    '',
    'Once completed, please reply to this email so we can continue with the next step.',
    '',
    'Regards,',
    counselorName || 'True Axis Team',
  ].join('\n');
  const params = new URLSearchParams({
    authuser: COMPANY_EMAIL,
    view: 'cm',
    fs: '1',
    from: COMPANY_EMAIL,
    to,
    su: subject,
    body,
  });
  const gmailUrl = `https://mail.google.com/mail/?${params.toString()}`;
  const draftWindow = window.open(gmailUrl, '_blank');

  if (!draftWindow) {
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
}

function WorkflowSection({
  title,
  locked,
  className = '',
  children,
}: {
  title: string;
  locked: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-xl border p-4 space-y-4 shadow-sm ${locked ? 'border-gray-200 bg-gray-50/80' : 'border-gray-200 bg-white'} ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <h5 className="font-semibold text-navy-900">{title}</h5>
        {locked && <span className="rounded-full bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600">Locked</span>}
      </div>
      {children}
    </section>
  );
}

function WorkflowButton({
  label,
  disabled,
  saving,
  icon,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  saving?: boolean;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || saving}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800 disabled:bg-gray-200 disabled:text-gray-500"
    >
      {icon}
      <span>{saving ? 'Saving...' : label}</span>
    </button>
  );
}

function MeetingsTab({
  studentId,
  meetings,
  onRefresh,
}: {
  studentId: string;
  meetings: Meeting[];
  onRefresh: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditingMeeting(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          <span>Add Meeting</span>
        </button>
      </div>

      {meetings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500">No meetings scheduled yet</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />
          <div className="space-y-6">
            {meetings.map((meeting) => (
              <div key={meeting.id} className="relative flex gap-6">
                <div className="relative z-10 flex-shrink-0 w-16 h-16 rounded-full bg-navy-900 flex items-center justify-center text-white font-bold">
                  #{meeting.meeting_number}
                </div>
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-navy-900">{meeting.meeting_date}</p>
                      <p className="text-sm text-gray-500">{meeting.meeting_time || 'Time TBD'}</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingMeeting(meeting);
                        setShowModal(true);
                      }}
                      className="p-2 text-gray-600 hover:text-navy-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                  {meeting.discussion_notes && (
                    <div className="mb-2">
                      <p className="text-sm text-gray-500">Discussion:</p>
                      <p className="text-navy-900">{meeting.discussion_notes}</p>
                    </div>
                  )}
                  {meeting.outcome && (
                    <div className="mb-2">
                      <p className="text-sm text-gray-500">Outcome:</p>
                      <p className="text-navy-900">{meeting.outcome}</p>
                    </div>
                  )}
                  {meeting.next_action && (
                    <div>
                      <p className="text-sm text-gray-500">Next Action:</p>
                      <p className="text-maroon-600 font-medium">{meeting.next_action}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <MeetingModal
          studentId={studentId}
          meeting={editingMeeting}
          meetingNumber={meetings.length + 1}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

function PaymentsTab({
  studentId,
  payments,
  latestQuotation,
  onRefresh,
}: {
  studentId: string;
  payments: Payment[];
  latestQuotation: Quotation | null;
  onRefresh: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditingPayment(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          <span>Add Payment</span>
        </button>
      </div>

      {payments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <CreditCard className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500">No payment records yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Payment #</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Due Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Total Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Paid</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Balance</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Status</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-navy-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-navy-900">#{payment.payment_number}</td>
                  <td className="px-6 py-4 text-gray-700">{payment.due_date}</td>
                  <td className="px-6 py-4 text-navy-900">₹{Number(payment.total_amount).toLocaleString()}</td>
                  <td className="px-6 py-4 text-green-600">₹{Number(payment.amount_paid).toLocaleString()}</td>
                  <td className="px-6 py-4 text-orange-600">
                    ₹{(Number(payment.total_amount) - Number(payment.amount_paid)).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      payment.status === 'paid' ? 'bg-green-100 text-green-700' :
                      payment.status === 'overdue' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => {
                        setEditingPayment(payment);
                        setShowModal(true);
                      }}
                      className="p-2 text-gray-600 hover:text-navy-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {showModal && (
        <PaymentModal
          studentId={studentId}
          payment={editingPayment}
          paymentNumber={payments.length + 1}
          latestQuotation={latestQuotation}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

function ProductModal({
  studentId,
  product,
  counselors,
  onClose,
  onSave,
}: {
  studentId: string;
  product: StudentProduct | null;
  counselors: User[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [productType, setProductType] = useState<ProductType>(product?.product_type || 'career_counselling');
  const [formData, setFormData] = useState<Record<string, unknown>>(() => getProductFormData(product));
  const [saving, setSaving] = useState(false);
  const [customCollege, setCustomCollege] = useState('');
  const productTypes = PRODUCT_CATALOG;
  const selectedCountries = getStringArray(formData.countries);
  const selectedColleges = getStringArray(formData.colleges);
  const selectedPrograms = getStringArray(formData.programs);
  const collegeOptions = getCollegesForCountries(selectedCountries);
  const allCollegeOptions = getCollegesForCountries(ADMISSION_COUNTRIES);
  const displayedCollegeOptions = [
    ...collegeOptions,
    ...selectedColleges.filter((college) => !collegeOptions.includes(college)),
  ];

  const toggleArrayValue = (field: 'countries' | 'colleges' | 'programs', value: string) => {
    setFormData((current) => {
      const currentValues = getStringArray(current[field]);
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      if (field === 'countries') {
        const availableColleges = getCollegesForCountries(nextValues);
        return {
          ...current,
          countries: nextValues,
          colleges: getStringArray(current.colleges).filter(
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
      const currentColleges = getStringArray(current.colleges);
      const alreadySelected = currentColleges.some(
        (college) => college.toLowerCase() === trimmedCollege.toLowerCase()
      );

      return alreadySelected
        ? current
        : { ...current, colleges: [...currentColleges, trimmedCollege] };
    });
    setCustomCollege('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        student_id: studentId,
        product_type: productType,
        status: 'active',
        ...formData,
      };

      if (product?.id) {
        await supabase.from('student_products').update(data).eq('id', product.id);
      } else {
        await supabase.from('student_products').insert(data);
      }

      onSave();
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between gap-3 sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-navy-900">
            {product ? 'Edit Product' : 'Add Product'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Type</label>
            <select
              value={productType}
              onChange={(e) => {
                const nextProductType = e.target.value as ProductType;
                setProductType(nextProductType);
                if (nextProductType !== 'college_admissions') {
                  setFormData((current) => {
                    const next = { ...current };
                    delete next.countries;
                    delete next.colleges;
                    delete next.programs;
                    delete next.degree_level;
                    return next;
                  });
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
            >
              {productTypes.map((product) => (
                <option key={product.key} value={product.key}>
                  {product.label}
                </option>
              ))}
            </select>
          </div>

          {productType === 'career_counselling' && (
            <>
              <InputField label="Interests" value={formData.interests as string || ''} onChange={(v) => setFormData({ ...formData, interests: v })} />
              <InputField label="Strengths" value={formData.strengths as string || ''} onChange={(v) => setFormData({ ...formData, strengths: v })} />
              <InputField label="Preferred Career" value={formData.preferred_career as string || ''} onChange={(v) => setFormData({ ...formData, preferred_career: v })} />
              <InputField label="Goals" value={formData.goals as string || ''} onChange={(v) => setFormData({ ...formData, goals: v })} textarea />
              <InputField label="Notes" value={formData.career_notes as string || ''} onChange={(v) => setFormData({ ...formData, career_notes: v })} textarea />
            </>
          )}

          {productType === 'college_admissions' && (
            <>
              <CheckboxGroup
                label="Interest of Countries"
                options={ADMISSION_COUNTRIES}
                selected={selectedCountries}
                onToggle={(value) => toggleArrayValue('countries', value)}
              />
              <CheckboxGroup
                label="Interest of College"
                options={displayedCollegeOptions}
                selected={selectedColleges}
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
                    className="min-w-0 flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
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
                selected={selectedPrograms}
                onToggle={(value) => toggleArrayValue('programs', value)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Degree Looking For</label>
                <select
                  value={formData.degree_level as string || ''}
                  onChange={(e) => setFormData({ ...formData, degree_level: e.target.value || null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
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
              <InputField label="Intake Year" type="number" value={formData.intake_year as number || ''} onChange={(v) => setFormData({ ...formData, intake_year: v })} />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.scholarship_required as boolean || false}
                  onChange={(e) => setFormData({ ...formData, scholarship_required: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label className="text-sm text-gray-700">Scholarship Required</label>
              </div>
              <InputField label="Application Status" value={formData.application_status as string || ''} onChange={(v) => setFormData({ ...formData, application_status: v })} />
              <InputField label="Notes" value={formData.admissions_notes as string || ''} onChange={(v) => setFormData({ ...formData, admissions_notes: v })} textarea />
            </>
          )}

          {productType === 'mentoring' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mentor</label>
                <select
                  value={formData.mentor_id as string || ''}
                  onChange={(e) => setFormData({ ...formData, mentor_id: e.target.value || null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
                >
                  <option value="">Select Mentor</option>
                  {counselors.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <InputField label="Duration" value={formData.duration as string || ''} onChange={(v) => setFormData({ ...formData, duration: v })} placeholder="e.g., 3 months" />
              <InputField label="Goals" value={formData.mentoring_goals as string || ''} onChange={(v) => setFormData({ ...formData, mentoring_goals: v })} textarea />
              <InputField label="Notes" value={formData.mentoring_notes as string || ''} onChange={(v) => setFormData({ ...formData, mentoring_notes: v })} textarea />
            </>
          )}

          {productType === 'psychometric_test' && (
            <>
              <InputField label="Test Date" type="date" value={formData.test_date as string || ''} onChange={(v) => setFormData({ ...formData, test_date: v })} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test Status</label>
                <select
                  value={formData.test_status as string || 'pending'}
                  onChange={(e) => setFormData({ ...formData, test_status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.report_generated as boolean || false}
                  onChange={(e) => setFormData({ ...formData, report_generated: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label className="text-sm text-gray-700">Report Generated</label>
              </div>
              <InputField label="Notes" value={formData.psychometric_notes as string || ''} onChange={(v) => setFormData({ ...formData, psychometric_notes: v })} textarea />
            </>
          )}

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

function MeetingModal({
  studentId,
  meeting,
  meetingNumber,
  onClose,
  onSave,
}: {
  studentId: string;
  meeting: Meeting | null;
  meetingNumber: number;
  onClose: () => void;
  onSave: () => void;
}) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    meeting_date: meeting?.meeting_date || '',
    meeting_time: meeting?.meeting_time || '',
    discussion_notes: meeting?.discussion_notes || '',
    outcome: meeting?.outcome || '',
    next_action: meeting?.next_action || '',
  });
  const [createNextMeeting, setCreateNextMeeting] = useState(false);
  const [nextMeetingData, setNextMeetingData] = useState({
    meeting_date: '',
    meeting_time: '',
  });
  const [saving, setSaving] = useState(false);

  const saveMeetingReminder = async (savedMeeting: Pick<Meeting, 'id' | 'student_id' | 'meeting_number' | 'meeting_date' | 'meeting_time' | 'discussion_notes' | 'next_action'>) => {
    const reminderData = {
      student_id: savedMeeting.student_id,
      meeting_id: savedMeeting.id,
      reminder_date: savedMeeting.meeting_date,
      reminder_time: savedMeeting.meeting_time || '09:00',
      title: `Meeting #${savedMeeting.meeting_number}`,
      description: savedMeeting.next_action || savedMeeting.discussion_notes || 'Student meeting scheduled',
      reminder_type: 'meeting' as const,
      assigned_to: user?.id || null,
    };

    const { data: existingReminder, error: reminderLookupError } = await supabase
      .from<Reminder>('reminders')
      .select('*')
      .eq('meeting_id', savedMeeting.id)
      .maybeSingle();

    if (reminderLookupError) throw reminderLookupError;

    if (existingReminder?.id) {
      const { error } = await supabase
        .from('reminders')
        .update({
          ...reminderData,
          status: existingReminder.status,
        })
        .eq('id', existingReminder.id);
      if (error) throw error;
      return;
    }

    const { error } = await supabase.from('reminders').insert({
      ...reminderData,
      status: 'pending',
    });
    if (error) throw error;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        student_id: studentId,
        meeting_number: meeting?.meeting_number || meetingNumber,
        ...formData,
      };

      let savedMeeting: Meeting | null = null;
      if (meeting?.id) {
        const { error } = await supabase.from('meetings').update(data).eq('id', meeting.id);
        if (error) throw error;
        savedMeeting = { ...meeting, ...data };
      } else {
        const { data: insertedMeeting, error } = await supabase
          .from<Meeting>('meetings')
          .insert(data)
          .select()
          .single();
        if (error) throw error;
        savedMeeting = insertedMeeting;
      }

      if (savedMeeting) {
        await saveMeetingReminder(savedMeeting);
      }

      if (createNextMeeting && nextMeetingData.meeting_date) {
        const nextMeeting = {
          student_id: studentId,
          meeting_number: meeting?.id ? meetingNumber : meetingNumber + 1,
          meeting_date: nextMeetingData.meeting_date,
          meeting_time: nextMeetingData.meeting_time,
          discussion_notes: '',
          outcome: '',
          next_action: '',
        };
        const { data: insertedNextMeeting, error } = await supabase
          .from<Meeting>('meetings')
          .insert(nextMeeting)
          .select()
          .single();
        if (error) throw error;
        if (insertedNextMeeting) {
          await saveMeetingReminder(insertedNextMeeting);
        }
      }

      onSave();
    } catch (error) {
      console.error('Error saving meeting:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-navy-900">
            {meeting ? 'Edit Meeting' : `New Meeting #${meetingNumber}`}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Date" type="date" value={formData.meeting_date} onChange={(v) => setFormData({ ...formData, meeting_date: v })} required />
            <InputField label="Time" type="time" value={formData.meeting_time} onChange={(v) => setFormData({ ...formData, meeting_time: v })} />
          </div>
          <InputField label="Discussion Notes" value={formData.discussion_notes} onChange={(v) => setFormData({ ...formData, discussion_notes: v })} textarea />
          <InputField label="Outcome" value={formData.outcome} onChange={(v) => setFormData({ ...formData, outcome: v })} textarea />
          <InputField label="Next Action" value={formData.next_action} onChange={(v) => setFormData({ ...formData, next_action: v })} />

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={createNextMeeting}
                onChange={(e) => setCreateNextMeeting(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-navy-900 focus:ring-navy-500"
              />
              Create next meeting
            </label>

            {createNextMeeting && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="Next Meeting Date"
                  type="date"
                  value={nextMeetingData.meeting_date}
                  onChange={(v) => setNextMeetingData({ ...nextMeetingData, meeting_date: v })}
                  required
                />
                <InputField
                  label="Next Meeting Time"
                  type="time"
                  value={nextMeetingData.meeting_time}
                  onChange={(v) => setNextMeetingData({ ...nextMeetingData, meeting_time: v })}
                />
              </div>
            )}
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

function PaymentModal({
  studentId,
  payment,
  paymentNumber,
  latestQuotation,
  onClose,
  onSave,
}: {
  studentId: string;
  payment: Payment | null;
  paymentNumber: number;
  latestQuotation: Quotation | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    quotation_id: payment?.quotation_id || latestQuotation?.id || '',
    total_amount: payment?.total_amount?.toString() || latestQuotation?.total_amount?.toString() || '',
    amount_paid: payment?.amount_paid?.toString() || '0',
    due_date: payment?.due_date || '',
    payment_date: payment?.payment_date || '',
    status: payment?.status || 'pending' as 'paid' | 'pending' | 'overdue',
    payment_mode: payment?.payment_mode || '',
    transaction_id: payment?.transaction_id || '',
    notes: payment?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        student_id: studentId,
        payment_number: payment?.payment_number || paymentNumber,
        quotation_id: formData.quotation_id || null,
        total_amount: formData.total_amount,
        amount_paid: formData.amount_paid,
        due_date: formData.due_date,
        payment_date: formData.payment_date || null,
        status: formData.status,
        payment_mode: formData.payment_mode || null,
        transaction_id: formData.transaction_id || null,
        notes: formData.notes || null,
      };

      if (payment?.id) {
        await supabase.from('payments').update(data).eq('id', payment.id);
      } else {
        await supabase.from('payments').insert(data);
      }

      onSave();
    } catch (error) {
      console.error('Error saving payment:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-navy-900">
            {payment ? 'Edit Payment' : `New Payment #${paymentNumber}`}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-700 mb-1">Counselling Fee Link</p>
            {latestQuotation ? (
              <div className="text-sm text-gray-600 space-y-1">
                <p>Auto-linked to the latest fee quotation.</p>
                <p className="font-medium text-navy-900">{latestQuotation.product_name}</p>
                <p>Quotation #{latestQuotation.quotation_number} - ₹{Number(latestQuotation.total_amount).toLocaleString()}</p>
              </div>
            ) : (
              <p className="text-sm text-orange-600">No fee quotation linked yet. This payment amount can be reused when you create one.</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Total Amount" type="number" value={formData.total_amount} onChange={(v) => setFormData({ ...formData, total_amount: v })} required />
            <InputField label="Amount Paid" type="number" value={formData.amount_paid} onChange={(v) => setFormData({ ...formData, amount_paid: v })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Due Date" type="date" value={formData.due_date} onChange={(v) => setFormData({ ...formData, due_date: v })} required />
            <InputField label="Payment Date" type="date" value={formData.payment_date} onChange={(v) => setFormData({ ...formData, payment_date: v })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'paid' | 'pending' | 'overdue' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <InputField label="Payment Mode" value={formData.payment_mode} onChange={(v) => setFormData({ ...formData, payment_mode: v })} placeholder="e.g., UPI, Bank Transfer" />
          <InputField label="Transaction ID" value={formData.transaction_id} onChange={(v) => setFormData({ ...formData, transaction_id: v })} />
          <InputField label="Notes" value={formData.notes} onChange={(v) => setFormData({ ...formData, notes: v })} textarea />

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

function FeeModal({
  studentId,
  studentName,
  products,
  quotation,
  paymentAmountSource,
  onClose,
  onSave,
}: {
  studentId: string;
  studentName: string;
  products: StudentProduct[];
  quotation: Quotation | null;
  paymentAmountSource: Payment | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const productOptions = products.map((product) => ({
    id: product.id,
    label: getProductLabel(product.product_type),
  }));

  const defaultProduct = productOptions[0];
  const paymentSourceAmount = paymentAmountSource ? Number(paymentAmountSource.total_amount || 0) : 0;
  const shouldUsePaymentAmount = !quotation && paymentSourceAmount > 0;
  const [formData, setFormData] = useState({
    customer_name: quotation?.customer_name || studentName,
    product_id: quotation?.product_id || defaultProduct?.id || '',
    product_name: quotation?.product_name || defaultProduct?.label || '',
    amount: shouldUsePaymentAmount ? String(paymentSourceAmount) : quotation?.amount?.toString() || '',
    discount: shouldUsePaymentAmount ? '0' : quotation?.discount?.toString() || '0',
    gst_percentage: shouldUsePaymentAmount ? '0' : quotation?.gst_percentage?.toString() || '18',
    quotation_date: quotation?.quotation_date || new Date().toISOString().split('T')[0],
    status: quotation?.status || 'draft' as 'draft' | 'sent' | 'accepted' | 'rejected',
  });
  const [saving, setSaving] = useState(false);
  const taxableAmount = Math.max(Number(formData.amount || 0) - Number(formData.discount || 0), 0);
  const estimatedTotal = taxableAmount + (taxableAmount * Number(formData.gst_percentage || 0)) / 100;

  const handleProductChange = (productId: string) => {
    const selectedProduct = products.find((product) => product.id === productId);
    setFormData((current) => ({
      ...current,
      product_id: productId,
      product_name: selectedProduct ? getProductLabel(selectedProduct.product_type) : current.product_name,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const amount = shouldUsePaymentAmount ? paymentSourceAmount : Number(formData.amount || 0);
      const discount = shouldUsePaymentAmount ? 0 : Number(formData.discount || 0);
      const gstPercentage = shouldUsePaymentAmount ? 0 : Number(formData.gst_percentage || 0);
      const finalTaxableAmount = Math.max(amount - discount, 0);
      const totalAmount = shouldUsePaymentAmount
        ? paymentSourceAmount
        : finalTaxableAmount + (finalTaxableAmount * gstPercentage) / 100;

      const data = {
        student_id: studentId,
        customer_name: formData.customer_name,
        product_id: formData.product_id || null,
        product_name: formData.product_name,
        amount,
        discount,
        gst_percentage: gstPercentage,
        total_amount: totalAmount,
        quotation_date: formData.quotation_date,
        status: formData.status,
      };

      if (quotation?.id) {
        await supabase.from('quotations').update(data).eq('id', quotation.id);
      } else {
        const quotationNumber = await supabase.rpc('generate_quotation_number');
        const { data: insertedQuotation, error } = await supabase
          .from<Quotation>('quotations')
          .insert({
            ...data,
            quotation_number: quotationNumber.data,
          })
          .select()
          .single();

        if (error) throw error;

        if (shouldUsePaymentAmount && paymentAmountSource?.id && insertedQuotation?.id) {
          await supabase
            .from('payments')
            .update({ quotation_id: insertedQuotation.id })
            .eq('id', paymentAmountSource.id);
        }
      }

      onSave();
    } catch (error) {
      console.error('Error saving fee quotation:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-navy-900">
            {quotation ? 'Edit Counselling Fee' : 'Add Counselling Fee'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <InputField label="Customer Name" value={formData.customer_name} onChange={(v) => setFormData({ ...formData, customer_name: v })} required />

          {shouldUsePaymentAmount && paymentAmountSource && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-medium text-green-800">Amount linked from payment details</p>
              <p className="mt-1 text-2xl font-bold text-navy-900">{formatCurrency(paymentSourceAmount)}</p>
              <p className="mt-1 text-sm text-green-700">
                Payment #{paymentAmountSource.payment_number} is being used as the quotation total.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Linked Product</label>
            <select
              value={formData.product_id}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
            >
              <option value="">Select a product</option>
              {productOptions.map((product) => (
                <option key={product.id} value={product.id}>{product.label}</option>
              ))}
            </select>
          </div>

          {shouldUsePaymentAmount ? (
            <InputField label="Quotation Date" type="date" value={formData.quotation_date} onChange={(v) => setFormData({ ...formData, quotation_date: v })} required />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Base Amount" type="number" value={formData.amount} onChange={(v) => setFormData({ ...formData, amount: v })} required />
                <InputField label="Discount" type="number" value={formData.discount} onChange={(v) => setFormData({ ...formData, discount: v })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="GST %" type="number" value={formData.gst_percentage} onChange={(v) => setFormData({ ...formData, gst_percentage: v })} />
                <InputField label="Quotation Date" type="date" value={formData.quotation_date} onChange={(v) => setFormData({ ...formData, quotation_date: v })} required />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'sent' | 'accepted' | 'rejected' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="rounded-lg bg-gray-50 p-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-gray-600">{shouldUsePaymentAmount ? 'Quotation total' : 'Estimated total'}</span>
            <span className="font-semibold text-navy-900">{formatCurrency(shouldUsePaymentAmount ? paymentSourceAmount : estimatedTotal)}</span>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Saving...' : 'Save fee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FeeSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="font-semibold text-navy-900 break-words">{value}</p>
    </div>
  );
}

function getStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function getProductFormData(product: StudentProduct | null): Record<string, unknown> {
  if (!product) return {};

  return {
    interests: product.interests || '',
    strengths: product.strengths || '',
    preferred_career: product.preferred_career || '',
    goals: product.goals || '',
    career_notes: product.career_notes || '',
    countries: product.countries || (product.country ? [product.country] : []),
    colleges: product.colleges || (product.university_name ? [product.university_name] : []),
    programs: product.programs || (product.course_name ? [product.course_name] : []),
    degree_level: product.degree_level || '',
    intake_year: product.intake_year || '',
    scholarship_required: product.scholarship_required || false,
    application_status: product.application_status || '',
    admissions_notes: product.admissions_notes || '',
    mentor_id: product.mentor_id || '',
    duration: product.duration || '',
    mentoring_goals: product.mentoring_goals || '',
    mentoring_notes: product.mentoring_notes || '',
    test_date: product.test_date || '',
    test_status: product.test_status || 'pending',
    report_generated: product.report_generated || false,
    psychometric_notes: product.psychometric_notes || '',
  };
}

function normalizeReviewSessions(reviews?: StudentProduct['review_sessions']) {
  const baseReviews = reviews || [];
  const requiredReviews = [0, 1, 2].map((index) => ({
    id: baseReviews[index]?.id || crypto.randomUUID(),
    title: baseReviews[index]?.title || `Review Session #${index + 1}`,
    date: baseReviews[index]?.date || '',
    discussion: baseReviews[index]?.discussion || '',
    progress: baseReviews[index]?.progress || '',
    action_items: baseReviews[index]?.action_items || '',
    completed: baseReviews[index]?.completed || false,
  }));

  return [
    ...requiredReviews,
    ...baseReviews.slice(3).map((review, index) => ({
      id: review.id || crypto.randomUUID(),
      title: review.title || `Review Session #${index + 4}`,
      date: review.date || '',
      discussion: review.discussion || '',
      progress: review.progress || '',
      action_items: review.action_items || '',
      completed: review.completed || false,
    })),
  ];
}

function formatList(value?: string[]) {
  return value && value.length > 0 ? value.join(', ') : '';
}

function formatDegree(value?: StudentProduct['degree_level']) {
  return DEGREE_LEVELS.find((degree) => degree.value === value)?.label || '';
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
        <p className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500">
          {emptyText || 'No options available'}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {options.map((option) => (
            <label key={option} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
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

function InputField({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  textarea,
  required,
}: {
  label: string;
  type?: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  textarea?: boolean;
  required?: boolean;
}) {
  const InputComponent = textarea ? 'textarea' : 'input';
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <InputComponent
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={textarea ? 3 : undefined}
        required={required}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
      />
    </div>
  );
}
