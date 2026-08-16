import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';
import { Layout } from './components/Layout/Layout';

const LoginPage = lazy(() => import('./pages/Auth/LoginPage').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./pages/Auth/RegisterPage').then((module) => ({ default: module.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/Auth/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })));
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const InquiriesPage = lazy(() => import('./pages/Inquiries/InquiriesPage').then((module) => ({ default: module.InquiriesPage })));
const InquiryDetailPage = lazy(() => import('./pages/Inquiries/InquiryDetailPage').then((module) => ({ default: module.InquiryDetailPage })));
const StudentsPage = lazy(() => import('./pages/Students/StudentsPage').then((module) => ({ default: module.StudentsPage })));
const StudentDetailPage = lazy(() => import('./pages/Students/StudentDetailPage').then((module) => ({ default: module.StudentDetailPage })));
const MeetingsPage = lazy(() => import('./pages/Meetings/MeetingsPage').then((module) => ({ default: module.MeetingsPage })));
const RemindersPage = lazy(() => import('./pages/Reminders/RemindersPage').then((module) => ({ default: module.RemindersPage })));
const QuotationsPage = lazy(() => import('./pages/Quotations/QuotationsPage').then((module) => ({ default: module.QuotationsPage })));
const PaymentsPage = lazy(() => import('./pages/Payments/PaymentsPage').then((module) => ({ default: module.PaymentsPage })));
const OngoingClientsPage = lazy(() => import('./pages/Pipeline/PipelinePages').then((module) => ({ default: module.OngoingClientsPage })));
const CompletedClientsPage = lazy(() => import('./pages/Pipeline/PipelinePages').then((module) => ({ default: module.CompletedClientsPage })));
const ProductsPage = lazy(() => import('./pages/Products/ProductsPage').then((module) => ({ default: module.ProductsPage })));
const ContactsPage = lazy(() => import('./pages/Contacts/ContactsPage').then((module) => ({ default: module.ContactsPage })));
const ReportsPage = lazy(() => import('./pages/Reports/ReportsPage').then((module) => ({ default: module.ReportsPage })));
const UsersPage = lazy(() => import('./pages/Users/UsersPage').then((module) => ({ default: module.UsersPage })));
const SettingsPage = lazy(() => import('./pages/Settings/SettingsPage').then((module) => ({ default: module.SettingsPage })));

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-12 h-12 border-4 border-navy-200 border-t-maroon-600 rounded-full animate-spin" />
    </div>
  );
}

function PrivateRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-navy-200 border-t-maroon-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-navy-200 border-t-maroon-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/inquiries" element={<InquiriesPage />} />
          <Route path="/inquiries/:id" element={<InquiryDetailPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/students/:id" element={<StudentDetailPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/meetings" element={<MeetingsPage />} />
          <Route path="/reminders" element={<RemindersPage />} />
          <Route path="/quotations" element={<QuotationsPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/ongoing" element={<OngoingClientsPage />} />
          <Route path="/completed" element={<CompletedClientsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/users" element={<PrivateRoute adminOnly><UsersPage /></PrivateRoute>} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
