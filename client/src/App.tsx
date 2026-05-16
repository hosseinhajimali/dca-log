import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/queryClient';
import { useStore } from '@/store/useStore';
import { AppLayout } from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import DcaPlans from '@/pages/DcaPlans';
import PlanDetail from '@/pages/PlanDetail';
import Transactions from '@/pages/Transactions';
import Simulator from '@/pages/Simulator';
import SettingsLayout from '@/pages/settings/SettingsLayout';
import General from '@/pages/settings/General';
import ProfilePage from '@/pages/settings/Profile';
import Login from '@/pages/Login';
import AuthCallback from '@/pages/AuthCallback';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useStore();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="plans" element={<DcaPlans />} />
            <Route path="plans/:id" element={<PlanDetail />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="simulator" element={<Simulator />} />
            <Route path="settings" element={<SettingsLayout />}>
              <Route index element={<General />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
