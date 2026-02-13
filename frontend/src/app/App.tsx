import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { initializeMockData } from '../lib/mockData';
import { Toaster } from './components/ui/sonner';

// Pages
import SplashScreen from './pages/SplashScreen';
import LandingPage from './pages/LandingPage';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import BudgetPage from './pages/BudgetPage';
import ExpensesPage from './pages/ExpensesPage';
import PayrollPage from './pages/PayrollPage';
import EmployeesPage from './pages/EmployeesPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isOnboarded } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

// Auth route wrapper (redirects if already logged in)
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isOnboarded } = useAuth();

  if (isAuthenticated && isOnboarded) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isAuthenticated && !isOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

// Onboarding route (only accessible when authenticated but not onboarded)
function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isOnboarded } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isOnboarded) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  useEffect(() => {
    // Initialize mock data on app load
    initializeMockData();
  }, []);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<SplashScreen />} />
      <Route path="/landing" element={<LandingPage />} />

      {/* Auth Routes */}
      <Route path="/signup" element={<AuthRoute><SignupPage /></AuthRoute>} />
      <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />

      {/* Onboarding Route */}
      <Route path="/onboarding" element={<OnboardingRoute><OnboardingPage /></OnboardingRoute>} />

      {/* Protected Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/budget" element={<ProtectedRoute><BudgetPage /></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
      <Route path="/payroll" element={<ProtectedRoute><PayrollPage /></ProtectedRoute>} />
      <Route path="/employees" element={<ProtectedRoute><EmployeesPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}