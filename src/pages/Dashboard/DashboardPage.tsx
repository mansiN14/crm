import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Meeting, Reminder, Payment, ActivityLog } from '../../lib/supabase';
import {
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  CreditCard,
  Bell,
  TrendingUp,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalInquiries: number;
  attendanceToday: number;
  ongoingClients: number;
  completedClients: number;
  upcomingMeetings: number;
  paymentsDue: number;
  followUpsDue: number;
  totalRevenue: number;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalInquiries: 0,
    attendanceToday: 0,
    ongoingClients: 0,
    completedClients: 0,
    upcomingMeetings: 0,
    paymentsDue: 0,
    followUpsDue: 0,
    totalRevenue: 0,
  });
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>([]);
  const [todaysMeetings, setTodaysMeetings] = useState<Meeting[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [
        inquiriesRes,
        studentsRes,
        meetingsRes,
        remindersRes,
        paymentsRes,
        activitiesRes,
      ] = await Promise.all([
        supabase.from('inquiries').select('*', { count: 'exact', head: true }),
        supabase.from('students').select('*'),
        supabase.from('meetings').select('*, student:students(*)'),
        supabase.from('reminders').select('*, student:students(*), assignedUser:users(*)').eq('status', 'pending'),
        supabase.from('payments').select('*, student:students(*)'),
        supabase.from('activity_logs').select('*, user:users(*)').order('created_at', { ascending: false }).limit(10),
      ]);

      const students = (studentsRes.data || []) as Array<{ status: string }>;
      const meetings = (meetingsRes.data || []) as Meeting[];
      const reminders = (remindersRes.data || []) as Reminder[];
      const payments = (paymentsRes.data || []) as Payment[];

      const todaysMeetingsFiltered = meetings.filter(
        (m) => m.meeting_date === today
      );

      const upcomingMeetings = meetings.filter(
        (m) => new Date(m.meeting_date) >= new Date(today)
      ).length;

      const pendingPayments = payments.filter(
        (p) => p.status === 'pending' && new Date(p.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );

      const totalRevenue = payments
        .filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + Number(p.amount_paid), 0);

      setStats({
        totalInquiries: inquiriesRes.count || 0,
        attendanceToday: todaysMeetingsFiltered.length,
        ongoingClients: students.filter((s) => s.status === 'ongoing').length,
        completedClients: students.filter((s) => s.status === 'completed').length,
        upcomingMeetings,
        paymentsDue: pendingPayments.length,
        followUpsDue: reminders.filter(
          (r) => new Date(r.reminder_date) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        ).length,
        totalRevenue,
      });

      setRecentActivities(activitiesRes.data || []);
      setUpcomingReminders(
        [...reminders]
          .sort((first, second) =>
            `${first.reminder_date || ''} ${first.reminder_time || ''}`.localeCompare(
              `${second.reminder_date || ''} ${second.reminder_time || ''}`
            )
          )
          .slice(0, 5)
      );
      setTodaysMeetings(todaysMeetingsFiltered);
      setRecentPayments(payments.filter(p => p.status === 'paid').slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
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
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name}</p>
        </div>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Inquiries"
          value={stats.totalInquiries}
          icon={Users}
          color="navy"
          trend="+12%"
          link="/inquiries"
        />
        <StatCard
          title="Attendance Today"
          value={stats.attendanceToday}
          icon={Calendar}
          color="maroon"
          link="/meetings"
        />
        <StatCard
          title="Ongoing Clients"
          value={stats.ongoingClients}
          icon={Clock}
          color="blue"
          link="/ongoing"
        />
        <StatCard
          title="Completed Clients"
          value={stats.completedClients}
          icon={CheckCircle2}
          color="green"
          trend="+8%"
          link="/completed"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Upcoming Meetings"
          value={stats.upcomingMeetings}
          icon={Calendar}
          color="purple"
          link="/meetings"
        />
        <StatCard
          title="Payments Due"
          value={stats.paymentsDue}
          icon={CreditCard}
          color="orange"
          link="/payments"
        />
        <StatCard
          title="Follow Ups Due"
          value={stats.followUpsDue}
          icon={Bell}
          color="red"
          link="/reminders"
        />
        <StatCard
          title="Total Revenue"
          value={`Rs ${stats.totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          color="emerald"
          trend="+15%"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-navy-900 flex items-center gap-2">
              <Calendar className="text-maroon-600" size={20} />
              Today's Meetings
            </h2>
          </div>
          <div className="p-6">
            {todaysMeetings.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No meetings scheduled for today</p>
            ) : (
              <div className="space-y-4">
                {todaysMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-navy-900">{meeting.student?.student_name}</p>
                      <p className="text-sm text-gray-600">Meeting #{meeting.meeting_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-navy-900">{meeting.meeting_time || 'Time TBD'}</p>
                      <Link
                        to={`/students/${meeting.student_id}`}
                        className="text-xs text-maroon-600 hover:text-maroon-700 font-medium"
                      >
                        Open Student
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-navy-900 flex items-center gap-2">
              <Bell className="text-maroon-600" size={20} />
              Upcoming Reminders
            </h2>
          </div>
          <div className="p-6">
            {upcomingReminders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No upcoming reminders</p>
            ) : (
              <div className="space-y-4">
                {upcomingReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-navy-900">{reminder.title}</p>
                      <p className="text-sm text-gray-600">
                        {reminder.reminder_date} at {reminder.reminder_time}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      reminder.reminder_type === 'meeting' ? 'bg-blue-100 text-blue-700' :
                      reminder.reminder_type === 'payment' ? 'bg-orange-100 text-orange-700' :
                      reminder.reminder_type === 'follow_up' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {reminder.reminder_type.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-navy-900 flex items-center gap-2">
              <TrendingUp className="text-maroon-600" size={20} />
              Recent Activities
            </h2>
          </div>
          <div className="p-6">
            {recentActivities.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent activities</p>
            ) : (
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-maroon-500 mt-2" />
                    <div className="flex-1">
                      <p className="text-navy-900">{activity.action}</p>
                      <p className="text-sm text-gray-500">
                        {activity.user?.name} - {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-navy-900 flex items-center gap-2">
              <CreditCard className="text-maroon-600" size={20} />
              Recent Payments
            </h2>
          </div>
          <div className="p-6">
            {recentPayments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent payments</p>
            ) : (
              <div className="space-y-4">
                {recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-navy-900">{payment.student?.student_name}</p>
                      <p className="text-sm text-gray-600">
                        Payment #{payment.payment_number}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        Rs {Number(payment.amount_paid).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">{payment.payment_date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
  link,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  trend?: string;
  link?: string;
}) {
  const colorClasses: Record<string, string> = {
    navy: 'bg-navy-100 text-navy-700',
    maroon: 'bg-maroon-100 text-maroon-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-orange-100 text-orange-700',
    red: 'bg-red-100 text-red-700',
    emerald: 'bg-emerald-100 text-emerald-700',
  };

  const content = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-lg ${colorClasses[color] || colorClasses.navy}`}>
          <Icon size={24} />
        </div>
        {trend && (
          <span className="text-sm font-medium text-green-600 flex items-center gap-1">
            <TrendingUp size={14} />
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-navy-900">{value}</p>
        <p className="text-sm text-gray-600 mt-1">{title}</p>
      </div>
      {link && (
        <div className="mt-4 flex items-center text-sm text-maroon-600 font-medium group-hover:gap-2 transition-all duration-200">
          <span>View all</span>
          <ArrowRight size={14} className="ml-1" />
        </div>
      )}
    </div>
  );

  if (link) {
    return <Link to={link}>{content}</Link>;
  }
  return content;
}
