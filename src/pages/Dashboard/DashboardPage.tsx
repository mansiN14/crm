import { useEffect, useState, type ElementType } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';
import type { Meeting, Reminder, Payment, ActivityLog } from '../../lib/supabase';
import { getDueStatus, toDateKey } from '../../lib/dateUtils';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
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
  Check,
  Plus,
  AlertTriangle,
  IndianRupee,
  UserRoundCheck,
  ClipboardList,
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
  overduePayments: number;
  overdueFollowUps: number;
  monthlyInquiryTrend: number | null;
  monthlyCompletedTrend: number | null;
  monthlyRevenueTrend: number | null;
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
    overduePayments: 0,
    overdueFollowUps: 0,
    monthlyInquiryTrend: null,
    monthlyCompletedTrend: null,
    monthlyRevenueTrend: null,
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
      const today = toDateKey();

      const [
        inquiriesRes,
        studentsRes,
        meetingsRes,
        remindersRes,
        paymentsRes,
        activitiesRes,
      ] = await Promise.all([
        supabase.from('inquiries').select('*'),
        supabase.from('students').select('*'),
        supabase.from('meetings').select('*, student:students(*)'),
        supabase.from('reminders').select('*, student:students(*), assignedUser:users(*)').eq('status', 'pending'),
        supabase.from('payments').select('*, student:students(*)'),
        supabase.from('activity_logs').select('*, user:users(*)').order('created_at', { ascending: false }).limit(10),
      ]);

      const students = (studentsRes.data || []) as Array<{ status: string; updated_at?: string }>;
      const meetings = (meetingsRes.data || []) as Meeting[];
      const reminders = (remindersRes.data || []) as Reminder[];
      const payments = (paymentsRes.data || []) as Payment[];
      const inquiries = (inquiriesRes.data || []) as Array<{ created_at?: string; inquiry_date?: string }>;

      const todaysMeetingsFiltered = meetings.filter(
        (m) => m.meeting_date === today
      );

      const upcomingMeetings = meetings.filter(
        (m) => new Date(m.meeting_date) >= new Date(today)
      ).length;

      const pendingPayments = payments.filter(
        (p) => p.status === 'pending' && new Date(p.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );
      const overduePayments = payments.filter((p) => p.status !== 'paid' && getDueStatus(p.due_date) === 'overdue');
      const dueReminders = reminders.filter(
        (r) => new Date(r.reminder_date) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      );
      const overdueFollowUps = reminders.filter((r) => getDueStatus(r.reminder_date) === 'overdue');

      const totalRevenue = payments
        .filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + Number(p.amount_paid), 0);
      const trendFor = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : null;
        return Math.round(((current - previous) / previous) * 100);
      };
      const monthKey = (offset: number) => {
        const date = new Date();
        date.setMonth(date.getMonth() - offset);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      };
      const currentMonth = monthKey(0);
      const previousMonth = monthKey(1);
      const currentInquiries = inquiries.filter((inquiry) =>
        (inquiry.inquiry_date || inquiry.created_at || '').startsWith(currentMonth)
      ).length;
      const previousInquiries = inquiries.filter((inquiry) =>
        (inquiry.inquiry_date || inquiry.created_at || '').startsWith(previousMonth)
      ).length;
      const currentCompleted = students.filter((student) =>
        student.status === 'completed' && (student.updated_at || '').startsWith(currentMonth)
      ).length;
      const previousCompleted = students.filter((student) =>
        student.status === 'completed' && (student.updated_at || '').startsWith(previousMonth)
      ).length;
      const currentRevenue = payments
        .filter((payment) => payment.status === 'paid' && (payment.payment_date || '').startsWith(currentMonth))
        .reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0);
      const previousRevenue = payments
        .filter((payment) => payment.status === 'paid' && (payment.payment_date || '').startsWith(previousMonth))
        .reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0);

      setStats({
        totalInquiries: inquiries.length,
        attendanceToday: todaysMeetingsFiltered.length,
        ongoingClients: students.filter((s) => s.status === 'ongoing').length,
        completedClients: students.filter((s) => s.status === 'completed').length,
        upcomingMeetings,
        paymentsDue: pendingPayments.length,
        followUpsDue: dueReminders.length,
        totalRevenue,
        overduePayments: overduePayments.length,
        overdueFollowUps: overdueFollowUps.length,
        monthlyInquiryTrend: trendFor(currentInquiries, previousInquiries),
        monthlyCompletedTrend: trendFor(currentCompleted, previousCompleted),
        monthlyRevenueTrend: trendFor(currentRevenue, previousRevenue),
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
    return <LoadingSpinner />;
  }

  const completeReminder = async (id: string) => {
    await supabase.from('reminders').update({ status: 'completed' }).eq('id', id);
    fetchDashboardData();
  };

  const markMeetingAttended = async (meeting: Meeting) => {
    await supabase.from('activity_logs').insert({
      user_id: user?.id || null,
      action: `Marked meeting #${meeting.meeting_number} attended`,
      entity_type: 'meeting',
      entity_id: meeting.id,
      details: { student_id: meeting.student_id },
    });
    fetchDashboardData();
  };

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-w-0 space-y-6">
      <section className="overflow-hidden rounded-lg border border-navy-100 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
          <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_#fdf2f8,_transparent_32%),linear-gradient(135deg,_#102a43_0%,_#1a365d_58%,_#831843_100%)] px-5 py-6 text-white sm:px-7 sm:py-8">
            <div className="absolute right-[-5rem] top-[-6rem] h-48 w-48 rounded-full border border-white/10" />
            <div className="absolute bottom-[-4rem] right-16 h-32 w-32 rounded-full border border-white/10" />
            <div className="relative max-w-3xl">
              <p className="text-sm font-medium text-pink-100">{todayLabel}</p>
              <h1 className="mt-3 text-3xl font-bold tracking-normal sm:text-4xl">
                Welcome back, {user?.name || 'there'}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-navy-100 sm:text-base">
                Your admissions workspace is ready with meetings, reminders, payments, and client movement in one view.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/inquiries"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-navy-900 shadow-sm transition hover:bg-pink-50"
                >
                  <Plus size={17} />
                  New inquiry
                </Link>
                <Link
                  to="/reminders"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <Bell size={17} />
                  Add reminder
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 bg-white lg:divide-x-0">
            <HeroMetric label="Today" value={stats.attendanceToday} icon={Calendar} tone="text-pink-700 bg-pink-50" />
            <HeroMetric label="Due Soon" value={stats.followUpsDue + stats.paymentsDue} icon={ClipboardList} tone="text-amber-700 bg-amber-50" />
            <HeroMetric label="Active" value={stats.ongoingClients} icon={UserRoundCheck} tone="text-blue-700 bg-blue-50" />
            <HeroMetric label="Revenue" value={`₹${compactNumber(stats.totalRevenue)}`} icon={IndianRupee} tone="text-emerald-700 bg-emerald-50" />
          </div>
        </div>
      </section>

      {(stats.overduePayments > 0 || stats.overdueFollowUps > 0) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-red-700 shadow-sm">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="font-semibold text-red-900">Needs attention</p>
                <p className="text-sm text-red-700">
                  {stats.overduePayments} overdue payment{stats.overduePayments === 1 ? '' : 's'} and {stats.overdueFollowUps} overdue reminder{stats.overdueFollowUps === 1 ? '' : 's'}.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/payments" className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-100">Payments</Link>
              <Link to="/reminders" className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-100">Reminders</Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Inquiries"
          value={stats.totalInquiries}
          icon={Users}
          color="navy"
          trend={stats.monthlyInquiryTrend}
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
          trend={stats.monthlyCompletedTrend}
          link="/completed"
        />
        <StatCard
          title="Upcoming Meetings"
          value={stats.upcomingMeetings}
          icon={Calendar}
          color="purple"
          link="/meetings"
        />
        <StatCard
          title="Payments Due"
          value={stats.overduePayments > 0 ? `${stats.paymentsDue} / ${stats.overduePayments}` : stats.paymentsDue}
          icon={CreditCard}
          color="orange"
          link="/payments"
        />
        <StatCard
          title="Follow Ups Due"
          value={stats.overdueFollowUps > 0 ? `${stats.followUpsDue} / ${stats.overdueFollowUps}` : stats.followUpsDue}
          icon={Bell}
          color="red"
          link="/reminders"
        />
        <StatCard
          title="Total Revenue"
          value={`₹${stats.totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          color="emerald"
          trend={stats.monthlyRevenueTrend}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <PanelHeader icon={Calendar} title="Today's Meetings" actionLabel="All meetings" to="/meetings" />
          <div className="p-4 sm:p-5">
            {todaysMeetings.length === 0 ? (
              <EmptyState icon={Calendar} message="No meetings scheduled for today" />
            ) : (
              <div className="space-y-3">
                {todaysMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 transition hover:border-pink-100 hover:bg-pink-50/40 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-navy-900">{meeting.student?.student_name}</p>
                      <p className="text-sm text-gray-600">Meeting #{meeting.meeting_number}</p>
                    </div>
                    <div className="text-right sm:min-w-[110px]">
                      <p className="text-sm font-medium text-navy-900">{meeting.meeting_time || 'Time TBD'}</p>
                      <Link
                        to={`/students/${meeting.student_id}`}
                        className="text-xs text-maroon-600 hover:text-maroon-700 font-medium"
                      >
                        Open Student
                      </Link>
                    </div>
                    <button
                      type="button"
                      onClick={() => markMeetingAttended(meeting)}
                      className="col-span-2 inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-sm font-semibold text-green-700 shadow-sm hover:bg-green-50 sm:col-span-1 sm:w-9 sm:px-0"
                      title="Mark attended"
                    >
                      <Check size={17} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <PanelHeader icon={Bell} title="Upcoming Reminders" actionLabel="Open reminders" to="/reminders" />
          <div className="p-4 sm:p-5">
            {upcomingReminders.length === 0 ? (
              <EmptyState icon={Bell} message="No upcoming reminders" />
            ) : (
              <div className="space-y-3">
                {upcomingReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className={`grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_auto] sm:items-center ${
                      getDueStatus(reminder.reminder_date) === 'overdue'
                        ? 'border-red-100 bg-red-50'
                        : getDueStatus(reminder.reminder_date) === 'today'
                          ? 'border-amber-100 bg-amber-50'
                          : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-navy-900">{reminder.title}</p>
                      <p className="text-sm text-gray-600">
                        {reminder.reminder_date} at {reminder.reminder_time}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        reminder.reminder_type === 'meeting' ? 'bg-blue-100 text-blue-700' :
                        reminder.reminder_type === 'payment' ? 'bg-orange-100 text-orange-700' :
                        reminder.reminder_type === 'follow_up' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {reminder.reminder_type.replace('_', ' ')}
                      </span>
                      <button
                        type="button"
                        onClick={() => completeReminder(reminder.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-green-700 shadow-sm hover:bg-green-100"
                        title="Complete reminder"
                      >
                        <Check size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <PanelHeader icon={Plus} title="Quick Actions" />
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
          <QuickAction to="/inquiries" icon={Users} label="New inquiry" />
          <QuickAction to="/students" icon={UserRoundCheck} label="Open students" />
          <QuickAction to="/reminders" icon={Bell} label="Add reminder" />
          <QuickAction to="/payments" icon={CreditCard} label="Record payment" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <PanelHeader icon={TrendingUp} title="Recent Activities" />
          <div className="p-4 sm:p-5">
            {recentActivities.length === 0 ? (
              <EmptyState icon={TrendingUp} message="No recent activities" />
            ) : (
              <div className="space-y-0">
                {recentActivities.map((activity, index) => (
                  <div key={activity.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {index !== recentActivities.length - 1 && (
                      <div className="absolute left-[9px] top-6 h-[calc(100%-1rem)] w-px bg-gray-200" />
                    )}
                    <div className="relative mt-1 h-5 w-5 shrink-0 rounded-full border-4 border-white bg-maroon-500 shadow-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-navy-900">{activity.action}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {activity.user?.name || 'System'} - {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <PanelHeader icon={CreditCard} title="Recent Payments" actionLabel="All payments" to="/payments" />
          <div className="p-4 sm:p-5">
            {recentPayments.length === 0 ? (
              <EmptyState icon={CreditCard} message="No recent payments" />
            ) : (
              <div className="space-y-3">
                {recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-navy-900">{payment.student?.student_name}</p>
                      <p className="text-sm text-gray-600">
                        Payment #{payment.payment_number}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        ₹{Number(payment.amount_paid).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">{payment.payment_date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function compactNumber(value: number) {
  if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return value.toLocaleString();
}

function HeroMetric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: ElementType;
  tone: string;
}) {
  return (
    <div className="flex min-h-[128px] flex-col justify-between p-4 sm:p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-navy-900">{value}</p>
        <p className="text-sm font-medium text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  actionLabel,
  to,
}: {
  icon: ElementType;
  title: string;
  actionLabel?: string;
  to?: string;
}) {
  return (
    <div className="flex min-h-[68px] items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-maroon-50 text-maroon-700">
          <Icon size={19} />
        </span>
        {title}
      </h2>
      {to && actionLabel && (
        <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-maroon-700 hover:text-maroon-800">
          {actionLabel}
          <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: ElementType; message: string }) {
  return (
    <div className="flex min-h-[154px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-white text-gray-400 shadow-sm">
        <Icon size={22} />
      </div>
      <p className="text-sm font-medium text-gray-500">{message}</p>
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: ElementType;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="group flex min-h-[76px] items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-navy-900 transition hover:border-maroon-200 hover:bg-maroon-50"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-maroon-700 shadow-sm">
          <Icon size={19} />
        </span>
        <span className="truncate">{label}</span>
      </span>
      <ArrowRight size={16} className="shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-maroon-700" />
    </Link>
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
  icon: ElementType;
  color: string;
  trend?: number | null;
  link?: string;
}) {
  const colorClasses: Record<string, string> = {
    navy: 'bg-navy-50 text-navy-700 ring-navy-100',
    maroon: 'bg-maroon-50 text-maroon-700 ring-maroon-100',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    green: 'bg-green-50 text-green-700 ring-green-100',
    purple: 'bg-violet-50 text-violet-700 ring-violet-100',
    orange: 'bg-amber-50 text-amber-700 ring-amber-100',
    red: 'bg-red-50 text-red-700 ring-red-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  };

  const content = (
    <div className="group min-h-[164px] rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-maroon-100 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ring-1 ${colorClasses[color] || colorClasses.navy}`}>
          <Icon size={22} />
        </div>
        {trend !== undefined && trend !== null && (
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            trend >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUp size={14} />
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="break-words text-2xl font-bold text-navy-900">{value}</p>
        <p className="mt-1 text-sm font-medium text-gray-500">{title}</p>
      </div>
      {link && (
        <div className="mt-4 flex items-center text-sm font-semibold text-maroon-700">
          <span>View all</span>
          <ArrowRight size={14} className="ml-1 transition group-hover:translate-x-0.5" />
        </div>
      )}
    </div>
  );

  if (link) {
    return <Link to={link}>{content}</Link>;
  }
  return content;
}
