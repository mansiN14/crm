import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout/Layout';
import { LoginPage } from './pages/Auth/LoginPage';
import { RegisterPage } from './pages/Auth/RegisterPage';
import { ForgotPasswordPage } from './pages/Auth/ForgotPasswordPage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { InquiriesPage } from './pages/Inquiries/InquiriesPage';
import { StudentsPage } from './pages/Students/StudentsPage';
import { StudentDetailPage } from './pages/Students/StudentDetailPage';
import { MeetingsPage } from './pages/Meetings/MeetingsPage';
import { RemindersPage } from './pages/Reminders/RemindersPage';
import { QuotationsPage } from './pages/Quotations/QuotationsPage';
import { PaymentsPage } from './pages/Payments/PaymentsPage';
import { OngoingClientsPage, CompletedClientsPage } from './pages/Pipeline/PipelinePages';
import { ProductsPage } from './pages/Products/ProductsPage';
import { ReportsPage } from './pages/Reports/ReportsPage';
import { UsersPage } from './pages/Users/UsersPage';
import { SettingsPage } from './pages/Settings/SettingsPage';

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
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/inquiries" element={<InquiriesPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/students/:id" element={<StudentDetailPage />} />
        <Route path="/products" element={<ProductsPage />} />
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
