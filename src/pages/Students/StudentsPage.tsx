import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import type { Inquiry, ProductType, Student, User } from '../../lib/supabase';
import { PRODUCT_CATALOG, getProductLabel } from '../../lib/products';
import {
  Plus,
  Search,
  Edit2,
  Eye,
  X,
  GraduationCap,
  Phone,
  Mail,
  MapPin,
  BookOpen,
  MoreVertical,
  ArrowRight,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

type StudentDraft = Student & {
  product_type?: ProductType | '';
  countries?: string[];
  colleges?: string[];
  programs?: string[];
  degree_level?: 'ug' | 'pg' | 'phd' | '';
};

type StudentProductSummary = {
  id: string;
  student_id: string;
  product_type: ProductType;
  created_at?: string;
};

const SCHOOL_GRADES = ['8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'];
const HIGHER_EDUCATION_GRADES = ['Diploma', 'Graduation', 'Post Graduate'];
const SCHOOL_PERCENTAGE_FIELDS = [
  { label: '8th Percentage', key: 'eighth_percentage', grade: '8th Grade' },
  { label: '9th Percentage', key: 'ninth_percentage', grade: '9th Grade' },
  { label: '10th Percentage', key: 'tenth_percentage', grade: '10th Grade' },
  { label: '11th Percentage', key: 'eleventh_percentage', grade: '11th Grade' },
  { label: '12th Percentage', key: 'twelfth_percentage', grade: '12th Grade' },
];

function isSchoolGrade(grade: string) {
  return SCHOOL_GRADES.includes(grade);
}

function getVisibleSchoolPercentageFields(currentGrade: string) {
  const currentIndex = SCHOOL_GRADES.indexOf(currentGrade);
  if (currentIndex === -1) return SCHOOL_PERCENTAGE_FIELDS;
  return SCHOOL_PERCENTAGE_FIELDS.slice(0, currentIndex + 1);
}

function getStudentStatusConfig(status: Student['status']) {
  if (status === 'completed') {
    return {
      label: 'Completed',
      className: 'bg-green-50 text-green-700 ring-green-100',
      dotClassName: 'bg-green-500',
    };
  }

  if (status === 'inactive') {
    return {
      label: 'Inactive',
      className: 'bg-gray-50 text-gray-600 ring-gray-200',
      dotClassName: 'bg-gray-400',
    };
  }

  return {
    label: 'Ongoing',
    className: 'bg-amber-50 text-amber-700 ring-amber-100',
    dotClassName: 'bg-amber-500',
  };
}

function getStudentProgress(status: Student['status']) {
  if (status === 'completed') return 100;
  if (status === 'inactive') return 20;
  return 65;
}

function StudentMetaItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-gray-50 px-3 py-3 ring-1 ring-gray-100 sm:px-4">
      <span className="shrink-0 text-maroon-600">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
        <p className="mt-1 truncate font-semibold text-navy-900" title={value}>{value}</p>
      </div>
    </div>
  );
}

export function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentProducts, setStudentProducts] = useState<StudentProductSummary[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentDraft | null>(null);
  const [counselors, setCounselors] = useState<User[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const inquiryId = searchParams.get('inquiry_id');
  const editStudentId = searchParams.get('edit_student_id');

  useEffect(() => {
    fetchStudents();
    fetchStudentProducts();
    fetchInquiries();
    fetchCounselors();
  }, []);

  useEffect(() => {
    if (inquiryId) {
      loadInquiryData(inquiryId);
    }
  }, [inquiryId]);

  useEffect(() => {
    if (editStudentId) {
      loadStudentForEdit(editStudentId);
    }
  }, [editStudentId]);

  const clearModalParams = () => {
    if (!inquiryId && !editStudentId) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('inquiry_id');
    nextParams.delete('edit_student_id');
    setSearchParams(nextParams, { replace: true });
  };

  const closeStudentModal = () => {
    setShowModal(false);
    clearModalParams();
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*, assigned_counselor:users!assigned_counselor_id(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('student_products')
        .select('id, student_id, product_type, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudentProducts((data || []) as StudentProductSummary[]);
    } catch (error) {
      console.error('Error fetching student products:', error);
    }
  };

  const fetchInquiries = async () => {
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInquiries((data || []) as Inquiry[]);
    } catch (error) {
      console.error('Error fetching inquiries:', error);
    }
  };

  const fetchCounselors = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .in('role', ['admin', 'counselor']);
    setCounselors(data || []);
  };

  const loadInquiryData = async (inquiryId: string) => {
    const { data } = await supabase
      .from('inquiries')
      .select('*')
      .eq('id', inquiryId)
      .maybeSingle();

    if (data) {
      setEditingStudent({
        student_name: data.student_name,
        mobile_number: data.contact_number,
        email: data.email || '',
        inquiry_id: data.id,
        product_type: data.product_type || '',
        countries: data.countries || [],
        colleges: data.colleges || [],
        programs: data.programs || [],
        degree_level: data.degree_level || '',
        education: {
          current_grade: data.student_grade || '',
        },
      } as StudentDraft);
      setShowModal(true);
    }
  };

  const loadStudentForEdit = async (studentId: string) => {
    const { data, error } = await supabase
      .from('students')
      .select('*, education:student_education(*), assigned_counselor:users!assigned_counselor_id(*)')
      .eq('id', studentId)
      .maybeSingle();

    if (error) {
      console.error('Error loading student for edit:', error);
      return;
    }

    if (data) {
      setEditingStudent(data as StudentDraft);
      setShowModal(true);
    }
  };

  const getStudentProductType = (studentId: string) => {
    return studentProducts.find((product) => product.student_id === studentId)?.product_type;
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.mobile_number.includes(searchQuery) ||
      student.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const categorizedStudents = PRODUCT_CATALOG.map((product) => ({
    ...product,
    students: filteredStudents.filter((student) => getStudentProductType(student.id) === product.key),
  }));

  const uncategorizedStudents = filteredStudents.filter(
    (student) => !getStudentProductType(student.id)
  );

  const renderStudentCard = (student: Student) => {
    const productType = getStudentProductType(student.id);
    const productLabel = productType ? getProductLabel(productType) : 'Unassigned';
    const statusConfig = getStudentStatusConfig(student.status);
    const progress = getStudentProgress(student.status);

    return (
      <div
        key={student.id}
        className="group w-full rounded-[18px] border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-navy-100 hover:shadow-xl"
      >
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-navy-100 to-maroon-50 ring-1 ring-navy-100 transition-transform duration-300 group-hover:scale-105 sm:h-16 sm:w-16">
                <GraduationCap className="text-navy-700" size={28} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
                  <h3 className="truncate text-lg font-semibold text-navy-900 sm:text-xl">{student.student_name}</h3>
                  <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusConfig.className}`}>
                    <span className={`h-2 w-2 rounded-full ${statusConfig.dotClassName} animate-pulse`} />
                    {statusConfig.label}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-700 ring-1 ring-navy-100">
                    {productLabel}
                  </span>
                  {student.assigned_counselor && (
                    <span className="text-sm text-gray-500">Assigned: {student.assigned_counselor.name}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2">
              <Link
                to={`/students/${student.id}`}
                aria-label={`View ${student.student_name}`}
                title="View"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-navy-50 hover:text-navy-900"
              >
                <Eye size={18} />
              </Link>
              <button
                onClick={() => {
                  setEditingStudent(student as StudentDraft);
                  setShowModal(true);
                }}
                aria-label={`Edit ${student.student_name}`}
                title="Edit"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-navy-50 hover:text-navy-900"
              >
                <Edit2 size={18} />
              </button>
              <button
                type="button"
                aria-label="More options"
                title="More options"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-navy-900"
              >
                <MoreVertical size={18} />
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 text-sm text-gray-600 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr]">
            <div className="grid gap-3 sm:grid-cols-2">
              <StudentMetaItem icon={<Phone size={16} />} label="Phone" value={student.mobile_number} />
              <StudentMetaItem icon={<Mail size={16} />} label="Email" value={student.email || 'Email not added'} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <StudentMetaItem
                icon={<GraduationCap size={16} />}
                label="Counselor"
                value={student.assigned_counselor?.name || 'Unassigned'}
              />
              <StudentMetaItem icon={<MapPin size={16} />} label="Country" value="Not added" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <StudentMetaItem icon={<BookOpen size={16} />} label="Current Product" value={productLabel} />
              <div className="rounded-2xl bg-gray-50 px-4 py-3 ring-1 ring-gray-100">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Payment</p>
                <p className="mt-1 font-semibold text-navy-900">View in profile</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 rounded-2xl bg-slate-50/70 p-4 ring-1 ring-gray-100 lg:grid-cols-[1fr_1fr_1.4fr]">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Last Meeting</p>
              <p className="mt-1 font-semibold text-navy-900">Not recorded</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Next Meeting</p>
              <p className="mt-1 font-semibold text-navy-900">Not scheduled</p>
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Progress</p>
                <span className="text-sm font-semibold text-navy-900">{progress}%</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-maroon-600 to-navy-700 transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end border-t border-gray-100 pt-4">
            <Link
              to={`/students/${student.id}`}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-maroon-700 transition-colors hover:bg-maroon-50 hover:text-maroon-800"
            >
              <span>View Full Profile</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-navy-200 border-t-maroon-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Students</h1>
          <p className="text-gray-600 mt-1">Manage student profiles and education details</p>
        </div>
        <button
          onClick={() => {
            setEditingStudent(null);
            setShowModal(true);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-white transition-colors hover:bg-navy-800 sm:w-auto"
        >
          <Plus size={20} />
          <span>Add Student</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
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
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {filteredStudents.length > 0 ? (
        <div className="space-y-8">
          {categorizedStudents.map((category) => (
            <div key={category.key} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-navy-900">{category.label}</h2>
                  <p className="text-sm text-gray-500">{category.description}</p>
                </div>
                <span className="shrink-0 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
                  {category.students.length}
                </span>
              </div>

              {category.students.length > 0 ? (
                <div className="space-y-4">
                  {category.students.map((student) => renderStudentCard(student))}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 p-6 text-sm text-gray-500">
                  No students assigned to this product yet.
                </div>
              )}
            </div>
          ))}

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-navy-900">Unassigned</h2>
                <p className="text-sm text-gray-500">Students without a product linked yet.</p>
              </div>
              <span className="shrink-0 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
                {uncategorizedStudents.length}
              </span>
            </div>

            {uncategorizedStudents.length > 0 ? (
              <div className="space-y-4">
                {uncategorizedStudents.map((student) => renderStudentCard(student))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 p-6 text-sm text-gray-500">
                No unassigned students.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <GraduationCap className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500">No students found</p>
        </div>
      )}

      {showModal && (
        <StudentModal
          student={editingStudent}
          inquiries={inquiries}
          counselors={counselors}
          onClose={closeStudentModal}
          onSave={() => {
            setShowModal(false);
            fetchStudents();
            fetchStudentProducts();
            fetchInquiries();
            clearModalParams();
          }}
        />
      )}
    </div>
  );
}

function StudentModal({
  student,
  inquiries,
  counselors,
  onClose,
  onSave,
}: {
  student: StudentDraft | null;
  inquiries: Inquiry[];
  counselors: User[];
  onClose: () => void;
  onSave: () => void;
}) {
  const applyInquiryToForm = (inquiryId: string) => {
    const selectedInquiry = inquiries.find((item) => item.id === inquiryId);

    setFormData((current) => ({
      ...current,
      inquiry_id: inquiryId,
      student_name: selectedInquiry?.student_name || current.student_name,
      mobile_number: selectedInquiry?.contact_number || current.mobile_number,
      email: selectedInquiry?.email || current.email,
      assigned_counselor_id: selectedInquiry?.assigned_counselor_id || current.assigned_counselor_id,
      product_type: selectedInquiry?.product_type || current.product_type,
      countries: selectedInquiry?.countries || current.countries,
      colleges: selectedInquiry?.colleges || current.colleges,
      programs: selectedInquiry?.programs || current.programs,
      degree_level: selectedInquiry?.degree_level || current.degree_level,
    }));

    setEducation((current) => ({
      ...current,
      current_grade: selectedInquiry?.student_grade || current.current_grade,
    }));
  };

  const [formData, setFormData] = useState({
    student_name: student?.student_name || '',
    father_name: student?.father_name || '',
    mother_name: student?.mother_name || '',
    date_of_birth: student?.date_of_birth || '',
    mobile_number: student?.mobile_number || '',
    email: student?.email || '',
    address: student?.address || '',
    notes: student?.notes || '',
    status: student?.status || 'ongoing' as 'ongoing' | 'completed' | 'inactive',
    assigned_counselor_id: student?.assigned_counselor_id || '',
    inquiry_id: student?.inquiry_id || '',
    product_type: student?.product_type || '',
    countries: student?.countries || [],
    colleges: student?.colleges || [],
    programs: student?.programs || [],
    degree_level: student?.degree_level || '',
  });
  const [education, setEducation] = useState({
    school_name: student?.education?.school_name || '',
    school_board: student?.education?.school_board || '',
    board_major_subject: student?.education?.board_major_subject || '',
    board_subject_percentage: student?.education?.board_subject_percentage || '',
    eighth_percentage: student?.education?.eighth_percentage || '',
    ninth_percentage: student?.education?.ninth_percentage || '',
    tenth_percentage: student?.education?.tenth_percentage || '',
    eleventh_percentage: student?.education?.eleventh_percentage || '',
    twelfth_percentage: student?.education?.twelfth_percentage || '',
    diploma: student?.education?.diploma || '',
    diploma_percentage: student?.education?.diploma_percentage || '',
    graduation: student?.education?.graduation || '',
    graduation_percentage: student?.education?.graduation_percentage || '',
    post_graduation: student?.education?.post_graduation || '',
    post_graduation_percentage: student?.education?.post_graduation_percentage || '',
    current_grade: student?.education?.current_grade || '',
    current_stream: student?.education?.current_stream || '',
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'education'>('personal');
  const schoolGradeSelected = isSchoolGrade(String(education.current_grade || ''));
  const visibleSchoolPercentageFields = getVisibleSchoolPercentageFields(String(education.current_grade || ''));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const studentData = {
        student_name: formData.student_name,
        father_name: formData.father_name || null,
        mother_name: formData.mother_name || null,
        date_of_birth: formData.date_of_birth || null,
        mobile_number: formData.mobile_number,
        email: formData.email || null,
        address: formData.address || null,
        notes: formData.notes.trim() || null,
        status: formData.status,
        assigned_counselor_id: formData.assigned_counselor_id || null,
        inquiry_id: formData.inquiry_id || null,
      };

      let studentId = student?.id;

      if (student?.id) {
        await supabase.from('students').update(studentData).eq('id', student.id);
      } else {
        const { data, error } = await supabase
          .from('students')
          .insert(studentData)
          .select()
          .single();

        if (error) throw error;
        studentId = data.id;

        if (formData.inquiry_id) {
          await supabase
            .from('inquiries')
            .update({ status: 'ongoing' })
            .eq('id', formData.inquiry_id);
        }
      }

      if (studentId) {
        const selectedSchoolGradeIndex = SCHOOL_GRADES.indexOf(String(education.current_grade || ''));
        const shouldKeepSchoolPercentage = (grade: string) => {
          const gradeIndex = SCHOOL_GRADES.indexOf(grade);
          return selectedSchoolGradeIndex === -1 || gradeIndex <= selectedSchoolGradeIndex;
        };
        const educationData = {
          student_id: studentId,
          school_name: education.school_name || null,
          school_board: education.school_board || null,
          board_major_subject: education.board_major_subject || null,
          board_subject_percentage: education.board_subject_percentage ? Number(education.board_subject_percentage) : null,
          eighth_percentage: shouldKeepSchoolPercentage('8th Grade') && education.eighth_percentage ? Number(education.eighth_percentage) : null,
          ninth_percentage: shouldKeepSchoolPercentage('9th Grade') && education.ninth_percentage ? Number(education.ninth_percentage) : null,
          tenth_percentage: shouldKeepSchoolPercentage('10th Grade') && education.tenth_percentage ? Number(education.tenth_percentage) : null,
          eleventh_percentage: shouldKeepSchoolPercentage('11th Grade') && education.eleventh_percentage ? Number(education.eleventh_percentage) : null,
          twelfth_percentage: shouldKeepSchoolPercentage('12th Grade') && education.twelfth_percentage ? Number(education.twelfth_percentage) : null,
          diploma: education.diploma || null,
          diploma_percentage: education.diploma_percentage ? Number(education.diploma_percentage) : null,
          graduation: education.graduation || null,
          graduation_percentage: education.graduation_percentage ? Number(education.graduation_percentage) : null,
          post_graduation: education.post_graduation || null,
          post_graduation_percentage: education.post_graduation_percentage ? Number(education.post_graduation_percentage) : null,
          current_grade: education.current_grade || null,
          current_stream: schoolGradeSelected ? null : education.current_stream || null,
        };

        const existingEdu = await supabase
          .from('student_education')
          .select('id')
          .eq('student_id', studentId)
          .maybeSingle();

        if (existingEdu.data) {
          await supabase
            .from('student_education')
            .update(educationData)
            .eq('id', existingEdu.data.id);
        } else {
          await supabase.from('student_education').insert(educationData);
        }

        if (formData.product_type) {
          const { data: existingProduct } = await supabase
            .from('student_products')
            .select('id')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false })
            .maybeSingle();

          const productData = {
            student_id: studentId,
            product_type: formData.product_type as ProductType,
            status: 'active' as const,
            ...(formData.product_type === 'college_admissions'
              ? {
                  countries: formData.countries,
                  colleges: formData.colleges,
                  programs: formData.programs,
                  degree_level: formData.degree_level || null,
                }
              : {}),
          };

          if (existingProduct?.id) {
            await supabase.from('student_products').update(productData).eq('id', existingProduct.id);
          } else {
            await supabase.from('student_products').insert(productData);
          }
        }
      }

      await supabase.from('activity_logs').insert({
        action: student?.id ? 'Updated student profile' : 'Created new student',
        entity_type: 'student',
        entity_id: studentId,
        details: { student_name: formData.student_name },
      });

      onSave();
    } catch (error) {
      console.error('Error saving student:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-navy-900">
            {student?.id ? 'Edit Student' : 'New Student'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="border-b border-gray-200 overflow-x-auto">
          <div className="flex min-w-max">
            <button
              onClick={() => setActiveTab('personal')}
              className={`px-4 sm:px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'personal'
                  ? 'text-navy-900 border-b-2 border-navy-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Personal Details
            </button>
            <button
              onClick={() => setActiveTab('education')}
              className={`px-4 sm:px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'education'
                  ? 'text-navy-900 border-b-2 border-navy-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Education Details
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto max-h-[calc(100dvh-12.5rem)] sm:max-h-[calc(90vh-200px)]">
          {activeTab === 'personal' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Link Existing Inquiry</label>
                  <select
                    value={formData.inquiry_id}
                    onChange={(e) => applyInquiryToForm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                  >
                    <option value="">No inquiry linked</option>
                    {inquiries.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.student_name} - {item.contact_number}
                        {item.product_type ? ` - ${getProductLabel(item.product_type)}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Student Name *</label>
                  <input
                    type="text"
                    value={formData.student_name}
                    onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Father's Name</label>
                  <input
                    type="text"
                    value={formData.father_name}
                    onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mother's Name</label>
                  <input
                    type="text"
                    value={formData.mother_name}
                    onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number *</label>
                  <input
                    type="tel"
                    value={formData.mobile_number}
                    onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ongoing' | 'completed' | 'inactive' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                  >
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Product</label>
                  <select
                    value={formData.product_type}
                    onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                  >
                    <option value="">Select product</option>
                    {PRODUCT_CATALOG.map((product) => (
                      <option key={product.key} value={product.key}>
                        {product.label}
                      </option>
                    ))}
                  </select>
                </div>

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

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    placeholder="Add general notes for this student profile..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Grade/Year</label>
                <select
                  value={education.current_grade}
                  onChange={(e) => {
                    const nextGrade = e.target.value;
                    setEducation({
                      ...education,
                      current_grade: nextGrade,
                      current_stream: isSchoolGrade(nextGrade) ? '' : education.current_stream,
                    });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                >
                  <option value="">Select current grade/year</option>
                  {[...SCHOOL_GRADES, ...HIGHER_EDUCATION_GRADES].map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>

              {schoolGradeSelected && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-navy-900 flex items-center gap-2">
                    <BookOpen size={16} />
                    School Education
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">School Name</label>
                      <input
                        type="text"
                        value={education.school_name}
                        onChange={(e) => setEducation({ ...education, school_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">School Board</label>
                      <input
                        type="text"
                        value={education.school_board}
                        onChange={(e) => setEducation({ ...education, school_board: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                        placeholder="e.g., CBSE, ICSE, State Board"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Main Major Subject</label>
                      <input
                        type="text"
                        value={education.board_major_subject}
                        onChange={(e) => setEducation({ ...education, board_major_subject: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                        placeholder="e.g., Mathematics, Science"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Major Subject Percentage</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={education.board_subject_percentage}
                        onChange={(e) => setEducation({ ...education, board_subject_percentage: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {visibleSchoolPercentageFields.map(({ label, key }) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={education[key as keyof typeof education] as string}
                          onChange={(e) => setEducation({ ...education, [key]: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!schoolGradeSelected && (
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-3">Higher Education</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Diploma', key: 'diploma', pctKey: 'diploma_percentage' },
                    { label: 'Graduation', key: 'graduation', pctKey: 'graduation_percentage' },
                    { label: 'Post Graduation', key: 'post_graduation', pctKey: 'post_graduation_percentage' },
                  ].map(({ label, key, pctKey }) => (
                    <div key={key} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{label} Name</label>
                        <input
                          type="text"
                          value={education[key as keyof typeof education] as string}
                          onChange={(e) => setEducation({ ...education, [key]: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                          placeholder={`e.g., B.Tech, MBA`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{label} Percentage</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={education[pctKey as keyof typeof education] as string}
                          onChange={(e) => setEducation({ ...education, [pctKey]: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )}

              {!schoolGradeSelected && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Stream</label>
                  <input
                    type="text"
                    value={education.current_stream}
                    onChange={(e) => setEducation({ ...education, current_stream: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                    placeholder="e.g., Science, Commerce"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200">
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
              {saving ? 'Saving...' : 'Save Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
