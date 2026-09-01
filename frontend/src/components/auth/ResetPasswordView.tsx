import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound,
  RefreshCw,
  Clock,
  ArrowLeft,
  MailCheck
} from 'lucide-react';
import { ChileAtiendeLogo } from '../common/ChileAtiendeLogo';
import { ThemeToggle } from '../common/ThemeToggle';
import { ApiClient } from '../../api/client';

interface ResetPasswordViewProps {
  token: string;
  onSuccess: () => void;
  onGoToLogin: (openForgotModal?: boolean) => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({
  token,
  onSuccess,
  onGoToLogin
}) => {
  const [isValidating, setIsValidating] = useState<boolean>(true);
  const [tokenValid, setTokenValid] = useState<boolean>(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{ fullName?: string; email?: string; username?: string } | null>(null);

  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Validar token al cargar la vista
  useEffect(() => {
    let isMounted = true;

    const validateToken = async () => {
      if (!token) {
        if (isMounted) {
          setIsValidating(false);
          setTokenValid(false);
          setTokenError('No se ha proporcionado un token de recuperación válido.');
        }
        return;
      }

      try {
        setIsValidating(true);
        const result = await ApiClient.verifyResetToken(token);
        if (isMounted) {
          if (result.valid) {
            setTokenValid(true);
            setUserInfo({
              fullName: result.fullName,
              email: result.email,
              username: result.username
            });
            setTokenError(null);
          } else {
            setTokenValid(false);
            setTokenError(result.error || 'El enlace de recuperación es inválido o ha expirado.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setTokenValid(false);
          setTokenError(err.message || 'El enlace de recuperación es inválido o ha expirado.');
        }
      } finally {
        if (isMounted) {
          setIsValidating(false);
        }
      }
    };

    validateToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Criterios de fortaleza de contraseña
  const hasMinLength = newPassword.length >= 6;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!newPassword.trim()) {
      setSubmitError('Por favor ingrese su nueva contraseña.');
      return;
    }

    if (newPassword.length < 6) {
      setSubmitError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSubmitError('Las contraseñas ingresadas no coinciden. Verifique e intente nuevamente.');
      return;
    }

    setIsSubmitting(true);
    try {
      await ApiClient.resetPasswordWithToken(token, newPassword.trim());
      setIsSuccess(true);
    } catch (err: any) {
      setSubmitError(err.message || 'Error al restablecer la contraseña.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-slate-100 dark:bg-gradient-to-br dark:from-[#001226] dark:via-[#002244] dark:to-[#00386B] text-slate-800 dark:text-slate-100 selection:bg-[#E4002B] selection:text-white transition-colors duration-250">
      {/* Fondo corporativo */}
      <div className="absolute inset-0 bg-corporate-grid opacity-30 dark:opacity-60 pointer-events-none" />
      <div className="absolute inset-0 bg-corporate-dots opacity-20 dark:opacity-40 pointer-events-none" />
      
      {/* Orbes de iluminación ambiental */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#0F69B4]/15 dark:bg-[#0F69B4]/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[30rem] h-[30rem] bg-[#00508F]/20 dark:bg-[#00508F]/40 rounded-full blur-3xl pointer-events-none" />

      {/* Barra bicromática superior */}
      <div className="relative z-10 gob-flag-bar shadow-md" />

      {/* Switch modo oscuro */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Contenedor central */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-lg animate-in fade-in zoom-in-95 duration-300">
          
          <div className="rounded-3xl shadow-xl dark:shadow-2xl dark:shadow-black/80 overflow-hidden border border-slate-200 dark:border-[#1E3B66]/60 bg-white/95 dark:bg-[#0C1729]/95 backdrop-blur-2xl transition-colors duration-200">
            
            {/* Cabecera */}
            <div className="p-7 sm:p-8 pb-6 text-center border-b border-slate-200 dark:border-[#1A2E4C] bg-slate-50/90 dark:bg-[#08101E]/90">
              <ChileAtiendeLogo size="panel" className="mx-auto" />
              
              <div className="mt-4 pt-3.5 border-t border-slate-200/80 dark:border-[#1A2E4C]/80">
                <h1 className="text-base sm:text-lg font-black text-[#003B70] dark:text-white tracking-tight">
                  Portal de Restablecimiento de Contraseña
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                  Sistema de Gestión de Activos TI (ITAM) • IPS ChileAtiende
                </p>
              </div>
            </div>

            {/* Contenido según estado */}
            <div className="p-7 sm:p-8 pt-6 bg-white dark:bg-[#0C1729]/95">
              
              {/* 1. Estado: Validando token */}
              {isValidating && (
                <div className="py-12 text-center space-y-4">
                  <RefreshCw className="w-10 h-10 text-[#003B70] dark:text-[#38BDF8] animate-spin mx-auto" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Verificando enlace de seguridad...
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Validando token criptográfico con el servidor institucional.
                    </p>
                  </div>
                </div>
              )}

              {/* 2. Estado: Token Inválido / Expirado */}
              {!isValidating && !tokenValid && !isSuccess && (
                <div className="py-6 text-center space-y-5">
                  <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-700/60 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
                    <Clock className="w-8 h-8" />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      Enlace Expirado o No Válido
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                      {tokenError || 'El enlace de recuperación ha caducado por motivos de seguridad (validez de 60 minutos) o ya fue utilizado.'}
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      type="button"
                      onClick={() => onGoToLogin(true)}
                      className="gov-btn-primary py-2.5 px-5 text-xs font-bold bg-[#003B70] hover:bg-[#002A50] text-white flex items-center justify-center gap-2"
                    >
                      <KeyRound className="w-4 h-4" />
                      Solicitar nuevo enlace
                    </button>
                    <button
                      type="button"
                      onClick={() => onGoToLogin(false)}
                      className="gov-btn-secondary py-2.5 px-5 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Volver al Login
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Estado: Éxito en el cambio de clave */}
              {isSuccess && (
                <div className="py-6 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-700/60 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-base font-bold text-emerald-800 dark:text-emerald-300">
                      ¡Contraseña Actualizada Exitosamente!
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                      Tu clave de acceso ha sido restablecida de forma segura. Ya puedes ingresar a la plataforma ITAM con tus nuevas credenciales.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onSuccess}
                      className="w-full gov-btn-primary py-3 text-xs font-bold shadow-md bg-[#003B70] dark:bg-gradient-to-r dark:from-[#003B70] dark:via-[#0055A5] dark:to-[#004282] hover:bg-[#002A50] text-white flex items-center justify-center gap-2"
                    >
                      <span>Iniciar Sesión en la Plataforma</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* 4. Estado: Formulario de Nueva Contraseña (Token Válido) */}
              {!isValidating && tokenValid && !isSuccess && (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  
                  {/* Tarjeta de Saludo e Identificación del Usuario */}
                  {userInfo && (
                    <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#003B70] text-white flex items-center justify-center font-bold text-sm shrink-0">
                        <KeyRound className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[#003B70] dark:text-[#38BDF8] truncate">
                          {userInfo.fullName || userInfo.username}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                          <MailCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span>{userInfo.email || userInfo.username}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {submitError && (
                    <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 text-[#E4002B] dark:text-[#F87171] mt-0.5" />
                      <span className="leading-relaxed font-medium">{submitError}</span>
                    </div>
                  )}

                  {/* Campo Nueva Contraseña */}
                  <div>
                    <label className="block text-slate-700 dark:text-slate-200 font-bold mb-1.5">
                      Nueva Contraseña *
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-[#003B70] dark:group-focus-within:text-[#38BDF8] transition-colors pointer-events-none" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres..."
                        className="gov-input gov-input-with-both-icons font-mono font-medium transition-all duration-200 focus:shadow-md"
                        autoFocus
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#003B70] dark:hover:text-[#38BDF8] p-1 transition-colors"
                        title={showNewPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Campo Confirmar Contraseña */}
                  <div>
                    <label className="block text-slate-700 dark:text-slate-200 font-bold mb-1.5">
                      Confirmar Nueva Contraseña *
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-[#003B70] dark:group-focus-within:text-[#38BDF8] transition-colors pointer-events-none" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Reingrese la nueva clave..."
                        className="gov-input gov-input-with-both-icons font-mono font-medium transition-all duration-200 focus:shadow-md"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#003B70] dark:hover:text-[#38BDF8] p-1 transition-colors"
                        title={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Checklist de Requisitos de Seguridad */}
                  <div className="p-3 bg-slate-50 dark:bg-[#08101E]/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px]">
                    <div className="font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Requisitos de la nueva contraseña:
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${hasMinLength ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                      Mínimo 6 caracteres
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasLetter && hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${hasLetter && hasNumber ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                      Incluye letras y números
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${passwordsMatch ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                      Ambas contraseñas coinciden
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="pt-2 space-y-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || !hasMinLength || !passwordsMatch}
                      className="w-full gov-btn-primary py-3 text-xs font-bold shadow-md bg-[#003B70] dark:bg-gradient-to-r dark:from-[#003B70] dark:via-[#0055A5] dark:to-[#004282] hover:bg-[#002A50] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Actualizando contraseña...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2 text-sm">
                          Guardar Nueva Contraseña
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onGoToLogin(false)}
                      className="w-full text-center text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 py-1.5 transition-colors font-medium"
                    >
                      Cancelar y volver al inicio de sesión
                    </button>
                  </div>

                </form>
              )}

            </div>
          </div>

          {/* Pie de página institucional */}
          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-300/80 space-y-1">
            <p className="font-semibold text-slate-700 dark:text-white/90">
              Instituto de Previsión Social • Gobierno de Chile
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-300/70">
              Mesa de Ayuda DTI: Anexo <strong>8700</strong> | soporteti@chileatiende.cl
            </p>
          </div>

        </div>
      </div>

      {/* Franja bicromática inferior */}
      <div className="relative z-10 gob-flag-bar shadow-lg" />
    </div>
  );
};
