import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Package, X, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Student } from '../../lib/supabase';
import { PRODUCT_CATALOG } from '../../lib/products';

type StudentOption = Pick<Student, 'id' | 'student_name'>;

type ProductAssignment = {
  student_id: string;
  product_type: (typeof PRODUCT_CATALOG)[number]['key'];
  status: 'active' | 'completed' | 'cancelled';
};

export function ProductsPage() {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<ProductAssignment['product_type']>('career_counselling');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [assignmentsByType, setAssignmentsByType] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchStudents();
    fetchAssignments();
  }, []);

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('id, student_name')
      .order('student_name', { ascending: true });

    setStudents((data || []) as StudentOption[]);
  };

  const fetchAssignments = async () => {
    const { data } = await supabase.from('student_products').select('product_type');
    const counts = PRODUCT_CATALOG.reduce((acc, product) => {
      acc[product.key] =
        ((data || []) as Array<Pick<ProductAssignment, 'product_type'>>).filter(
          (item) => item.product_type === product.key
        ).length || 0;
      return acc;
    }, {} as Record<string, number>);

    setAssignmentsByType(counts);
  };

  const handleOpenModal = (productType?: ProductAssignment['product_type']) => {
    setSelectedProductType(productType || 'career_counselling');
    setSelectedStudentId('');
    setShowModal(true);
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedStudentId) {
      return;
    }

    setSaving(true);
    try {
      await supabase.from('student_products').insert({
        student_id: selectedStudentId,
        product_type: selectedProductType,
        status: 'active',
      });

      await fetchAssignments();
      setShowModal(false);
    } catch (error) {
      console.error('Error adding product:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Products</h1>
          <p className="text-gray-600 mt-1">Manage the consulting products available in the CRM</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          <span>Add Product</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {PRODUCT_CATALOG.map((product, index) => (
          <div
            key={product.key}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-navy-50 text-navy-700 text-xs font-semibold uppercase tracking-wide">
                  Product {index + 1}
                </div>
                <h2 className="text-xl font-semibold text-navy-900 mt-3">{product.label}</h2>
              </div>
              <div className="w-12 h-12 rounded-xl bg-maroon-50 flex items-center justify-center text-maroon-600">
                <Package size={22} />
              </div>
            </div>

            <p className="text-sm text-gray-600 leading-6">{product.description}</p>

            <div className="mt-4 space-y-2">
              {product.highlights.map((highlight) => (
                <div key={highlight} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>{highlight}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between text-sm text-gray-500">
              <span>{assignmentsByType[product.key] || 0} assigned</span>
              <button
                onClick={() => handleOpenModal(product.key)}
                className="text-maroon-600 hover:text-maroon-700 font-medium"
              >
                Add Product
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-4 sm:px-6">
              <div>
                <h2 className="text-xl font-semibold text-navy-900">Add Product</h2>
                <p className="text-sm text-gray-500">Assign one of the product offerings to a student</p>
              </div>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-2 hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 p-4 sm:p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Student</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-navy-500 focus:ring-2 focus:ring-navy-500"
                  required
                >
                  <option value="">Select student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.student_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Type</label>
                <select
                  value={selectedProductType}
                  onChange={(e) => setSelectedProductType(e.target.value as ProductAssignment['product_type'])}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-navy-500 focus:ring-2 focus:ring-navy-500"
                >
                  {PRODUCT_CATALOG.map((product) => (
                    <option key={product.key} value={product.key}>
                      {product.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-navy-900 px-4 py-2 text-white hover:bg-navy-800 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
