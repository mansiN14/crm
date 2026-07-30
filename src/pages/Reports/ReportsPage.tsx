import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Inquiry, Student, Payment, User, StudentProduct } from '../../lib/supabase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';
import { PRODUCT_CATALOG } from '../../lib/products';

const COLORS = ['#1a365d', '#831843', '#2563eb', '#059669', '#7c3aed', '#db2777'];

export function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<StudentProduct[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [inquiriesRes, studentsRes, paymentsRes, usersRes, productsRes] = await Promise.all([
        supabase.from('inquiries').select('*'),
        supabase.from('students').select('*, assigned_counselor:users!assigned_counselor_id(*)'),
        supabase.from('payments').select('*'),
        supabase.from('users').select('*'),
        supabase.from('student_products').select('*'),
      ]);

      setInquiries(inquiriesRes.data || []);
      setStudents(studentsRes.data || []);
      setPayments(paymentsRes.data || []);
      setUsers(usersRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount_paid), 0);
  const pendingPayments = payments.filter(p => p.status !== 'paid').reduce((sum, p) => sum + Number(p.total_amount) - Number(p.amount_paid), 0);

  const productWiseData = [
    ...PRODUCT_CATALOG.map((product) => ({
      name: product.label,
      value: products.filter((p) => p.product_type === product.key).length,
    })),
  ].filter(p => p.value > 0);

  const counselorPerformance = users
    .filter(u => u.role === 'counselor' || u.role === 'admin')
    .map(counselor => {
      const counselorStudents = students.filter(s => s.assigned_counselor_id === counselor.id);
      const completed = counselorStudents.filter(s => s.status === 'completed').length;
      return {
        name: counselor.name,
        students: counselorStudents.length,
        completed,
      };
    });

  const monthlyData = (() => {
    const months: Record<string, { inquiries: number; students: number; revenue: number }> = {};
    const last6Months = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      last6Months.push(monthKey);
      months[monthKey] = { inquiries: 0, students: 0, revenue: 0 };
    }

    inquiries.forEach(inq => {
      const monthKey = inq.inquiry_date?.substring(0, 7);
      if (monthKey && months[monthKey]) {
        months[monthKey].inquiries++;
      }
    });

    students.forEach(student => {
      const monthKey = student.created_at?.substring(0, 7);
      if (monthKey && months[monthKey]) {
        months[monthKey].students++;
      }
    });

    payments.filter(p => p.status === 'paid' && p.payment_date).forEach(payment => {
      const monthKey = payment.payment_date?.substring(0, 7);
      if (monthKey && months[monthKey]) {
        months[monthKey].revenue += Number(payment.amount_paid);
      }
    });

    return last6Months.map(monthKey => ({
      month: new Date(monthKey + '-01').toLocaleDateString('en-US', { month: 'short' }),
      inquiries: months[monthKey]?.inquiries || 0,
      students: months[monthKey]?.students || 0,
      revenue: months[monthKey]?.revenue || 0,
    }));
  })();

  const statusData = [
    { name: 'New', value: inquiries.filter(i => i.status === 'new').length, color: '#3b82f6' },
    { name: 'Attended', value: inquiries.filter(i => i.status === 'attended').length, color: '#8b5cf6' },
    { name: 'Ongoing', value: students.filter(s => s.status === 'ongoing').length, color: '#f59e0b' },
    { name: 'Completed', value: students.filter(s => s.status === 'completed').length, color: '#10b981' },
  ];

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
        <h1 className="text-2xl font-bold text-navy-900">Reports & Analytics</h1>
        <p className="text-gray-600 mt-1">Comprehensive insights and performance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-navy-100 flex items-center justify-center">
              <Users className="text-navy-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Inquiries</p>
              <p className="text-2xl font-bold text-navy-900">{inquiries.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <TrendingUp className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Students</p>
              <p className="text-2xl font-bold text-navy-900">{students.filter(s => s.status === 'ongoing').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">₹{totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Calendar className="text-orange-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending Amount</p>
              <p className="text-2xl font-bold text-orange-600">₹{pendingPayments.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Monthly Trends</h2>
          {monthlyData.some(d => d.inquiries > 0 || d.students > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="month" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="inquiries" stroke="#831843" strokeWidth={2} name="Inquiries" />
                <Line type="monotone" dataKey="students" stroke="#1a365d" strokeWidth={2} name="Students" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No data available
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Monthly Revenue</h2>
          {monthlyData.some(d => d.revenue > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="month" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} />
                <Bar dataKey="revenue" fill="#059669" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No revenue data available
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Product Distribution</h2>
          {productWiseData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={productWiseData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {productWiseData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No product data available
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Pipeline Status</h2>
          {statusData.some(s => s.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis type="number" stroke="#666" />
                <YAxis dataKey="name" type="category" stroke="#666" width={80} />
                <Tooltip />
                <Bar dataKey="value" name="Count">
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No pipeline data available
            </div>
          )}
        </div>
      </div>

      {counselorPerformance.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Counselor Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Counselor</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Assigned Students</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Completed</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy-900">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {counselorPerformance.map((counselor) => (
                  <tr key={counselor.name}>
                    <td className="px-6 py-4 font-medium text-navy-900">{counselor.name}</td>
                    <td className="px-6 py-4 text-gray-700">{counselor.students}</td>
                    <td className="px-6 py-4 text-green-600">{counselor.completed}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{
                              width: counselor.students > 0
                                ? `${(counselor.completed / counselor.students) * 100}%`
                                : '0%',
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">
                          {counselor.students > 0
                            ? Math.round((counselor.completed / counselor.students) * 100)
                            : 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
