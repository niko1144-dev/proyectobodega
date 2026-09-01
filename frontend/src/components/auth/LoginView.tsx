import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  ShieldCheck, 
  KeyRound,
  Building2,
  CheckCircle2,
  Server,
  Sparkles,
  Mail,
  X,
  Send,
  HelpCircle
} from 'lucide-react';
import { ChileAtiendeLogo } from '../common/ChileAtiendeLogo';
import { ThemeToggle } from '../common/ThemeToggle';
import { ApiClient } from '../../api/client';
import { storage } from '../../db/storage';
import { PlatformUser } from '../../types/user';

interface LoginViewProps {
  onLoginSuccess: (user: PlatformUser) => void;
  initialOpenForgotModal?: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({ 
  onLoginSuccess,
  initialOpenForgotModal = false
}) => {
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados del Modal de Recuperación de Contraseña
  const [isForgotModalOpen, setIsForgotModalOpen] = useState<boolean>(initialOpenForgotModal);
  const [forgotIdentifier, setForgotIdentifier] = useState<string>('');
  const [isForgotLoading, setIsForgotLoading] = useState<boolean>(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<{ message: string; emailMasked?: string } | null>(null);

  useEffect(() => {
    if (initialOpenForgotModal) {
      setIsForgotModalOpen(true);
    }
  }, [initialOpenForgotModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Por favor ingrese su usuario o RUT y contraseña institucional.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await ApiClient.login({
        identifier: identifier.trim(),
        password: password.trim()
      });

      if (response && response.user) {
        storage.setCurrentUser(response.user);
        onLoginSuccess(response.user);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de autenticación. Verifique sus credenciales.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    if (!forgotIdentifier.trim()) {
      setForgotError('Por favor ingrese su usuario, RUT o correo institucional.');
      return;
    }

    setIsForgotLoading(true);
    try {
      const result = await ApiClient.requestPasswordReset(forgotIdentifier.trim());
      setForgotSuccess({
        message: result.message,
        emailMasked: result.emailMasked
      });
    } catch (err: any) {
      setForgotError(err.message || 'Error al solicitar la recuperación de contraseña.');
    } finally {
      setIsForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setIsForgotModalOpen(false);
    setForgotError(null);
    setForgotSuccess(null);
    setForgotIdentifier('');
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-slate-100 dark:bg-gradient-to-br dark:from-[#001226] dark:via-[#002244] dark:to-[#00386B] text-slate-800 dark:text-slate-100 selection:bg-[#E4002B] selection:text-white transition-colors duration-250">
      {/* 1. Fondo Corporativo Premium: Rejilla Geométrica y Orbes Ambientales */}
      <div className="absolute inset-0 bg-corporate-grid opacity-30 dark:opacity-60 pointer-events-none" />
      <div className="absolute inset-0 bg-corporate-dots opacity-20 dark:opacity-40 pointer-events-none" />
      
      {/* Orbes de Iluminación Ambiental */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#0F69B4]/15 dark:bg-[#0F69B4]/30 rounded-full blur-3xl animate-float-slow pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[30rem] h-[30rem] bg-[#00508F]/20 dark:bg-[#00508F]/40 rounded-full blur-3xl animate-float-reverse pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-72 h-72 bg-[#E4002B]/10 dark:bg-[#E4002B]/15 rounded-full blur-3xl animate-pulse-subtle pointer-events-none" />

      {/* Barra Bicromática Superior Oficial Gobierno de Chile */}
      <div className="relative z-10 gob-flag-bar shadow-md" />

      {/* Botón flotante de Switch Día / Noche */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Contenedor Principal Centrado */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
          
          {/* Tarjeta de Autenticación Glassmorphic */}
          <div className="rounded-3xl shadow-xl dark:shadow-2xl dark:shadow-black/80 overflow-hidden border border-slate-200 dark:border-[#1E3B66]/60 bg-white/95 dark:bg-[#0C1729]/95 backdrop-blur-2xl transition-colors duration-200">
            
            {/* Cabecera con Logotipo Oficial e Identidad */}
            <div className="p-7 sm:p-8 pb-6 text-center border-b border-slate-200 dark:border-[#1A2E4C] bg-slate-50/90 dark:bg-[#08101E]/90 transition-colors">
              <div className="transform hover:scale-105 transition-transform duration-200 inline-block">
                <ChileAtiendeLogo size="panel" className="mx-auto" />
              </div>
              
              <div className="mt-4 pt-3.5 border-t border-slate-200/80 dark:border-[#1A2E4C]/80">
                <h1 className="text-base sm:text-lg font-black text-[#003B70] dark:text-white tracking-tight">
                  Sistema de Gestión de Activos TI (ITAM)
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                  Control de Inventario & Bodegas • Instituto de Previsión Social (IPS)
                </p>

                {/* Badge de Plataforma Segura */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mt-3 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  <Server className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Autenticación Institucional DTI</span>
                </div>
              </div>
            </div>

            {/* Cuerpo del Formulario */}
            <div className="p-7 sm:p-8 pt-6 bg-white dark:bg-[#0C1729]/95 space-y-5 transition-colors">
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#E4002B] dark:text-[#F87171] mt-0.5" />
                  <span className="leading-relaxed font-medium">{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-200 font-bold mb-1.5">
                    Usuario Institucional / RUT / Correo *
                  </label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-[#003B70] dark:group-focus-within:text-[#38BDF8] transition-colors pointer-events-none" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Ej: admin / 14.238.990-1 / patricio.silva@chileatiende.cl"
                      className="gov-input gov-input-with-icon font-medium transition-all duration-200 focus:shadow-md"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-slate-700 dark:text-slate-200 font-bold">Contraseña *</label>
                    <span className="text-[11px] text-slate-400 font-medium">Seguridad DTI / TLS</span>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-[#003B70] dark:group-focus-within:text-[#38BDF8] transition-colors pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ingrese su clave asignada..."
                      className="gov-input gov-input-with-both-icons font-mono font-medium transition-all duration-200 focus:shadow-md"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#003B70] dark:hover:text-[#38BDF8] p-1 transition-colors"
                      title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Enlace para Recuperar Contraseña */}
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotModalOpen(true);
                        setForgotIdentifier(identifier || '');
                      }}
                      className="text-[11px] font-semibold text-[#003B70] hover:text-[#0055A5] dark:text-[#38BDF8] dark:hover:text-[#7DD3FC] transition-colors flex items-center gap-1 hover:underline"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full gov-btn-primary py-3 text-xs font-bold shadow-md dark:shadow-lg dark:shadow-[#003B70]/40 bg-[#003B70] dark:bg-gradient-to-r dark:from-[#003B70] dark:via-[#0055A5] dark:to-[#004282] hover:bg-[#002A50] dark:hover:from-[#002A50] dark:hover:to-[#003B70] transition-all duration-200 group"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Validando credenciales...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2 text-sm">
                        Ingresar a la Plataforma 
                        <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Pie de Página Institucional */}
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

      {/* Modal de Recuperación de Contraseña */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md bg-white dark:bg-[#0C1729] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#1E3B66] overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Modal */}
            <div className="p-6 pb-4 border-b border-slate-200 dark:border-[#1A2E4C] bg-slate-50/80 dark:bg-[#08101E]/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-[#003B70]/50 text-[#003B70] dark:text-[#38BDF8] flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Recuperar Contraseña
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Despacho seguro vía Relay institucional
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeForgotModal}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cuerpo del Modal */}
            <div className="p-6 space-y-4 text-xs">
              {forgotError && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#E4002B] dark:text-[#F87171] mt-0.5" />
                  <span className="leading-relaxed font-medium">{forgotError}</span>
                </div>
              )}

              {forgotSuccess ? (
                <div className="py-4 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-700/60 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                      ¡Correo Enviado Exitosamente!
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
                      {forgotSuccess.message}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 rounded-xl border border-blue-200/60 dark:border-blue-800/40 text-[11px] text-slate-600 dark:text-slate-400 text-left">
                    💡 <strong>Nota:</strong> El enlace tiene una validez de <strong>60 minutos</strong>. Al abrir el correo, haga clic en el botón de restablecimiento para ingresar su nueva contraseña.
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={closeForgotModal}
                      className="w-full gov-btn-primary py-2.5 text-xs font-bold bg-[#003B70] hover:bg-[#002A50] text-white"
                    >
                      Entendido, volver al Login
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Ingrese su <strong>usuario</strong>, <strong>RUT</strong> o <strong>correo institucional</strong>. Le enviaremos un enlace oficial de recuperación con token de seguridad para crear una nueva clave de acceso.
                  </p>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-200 font-bold mb-1.5">
                      Identificador de Usuario / Correo *
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-[#003B70] dark:group-focus-within:text-[#38BDF8] transition-colors pointer-events-none" />
                      <input
                        type="text"
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        placeholder="Ej: admin / 14.238.990-1 / usuario@chileatiende.cl"
                        className="gov-input gov-input-with-icon font-medium"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={closeForgotModal}
                      className="flex-1 gov-btn-secondary py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isForgotLoading || !forgotIdentifier.trim()}
                      className="flex-1 gov-btn-primary py-2.5 text-xs font-bold bg-[#003B70] hover:bg-[#002A50] text-white disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isForgotLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Enviando...
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <Send className="w-3.5 h-3.5" />
                          Enviar Enlace
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Franja Bicromática Inferior Oficial */}
      <div className="relative z-10 gob-flag-bar shadow-lg" />
    </div>
  );
};

