import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Search, 
  ShieldCheck, 
  Building2, 
  KeyRound, 
  Edit, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Lock,
  User,
  Mail,
  CreditCard,
  Trash2,
  Server,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { PlatformUser, PlatformRole, ADUser } from '../../types/user';
import { Branch } from '../../types/document';
import { Modal } from '../common/Modal';
import { SearchableSelect } from '../common/SearchableSelect';
import { formatDate, validateRut, formatRut, validateEmail, normalizeText } from '../../utils/formatters';
import { ApiClient } from '../../api/client';

export const UsersManagementView: React.FC = () => {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [directoryUsers, setDirectoryUsers] = useState<ADUser[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('ALL');

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);

  // Formulario Crear / Autorizar Usuario
  const [adSearchQuery, setAdSearchQuery] = useState<string>('');
  const [isAdLinked, setIsAdLinked] = useState<boolean>(true);
  const [formRut, setFormRut] = useState<string>('');
  const [formUsername, setFormUsername] = useState<string>('');
  const [formFullName, setFormFullName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPassword, setFormPassword] = useState<string>('AD_AUTHENTICATED');
  const [formRole, setFormRole] = useState<PlatformRole>('TECNICO_SOPORTE');
  const [formJobTitle, setFormJobTitle] = useState<string>('Técnico Soporte TI');
  const [formDepartment, setFormDepartment] = useState<string>('División Tecnologías de la Información');
  const [formBranchIds, setFormBranchIds] = useState<string[]>([]);

  // Formulario Password Reset
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');

  // Feedback & Errores de Validación
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rutError, setRutError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const loadData = async () => {
    const [u, b, d] = await Promise.all([
      ApiClient.getPlatformUsers(),
      ApiClient.getBranches(),
      ApiClient.searchDirectoryUsers()
    ]);
    setUsers(u);
    setBranches(b);
    setDirectoryUsers(d);
    if (b.length > 0 && formBranchIds.length === 0) {
      setFormBranchIds([b[0].id]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateModal = () => {
    setAdSearchQuery('');
    setIsAdLinked(true);
    setFormRut('');
    setFormUsername('');
    setFormFullName('');
    setFormEmail('');
    setFormPassword('AD_AUTHENTICATED');
    setFormRole('TECNICO_SOPORTE');
    setFormJobTitle('Técnico Soporte TI');
    setFormDepartment('División Tecnologías de la Información');
    setFormBranchIds(branches.length > 0 ? [branches[0].id] : []);
    setErrorMsg(null);
    setRutError(null);
    setEmailError(null);
    setIsCreateModalOpen(true);
  };

  const handleSelectAdUser = (adUser: ADUser) => {
    setFormFullName(adUser.fullName);
    setFormRut(adUser.rut || '');
    setFormUsername(adUser.samAccountName);
    setFormEmail(adUser.email);
    setFormJobTitle(adUser.jobTitle || 'Funcionario ITAM');
    setFormDepartment(adUser.department || 'ChileAtiende / IPS');
    setFormPassword('AD_AUTHENTICATED');
    setIsAdLinked(true);
    setAdSearchQuery('');
    setRutError(null);
    setEmailError(null);
    if (formBranchIds.length === 0 && branches.length > 0) {
      setFormBranchIds([branches[0].id]);
    }
  };

  const handleRutChange = (val: string) => {
    const formatted = formatRut(val);
    setFormRut(formatted);
    if (val.trim().length > 3) {
      if (validateRut(formatted)) {
        setRutError(null);
      } else {
        setRutError('RUT incompleto o formato inválido.');
      }
    } else {
      setRutError(null);
    }
  };

  const handleEmailChange = (val: string) => {
    setFormEmail(val);
    if (val.trim() && !validateEmail(val)) {
      setEmailError('Formato de correo electrónico inválido.');
    } else {
      setEmailError(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validaciones
    const formattedRut = formRut.trim().length >= 6 ? formatRut(formRut.trim()) : formRut.trim();
    if (!formUsername.trim() || formUsername.trim().length < 3) {
      setErrorMsg('El nombre de usuario debe tener al menos 3 caracteres.');
      return;
    }

    if (!formFullName.trim()) {
      setErrorMsg('Debe ingresar el nombre completo del funcionario.');
      return;
    }

    if (!validateEmail(formEmail.trim())) {
      setErrorMsg('Debe ingresar un correo electrónico institucional válido (ej: usuario@chileatiende.cl o usuario@ips.gob.cl).');
      return;
    }

    if (!isAdLinked && (!formPassword.trim() || formPassword.trim().length < 6)) {
      setErrorMsg('Para cuentas locales, la contraseña inicial debe tener al menos 6 caracteres.');
      return;
    }

    if (formBranchIds.length === 0) {
      setErrorMsg('Debe seleccionar al menos una bodega o sucursal autorizada.');
      return;
    }

    try {
      await ApiClient.createPlatformUser({
        rut: formattedRut || `USR-${formUsername.trim().toUpperCase()}`,
        username: formUsername.trim().toLowerCase(),
        fullName: formFullName.trim(),
        email: formEmail.trim().toLowerCase(),
        password: isAdLinked ? 'AD_AUTHENTICATED' : formPassword.trim(),
        role: formRole,
        jobTitle: formJobTitle.trim() || 'Funcionario ITAM',
        department: formDepartment.trim() || 'División Tecnologías de la Información',
        branchId: formBranchIds[0],
        assignedBranchIds: formBranchIds
      });

      setIsCreateModalOpen(false);
      setFeedbackMsg(`✓ Funcionario ${formFullName} autorizado exitosamente con rol ${formRole} (${formBranchIds.length} bodegas asignadas).`);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar o autorizar el usuario.');
    }
  };

  const handleDeleteUser = async (user: PlatformUser) => {
    if (user.username === 'admin') {
      alert('La cuenta de Administrador Principal no puede ser eliminada.');
      return;
    }

    if (confirm(`¿Confirma que desea revocar todos los permisos y eliminar el acceso de ${user.fullName} (${user.username})?`)) {
      try {
        await ApiClient.deletePlatformUser(user.id);
        setFeedbackMsg(`✓ Acceso revocado y cuenta de ${user.fullName} eliminada exitosamente.`);
        loadData();
      } catch (err: any) {
        alert(`Error al eliminar usuario: ${err.message}`);
      }
    }
  };

  const handleOpenEditModal = (user: PlatformUser) => {
    setSelectedUser(user);
    setFormFullName(user.fullName);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormJobTitle(user.jobTitle || '');
    setFormDepartment(user.department || '');
    const userBranches = user.assignedBranchIds && user.assignedBranchIds.length > 0 
      ? user.assignedBranchIds 
      : (user.branchId ? [user.branchId] : (branches.length > 0 ? [branches[0].id] : []));
    setFormBranchIds(userBranches);
    setErrorMsg(null);
    setEmailError(null);
    setIsEditModalOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setErrorMsg(null);

    if (!formFullName.trim()) {
      setErrorMsg('El nombre completo es obligatorio.');
      return;
    }

    if (!validateEmail(formEmail.trim())) {
      setErrorMsg('El correo electrónico no tiene un formato válido.');
      return;
    }

    if (formBranchIds.length === 0) {
      setErrorMsg('Debe seleccionar al menos una bodega o sucursal autorizada.');
      return;
    }

    try {
      await ApiClient.updatePlatformUser(selectedUser.id, {
        fullName: formFullName.trim(),
        email: formEmail.trim().toLowerCase(),
        role: formRole,
        jobTitle: formJobTitle.trim(),
        department: formDepartment.trim(),
        branchId: formBranchIds[0],
        assignedBranchIds: formBranchIds
      });

      setIsEditModalOpen(false);
      setFeedbackMsg(`✓ Datos de ${formFullName} actualizados correctamente.`);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar usuario.');
    }
  };

  const handleOpenPasswordModal = (user: PlatformUser) => {
    setSelectedUser(user);
    setNewPasswordInput('');
    setErrorMsg(null);
    setIsPasswordModalOpen(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setErrorMsg(null);

    if (!newPasswordInput.trim() || newPasswordInput.trim().length < 6) {
      setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      await ApiClient.updatePlatformUserPassword(selectedUser.id, newPasswordInput.trim());
      setIsPasswordModalOpen(false);
      setFeedbackMsg(`✓ Contraseña actualizada exitosamente para el usuario ${selectedUser.username}.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cambiar contraseña.');
    }
  };

  const handleToggleStatus = async (user: PlatformUser) => {
    const action = user.isActive ? 'desactivar' : 'activar';
    if (confirm(`¿Confirma que desea ${action} la cuenta de acceso de ${user.fullName}?`)) {
      await ApiClient.togglePlatformUserStatus(user.id);
      setFeedbackMsg(`✓ Cuenta de ${user.fullName} ${user.isActive ? 'desactivada' : 'activada'}.`);
      loadData();
    }
  };

  // Filtrado (Insensible a Acentos y Mayúsculas)
  const filteredUsers = users.filter(u => {
    if (searchTerm.trim()) {
      const words = normalizeText(searchTerm).split(/\s+/).filter(Boolean);
      const target = normalizeText(
        `${u.fullName} ${u.rut} ${u.username} ${u.email} ${u.jobTitle || ''} ${u.department || ''} ${u.branchName || ''}`
      );
      if (!words.every(w => target.includes(w))) return false;
    }

    if (selectedRoleFilter !== 'ALL' && u.role !== selectedRoleFilter) return false;
    if (selectedBranchFilter !== 'ALL' && u.branchId !== selectedBranchFilter) return false;

    return true;
  });

  const getRoleBadge = (role: PlatformRole) => {
    switch (role) {
      case 'ADMIN_TI':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-[#003B70] text-white">ADMINISTRADOR DTI</span>;
      case 'ENCARGADO_BODEGA':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-blue-50 text-blue-800 border border-blue-200">JEFE DE BODEGA</span>;
      case 'TECNICO_SOPORTE':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">TÉCNICO SOPORTE</span>;
      case 'AUDITOR_CONSULTOR':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-purple-50 text-purple-800 border border-purple-200">AUDITOR / CGR</span>;
      default:
        return <span className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-700">{role}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#003B70] tracking-tight">Mantenedor de Usuarios & Roles (RBAC)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Administración de cuentas con acceso a la plataforma ITAM y asignación de niveles de privilegio
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="gov-btn-primary"
        >
          <UserPlus className="w-4 h-4" />
          Crear Nuevo Usuario
        </button>
      </div>

      {feedbackMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{feedbackMsg}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-emerald-800 font-bold hover:underline">
            Cerrar
          </button>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="gov-card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Nombre, RUT, Usuario o Correo..."
              className="gov-input gov-input-with-icon"
            />
          </div>

          <div>
            <SearchableSelect
              value={selectedRoleFilter}
              onChange={(val) => setSelectedRoleFilter(val)}
              options={[
                { value: 'ALL', label: 'Rol: Todos los Niveles' },
                { value: 'ADMIN_TI', label: 'Administrador DTI', badge: 'Total' },
                { value: 'ENCARGADO_BODEGA', label: 'Encargado de Bodega', badge: 'Bodega' },
                { value: 'TECNICO_SOPORTE', label: 'Técnico de Soporte', badge: 'Soporte' },
                { value: 'AUDITOR_CONSULTOR', label: 'Auditor / Consultor', badge: 'CGR' }
              ]}
              placeholder="Filtrar rol..."
              searchPlaceholder="Filtrar rol..."
            />
          </div>

          <div>
            <SearchableSelect
              value={selectedBranchFilter}
              onChange={(val) => setSelectedBranchFilter(val)}
              options={[
                { value: 'ALL', label: 'Sucursal: Todas' },
                ...branches.map(b => ({
                  value: b.id,
                  label: b.name,
                  sublabel: b.region,
                  badge: b.code
                }))
              ]}
              placeholder="Filtrar sucursal..."
              searchPlaceholder="Filtrar sucursal..."
            />
          </div>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="gov-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#003B70] text-white select-none">
              <tr>
                <th className="px-3.5 py-3 font-bold">Usuario / RUT</th>
                <th className="px-3.5 py-3 font-bold">Nombre Completo</th>
                <th className="px-3.5 py-3 font-bold">Rol & Privilegios</th>
                <th className="px-3.5 py-3 font-bold">Sucursal Asignada</th>
                <th className="px-3.5 py-3 font-bold">Contacto / Correo</th>
                <th className="px-3.5 py-3 font-bold">Estado Cuenta</th>
                <th className="px-3.5 py-3 text-right font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No se encontraron usuarios con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    {/* Usuario & RUT */}
                    <td className="px-3.5 py-3 font-mono">
                      <div className="font-bold text-slate-900">{user.username}</div>
                      <div className="text-[11px] text-[#003B70] font-semibold">{user.rut}</div>
                    </td>

                    {/* Nombre y Cargo */}
                    <td className="px-3.5 py-3">
                      <div className="font-bold text-slate-900">{user.fullName}</div>
                      <div className="text-[11px] text-slate-500">{user.jobTitle}</div>
                    </td>

                    {/* Rol */}
                    <td className="px-3.5 py-3">
                      {getRoleBadge(user.role)}
                    </td>

                    {/* Bodegas / Sucursales Autorizadas */}
                    <td className="px-3.5 py-3 text-slate-700 font-medium">
                      <div className="space-y-1">
                        {user.assignedBranchNames && user.assignedBranchNames.length > 0 ? (
                          user.assignedBranchNames.length === 1 ? (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-[#003B70]" />
                              <span className="font-semibold">{user.assignedBranchNames[0]}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 font-bold text-[#003B70]">
                                <Building2 className="w-3.5 h-3.5 text-[#003B70]" />
                                <span>{user.assignedBranchNames[0]}</span>
                              </div>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200 w-fit" title={user.assignedBranchNames.join(', ')}>
                                +{user.assignedBranchNames.length - 1} bodegas adicionales
                              </span>
                            </div>
                          )
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-[#003B70]" />
                            <span>{user.branchName || 'Sucursal Central'}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Correo */}
                    <td className="px-3.5 py-3 text-slate-600">
                      <div>{user.email}</div>
                      <div className="text-[10px] text-slate-400">
                        {user.lastLoginAt ? `Último acceso: ${formatDate(user.lastLoginAt)}` : 'Sin accesos previos'}
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="px-3.5 py-3">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#ECFDF5] text-[#065F46] font-bold border border-[#A7F3D0]">
                          <CheckCircle2 className="w-3 h-3" /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FEF2F2] text-[#991B1B] font-bold border border-[#FECACA]">
                          <XCircle className="w-3 h-3" /> Desactivado
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-3.5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          title="Editar Datos & Rol"
                          className="p-1.5 text-slate-500 hover:text-[#003B70] hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenPasswordModal(user)}
                          title="Resetear Contraseña"
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(user)}
                          title={user.isActive ? "Desactivar Cuenta" : "Activar Cuenta"}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.isActive ? 'text-slate-500 hover:text-[#E4002B] hover:bg-red-50' : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteUser(user)}
                          title="Revocar Acceso y Eliminar Cuenta"
                          disabled={user.username === 'admin'}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CREAR / AUTORIZAR USUARIO */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Autorizar / Crear Usuario en la Plataforma"
          subtitle="Seleccione un funcionario de Active Directory o ingrese datos manuales y asigne su rol y bodegas autorizadas"
          maxWidth="2xl"
        >
          <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#E4002B]" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Buscador Rápido de Funcionarios en Active Directory */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Server className="w-4 h-4 text-[#003B70]" />
                  <span>Buscar Funcionario en Active Directory (CHA & IPS)</span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium">3.409 Funcionarios disponibles</span>
              </div>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={adSearchQuery}
                  onChange={(e) => setAdSearchQuery(e.target.value)}
                  placeholder="Escriba nombre, apellido, RUT o usuario para autocompletar..."
                  className="gov-input gov-input-with-icon text-xs font-medium"
                />
              </div>

              {/* Resultados desplegables si hay búsqueda */}
              {adSearchQuery.trim().length >= 2 && (
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white rounded-lg border border-slate-200 shadow-sm mt-1">
                  {directoryUsers
                    .filter(u => {
                      const target = normalizeText(`${u.fullName} ${u.rut || ''} ${u.samAccountName} ${u.email} ${u.department || ''}`);
                      const words = normalizeText(adSearchQuery).split(/\s+/).filter(Boolean);
                      return words.every(w => target.includes(w));
                    })
                    .slice(0, 8)
                    .map(adUser => (
                      <button
                        type="button"
                        key={adUser.id || adUser.samAccountName}
                        onClick={() => handleSelectAdUser(adUser)}
                        className="w-full text-left p-2.5 hover:bg-[#EBF3FA] flex items-center justify-between transition-colors group"
                      >
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-[#003B70]">{adUser.fullName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {adUser.samAccountName} • {adUser.rut || 'Sin RUT'} • {adUser.email}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                          Seleccionar
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            {isAdLinked && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-800 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Funcionario vinculado a <strong>Active Directory</strong>. La contraseña se valida en red.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdLinked(false)}
                  className="text-emerald-700 underline text-[11px] font-semibold hover:text-emerald-900"
                >
                  Cambiar a cuenta local
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">RUT Funcionario</label>
                <div className="relative">
                  <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={formRut}
                    onChange={(e) => handleRutChange(e.target.value)}
                    placeholder="Ej: 16.789.123-4"
                    className={`gov-input gov-input-with-icon font-mono font-bold ${rutError ? 'border-red-400 bg-red-50/20' : ''}`}
                  />
                </div>
                {rutError && <p className="text-[11px] text-red-600 mt-1">{rutError}</p>}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Nombre de Usuario (Login / sAMAccountName) *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="Ej: fnavarro"
                    className="gov-input gov-input-with-icon font-bold"
                    required
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="Ej: Felipe Andrés Navarro Toro"
                  className="gov-input font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Correo Electrónico Institucional *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="nombre.apellido@chileatiende.cl o @ips.gob.cl"
                    className={`gov-input gov-input-with-icon ${emailError ? 'border-red-400 bg-red-50/20' : ''}`}
                    required
                  />
                </div>
                {emailError && <p className="text-[11px] text-red-600 mt-1">{emailError}</p>}
              </div>

              {!isAdLinked ? (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Contraseña Local Inicial (mínimo 6 car.) *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres..."
                      className="gov-input gov-input-with-icon font-mono"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Método de Autenticación</label>
                  <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700 font-medium flex items-center gap-2 border border-slate-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Contraseña Active Directory institucional</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">Rol y Privilegios en el Sistema *</label>
                <SearchableSelect
                  value={formRole}
                  onChange={(val) => setFormRole(val as PlatformRole)}
                  options={[
                    { value: 'ADMIN_TI', label: 'ADMINISTRADOR DTI', badge: 'Acceso Total' },
                    { value: 'ENCARGADO_BODEGA', label: 'ENCARGADO DE BODEGA', badge: 'Stock y Guías' },
                    { value: 'TECNICO_SOPORTE', label: 'TÉCNICO DE SOPORTE', badge: 'Asignaciones' },
                    { value: 'AUDITOR_CONSULTOR', label: 'AUDITOR / CGR', badge: 'Solo Lectura' }
                  ]}
                  placeholder="Seleccione rol..."
                  searchPlaceholder="Filtrar rol..."
                />
              </div>

              {/* Selector Multi-Bodega */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-700 font-bold">Bodegas / Sucursales Autorizadas (1 o varias) *</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormBranchIds(branches.map(b => b.id))}
                      className="text-[11px] text-[#003B70] font-bold hover:underline"
                    >
                      Seleccionar Todas ({branches.length})
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setFormBranchIds([])}
                      className="text-[11px] text-slate-500 font-semibold hover:underline"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-44 overflow-y-auto">
                  {branches.map(b => {
                    const isSelected = formBranchIds.includes(b.id);
                    return (
                      <label
                        key={b.id}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-blue-50/90 border-[#003B70] text-[#003B70] font-bold shadow-xs' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setFormBranchIds(formBranchIds.filter(id => id !== b.id));
                            } else {
                              setFormBranchIds([...formBranchIds, b.id]);
                            }
                          }}
                          className="w-4 h-4 rounded text-[#003B70] focus:ring-[#003B70]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs truncate">{b.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{b.region} • {b.code}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {formBranchIds.length === 0 ? (
                    <span className="text-red-500 font-semibold">⚠️ Debe seleccionar al menos una bodega o sucursal.</span>
                  ) : (
                    <span className="text-emerald-700 font-semibold">✓ <strong>{formBranchIds.length}</strong> {formBranchIds.length === 1 ? 'bodega seleccionada' : 'bodegas seleccionadas'}</span>
                  )}
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Cargo Institucional</label>
                <input
                  type="text"
                  value={formJobTitle}
                  onChange={(e) => setFormJobTitle(e.target.value)}
                  placeholder="Ej: Encargado de Soporte Regional"
                  className="gov-input"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Departamento / División</label>
                <input
                  type="text"
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  placeholder="Ej: División Tecnologías de la Información"
                  className="gov-input"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="gov-btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="gov-btn-primary"
              >
                <UserCheck className="w-4 h-4" />
                <span>Autorizar Usuario</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL EDITAR USUARIO */}
      {isEditModalOpen && selectedUser && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Editar Usuario: ${selectedUser.username}`}
          subtitle={`RUT: ${selectedUser.rut}`}
          maxWidth="xl"
        >
          <form onSubmit={handleEditUser} className="space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#E4002B]" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  className="gov-input font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={`gov-input ${emailError ? 'border-red-400 bg-red-50/20' : ''}`}
                  required
                />
                {emailError && <p className="text-[11px] text-red-600 mt-1">{emailError}</p>}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Nivel de Privilegios / Rol *</label>
                <SearchableSelect
                  value={formRole}
                  onChange={(val) => setFormRole(val as PlatformRole)}
                  options={[
                    { value: 'ADMIN_TI', label: 'ADMINISTRADOR DTI', badge: 'Acceso Total' },
                    { value: 'ENCARGADO_BODEGA', label: 'ENCARGADO DE BODEGA', badge: 'Stock y Guías' },
                    { value: 'TECNICO_SOPORTE', label: 'TÉCNICO DE SOPORTE', badge: 'Asignaciones' },
                    { value: 'AUDITOR_CONSULTOR', label: 'AUDITOR / CGR', badge: 'Solo Lectura' }
                  ]}
                  placeholder="Seleccione rol..."
                  searchPlaceholder="Filtrar rol..."
                />
              </div>

              {/* Selector Multi-Bodega en Edición */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-700 font-bold">Bodegas / Sucursales Autorizadas *</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormBranchIds(branches.map(b => b.id))}
                      className="text-[11px] text-[#003B70] font-bold hover:underline"
                    >
                      Seleccionar Todas ({branches.length})
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setFormBranchIds([])}
                      className="text-[11px] text-slate-500 font-semibold hover:underline"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-44 overflow-y-auto">
                  {branches.map(b => {
                    const isSelected = formBranchIds.includes(b.id);
                    return (
                      <label
                        key={b.id}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-blue-50/90 border-[#003B70] text-[#003B70] font-bold shadow-xs' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setFormBranchIds(formBranchIds.filter(id => id !== b.id));
                            } else {
                              setFormBranchIds([...formBranchIds, b.id]);
                            }
                          }}
                          className="w-4 h-4 rounded text-[#003B70] focus:ring-[#003B70]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs truncate">{b.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{b.region} • {b.code}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {formBranchIds.length === 0 ? (
                    <span className="text-red-500 font-semibold">⚠️ Debe seleccionar al menos una bodega o sucursal.</span>
                  ) : (
                    <span className="text-emerald-700 font-semibold">✓ <strong>{formBranchIds.length}</strong> {formBranchIds.length === 1 ? 'bodega seleccionada' : 'bodegas seleccionadas'}</span>
                  )}
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">Cargo</label>
                <input
                  type="text"
                  value={formJobTitle}
                  onChange={(e) => setFormJobTitle(e.target.value)}
                  className="gov-input"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="gov-btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="gov-btn-primary"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL RESET PASSWORD */}
      {isPasswordModalOpen && selectedUser && (
        <Modal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
          title="Resetear Contraseña de Usuario"
          subtitle={`Usuario: ${selectedUser.username} (${selectedUser.fullName})`}
          maxWidth="md"
        >
          <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#E4002B]" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-bold mb-1">Nueva Contraseña (mínimo 6 car.) *</label>
              <input
                type="text"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="Ingrese la nueva contraseña..."
                className="gov-input font-mono font-bold"
                required
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="gov-btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="gov-btn-primary"
              >
                Actualizar Contraseña
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
