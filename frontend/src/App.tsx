import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavModule } from './components/layout/Sidebar';
import { LoginView } from './components/auth/LoginView';
import { ResetPasswordView } from './components/auth/ResetPasswordView';
import { DashboardView } from './components/dashboard/DashboardView';
import { ReceptionView } from './components/reception/ReceptionView';
import { InventoryView } from './components/inventory/InventoryView';
import { TransfersView } from './components/transfers/TransfersView';
import { TraceabilityView } from './components/traceability/TraceabilityView';
import { ConsumablesView } from './components/consumables/ConsumablesView';
import { AssignmentsView } from './components/assignments/AssignmentsView';
import { ReturnsView } from './components/returns/ReturnsView';
import { DirectoryView } from './components/directory/DirectoryView';
import { UsersManagementView } from './components/users/UsersManagementView';
import { SettingsView } from './components/settings/SettingsView';
import { ApiClient } from './api/client';
import { storage } from './db/storage';
import { PlatformUser } from './types/user';
import { getDaysUntil } from './utils/formatters';
import { useTheme } from './context/ThemeContext';

export const App: React.FC = () => {
  const { isDark } = useTheme();

  // Detección de token de recuperación de contraseña en URL (?token=... o #token=...)
  const [resetToken, setResetToken] = useState<string | null>(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const queryToken = searchParams.get('token') || searchParams.get('resetToken');
      if (queryToken) return queryToken;

      const hash = window.location.hash;
      if (hash && hash.includes('token=')) {
        const hashParams = new URLSearchParams(hash.replace(/^#\/?/, ''));
        return hashParams.get('token') || hashParams.get('resetToken');
      }
    } catch {
      // Ignorar errores de parsing
    }
    return null;
  });

  const [openForgotModalOnLogin, setOpenForgotModalOnLogin] = useState<boolean>(false);

  const clearTokenFromUrl = () => {
    setResetToken(null);
    try {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } catch {
      // Ignorar
    }
  };

  // Estado de Autenticación
  const [currentUser, setCurrentUser] = useState<PlatformUser | null>(() => {
    return storage.getCurrentUser();
  });

  const [activeModule, setActiveModule] = useState<NavModule>('dashboard');
  const [currentBranchId, setCurrentBranchId] = useState<string>('ALL');
  const [globalSearchTerm, setGlobalSearchTerm] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Indicadores en tiempo real para el Sidebar (Alertas de vencimiento y stock crítico)
  const [pendingExpirationsCount, setPendingExpirationsCount] = useState<number>(0);
  const [criticalStockCount, setCriticalStockCount] = useState<number>(0);

  const updateAlerts = async (branchId?: string) => {
    try {
      const activeBranch = branchId !== undefined ? branchId : currentBranchId;
      const metrics = await ApiClient.getDashboardMetrics(activeBranch);
      setPendingExpirationsCount(Array.isArray(metrics?.expiringContracts) ? metrics.expiringContracts.length : 0);
      setCriticalStockCount(Array.isArray(metrics?.criticalStocks) ? metrics.criticalStocks.length : 0);
    } catch {
      setPendingExpirationsCount(0);
      setCriticalStockCount(0);
    }
  };

  // Sincronizar datos frescos del usuario autenticado (Nombre, Cargo, Rol) solo si hay sesión activa
  const syncCurrentUser = async () => {
    const localUser = storage.getCurrentUser();
    if (!localUser) {
      setCurrentUser(null);
      return;
    }
    try {
      const pUsers = await ApiClient.getPlatformUsers();
      const freshUser = pUsers.find(u => u.id === localUser.id || u.username.toLowerCase() === localUser.username.toLowerCase());
      if (freshUser) {
        storage.setCurrentUser(freshUser);
        setCurrentUser(freshUser);
      } else {
        setCurrentUser(localUser);
      }
    } catch {
      setCurrentUser(localUser);
    }
  };

  useEffect(() => {
    updateAlerts(currentBranchId);
    syncCurrentUser();
    const handleStorageUpdate = () => {
      updateAlerts(currentBranchId);
      const u = storage.getCurrentUser();
      setCurrentUser(u);
    };
    window.addEventListener('itam_storage_updated', handleStorageUpdate);
    return () => window.removeEventListener('itam_storage_updated', handleStorageUpdate);
  }, [currentBranchId]);

  const handleGlobalSearch = (term: string) => {
    setGlobalSearchTerm(term);
    setActiveModule('inventory');
    setIsMobileMenuOpen(false);
  };

  const handleNavigate = (mod: NavModule) => {
    setActiveModule(mod);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    if (confirm('¿Confirma que desea cerrar su sesión en la plataforma?')) {
      await ApiClient.logout();
      storage.logout();
      setCurrentUser(null);
    }
  };

  // 1. Si hay un token de recuperación en la URL, mostrar el portal de cambio de clave
  if (resetToken) {
    return (
      <ResetPasswordView
        token={resetToken}
        onSuccess={() => {
          clearTokenFromUrl();
          setOpenForgotModalOnLogin(false);
        }}
        onGoToLogin={(openForgotModal) => {
          clearTokenFromUrl();
          setOpenForgotModalOnLogin(!!openForgotModal);
        }}
      />
    );
  }

  // 2. Si no hay sesión iniciada, mostrar Login
  if (!currentUser) {
    return (
      <LoginView
        initialOpenForgotModal={openForgotModalOnLogin}
        onLoginSuccess={(user) => {
          storage.setCurrentUser(user);
          setCurrentUser(user);
          setActiveModule('dashboard');
          setIsMobileMenuOpen(false);
          setOpenForgotModalOnLogin(false);
        }}
      />
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'dark bg-[#0A111E] text-slate-100' : 'light bg-[#F4F6F8] text-slate-800'} transition-colors duration-200 antialiased font-sans text-base`}>
      {/* Barra de Navegación Superior */}
      <Navbar
        currentUser={currentUser}
        currentBranchId={currentBranchId}
        onBranchChange={setCurrentBranchId}
        onGlobalSearch={handleGlobalSearch}
        onNavigate={(mod) => handleNavigate(mod as NavModule)}
        onLogout={handleLogout}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Contenedor Principal: Sidebar + Contenido */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeModule={activeModule}
          onNavigate={handleNavigate}
          userRole={currentUser.role}
          pendingExpirationsCount={pendingExpirationsCount}
          criticalStockCount={criticalStockCount}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {activeModule === 'dashboard' && (
            <DashboardView
              currentBranchId={currentBranchId}
              onNavigate={handleNavigate}
            />
          )}

          {activeModule === 'reception' && <ReceptionView />}

          {activeModule === 'inventory' && (
            <InventoryView
              currentBranchId={currentBranchId}
              initialSearchQuery={globalSearchTerm}
              onNavigateToAssign={() => handleNavigate('assignments')}
            />
          )}

          {activeModule === 'transfers' && <TransfersView />}

          {activeModule === 'traceability' && (
            <TraceabilityView currentBranchId={currentBranchId} />
          )}

          {activeModule === 'consumables' && (
            <ConsumablesView currentBranchId={currentBranchId} />
          )}

          {activeModule === 'assignments' && (
            <AssignmentsView currentBranchId={currentBranchId} />
          )}

          {activeModule === 'returns' && <ReturnsView />}

          {activeModule === 'directory' && <DirectoryView />}

          {activeModule === 'users' && <UsersManagementView />}

          {activeModule === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
};
