import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavModule } from './components/layout/Sidebar';
import { LoginView } from './components/auth/LoginView';
import { DashboardView } from './components/dashboard/DashboardView';
import { ReceptionView } from './components/reception/ReceptionView';
import { InventoryView } from './components/inventory/InventoryView';
import { ConsumablesView } from './components/consumables/ConsumablesView';
import { AssignmentsView } from './components/assignments/AssignmentsView';
import { ReturnsView } from './components/returns/ReturnsView';
import { DirectoryView } from './components/directory/DirectoryView';
import { UsersManagementView } from './components/users/UsersManagementView';
import { SettingsView } from './components/settings/SettingsView';
import { storage } from './db/storage';
import { PlatformUser } from './types/user';
import { getDaysUntil } from './utils/formatters';

export const App: React.FC = () => {
  // Estado de Autenticación
  const [currentUser, setCurrentUser] = useState<PlatformUser | null>(() => {
    return storage.getCurrentUser();
  });

  const [activeModule, setActiveModule] = useState<NavModule>('dashboard');
  const [currentBranchId, setCurrentBranchId] = useState<string>('ALL');
  const [globalSearchTerm, setGlobalSearchTerm] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Indicadores para el Sidebar
  const [pendingExpirationsCount, setPendingExpirationsCount] = useState<number>(0);
  const [criticalStockCount, setCriticalStockCount] = useState<number>(0);

  const updateAlerts = () => {
    // 1. Contratos por vencer (< 60 días)
    const contracts = storage.getLeasingContracts();
    const expCount = contracts.filter(c => {
      const days = getDaysUntil(c.endDate);
      return days !== null && days <= 60;
    }).length;
    setPendingExpirationsCount(expCount);

    // 2. Insumos bajo stock
    const stocks = storage.getConsumableStocks();
    const consumables = storage.getConsumables();
    const critCount = stocks.filter(stk => {
      const c = consumables.find(item => item.id === stk.consumableId);
      return c && stk.currentQuantity <= c.minStockAlert;
    }).length;
    setCriticalStockCount(critCount);
  };

  useEffect(() => {
    updateAlerts();
    window.addEventListener('itam_storage_updated', updateAlerts);
    return () => window.removeEventListener('itam_storage_updated', updateAlerts);
  }, []);

  const handleGlobalSearch = (term: string) => {
    setGlobalSearchTerm(term);
    setActiveModule('inventory');
    setIsMobileMenuOpen(false);
  };

  const handleNavigate = (mod: NavModule) => {
    setActiveModule(mod);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    if (confirm('¿Confirma que desea cerrar su sesión en la plataforma?')) {
      setCurrentUser(null);
      localStorage.removeItem('chileatiende_itam_current_user_v1');
    }
  };

  // Si no hay sesión iniciada, mostrar Login
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setActiveModule('dashboard');
          setIsMobileMenuOpen(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F8] text-slate-800 antialiased font-sans text-base">
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
