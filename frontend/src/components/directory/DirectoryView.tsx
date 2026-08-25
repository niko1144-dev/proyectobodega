import React, { useState, useEffect } from 'react';
import { 
  Users2, 
  Search, 
  RefreshCw, 
  Building2, 
  Laptop, 
  CheckCircle2, 
  UserCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ADUser } from '../../types/user';
import { Asset } from '../../types/asset';
import { PropertyBadge, StatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ApiClient } from '../../api/client';
import { normalizeText } from '../../utils/formatters';

export const DirectoryView: React.FC = () => {
  const [users, setUsers] = useState<ADUser[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [selectedUserForAssets, setSelectedUserForAssets] = useState<ADUser | null>(null);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 24;

  const loadData = async () => {
    const [u, a] = await Promise.all([
      ApiClient.searchDirectoryUsers(),
      ApiClient.getAssets()
    ]);
    // Filtrar cuentas de máquina o nombres vacíos
    const validUsers = u.filter(user => user.fullName && user.fullName.trim().length > 1 && !user.samAccountName.endsWith('$'));
    setUsers(validUsers);
    setAssets(a);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('itam_storage_updated', loadData);
    return () => window.removeEventListener('itam_storage_updated', loadData);
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const result = await ApiClient.syncDirectory();
      alert(`✓ Sincronización exitosa con Active Directory (cha.cl).\nSe sincronizaron ${result.syncedCount} funcionarios en la base de datos.`);
      await loadData();
    } catch (err: any) {
      alert(`Error al sincronizar: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (!searchTerm.trim()) return true;
    const words = normalizeText(searchTerm).split(/\s+/).filter(Boolean);
    const target = normalizeText(
      `${u.fullName} ${u.firstName} ${u.lastName} ${u.rut} ${u.samAccountName} ${u.email} ${u.department} ${u.jobTitle} ${u.branchName}`
    );
    return words.every(w => target.includes(w));
  });

  // Cálculos de Paginación
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + pageSize);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const getUserAssignedAssets = (userId: string) => {
    return assets.filter(a => a.assignedToUserId === userId);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-150">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#003B70] tracking-tight">
            Directorio de Funcionarios (Active Directory)
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Sincronización en tiempo real con el dominio institucional <strong>cha.cl</strong> ({users.length} funcionarios registrados)
          </p>
        </div>

        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="gov-btn-primary"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Sincronizando 1800+ usuarios...' : 'Sincronizar Active Directory'}</span>
        </button>
      </div>

      {/* Barra de Búsqueda y Estadísticas */}
      <div className="gov-card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xl w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Buscar por Nombre, RUT, Usuario, Correo o Departamento..."
            className="gov-input gov-input-with-icon"
          />
        </div>

        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600">
          <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-[#003B70] border border-blue-200">
            {filteredUsers.length} funcionarios encontrados
          </span>
        </div>
      </div>

      {/* Grid de Funcionarios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {paginatedUsers.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
            <Users2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-bold text-slate-600">No se encontraron funcionarios con el criterio de búsqueda</p>
            <p className="text-xs text-slate-400 mt-1">Intente buscando por nombre, RUT (ej: 13108837-K) o correo institucional</p>
          </div>
        ) : (
          paginatedUsers.map(user => {
            const assigned = getUserAssignedAssets(user.id);
            const initials = user.fullName
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map(w => w[0])
              .join('')
              .toUpperCase() || 'AD';

            return (
              <div
                key={user.id}
                className="gov-card p-5 space-y-4 hover:shadow-gov-card transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#003B70] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 leading-tight truncate">{user.fullName}</h3>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{user.jobTitle || 'Funcionario'}</p>
                      </div>
                    </div>

                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#065F46] font-bold border border-[#A7F3D0] shrink-0">
                      cha.cl
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-400">RUT:</span>
                      <span className="font-mono font-bold text-slate-800">{user.rut}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Usuario AD:</span>
                      <span className="font-mono text-slate-700 font-semibold">{user.samAccountName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Correo:</span>
                      <span className="text-slate-700 font-medium truncate max-w-[170px]">{user.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Depto:</span>
                      <span className="text-slate-700 truncate max-w-[170px]">{user.department}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Laptop className="w-4 h-4 text-[#003B70]" />
                    <span className="text-slate-600 font-medium">Equipos a cargo:</span>
                    <strong className="text-[#003B70] font-bold">{assigned.length}</strong>
                  </div>

                  {assigned.length > 0 ? (
                    <button
                      onClick={() => setSelectedUserForAssets(user)}
                      className="text-xs text-[#003B70] hover:text-[#002A50] font-bold hover:underline"
                    >
                      Ver Activos ({assigned.length})
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">Sin equipos</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Controles de Paginación */}
      {totalPages > 1 && (
        <div className="gov-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs sm:text-sm text-slate-600">
            Mostrando <strong>{startIndex + 1}</strong> a <strong>{Math.min(startIndex + pageSize, filteredUsers.length)}</strong> de <strong>{filteredUsers.length}</strong> funcionarios
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="gov-btn-secondary py-1.5 px-3 text-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>

            <span className="px-3 py-1 text-xs font-bold text-slate-700">
              Página {currentPage} de {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="gov-btn-secondary py-1.5 px-3 text-xs"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de Equipos Asignados al Funcionario */}
      {selectedUserForAssets && (
        <Modal
          isOpen={!!selectedUserForAssets}
          onClose={() => setSelectedUserForAssets(null)}
          title={`Equipamiento Asignado a ${selectedUserForAssets.fullName}`}
          subtitle={`RUT: ${selectedUserForAssets.rut} • ${selectedUserForAssets.jobTitle} (${selectedUserForAssets.department})`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left">
                <thead className="bg-[#003B70] text-white">
                  <tr>
                    <th className="px-3 py-2.5 font-bold">Dispositivo</th>
                    <th className="px-3 py-2.5 font-bold">N° Serie / Inventario</th>
                    <th className="px-3 py-2.5 font-bold">Modalidad</th>
                    <th className="px-3 py-2.5 font-bold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {getUserAssignedAssets(selectedUserForAssets.id).map(asset => (
                    <tr key={asset.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-semibold text-slate-900">
                        {asset.brand} {asset.model}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-700">
                        <div>{asset.serialNumber}</div>
                        {asset.inventoryNumber && (
                          <div className="text-[10px] text-[#003B70] font-bold">Inv: {asset.inventoryNumber}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <PropertyBadge type={asset.propertyType} />
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={asset.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
