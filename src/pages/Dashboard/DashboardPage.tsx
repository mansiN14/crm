import { useEffect, useState, type ElementType } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';
import type { Meeting, Reminder, Payment, ActivityLog, Inquiry } from '../../lib/supabase';
import { formatDateLabel, getDueStatus, toDateKey } from '../../lib/dateUtils';
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
  WalletCards,
  Target,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalInquiries: number;
  newLeads: number;
  uncontactedLeads: number;
  activeLeads: number;
  attendanceToday: number;
  ongoingClients: number;
  completedClients: number;
  upcomingMeetings: number;
  paymentsDue: number;
  followUpsDue: number;
  totalRevenue: number;
  overduePayments: number;
  overdueFollowUps: number;
  leadFollowUpsToday: number;
  overdueLeadFollowUps: number;
  applicationsInProgress: number;
  offersReceived: number;
  monthlyInquiryTrend: number | null;
  monthlyCompletedTrend: number | null;
  monthlyRevenueTrend: number | null;
  revenueThisMonth: number;
  overduePaymentAmount: number;
  dueSoonPaymentAmount: number;
  collectionRate: number;
}

interface PriorityItem {
  id: string;
  title: string;
  meta: string;
  label: string;
  to: string;
  icon: ElementType;
  tone: string;
  rank: number;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalInquiries: 0,
    newLeads: 0,
    uncontactedLeads: 0,
    activeLeads: 0,
    attendanceToday: 0,
    ongoingClients: 0,
    completedClients: 0,
    upcomingMeetings: 0,
    paymentsDue: 0,
    followUpsDue: 0,
    totalRevenue: 0,
    overduePayments: 0,
    overdueFollowUps: 0,
    leadFollowUpsToday: 0,
    overdueLeadFollowUps: 0,
    applicationsInProgress: 0,
    offersReceived: 0,
    monthlyInquiryTrend: null,
    monthlyCompletedTrend: null,
    monthlyRevenueTrend: null,
    revenueThisMonth: 0,
    overduePaymentAmount: 0,
    dueSoonPaymentAmount: 0,
    collectionRate: 0,
  });
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>([]);
  const [todaysMeetings, setTodaysMeetings] = useState<Meeting[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [priorityItems, setPriorityItems] = useState<PriorityItem[]>([]);

  useEffect(() => {
    fetchDashboardData();

    const refreshInterval = window.setInterval(fetchDashboardData, 60_000);
    const refreshOnFocus = () => fetchDashboardData();
    window.addEventListener('focus', refreshOnFocus);

    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', refreshOnFocus);
    };
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

      const students = (studentsRes.data || []) as Array<{ id: string; status: string; updated_at?: string }>;
      const meetings = (meetingsRes.data || []) as Meeting[];
      const reminders = (remindersRes.data || []) as Reminder[];
      const payments = (paymentsRes.data || []) as Payment[];
      const inquiries = (inquiriesRes.data || []) as Inquiry[];
      const activities = (activitiesRes.data || []) as ActivityLog[];
      const studentProducts =
        ((await supabase.from('student_products').select('*')).data || []) as Array<{ application_status?: string }>;
      const existingEntityIds: Record<string, Set<string>> = {
        inquiry: new Set(inquiries.map((inquiry) => inquiry.id)),
        student: new Set(students.map((student) => student.id).filter(Boolean) as string[]),
        meeting: new Set(meetings.map((meeting) => meeting.id)),
        reminder: new Set(reminders.map((reminder) => reminder.id)),
        payment: new Set(payments.map((payment) => payment.id)),
      };
      const visibleActivities = activities.filter((activity) => {
        if (!activity.entity_id) return true;
        return existingEntityIds[activity.entity_type]?.has(activity.entity_id) ?? true;
      });

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
      const activeLeadStatuses = [
        'new',
        'contacted',
        'follow_up_required',
        'counselling_scheduled',
        'counselling_completed',
        'assessment_pending',
        'program_selected',
        'application_started',
        'attended',
        'ongoing',
      ];
      const leadFollowUpsToday = inquiries.filter((inquiry) =>
        inquiry.next_follow_up_date && getDueStatus(inquiry.next_follow_up_date) === 'today'
      );
      const overdueLeadFollowUps = inquiries.filter((inquiry) =>
        inquiry.next_follow_up_date && getDueStatus(inquiry.next_follow_up_date) === 'overdue'
      );

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
      const overduePaymentAmount = overduePayments.reduce(
        (sum, payment) => sum + Math.max(Number(payment.total_amount || 0) - Number(payment.amount_paid || 0), 0),
        0
      );
      const dueSoonPaymentAmount = pendingPayments.reduce(
        (sum, payment) => sum + Math.max(Number(payment.total_amount || 0) - Number(payment.amount_paid || 0), 0),
        0
      );
      const expectedPaymentAmount = payments.reduce((sum, payment) => sum + Number(payment.total_amount || 0), 0);
      const collectedPaymentAmount = payments.reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0);
      const collectionRate = expectedPaymentAmount > 0
        ? Math.round((collectedPaymentAmount / expectedPaymentAmount) * 100)
        : 0;

      const paymentPriorityItems: PriorityItem[] = overduePayments
        .map((payment) => ({
          id: `payment-${payment.id}`,
          title: payment.student?.student_name || `Payment #${payment.payment_number}`,
          meta: `₹${Math.max(Number(payment.total_amount || 0) - Number(payment.amount_paid || 0), 0).toLocaleString()} overdue`,
          label: formatDateLabel(payment.due_date),
          to: '/payments',
          icon: CreditCard,
          tone: 'border-red-100 bg-red-50 text-red-700',
          rank: 1,
        }));
      const reminderPriorityItems: PriorityItem[] = reminders
        .filter((reminder) => ['overdue', 'today'].includes(getDueStatus(reminder.reminder_date)))
        .map((reminder) => {
          const status = getDueStatus(reminder.reminder_date);
          return {
            id: `reminder-${reminder.id}`,
            title: reminder.title,
            meta: reminder.student?.student_name || reminder.reminder_type.replace('_', ' '),
            label: status === 'overdue' ? 'Overdue' : 'Today',
            to: '/reminders',
            icon: Bell,
            tone: status === 'overdue'
              ? 'border-red-100 bg-red-50 text-red-700'
              : 'border-amber-100 bg-amber-50 text-amber-700',
            rank: status === 'overdue' ? 2 : 4,
          };
        });
      const inquiryPriorityItems: PriorityItem[] = inquiries
        .filter((inquiry) =>
          inquiry.next_follow_up_date && ['overdue', 'today'].includes(getDueStatus(inquiry.next_follow_up_date))
        )
        .map((inquiry) => {
          const status = getDueStatus(inquiry.next_follow_up_date);
          return {
            id: `inquiry-${inquiry.id}`,
            title: inquiry.student_name,
            meta: inquiry.interested_service || inquiry.preferred_course || 'Lead follow-up',
            label: status === 'overdue' ? 'Overdue' : 'Today',
            to: `/inquiries/${inquiry.id}`,
            icon: Users,
            tone: status === 'overdue'
              ? 'border-red-100 bg-red-50 text-red-700'
              : 'border-blue-100 bg-blue-50 text-blue-700',
            rank: status === 'overdue' ? 3 : 5,
          };
        });
      const meetingPriorityItems: PriorityItem[] = todaysMeetingsFiltered.map((meeting) => ({
        id: `meeting-${meeting.id}`,
        title: meeting.student?.student_name || 'Student meeting',
        meta: `Meeting #${meeting.meeting_number}`,
        label: meeting.meeting_time || 'Today',
        to: meeting.student_id ? `/students/${meeting.student_id}` : '/meetings',
        icon: Calendar,
        tone: 'border-emerald-100 bg-emerald-50 text-emerald-700',
        rank: 6,
      }));

      setStats({
        totalInquiries: inquiries.length,
        newLeads: inquiries.filter((inquiry) => inquiry.status === 'new').length,
        uncontactedLeads: inquiries.filter((inquiry) => inquiry.status === 'new' && !inquiry.last_contacted).length,
        activeLeads: inquiries.filter((inquiry) => activeLeadStatuses.includes(inquiry.status)).length,
        attendanceToday: todaysMeetingsFiltered.length,
        ongoingClients: students.filter((s) => s.status === 'ongoing').length,
        completedClients: students.filter((s) => s.status === 'completed').length,
        upcomingMeetings,
        paymentsDue: pendingPayments.length,
        followUpsDue: dueReminders.length + leadFollowUpsToday.length,
        totalRevenue,
        overduePayments: overduePayments.length,
        overdueFollowUps: overdueFollowUps.length + overdueLeadFollowUps.length,
        leadFollowUpsToday: leadFollowUpsToday.length,
        overdueLeadFollowUps: overdueLeadFollowUps.length,
        applicationsInProgress: studentProducts.filter((product) =>
          String(product.application_status || '').toLowerCase().includes('preparation') ||
          String(product.application_status || '').toLowerCase().includes('started') ||
          String(product.application_status || '').toLowerCase().includes('review')
        ).length,
        offersReceived: studentProducts.filter((product) =>
          String(product.application_status || '').toLowerCase().includes('offer')
        ).length,
        monthlyInquiryTrend: trendFor(currentInquiries, previousInquiries),
        monthlyCompletedTrend: trendFor(currentCompleted, previousCompleted),
        monthlyRevenueTrend: trendFor(currentRevenue, previousRevenue),
        revenueThisMonth: currentRevenue,
        overduePaymentAmount,
        dueSoonPaymentAmount,
        collectionRate,
      });

      setRecentActivities(visibleActivities.slice(0, 10));
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
      setRecentPayments(
        payments
          .filter(p => p.status === 'paid')
          .sort((first, second) => (second.payment_date || '').localeCompare(first.payment_date || ''))
          .slice(0, 5)
      );
      setPriorityItems(
        [
          ...paymentPriorityItems,
          ...reminderPriorityItems,
          ...inquiryPriorityItems,
          ...meetingPriorityItems,
        ]
          .sort((first, second) => first.rank - second.rank)
          .slice(0, 7)
      );
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
          title="New Leads"
          value={stats.newLeads}
          icon={Users}
          color="blue"
          link="/inquiries"
        />
        <StatCard
          title="Uncontacted Leads"
          value={stats.uncontactedLeads}
          icon={AlertTriangle}
          color="orange"
          link="/inquiries"
        />
        <StatCard
          title="Active Leads"
          value={stats.activeLeads}
          icon={UserRoundCheck}
          color="navy"
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
          title="Applications In Progress"
          value={stats.applicationsInProgress}
          icon={ClipboardList}
          color="purple"
          link="/students"
        />
        <StatCard
          title="Payments Due"
          value={stats.overduePayments > 0 ? `${stats.paymentsDue} / ${stats.overduePayments}` : stats.paymentsDue}
          icon={CreditCard}
          color="orange"
          link="/payments"
        />
        <StatCard
          title="Offers Received"
          value={stats.offersReceived}
          icon={CheckCircle2}
          color="green"
          link="/students"
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <PanelHeader icon={Target} title="Today's Priority Queue" actionLabel="Open reports" to="/reports" />
          <div className="p-4 sm:p-5">
            {priorityItems.length === 0 ? (
              <EmptyState
                icon={Target}
                message="Nothing urgent in the queue"
                actionLabel="Review leads"
                to="/inquiries"
              />
            ) : (
              <div className="divide-y divide-gray-100">
                {priorityItems.map((item) => (
                  <Link
                    key={item.id}
                    to={item.to}
                    className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${item.tone}`}>
                      <item.icon size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-navy-900">{item.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-gray-500">{item.meta}</span>
                    </span>
                    <span className="flex items-center gap-2 text-right">
                      <span className="max-w-[86px] truncate rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                        {item.label}
                      </span>
                      <ArrowRight size={15} className="shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-maroon-700" />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <PanelHeader icon={WalletCards} title="Payment Health" actionLabel="All payments" to="/payments" />
          <div className="grid grid-cols-2 divide-x divide-y divide-gray-100">
            <FinanceMetric label="Collected this month" value={`₹${compactNumber(stats.revenueThisMonth)}`} tone="text-emerald-700" />
            <FinanceMetric label="Collection rate" value={`${stats.collectionRate}%`} tone="text-blue-700" />
            <FinanceMetric label="Overdue amount" value={`₹${compactNumber(stats.overduePaymentAmount)}`} tone="text-red-700" />
            <FinanceMetric label="Due in 7 days" value={`₹${compactNumber(stats.dueSoonPaymentAmount)}`} tone="text-amber-700" />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <PanelHeader icon={Calendar} title="Today's Meetings" actionLabel="All meetings" to="/meetings" />
          <div className="p-4 sm:p-5">
            {todaysMeetings.length === 0 ? (
              <EmptyState
                icon={Calendar}
                message="No meetings scheduled for today"
                actionLabel="Schedule meeting"
                to="/meetings"
              />
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
              <EmptyState
                icon={Bell}
                message="No upcoming reminders"
                actionLabel="Create reminder"
                to="/reminders"
              />
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
              <EmptyState
                icon={TrendingUp}
                message="No recent activities"
                actionLabel="Open dashboard"
                to="/"
              />
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
              <EmptyState
                icon={CreditCard}
                message="No recent payments"
                actionLabel="Record payment"
                to="/payments"
              />
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

function FinanceMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <div className="flex min-h-[118px] flex-col justify-between p-4 sm:p-5">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`break-words text-2xl font-bold ${tone}`}>{value}</p>
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

function EmptyState({
  icon: Icon,
  message,
  actionLabel,
  to,
}: {
  icon: ElementType;
  message: string;
  actionLabel?: string;
  to?: string;
}) {
  return (
    <div className="flex min-h-[154px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-white text-gray-400 shadow-sm">
        <Icon size={22} />
      </div>
      <p className="text-sm font-medium text-gray-500">{message}</p>
      {to && actionLabel && (
        <Link
          to={to}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-maroon-700 shadow-sm transition hover:bg-maroon-50"
        >
          {actionLabel}
          <ArrowRight size={14} />
        </Link>
      )}
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
