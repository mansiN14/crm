import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Quotation, Student } from '../../lib/supabase';
import { Search, FileText, Plus, Eye, Download, X } from 'lucide-react';
import { PRODUCT_CATALOG } from '../../lib/products';

const PRODUCT_OPTIONS = PRODUCT_CATALOG.map((product) => product.label);
const TRUE_AXIS_LOGO_SRC = '/logo.jpeg';

function formatQuotationDate(date: string) {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return date;
  return parsedDate.toLocaleDateString('en-GB');
}

export function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState<Quotation | null>(null);
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    fetchQuotations();
    fetchStudents();
  }, [statusFilter]);

  const fetchQuotations = async () => {
    try {
      let query = supabase
        .from('quotations')
        .select('*, student:students(*)')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setQuotations(data || []);
    } catch (error) {
      console.error('Error fetching quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*');
    setStudents(data || []);
  };

  const filteredQuotations = quotations.filter((q) =>
    q.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.quotation_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const generatePDF = (quotation: Quotation) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const logoUrl = `${window.location.origin}${TRUE_AXIS_LOGO_SRC}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quotation ${quotation.quotation_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; }
          .header { border-top: 2px solid #e5e5e5; border-bottom: 2px solid #e5e5e5; padding: 22px 0; margin-bottom: 40px; }
          .company { display: flex; align-items: flex-start; justify-content: space-between; gap: 30px; }
          .brand { text-align: left; max-width: 460px; }
          .logo-wrap { background: #fff; margin-bottom: 14px; }
          .logo { display: block; width: 260px; max-width: 100%; height: auto; object-fit: contain; }
          .company p { color: #666; font-size: 14px; }
          .quote-info { text-align: right; min-width: 210px; padding-top: 6px; }
          .quote-info h2 { font-size: 24px; color: #831843; margin-bottom: 12px; }
          .quote-info p { font-size: 14px; color: #666; margin-bottom: 5px; }
          .details { margin-bottom: 40px; }
          .details h3 { font-size: 16px; color: #1a365d; margin-bottom: 10px; border-bottom: 2px solid #831843; padding-bottom: 5px; }
          .details p { margin-bottom: 5px; }
          .table { width: 100%; border-collapse: collapse; margin: 30px 0; }
          .table th, .table td { padding: 15px; text-align: left; border-bottom: 1px solid #e5e5e5; }
          .table th { background: #1a365d; color: white; }
          .table tr:nth-child(even) { background: #f9f9f9; }
          .totals { margin-left: auto; width: 300px; margin-top: 20px; }
          .totals-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e5e5; }
          .totals-row.grand-total { font-weight: bold; font-size: 18px; border-bottom: none; background: #1a365d; color: white; padding: 15px; margin-top: 10px; }
          .footer { margin-top: 60px; padding-top: 20px; border-top: 2px solid #e5e5e5; }
          .footer p { color: #666; font-size: 12px; text-align: center; }
          .terms { margin-top: 30px; }
          .terms h4 { color: #1a365d; margin-bottom: 10px; }
          .terms ul { padding-left: 20px; color: #666; font-size: 12px; }
          .terms li { margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company">
            <div class="brand">
              <div class="logo-wrap">
                <img class="logo" src="${logoUrl}" alt="The True Axis logo" />
              </div>
              <p>Email: info@thetrueaxis.com | Phone: +91 9876543210</p>
            </div>
            <div class="quote-info">
              <h2>QUOTATION</h2>
              <p><strong>Quotation No:</strong> ${quotation.quotation_number}</p>
              <p><strong>Date:</strong> ${formatQuotationDate(quotation.quotation_date)}</p>
              <p><strong>Status:</strong> ${quotation.status}</p>
            </div>
          </div>
        </div>

        <div class="details">
          <h3>Customer Details</h3>
          <p><strong>Customer Name:</strong> ${quotation.customer_name}</p>
          ${quotation.student?.email ? `<p><strong>Email:</strong> ${quotation.student.email}</p>` : ''}
          ${quotation.student?.mobile_number ? `<p><strong>Phone:</strong> ${quotation.student.mobile_number}</p>` : ''}
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${quotation.product_name}</strong></td>
              <td>₹${Number(quotation.amount).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>₹${Number(quotation.amount).toLocaleString()}</span>
          </div>
          ${Number(quotation.discount) > 0 ? `
          <div class="totals-row">
            <span>Discount:</span>
            <span>-₹${Number(quotation.discount).toLocaleString()}</span>
          </div>
          ` : ''}
          <div class="totals-row">
            <span>GST (${quotation.gst_percentage}%):</span>
            <span>₹${((Number(quotation.amount) - Number(quotation.discount)) * Number(quotation.gst_percentage) / 100).toLocaleString()}</span>
          </div>
          <div class="totals-row grand-total">
            <span>Grand Total:</span>
            <span>₹${Number(quotation.total_amount).toLocaleString()}</span>
          </div>
        </div>

        <div class="terms">
          <h4>Terms & Conditions:</h4>
          <ul>
            <li>Payment is due within 30 days of the quotation date.</li>
            <li>Prices are valid for 15 days from the date of this quotation.</li>
            <li>All fees are non-refundable once services are rendered.</li>
            <li>Services will commence upon receipt of payment.</li>
          </ul>
        </div>

        <div class="footer">
          <p>Thank you for choosing The True Axis - Your partner in educational excellence.</p>
          <p>This is a computer-generated quotation and does not require a signature.</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-28 shrink-0 items-center justify-center rounded-lg bg-white p-2 shadow-sm ring-1 ring-gray-200 sm:h-16 sm:w-36">
            <img
              src={TRUE_AXIS_LOGO_SRC}
              alt="The True Axis logo"
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Quotations</h1>
            <p className="text-gray-600 mt-1">Generate and manage quotations</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          <span>New Quotation</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search quotations..."
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
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Quotation #</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Customer</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Product</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Status</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-navy-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredQuotations.map((quotation) => (
                <tr key={quotation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-navy-900">{quotation.quotation_number}</td>
                  <td className="px-6 py-4 text-gray-700">{quotation.customer_name}</td>
                  <td className="px-6 py-4 text-gray-700">{quotation.product_name}</td>
                  <td className="px-6 py-4 text-gray-700">{quotation.quotation_date}</td>
                  <td className="px-6 py-4 font-semibold text-navy-900">₹{Number(quotation.total_amount).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      quotation.status === 'accepted' ? 'bg-green-100 text-green-700' :
                      quotation.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      quotation.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {quotation.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex justify-end gap-2">
                    <button
                      onClick={() => setShowPreview(quotation)}
                      className="p-2 text-gray-600 hover:text-navy-900 hover:bg-gray-100 rounded-lg"
                      title="Preview"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => generatePDF(quotation)}
                      className="p-2 text-gray-600 hover:text-navy-900 hover:bg-gray-100 rounded-lg"
                      title="Download PDF"
                    >
                      <Download size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredQuotations.length === 0 && (
          <div className="p-12 text-center">
            <FileText className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500">No quotations found</p>
          </div>
        )}
      </div>

      {showModal && (
        <QuotationModal
          students={students}
          onClose={() => setShowModal(false)}
          onSave={(quotation) => {
            setShowModal(false);
            generatePDF(quotation);
            fetchQuotations();
          }}
        />
      )}

      {showPreview && (
        <QuotationPreview
          quotation={showPreview}
          onClose={() => setShowPreview(null)}
          onDownload={() => generatePDF(showPreview)}
        />
      )}
    </div>
  );
}

function QuotationModal({
  students,
  onClose,
  onSave,
}: {
  students: Student[];
  onClose: () => void;
  onSave: (quotation: Quotation) => void;
}) {
  const [formData, setFormData] = useState({
    student_id: '',
    customer_name: '',
    product_name: PRODUCT_OPTIONS[0],
    amount: '',
    discount: '0',
    gst_percentage: '18',
  });
  const [saving, setSaving] = useState(false);

  const subtotal = Math.max(0, Number(formData.amount) - Number(formData.discount));
  const gstAmount = subtotal * Number(formData.gst_percentage) / 100;
  const totalAmount = subtotal + gstAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const quotationNumber = await supabase.rpc('generate_quotation_number');

      const { data, error } = await supabase
        .from('quotations')
        .insert({
          quotation_number: quotationNumber.data,
          student_id: formData.student_id || null,
          customer_name: formData.customer_name,
          product_name: formData.product_name,
          amount: formData.amount,
          discount: formData.discount,
          gst_percentage: formData.gst_percentage,
          total_amount: totalAmount,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      if (data) onSave(data);
    } catch (error) {
      console.error('Error creating quotation:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-navy-900">New Quotation</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Student (Optional)</label>
            <select
              value={formData.student_id}
              onChange={(e) => {
                const student = students.find(s => s.id === e.target.value);
                setFormData({
                  ...formData,
                  student_id: e.target.value,
                  customer_name: student?.student_name || formData.customer_name,
                });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
            >
              <option value="">Select manually</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.student_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
            <input
              type="text"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product *</label>
            <select
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
            >
              {PRODUCT_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
                required
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Discount</label>
              <input
                type="number"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">GST %</label>
              <input
                type="number"
                value={formData.gst_percentage}
                onChange={(e) => setFormData({ ...formData, gst_percentage: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
                min="0"
                max="100"
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">₹{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">GST ({formData.gst_percentage}%):</span>
              <span className="font-medium">₹{gstAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-300">
              <span className="font-semibold text-navy-900">Total:</span>
              <span className="font-bold text-navy-900 text-lg">₹{totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving || !formData.amount} className="flex-1 px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Creating...' : 'Create & Download'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuotationPreview({
  quotation,
  onClose,
  onDownload,
}: {
  quotation: Quotation;
  onClose: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between gap-3 sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-navy-900">Quotation Preview</h2>
          <div className="flex items-center gap-2">
            <button onClick={onDownload} className="flex items-center gap-2 px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-lg transition-colors">
              <Download size={18} />
              <span>Download PDF</span>
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="mb-8 border-y border-gray-200 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex h-16 w-40 shrink-0 items-center justify-center rounded-lg bg-white p-2 ring-1 ring-gray-200 sm:h-20 sm:w-52">
                  <img
                    src={TRUE_AXIS_LOGO_SRC}
                    alt="The True Axis logo"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm text-gray-500">Quotation No</p>
                <p className="font-semibold text-navy-900">{quotation.quotation_number}</p>
                <p className="mt-2 text-sm text-gray-500">Date</p>
                <p className="font-medium text-navy-900">{formatQuotationDate(quotation.quotation_date)}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between mb-8">
            <div>
              <h2 className="text-lg font-semibold text-maroon-700 mb-2">QUOTATION</h2>
              <p className="text-gray-600">Number: {quotation.quotation_number}</p>
              <p className="text-gray-600">Date: {quotation.quotation_date}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{quotation.customer_name}</p>
              {quotation.student?.email && <p className="text-gray-600">{quotation.student.email}</p>}
              {quotation.student?.mobile_number && <p className="text-gray-600">{quotation.student.mobile_number}</p>}
            </div>
          </div>

          <table className="w-full mb-8">
            <thead>
              <tr className="border-b-2 border-navy-900">
                <th className="text-left py-2">Description</th>
                <th className="text-right py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="py-3">{quotation.product_name}</td>
                <td className="text-right py-3">₹{Number(quotation.amount).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div className="ml-auto w-64 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span>₹{Number(quotation.amount).toLocaleString()}</span>
            </div>
            {Number(quotation.discount) > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount:</span>
                <span>-₹{Number(quotation.discount).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">GST ({quotation.gst_percentage}%):</span>
              <span>₹{((Number(quotation.amount) - Number(quotation.discount)) * Number(quotation.gst_percentage) / 100).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-navy-900 text-lg pt-2 border-t">
              <span>Total:</span>
              <span>₹{Number(quotation.total_amount).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
