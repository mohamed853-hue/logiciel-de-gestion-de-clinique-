import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Login } from './pages/Login';
import { MainLayout } from './layouts/MainLayout';
import { ReceptionistDashboard } from './pages/ReceptionistDashboard';
import { PharmacyDashboard } from './pages/PharmacyDashboard';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { GynecologistDashboard } from './pages/GynecologistDashboard';
import { LaboratoryDashboard } from './pages/LaboratoryDashboard';
import { NurseDashboard } from './pages/NurseDashboard';
import { RadiologyDashboard } from './pages/RadiologyDashboard';
import { SecretaryDashboard } from './pages/SecretaryDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { CashierDashboard } from './pages/CashierDashboard';
import type { UserRole } from './types';

function DashboardRouter() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const getDashboardComponent = (role: UserRole) => {
    switch (role) {
      case 'receptionniste':
        return <ReceptionistDashboard />;
      case 'pharmacien':
      case 'pharmacien_chef':
        return <PharmacyDashboard />;
      case 'medecin':
        return <DoctorDashboard />;
      case 'gynecologue':
        return <GynecologistDashboard />;
      case 'laborantin':
        return <LaboratoryDashboard />;
      case 'infirmier':
        return <NurseDashboard />;
      case 'radiologue':
        return <RadiologyDashboard />;
      case 'secretary':
        return <SecretaryDashboard />;
      case 'caissier':
        return <CashierDashboard />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <ReceptionistDashboard />;
    }
  };

  return (
    <MainLayout>
      <ErrorBoundary>
        {user && getDashboardComponent(user.role)}
      </ErrorBoundary>
    </MainLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<DashboardRouter />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            {/* Fallback pour les sous-routes éventuelles */}
            <Route path="/dashboard/*" element={<DashboardRouter />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
