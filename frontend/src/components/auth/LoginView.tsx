import React, { useState } from 'react';
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
  Sparkles
} from 'lucide-react';
import { ChileAtiendeLogo } from '../common/ChileAtiendeLogo';
import { ApiClient } from '../../api/client';
import { PlatformUser } from '../../types/user';

interface LoginViewProps {
  onLoginSuccess: (user: PlatformUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState<string>('admin');
  const [password, setPassword] = useState<string>('admin123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        onLoginSuccess(response.user);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de autenticación. Verifique sus credenciales.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoUser: string, demoPass: string) => {
    setIdentifier(demoUser);
    setPassword(demoPass);
    setErrorMessage(null);
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#001226] via-[#002244] to-[#00386B] text-slate-800 selection:bg-[#E4002B] selection:text-white">
      {/* 1. Fondo Corporativo Premium: Rejilla Geométrica y Orbes Ambientales */}
      <div className="absolute inset-0 bg-corporate-grid opacity-60 pointer-events-none" />
      <div className="absolute inset-0 bg-corporate-dots opacity-40 pointer-events-none" />
      
      {/* Orbes de Iluminación Ambiental */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#0F69B4]/30 rounded-full blur-3xl animate-float-slow pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[30rem] h-[30rem] bg-[#00508F]/40 rounded-full blur-3xl animate-float-reverse pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-72 h-72 bg-[#E4002B]/15 rounded-full blur-3xl animate-pulse-subtle pointer-events-none" />

      {/* Barra Bicromática Superior Oficial Gobierno de Chile */}
      <div className="relative z-10 gob-flag-bar shadow-md" />

      {/* Contenedor Principal Centrado */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
          
          {/* Tarjeta de Autenticación Glassmorphic Dark */}
          <div className="rounded-3xl shadow-2xl shadow-black/80 overflow-hidden border border-[#1E3B66]/60 bg-[#0C1729]/95 backdrop-blur-2xl">
            
            {/* Cabecera con Logotipo Oficial e Identidad */}
            <div className="p-7 sm:p-8 pb-6 text-center border-b border-[#1A2E4C] bg-[#08101E]/90">
              <div className="transform hover:scale-105 transition-transform duration-200 inline-block">
                <ChileAtiendeLogo size="panel" className="mx-auto" />
              </div>
              
              <div className="mt-4 pt-3.5 border-t border-[#1A2E4C]/80">
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Sistema de Gestión de Activos TI (ITAM)
                </h1>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  Control de Inventario & Bodegas • Instituto de Previsión Social (IPS)
                </p>

                {/* Badge de Active Directory Multi-Dominio */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mt-3 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[11px] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <Server className="w-3 h-3 text-emerald-400" />
                  <span>Active Directory Dual (CHA & IPS)</span>
                </div>
              </div>
            </div>

            {/* Cuerpo del Formulario */}
            <div className="p-7 sm:p-8 pt-6 bg-[#0C1729]/95 space-y-5">
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800/80 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#F87171] mt-0.5" />
                  <span className="leading-relaxed font-medium">{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-200 font-bold mb-1.5">
                    Usuario Institucional / RUT / Correo *
                  </label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#38BDF8] transition-colors pointer-events-none" />
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
                    <label className="block text-slate-200 font-bold">Contraseña *</label>
                    <span className="text-[11px] text-slate-400 font-medium">Seguridad DTI / TLS</span>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#38BDF8] transition-colors pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ingrese su clave institucional..."
                      className="gov-input gov-input-with-both-icons font-mono font-medium transition-all duration-200 focus:shadow-md"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#38BDF8] p-1 transition-colors"
                      title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full gov-btn-primary py-3 text-xs font-bold shadow-lg shadow-[#003B70]/40 bg-gradient-to-r from-[#003B70] via-[#0055A5] to-[#004282] hover:from-[#002A50] hover:to-[#003B70] transition-all duration-200 group"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Autenticando en Directorio Activo...
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

              {/* Selector de Perfiles de Prueba (Demo Roles) con Micro-interacciones */}
              <div className="pt-4 border-t border-[#1A2E4C] space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 text-[#38BDF8]">
                    <KeyRound className="w-3.5 h-3.5 text-[#38BDF8]" /> Acceso Rápido por Perfil (Demo)
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">Click para autocompletar</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-left">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin', 'admin123')}
                    className="p-2.5 rounded-xl bg-[#101F36] hover:bg-[#162D4F] border border-[#1E385F] hover:border-[#38BDF8] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#38BDF8] text-xs group-hover:text-white">Administrador</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-[#38BDF8] transition-transform duration-200 group-hover:scale-110" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Control total y Usuarios</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('bodega', 'bodega123')}
                    className="p-2.5 rounded-xl bg-[#101F36] hover:bg-[#162D4F] border border-[#1E385F] hover:border-[#38BDF8] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 text-xs group-hover:text-white">Jefe Bodega</span>
                      <Building2 className="w-3.5 h-3.5 text-blue-400 transition-transform duration-200 group-hover:scale-110" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Guías, stock y traspasos</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('tecnico', 'tecnico123')}
                    className="p-2.5 rounded-xl bg-[#101F36] hover:bg-[#162D4F] border border-[#1E385F] hover:border-[#38BDF8] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 text-xs group-hover:text-white">Técnico Soporte</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 transition-transform duration-200 group-hover:scale-110" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Asignaciones y actas</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('auditor', 'auditor123')}
                    className="p-2.5 rounded-xl bg-[#101F36] hover:bg-[#162D4F] border border-[#1E385F] hover:border-[#38BDF8] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 text-xs group-hover:text-white">Auditor / CGR</span>
                      <User className="w-3.5 h-3.5 text-purple-400 transition-transform duration-200 group-hover:scale-110" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Solo lectura y reportes</p>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Pie de Página Institucional */}
          <div className="mt-6 text-center text-xs text-slate-300/80 space-y-1">
            <p className="font-semibold text-white/90">
              Instituto de Previsión Social • Gobierno de Chile
            </p>
            <p className="text-[11px] text-slate-300/70">
              Mesa de Ayuda DTI: Anexo <strong>8700</strong> | soporteti@chileatiende.cl
            </p>
          </div>
        </div>
      </div>

      {/* Franja Bicromática Inferior Oficial */}
      <div className="relative z-10 gob-flag-bar shadow-lg" />
    </div>
  );
};
