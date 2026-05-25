import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Toaster } from 'sonner';

import LandingPage            from '@/pages/LandingPage';
import LoginPage              from '@/pages/LoginPage';
import RegisterPage           from '@/pages/RegisterPage';
import VerifyEmailPage        from '@/pages/VerifyEmailPage';
import ForgotPasswordPage     from '@/pages/ForgotPasswordPage';
import ResetPasswordPage      from '@/pages/ResetPasswordPage';
import TermsPage              from '@/pages/TermsPage';
import PrivacyPage            from '@/pages/PrivacyPage';
import OnboardingPage         from '@/pages/OnboardingPage';
import EmployeePayslipsPage      from '@/pages/EmployeePayslipsPage';
import EmployeeSetPasswordPage   from '@/pages/EmployeeSetPasswordPage';
import EmployeeResetPasswordPage from '@/pages/EmployeeResetPasswordPage';
import PayrollConfigPage         from '@/pages/PayrollConfigPage';
import SettingsPage           from '@/pages/SettingsPage';
import MainLayout             from '@/components/layout/MainLayout';
import DashboardPage          from '@/components/admin/DashboardPage';
import EmployeesPage          from '@/components/admin/EmployeesPage';
import PayslipsPage           from '@/components/admin/PayslipsPage';
import UploadPage             from '@/components/admin/UploadPage';
import SendPage               from '@/components/admin/SendPage';
import ReportsPage            from '@/components/admin/ReportsPage';
import AnalyticsPage          from '@/components/admin/AnalyticsPage';
import AttendancePage         from '@/pages/AttendancePage';
import BillingPage            from '@/pages/BillingPage';
import LeavePolicyPage        from '@/pages/LeavePolicyPage';
import LocationsPage          from '@/pages/LocationsPage';
import UsersPage              from '@/pages/UsersPage';
import Form16Page             from '@/pages/Form16Page';

// Super Admin
import SuperAdminLoginPage    from '@/pages/super-admin/SuperAdminLoginPage';
import SuperAdminLayout       from '@/pages/super-admin/SuperAdminLayout';
import SuperDashboardPage     from '@/pages/super-admin/SuperDashboardPage';
import SuperClientsPage       from '@/pages/super-admin/SuperClientsPage';
import SuperPaymentsPage      from '@/pages/super-admin/SuperPaymentsPage';
import ErrorMonitorPage       from '@/pages/super-admin/ErrorMonitorPage';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" richColors />
      <BrowserRouter>
        <Routes>
          {/* ── Landing page ─────────────────────────────────────── */}
          <Route path="/" element={<LandingPage />} />

          {/* ── Auth ─────────────────────────────────────────────── */}
          <Route path="/login"            element={<LoginPage />} />
          <Route path="/register"         element={<RegisterPage />} />
          <Route path="/verify-email"     element={<VerifyEmailPage />} />
          <Route path="/forgot-password"  element={<ForgotPasswordPage />} />
          <Route path="/reset-password"   element={<ResetPasswordPage />} />
          <Route path="/terms"            element={<TermsPage />} />
          <Route path="/privacy"          element={<PrivacyPage />} />

          {/* ── Onboarding (shown after first login) ─────────────── */}
          <Route path="/onboarding" element={<OnboardingPage />} />

          {/* ── Employee portal ───────────────────────────────────── */}
          <Route path="/employee/payslips"      element={<EmployeePayslipsPage />} />
          <Route path="/employee/set-password"  element={<EmployeeSetPasswordPage />} />
          <Route path="/employee/reset-password" element={<EmployeeResetPasswordPage />} />

          {/* ── Admin panel (protected via MainLayout) ────────────── */}
          <Route path="/admin" element={<MainLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"      element={<DashboardPage />} />
            <Route path="employees"      element={<EmployeesPage />} />
            <Route path="payslips"       element={<PayslipsPage />} />
            <Route path="upload"         element={<UploadPage />} />
            <Route path="send"           element={<SendPage />} />
            <Route path="reports"        element={<ReportsPage />} />
            <Route path="analytics"      element={<AnalyticsPage />} />
            <Route path="attendance"     element={<AttendancePage />} />
            <Route path="billing"        element={<BillingPage />} />
            <Route path="payroll-config" element={<PayrollConfigPage />} />
            <Route path="leave-policy"   element={<LeavePolicyPage />} />
            <Route path="locations"      element={<LocationsPage />} />
            <Route path="users"          element={<UsersPage />} />
            <Route path="settings"       element={<SettingsPage />} />
            <Route path="form16"         element={<Form16Page />} />
          </Route>

          {/* ── Super Admin panel ─────────────────────────────────── */}
          <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />
          <Route path="/super-admin" element={<SuperAdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<SuperDashboardPage />} />
            <Route path="clients"   element={<SuperClientsPage />} />
            <Route path="payments"  element={<SuperPaymentsPage />} />
            <Route path="analytics" element={<SuperDashboardPage />} />
            <Route path="errors"    element={<ErrorMonitorPage />} />
          </Route>

          {/* ── Legacy redirects ──────────────────────────────────── */}
          <Route path="/admin-login"       element={<Navigate to="/login" replace />} />
          <Route path="/employee-login"    element={<Navigate to="/login" replace />} />
          <Route path="/admin-dashboard"   element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/upload-salaries"   element={<Navigate to="/admin/upload" replace />} />
          <Route path="/generate-payslips" element={<Navigate to="/admin/send" replace />} />
          <Route path="/send-email"        element={<Navigate to="/admin/send" replace />} />
          <Route path="/reports"           element={<Navigate to="/admin/reports" replace />} />
          <Route path="/analytics"         element={<Navigate to="/admin/analytics" replace />} />
          <Route path="/employee-payslips" element={<Navigate to="/employee/payslips" replace />} />

          {/* ── Fallback ──────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
