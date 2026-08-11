import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types';
import {
  Stethoscope,
  Heart,
  FlaskConical,
  Syringe,
  Activity,
  FileText,
  Shield,
  Users,
  Pill,
  CreditCard,
  Lock,
  Mail,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

// Rôles affichés dans le login (caissier et pharmacien_chef inclus)
interface RoleOption {
  role: UserRole;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

const roleOptions: RoleOption[] = [
  { role: 'admin', label: 'Administrateur', icon: <Shield className="w-4 h-4" />, color: 'text-slate-700', bgColor: 'bg-slate-50', borderColor: 'border-slate-300' },
  { role: 'medecin', label: 'Médecin', icon: <Stethoscope className="w-4 h-4" />, color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300' },
  { role: 'gynecologue', label: 'Gynécologue', icon: <Heart className="w-4 h-4" />, color: 'text-pink-700', bgColor: 'bg-pink-50', borderColor: 'border-pink-300' },
  { role: 'infirmier', label: 'Infirmier/ère', icon: <Syringe className="w-4 h-4" />, color: 'text-teal-700', bgColor: 'bg-teal-50', borderColor: 'border-teal-300' },
  { role: 'laborantin', label: 'Laborantin', icon: <FlaskConical className="w-4 h-4" />, color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-300' },
  { role: 'receptionniste', label: 'Réceptionniste', icon: <Users className="w-4 h-4" />, color: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-300' },
  { role: 'radiologue', label: 'Radiologue', icon: <Activity className="w-4 h-4" />, color: 'text-cyan-700', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-300' },
  { role: 'secretary', label: 'Secrétaire', icon: <FileText className="w-4 h-4" />, color: 'text-violet-700', bgColor: 'bg-violet-50', borderColor: 'border-violet-300' },
  { role: 'pharmacien', label: 'Pharmacien', icon: <Pill className="w-4 h-4" />, color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-300' },
  { role: 'pharmacien_chef', label: 'Pharmacien Chef', icon: <Pill className="w-4 h-4" />, color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-300' },
  { role: 'caissier', label: 'Caissier/ère', icon: <CreditCard className="w-4 h-4" />, color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-300' },
];

export function Login() {
  const [email, setEmail] = useState('demo@alshifa.com');
  const [password, setPassword] = useState('demo123');
  const [role, setRole] = useState<UserRole>('admin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email || 'demo@alshifa.com', password || 'demo123', role);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion. Veuillez réessayer.');
      console.error('Login failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedOption = roleOptions.find(o => o.role === role);

  return (
    <div className="min-h-screen flex items-stretch overflow-hidden bg-slate-900">
      {/* ======= PANNEAU GAUCHE — BRANDING ======= */}
      <div
        className="hidden lg:flex flex-col justify-between w-[45%] relative p-10 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #0c4a6e 70%, #164e63 100%)',
        }}
      >
        {/* Cercles décoratifs */}
        <div className="absolute top-[-80px] left-[-80px] w-[350px] h-[350px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #38bdf8, transparent)' }} />
        <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />
        <div className="absolute top-[40%] left-[60%] w-[200px] h-[200px] rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #34d399, transparent)' }} />

        {/* Logo + Titre */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-white/10 backdrop-blur flex items-center justify-center flex-shrink-0">
              <img src="/logo.jpg" alt="Al Shifa" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-wide">AL SHIFA</h1>
              <p className="text-sky-300 text-sm font-medium">Clinique Médicale</p>
            </div>
          </div>
        </div>

        {/* Centre — Grand logo et slogan */}
        <div className="relative z-10 flex flex-col items-center text-center flex-1 justify-center">
          <div className="w-48 h-48 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(56,189,248,0.3)] border-2 border-white/20 mb-8 bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <img src="/logo.jpg" alt="Al Shifa Clinique" className="w-full h-full object-contain p-2" />
          </div>

          <h2 className="text-4xl font-black text-white mb-3 leading-tight">
            Bienvenue à<br />
            <span className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(90deg, #38bdf8, #818cf8, #34d399)' }}>
              Al Shifa
            </span>
          </h2>
          <p className="text-slate-300 text-base max-w-xs leading-relaxed">
            Système de gestion clinique moderne, rapide et sécurisé pour votre établissement de santé.
          </p>

          {/* Features */}
          <div className="mt-8 grid grid-cols-1 gap-3 w-full max-w-xs">
            {[
              { icon: '🏥', text: '8 services médicaux intégrés' },
              { icon: '🔒', text: 'Données sécurisées & confidentielles' },
              { icon: '⚡', text: 'Interface rapide & intuitive' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/8 rounded-xl px-4 py-2.5 text-left backdrop-blur-sm border border-white/10">
                <span className="text-xl">{f.icon}</span>
                <span className="text-slate-200 text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer bas */}
        <div className="relative z-10">
          <p className="text-slate-500 text-xs text-center">© 2026 Al Shifa Clinique Médicale · v1.0</p>
        </div>
      </div>

      {/* ======= PANNEAU DROIT — FORMULAIRE ======= */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-10 bg-white relative overflow-y-auto">
        {/* Header mobile */}
        <div className="lg:hidden flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-xl border-2 border-sky-200 mb-3">
            <img src="/logo.jpg" alt="Al Shifa" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-black text-slate-800">AL SHIFA</h1>
          <p className="text-slate-500 text-sm">Clinique Médicale</p>
        </div>

        <div className="w-full max-w-md">
          {/* Titre */}
          <div className="mb-7">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-sky-500" />
              <h2 className="text-2xl font-black text-slate-800">Connexion</h2>
            </div>
            <p className="text-slate-500 text-sm">
              Connectez-vous à votre espace de travail Al Shifa
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Adresse Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="demo@alshifa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:ring-3 focus:ring-sky-100 transition-all text-slate-800 placeholder-slate-300 text-sm font-medium"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Mot de Passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:ring-3 focus:ring-sky-100 transition-all text-slate-800 placeholder-slate-300 text-sm font-medium"
                />
              </div>
            </div>

            {/* Sélection du rôle */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Mon Rôle
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
                {roleOptions.map((opt) => (
                  <button
                    key={opt.role}
                    type="button"
                    onClick={() => setRole(opt.role)}
                    className={`p-2.5 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1.5 text-center ${
                      role === opt.role
                        ? `${opt.borderColor} ${opt.bgColor} shadow-md scale-[1.02]`
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span className={role === opt.role ? opt.color : 'text-slate-500'}>
                      {opt.icon}
                    </span>
                    <span className={`text-[11px] font-semibold leading-tight ${role === opt.role ? opt.color : 'text-slate-600'}`}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Rôle sélectionné */}
              {selectedOption && (
                <div className={`mt-2.5 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${selectedOption.bgColor} ${selectedOption.color} border ${selectedOption.borderColor}`}>
                  {selectedOption.icon}
                  <span>Sélectionné : <strong>{selectedOption.label}</strong></span>
                </div>
              )}
            </div>

            {/* Erreur */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            {/* Bouton connexion */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-sky-500/30 hover:-translate-y-0.5 active:translate-y-0"
              style={{
                background: isLoading
                  ? '#94a3b8'
                  : 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              }}
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  Se connecter
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Info démo */}
          <div className="mt-5 p-4 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-800">
            <p className="font-bold mb-1">🔑 Mode démonstration</p>
            <p>Email : <code className="bg-sky-100 px-1.5 py-0.5 rounded font-mono">demo@alshifa.com</code></p>
            <p className="mt-0.5">Mot de passe : <code className="bg-sky-100 px-1.5 py-0.5 rounded font-mono">demo123</code></p>
            <p className="mt-0.5 text-sky-600">Sélectionnez votre rôle puis cliquez sur Connexion.</p>
          </div>

          {/* Footer */}
          <p className="text-center text-slate-400 text-xs mt-5">
            © 2026 Clinique Al Shifa · Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  );
}
