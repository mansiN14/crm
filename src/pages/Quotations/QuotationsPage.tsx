import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Quotation, Student } from '../../lib/supabase';
import { Search, FileText, Plus, Eye, Download, X } from 'lucide-react';
import { PRODUCT_CATALOG } from '../../lib/products';

const PRODUCT_OPTIONS = PRODUCT_CATALOG.map((product) => product.label);
const TRUE_AXIS_LOGO_SRC = '/logo.jpeg';
const COMPANY_DETAILS = {
  gstNumber: '27AAPCA5279F1ZA',
  phone: '+91 99 2020 4727',
  email: 'vijay@thetrueaxis.in',
  address: 'WeWork, Zenia, Hiranandani Business Park, Hiranandani Estate, Ghodbander Road, Thane (W) 400 607, Maharashtra, India',
  registeredOffice: 'C-20, G Block, Bandra Kurla Complex, Bandra East, Mumbai, Maharashtra 400051.',
  bank: {
    beneficiary: 'Arrham Intelligence Institute Pvt Ltd',
    name: 'Indian Bank',
    accountType: 'Current',
    accountNumber: '6531599903',
    ifsCode: 'IDIB000T129',
    branchAddress: 'G1, Hamilton, A Wing, Hiranandani Business Park, Thane W, 400607',
  },
};

function formatLongQuotationDate(date: string) {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return date;
  return parsedDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatCurrency(amount: string | number) {
  return `₹ ${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function escapeHtml(value: string | number | undefined | null) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildProposalTitle(productName: string) {
  const trimmedProductName = productName.trim();
  return /^proposal\s+for\b/i.test(trimmedProductName) ? trimmedProductName : `Proposal for ${trimmedProductName}`;
}

function buildQuotationTemplateHtml(quotation: Quotation, logoUrl: string) {
  const taxableAmount = Number(quotation.amount || 0) - Number(quotation.discount || 0);
  const gstAmount = taxableAmount * Number(quotation.gst_percentage || 0) / 100;
  const proposalLine = buildProposalTitle(quotation.product_name);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Quotation ${escapeHtml(quotation.quotation_number)}</title>
      <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          color: #111827;
          font-family: Arial, Helvetica, sans-serif;
          background: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .page {
          position: relative;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          overflow: hidden;
          background: #ffffff;
          padding: 25mm 18mm 0;
        }
        .ribbon {
          position: absolute;
          top: 0;
          right: 0;
          width: 78mm;
          height: 14mm;
          background: linear-gradient(135deg, #9a0a0a 0 35%, #c70f13 35% 67%, #ff1515 67% 100%);
          border-bottom-left-radius: 16mm;
        }
        .top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18mm;
          border-bottom: 1.5px solid #111;
          padding-bottom: 10mm;
        }
        .logo {
          width: 86mm;
          max-height: 24mm;
          object-fit: contain;
          object-position: left center;
        }
        .title {
          text-align: right;
          padding-top: 4mm;
        }
        .title h1 {
          margin: 0;
          color: #071452;
          font-size: 29pt;
          line-height: 1;
          letter-spacing: 0;
          font-weight: 800;
        }
        .title p {
          margin: 5mm 0 0;
          color: #111;
          font-size: 12pt;
        }
        .meta {
          padding: 10mm 6mm 7mm;
          border-bottom: 1.5px solid #111;
        }
        .meta-row {
          display: grid;
          grid-template-columns: 34mm 1fr;
          gap: 10mm;
          align-items: baseline;
          margin-bottom: 6mm;
          font-size: 13pt;
        }
        .meta-label { color: #111; }
        .meta-value { font-weight: 700; font-size: 16pt; color: #2d3340; }
        .proposal {
          margin-top: 7mm;
          font-size: 12.5pt;
        }
        .proposal strong { font-weight: 800; }
        .items {
          width: 100%;
          border-collapse: collapse;
          margin-top: 9mm;
          font-size: 12pt;
        }
        .items th {
          background: #880909;
          color: #fff;
          padding: 4mm 5mm;
          text-align: center;
          font-size: 12pt;
        }
        .items td {
          padding: 4.2mm 5mm;
          background: #ededed;
          font-weight: 800;
          text-align: center;
          color: #050505;
        }
        .items td:last-child,
        .items th:last-child { width: 42%; }
        .totals {
          width: 74mm;
          margin: 9mm 27mm 10mm auto;
          font-size: 12pt;
        }
        .total-row {
          display: grid;
          grid-template-columns: 1fr 38mm;
          gap: 8mm;
          margin-bottom: 4mm;
          align-items: baseline;
        }
        .total-row .label {
          text-align: right;
          font-weight: 800;
        }
        .total-row .amount {
          text-align: left;
        }
        .total-row.grand .amount,
        .total-row.grand .label {
          font-weight: 800;
        }
        .divider {
          border-top: 1.5px solid #111;
          width: 100%;
          margin-top: 4mm;
          padding-top: 3mm;
        }
        .divider::after {
          content: '';
          display: block;
          width: 68mm;
          height: 1.2mm;
          background: #111;
          margin: 0 auto;
        }
        .terms {
          margin-top: 10mm;
          padding: 0 2mm;
        }
        .terms h2 {
          margin: 0 0 4mm;
          color: #4a4a4a;
          font-size: 11pt;
          font-weight: 800;
        }
        .terms p {
          margin: 0;
          color: #555;
          font-size: 8.6pt;
          line-height: 1.2;
        }
        .footer {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 17mm;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          background: #071452;
          color: #fff;
          padding: 10mm 13mm;
          min-height: 72mm;
        }
        .footer h2 {
          margin: 0 0 1mm;
          font-size: 18pt;
          line-height: 1;
        }
        .footer h3 {
          margin: 0 0 4mm;
          font-size: 15pt;
        }
        .bank p,
        .contact p {
          margin: 0 0 2mm;
          font-size: 12.5pt;
          line-height: 1.25;
        }
        .contact {
          border-left: 1px solid rgba(255, 255, 255, 0.85);
          padding-left: 13mm;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 7mm;
        }
        .contact-row {
          display: grid;
          grid-template-columns: 12mm 1fr;
          gap: 6mm;
          align-items: center;
        }
        .icon {
          width: 8mm;
          height: 8mm;
          border: 1px solid #fff;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11pt;
          background: #fff;
          color: #071452;
        }
        .registered {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          background: #880909;
          color: #fff;
          min-height: 17mm;
          padding: 5mm 13mm;
          font-size: 12pt;
          line-height: 1.25;
        }
        .registered strong { font-weight: 800; }
        @media print {
          .page { margin: 0; }
        }
      </style>
    </head>
    <body>
      <main class="page">
        <div class="ribbon"></div>
        <header class="top">
          <img class="logo" src="${escapeHtml(logoUrl)}" alt="The True Axis logo" />
          <div class="title">
            <h1>QUOTATION</h1>
            <p>GST No.: ${COMPANY_DETAILS.gstNumber}</p>
          </div>
        </header>

        <section class="meta">
          <div class="meta-row">
            <span class="meta-label">Billed to:</span>
            <span class="meta-value">${escapeHtml(quotation.customer_name)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Date Issued:</span>
            <span>${escapeHtml(formatLongQuotationDate(quotation.quotation_date))}</span>
          </div>
          <p class="proposal">${escapeHtml(proposalLine)}</p>
        </section>

        <table class="items">
          <thead>
            <tr>
              <th>DESCRIPTION</th>
              <th>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${escapeHtml(quotation.product_name).toUpperCase()}</td>
              <td>${formatCurrency(quotation.amount)}</td>
            </tr>
          </tbody>
        </table>

        <section class="totals">
          <div class="total-row">
            <span class="label">SUBTOTAL</span>
            <span class="amount">${formatCurrency(taxableAmount)}</span>
          </div>
          <div class="total-row">
            <span class="label">GST ${escapeHtml(quotation.gst_percentage)}%</span>
            <span class="amount">${formatCurrency(gstAmount)}</span>
          </div>
          <div class="total-row grand">
            <span class="label">TOTAL</span>
            <span class="amount">${formatCurrency(quotation.total_amount)}</span>
          </div>
        </section>

        <div class="divider"></div>

        <section class="terms">
          <h2>TERMS AND CONDITIONS</h2>
          <p>The aforementioned fees are strictly limited to the scope of admission consulting services provided by our firm. All additional charges associated with the application process, including but not limited to standardized examinations (e.g., SAT, AP, ACT, IELTS, TOEFL), university application fees, visa applications, SEVIS fees, and any other applicable charges as outlined in the invoice, shall be the sole responsibility of the student and/or parent and will be billed directly to them.</p>
        </section>

        <section class="footer">
          <div class="bank">
            <h2>PAYABLE TO:</h2>
            <h3>Bank Details:</h3>
            <p>Beneficiary: ${COMPANY_DETAILS.bank.beneficiary}</p>
            <p>Bank: ${COMPANY_DETAILS.bank.name}</p>
            <p>Account Type: ${COMPANY_DETAILS.bank.accountType}</p>
            <p>Account No: ${COMPANY_DETAILS.bank.accountNumber}</p>
            <p>IFS Code: ${COMPANY_DETAILS.bank.ifsCode}</p>
            <p>Branch Address: ${COMPANY_DETAILS.bank.branchAddress}</p>
          </div>
          <div class="contact">
            <div class="contact-row"><span class="icon">☎</span><p>${COMPANY_DETAILS.phone}</p></div>
            <div class="contact-row"><span class="icon">✉</span><p>${COMPANY_DETAILS.email}</p></div>
            <div class="contact-row"><span class="icon">⌂</span><p>${COMPANY_DETAILS.address}</p></div>
          </div>
        </section>

        <section class="registered">
          <strong>Register Office :</strong> ${COMPANY_DETAILS.registeredOffice}
        </section>
      </main>
    </body>
    </html>
  `;
}

export function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState<Quotation | null>(null);
  const [students, setStudents] = useState<Student[]>([]);

  const fetchQuotations = useCallback(async () => {
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
  }, [statusFilter]);

  const fetchStudents = useCallback(async () => {
    const { data } = await supabase.from('students').select('*');
    setStudents(data || []);
  }, []);

  useEffect(() => {
    fetchQuotations();
    fetchStudents();
  }, [fetchQuotations, fetchStudents]);

  const filteredQuotations = quotations.filter((q) =>
    q.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.quotation_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const generatePDF = (quotation: Quotation) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const logoUrl = `${window.location.origin}${TRUE_AXIS_LOGO_SRC}`;
    const html = buildQuotationTemplateHtml(quotation, logoUrl);

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
  const taxableAmount = Number(quotation.amount || 0) - Number(quotation.discount || 0);
  const gstAmount = taxableAmount * Number(quotation.gst_percentage || 0) / 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] overflow-y-auto">
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

        <div className="bg-gray-100 p-4 sm:p-8">
          <div className="mx-auto max-w-[794px] overflow-hidden bg-white shadow-sm">
            <div className="relative p-8 sm:p-12">
              <div className="absolute right-0 top-0 h-10 w-52 rounded-bl-full bg-gradient-to-r from-red-900 via-red-700 to-red-500" />

              <div className="flex flex-col gap-6 border-b border-gray-900 pb-8 sm:flex-row sm:items-start sm:justify-between">
                <img
                  src={TRUE_AXIS_LOGO_SRC}
                  alt="The True Axis logo"
                  className="h-16 w-72 object-contain object-left"
                />
                <div className="text-left sm:text-right">
                  <h3 className="text-4xl font-extrabold text-[#071452]">QUOTATION</h3>
                  <p className="mt-2 text-navy-900">GST No.: {COMPANY_DETAILS.gstNumber}</p>
                </div>
              </div>

              <div className="space-y-5 border-b border-gray-900 px-6 py-8">
                <div className="grid grid-cols-[120px_1fr] items-baseline gap-8">
                  <span>Billed to:</span>
                  <span className="text-2xl font-bold text-gray-700">{quotation.customer_name}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-baseline gap-8">
                  <span>Date Issued:</span>
                  <span>{formatLongQuotationDate(quotation.quotation_date)}</span>
                </div>
                <p className="font-semibold">{buildProposalTitle(quotation.product_name)}</p>
              </div>

              <table className="mt-8 w-full">
                <thead>
                  <tr className="bg-red-900 text-white">
                    <th className="px-6 py-4 text-center">DESCRIPTION</th>
                    <th className="px-6 py-4 text-center">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-gray-100 font-extrabold">
                    <td className="px-6 py-4 text-center">{quotation.product_name.toUpperCase()}</td>
                    <td className="px-6 py-4 text-center">{formatCurrency(quotation.amount)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="ml-auto mr-16 mt-8 w-72 space-y-4">
                <div className="grid grid-cols-2 gap-8">
                  <span className="text-right font-extrabold">SUBTOTAL</span>
                  <span>{formatCurrency(taxableAmount)}</span>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <span className="text-right font-extrabold">GST {quotation.gst_percentage}%</span>
                  <span>{formatCurrency(gstAmount)}</span>
                </div>
                <div className="grid grid-cols-2 gap-8 font-extrabold">
                  <span className="text-right">TOTAL</span>
                  <span>{formatCurrency(quotation.total_amount)}</span>
                </div>
              </div>

              <div className="mt-8 border-t border-gray-900 pt-3">
                <div className="mx-auto h-1 w-64 bg-gray-900" />
              </div>

              <div className="mt-10">
                <h4 className="text-sm font-extrabold text-gray-700">TERMS AND CONDITIONS</h4>
                <p className="mt-3 text-xs leading-5 text-gray-600">
                  The aforementioned fees are strictly limited to the scope of admission consulting services provided by our firm.
                  All additional charges associated with the application process, including but not limited to standardized
                  examinations, university application fees, visa applications, SEVIS fees, and any other applicable charges shall
                  be the sole responsibility of the student and/or parent and will be billed directly to them.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 bg-[#071452] text-white sm:grid-cols-2">
              <div className="p-8">
                <h3 className="text-2xl font-extrabold">PAYABLE TO:</h3>
                <p className="mt-1 text-xl font-bold">Bank Details:</p>
                <div className="mt-4 space-y-1 text-lg">
                  <p>Beneficiary: {COMPANY_DETAILS.bank.beneficiary}</p>
                  <p>Bank: {COMPANY_DETAILS.bank.name}</p>
                  <p>Account Type: {COMPANY_DETAILS.bank.accountType}</p>
                  <p>Account No: {COMPANY_DETAILS.bank.accountNumber}</p>
                  <p>IFS Code: {COMPANY_DETAILS.bank.ifsCode}</p>
                  <p>Branch Address: {COMPANY_DETAILS.bank.branchAddress}</p>
                </div>
              </div>
              <div className="space-y-6 border-t border-white/70 p-8 sm:border-l sm:border-t-0">
                <p>{COMPANY_DETAILS.phone}</p>
                <p>{COMPANY_DETAILS.email}</p>
                <p>{COMPANY_DETAILS.address}</p>
              </div>
            </div>
            <div className="bg-red-900 px-8 py-5 text-white">
              <strong>Register Office :</strong> {COMPANY_DETAILS.registeredOffice}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
