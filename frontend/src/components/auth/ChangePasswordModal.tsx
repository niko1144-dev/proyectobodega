import React, { useState } from 'react';
import { 
  KeyRound, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  User, 
  RefreshCw, 
  X 
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { PlatformUser } from '../../types/user';
import { ApiClient } from '../../api/client';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: PlatformUser;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  currentUser
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Cálculo de fortaleza de contraseña
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pwd.length >= 4) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Débil (mínimo alcanzado)', color: 'bg-red-500', textColor: 'text-red-600 dark:text-red-400' };
      case 2:
        return { score: 2, label: 'Media', color: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400' };
      case 3:
      case 4:
        return { score: 3, label: 'Fuerte y Segura', color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' };
      default:
        return { score: 0, label: '', color: 'bg-slate-200', textColor: 'text-slate-400' };
    }
  };

  const strength = getPasswordStrength(newPassword);
  const isMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const isDifferentFromCurrent = newPassword && currentPassword && newPassword !== currentPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentPassword) {
      setErrorMsg('Debes ingresar tu contraseña actual.');
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setErrorMsg('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Las contraseñas nuevas no coinciden.');
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMsg('La nueva contraseña debe ser distinta a la contraseña actual.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await ApiClient.changeMyPassword({
        userId: currentUser.id,
        currentPassword,
        newPassword
      });

      setSuccessMsg(res.message || 'Contraseña actualizada con éxito.');
      setTimeout(() => {
        handleClose();
      }, 1800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar contraseña. Verifica tu clave actual.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cambiar Mi Contraseña"
      subtitle="Actualiza tu clave de acceso personalizada al sistema ITAM ChileAtiende"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Ficha Resumen del Usuario */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#080F1D] border border-slate-200 dark:border-[#1E3352] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EBF3FA] dark:bg-[#0C2447] text-[#003B70] dark:text-[#38BDF8] border border-[#BFDBFE] dark:border-[#1E4B8A] flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {currentUser.fullName}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span>Usuario: <strong className="text-slate-700 dark:text-slate-300 font-mono">{currentUser.username}</strong></span>
              <span>•</span>
              <span>RUT: {currentUser.rut}</span>
            </div>
          </div>
        </div>

        {/* Mensaje de Error */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold flex items-start gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Mensaje de Éxito */}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Campo: Contraseña Actual */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Contraseña Actual <span className="text-red-500">*</span>
          </label>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-[#003B70] dark:group-focus-within:text-[#38BDF8] transition-colors pointer-events-none" />
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Ingresa tu contraseña actual"
              required
              disabled={isLoading || !!successMsg}
              className="gov-input gov-input-with-both-icons text-sm font-medium w-full"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Campo: Nueva Contraseña */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Nueva Contraseña <span className="text-red-500">*</span>
          </label>
          <div className="relative group">
            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-[#003B70] dark:group-focus-within:text-[#38BDF8] transition-colors pointer-events-none" />
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 4 caracteres"
              required
              disabled={isLoading || !!successMsg}
              className="gov-input gov-input-with-both-icons text-sm font-medium w-full"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Barra de Fortaleza de Contraseña */}
          {newPassword && (
            <div className="space-y-1 pt-1 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Seguridad:</span>
                <span className={`font-bold ${strength.textColor}`}>{strength.label}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex gap-1">
                <div className={`h-full flex-1 rounded-full ${strength.score >= 1 ? strength.color : 'bg-transparent'}`} />
                <div className={`h-full flex-1 rounded-full ${strength.score >= 2 ? strength.color : 'bg-transparent'}`} />
                <div className={`h-full flex-1 rounded-full ${strength.score >= 3 ? strength.color : 'bg-transparent'}`} />
              </div>
            </div>
          )}
        </div>

        {/* Campo: Confirmar Nueva Contraseña */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Confirmar Nueva Contraseña <span className="text-red-500">*</span>
          </label>
          <div className="relative group">
            <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-[#003B70] dark:group-focus-within:text-[#38BDF8] transition-colors pointer-events-none" />
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la nueva contraseña"
              required
              disabled={isLoading || !!successMsg}
              className={`gov-input gov-input-with-both-icons text-sm font-medium w-full ${
                confirmPassword && !isMatch ? 'border-red-400 focus:ring-red-400' : ''
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {confirmPassword && (
            <div className="text-[11px] font-semibold pt-0.5">
              {isMatch ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Las contraseñas coinciden
                </span>
              ) : (
                <span className="text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Las contraseñas no coinciden
                </span>
              )}
            </div>
          )}
        </div>

        {/* Botones de Acción */}
        <div className="pt-3 border-t border-slate-200 dark:border-[#1E3352] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A2D4C] border border-slate-200 dark:border-[#1E3352] transition-colors"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isLoading || !currentPassword || !newPassword || !isMatch || !!successMsg}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#003B70] to-[#0055A5] hover:from-[#002A50] hover:to-[#003B70] shadow-md shadow-[#003B70]/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#38BDF8]" />
                <span>Actualizando...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4 text-[#38BDF8]" />
                <span>Guardar Nueva Clave</span>
              </>
            )}
          </button>
        </div>

      </form>
    </Modal>
  );
};
