import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Payment } from '../../lib/supabase';
import { Search, CreditCard, AlertCircle, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const fetchPayments = async () => {
    try {
      let query = supabase
        .from('payments')
        .select('*, student:students(*)')
        .order('due_date', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];
      const updatedData = ((data || []) as Payment[]).map((p) => {
        if (p.status === 'pending' && p.due_date < today) {
          supabase.from('payments').update({ status: 'overdue' }).eq('id', p.id);
          return { ...p, status: 'overdue' as const };
        }
        return p;
      });

      setPayments(updatedData);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter((payment) =>
    payment.student?.student_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount_paid), 0);
  const totalPending = payments.filter(p => p.status !== 'paid').reduce((sum, p) => sum + Number(p.total_amount) - Number(p.amount_paid), 0);
  const overduePayments = payments.filter(p => p.status === 'overdue');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-navy-200 border-t-maroon-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Payments</h1>
        <p className="text-gray-600 mt-1">Track and manage payment records</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="text-green-600" size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-600">Total Collected</p>
              <p className="truncate text-xl font-bold text-green-600 sm:text-2xl">Rs {totalPaid.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
              <Clock className="text-orange-600" size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-600">Pending</p>
              <p className="truncate text-xl font-bold text-orange-600 sm:text-2xl">Rs {totalPending.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertCircle className="text-red-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{overduePayments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {overduePayments.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-700 mb-3">
            <AlertCircle size={20} />
            <span className="font-semibold">Overdue Payments</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {overduePayments.slice(0, 6).map((payment) => (
              <div key={payment.id} className="bg-white rounded-lg p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-navy-900">{payment.student?.student_name}</p>
                  <p className="text-sm text-gray-500">Due: {payment.due_date}</p>
                </div>
                <p className="font-semibold text-red-600">
                  Rs {(Number(payment.total_amount) - Number(payment.amount_paid)).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by student name..."
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
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Student</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Payment #</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Due Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Total</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Paid</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Balance</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link to={`/students/${payment.student_id}`} className="text-navy-900 hover:text-maroon-600 font-medium">
                      {payment.student?.student_name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-700">#{payment.payment_number}</td>
                  <td className="px-6 py-4 text-gray-700">{payment.due_date}</td>
                  <td className="px-6 py-4 font-medium text-navy-900">Rs {Number(payment.total_amount).toLocaleString()}</td>
                  <td className="px-6 py-4 text-green-600 font-medium">Rs {Number(payment.amount_paid).toLocaleString()}</td>
                  <td className="px-6 py-4 font-medium text-orange-600">
                    Rs {(Number(payment.total_amount) - Number(payment.amount_paid)).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                      payment.status === 'paid' ? 'bg-green-100 text-green-700' :
                      payment.status === 'overdue' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {payment.status === 'paid' && <CheckCircle size={12} />}
                      {payment.status === 'overdue' && <AlertCircle size={12} />}
                      {payment.status === 'pending' && <Clock size={12} />}
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredPayments.length === 0 && (
          <div className="p-12 text-center">
            <CreditCard className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500">No payments found</p>
          </div>
        )}
      </div>
    </div>
  );
}
