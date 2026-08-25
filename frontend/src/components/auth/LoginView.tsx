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
  CheckCircle2
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
    <div className="min-h-screen flex flex-col justify-between bg-[#F4F6F8] text-slate-800 selection:bg-[#003B70] selection:text-white">
      {/* Barra Bicromática Superior */}
      <div className="gob-flag-bar" />

      {/* Contenedor Principal */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          {/* Tarjeta de Autenticación */}
          <div className="gov-card overflow-hidden shadow-xl border-slate-200">
            {/* Cabecera con Logotipo Oficial */}
            <div className="p-8 pb-6 text-center border-b border-slate-100 bg-white">
              <ChileAtiendeLogo size="panel" className="mx-auto" />
              
              <div className="mt-4 pt-3 border-t border-slate-100">
                <h2 className="text-base font-extrabold text-[#003B70] tracking-tight">
                  Sistema de Gestión de Activos TI (ITAM)
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Acceso Seguro • Instituto de Previsión Social (IPS)
                </p>
              </div>
            </div>

            {/* Formulario */}
            <div className="p-8 pt-6 bg-white space-y-5">
              {errorMessage && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#E4002B] mt-0.5" />
                  <span className="leading-relaxed font-medium">{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">
                    Usuario Institucional / RUT / Correo *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Ej: admin / 14.238.990-1 / patricio.silva@chileatiende.cl"
                      className="gov-input gov-input-with-icon font-medium"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-slate-700 font-bold">Contraseña *</label>
                    <span className="text-[11px] text-slate-400">Protegida por DTI</span>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ingrese su clave..."
                      className="gov-input gov-input-with-both-icons font-mono font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full gov-btn-primary py-2.5 text-xs font-bold shadow-md hover:shadow-lg transition-all"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Validando credenciales...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        Ingresar a la Plataforma <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </button>
                </div>
              </form>

              {/* Selector de Perfiles de Prueba (Demo Roles) */}
              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1 text-[#003B70]">
                    <KeyRound className="w-3.5 h-3.5" /> Acceso Rápido por Perfil (Demo)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-left">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin', 'admin123')}
                    className="p-2 rounded-lg bg-slate-50 hover:bg-[#EBF3FA] border border-slate-200 hover:border-[#003B70] transition-colors text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#003B70] text-xs">Administrador</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-[#003B70]" />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Control total y Usuarios</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('bodega', 'bodega123')}
                    className="p-2 rounded-lg bg-slate-50 hover:bg-[#EBF3FA] border border-slate-200 hover:border-[#003B70] transition-colors text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs">Jefe Bodega</span>
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Guías, stock y recepciones</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('tecnico', 'tecnico123')}
                    className="p-2 rounded-lg bg-slate-50 hover:bg-[#EBF3FA] border border-slate-200 hover:border-[#003B70] transition-colors text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs">Técnico Soporte</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Asignaciones y actas</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('auditor', 'auditor123')}
                    className="p-2 rounded-lg bg-slate-50 hover:bg-[#EBF3FA] border border-slate-200 hover:border-[#003B70] transition-colors text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs">Auditor / CGR</span>
                      <User className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Solo lectura y reportes</p>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Pie de Página */}
          <div className="mt-6 text-center text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">
              Instituto de Previsión Social • Gobierno de Chile
            </p>
            <p className="text-[11px] text-slate-400">
              Para soporte de cuentas y accesos: Anexo <strong>8700</strong> o soporteti@chileatiende.cl
            </p>
          </div>
        </div>
      </div>

      {/* Franja Bicromática Inferior */}
      <div className="gob-flag-bar" />
    </div>
  );
};
