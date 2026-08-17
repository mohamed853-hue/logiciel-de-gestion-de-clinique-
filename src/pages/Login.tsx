import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types';
import { Toast } from '../components/Toast';
import type { ToastMessage } from '../components/Toast';
import {
  Stethoscope,
  Heart,
  FlaskConical,
  Syringe,
  Activity,
  Shield,
  Users,
  Lock,
  Mail,
  ChevronRight,
  Sparkles,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';

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
  { role: 'receptionniste', label: 'Réceptionniste (Accueil, Caisse & Pharmacie)', icon: <Users className="w-4 h-4" />, color: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-300' },
  { role: 'radiologue', label: 'Radiologue', icon: <Activity className="w-4 h-4" />, color: 'text-cyan-700', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-300' },
];

// ─── SVG AVATAR 1 : Médecin classique avec blouse blanche ───────────────────
function DoctorAvatarClassic({ focusedInput, showPassword }: { focusedInput: 'email' | 'password' | null; showPassword: boolean }) {
  // Yeux fermés quand le mot de passe est VISIBLE (le docteur protège ta vie privée!)
  const eyesClosed = focusedInput === 'password' && showPassword;
  const lookingAtEmail = focusedInput === 'email';

  return (
    <svg viewBox="0 0 200 220" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Corps / Blouse blanche */}
      <rect x="50" y="145" width="100" height="75" rx="20" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2"/>
      {/* Col de blouse */}
      <path d="M 85 145 L 100 165 L 115 145" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1"/>
      {/* Poche blouse */}
      <rect x="58" y="158" width="22" height="16" rx="3" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1"/>
      {/* Stylo dans la poche */}
      <rect x="63" y="156" width="3" height="14" rx="1" fill="#3b82f6"/>
      <rect x="68" y="157" width="3" height="12" rx="1" fill="#10b981"/>

      {/* Stéthoscope */}
      <path d="M 72 148 Q 68 160 68 170 Q 68 185 85 185 Q 102 185 102 170 Q 102 160 115 148" fill="none" stroke="#0d9488" strokeWidth="4" strokeLinecap="round"/>
      <circle cx="85" cy="187" r="8" fill="#0d9488" stroke="#f0fdfa" strokeWidth="2"/>
      <circle cx="85" cy="187" r="4" fill="#f0fdfa"/>
      {/* Écouteurs */}
      <circle cx="68" cy="148" r="5" fill="#0d9488"/>
      <circle cx="115" cy="148" r="5" fill="#0d9488"/>

      {/* Cou */}
      <rect x="88" y="128" width="24" height="20" rx="8" fill="#f9dbc0"/>

      {/* Tête */}
      <ellipse cx="100" cy="100" rx="48" ry="52" fill="#f9dbc0"/>

      {/* Cheveux */}
      <path d="M 55 88 Q 52 60 75 52 Q 100 42 125 52 Q 148 60 145 88 Q 140 70 125 65 Q 100 58 75 65 Q 60 70 55 88 Z" fill="#1e293b"/>
      {/* Mèche */}
      <path d="M 95 55 Q 100 48 108 52 Q 104 58 98 60 Z" fill="#334155"/>

      {/* Sourcils expressifs */}
      {eyesClosed ? (
        <>
          <path d="M 72 82 Q 82 78 92 82" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M 108 82 Q 118 78 128 82" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round"/>
        </>
      ) : lookingAtEmail ? (
        <>
          <path d="M 72 80 Q 82 76 92 80" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M 108 80 Q 118 76 128 80" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round"/>
        </>
      ) : (
        <>
          <path d="M 72 82 Q 82 79 92 82" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M 108 82 Q 118 79 128 82" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round"/>
        </>
      )}

      {/* YEUX */}
      {eyesClosed ? (
        /* Yeux FERMÉS — avec mains qui couvrent (showPassword=true → il protège ta vie privée) */
        <g>
          {/* Arc yeux fermés */}
          <path d="M 72 94 Q 82 104 92 94" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round"/>
          <path d="M 108 94 Q 118 104 128 94" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round"/>
          {/* Mains qui couvrent */}
          <ellipse cx="82" cy="95" rx="14" ry="12" fill="#f4c4a0" stroke="#e8a87c" strokeWidth="2"/>
          <ellipse cx="118" cy="95" rx="14" ry="12" fill="#f4c4a0" stroke="#e8a87c" strokeWidth="2"/>
          {/* Doigts */}
          <path d="M 70 90 Q 68 84 73 83" fill="none" stroke="#e8a87c" strokeWidth="2" strokeLinecap="round"/>
          <path d="M 74 88 Q 72 81 77 80" fill="none" stroke="#e8a87c" strokeWidth="2" strokeLinecap="round"/>
          <path d="M 130 90 Q 132 84 127 83" fill="none" stroke="#e8a87c" strokeWidth="2" strokeLinecap="round"/>
          <path d="M 126 88 Q 128 81 123 80" fill="none" stroke="#e8a87c" strokeWidth="2" strokeLinecap="round"/>
        </g>
      ) : (
        /* Yeux OUVERTS */
        <g>
          {/* Blanc des yeux */}
          <ellipse cx="82" cy="95" rx="13" ry="12" fill="white"/>
          <ellipse cx="118" cy="95" rx="13" ry="12" fill="white"/>
          {/* Iris */}
          <circle cx={lookingAtEmail ? 85 : 82} cy={lookingAtEmail ? 97 : 95} r="7" fill="#1e40af"/>
          <circle cx={lookingAtEmail ? 121 : 118} cy={lookingAtEmail ? 97 : 95} r="7" fill="#1e40af"/>
          {/* Pupille */}
          <circle cx={lookingAtEmail ? 85 : 82} cy={lookingAtEmail ? 97 : 95} r="4" fill="#0f172a"/>
          <circle cx={lookingAtEmail ? 121 : 118} cy={lookingAtEmail ? 97 : 95} r="4" fill="#0f172a"/>
          {/* Reflet */}
          <circle cx={lookingAtEmail ? 87 : 84} cy={lookingAtEmail ? 95 : 93} r="2" fill="white"/>
          <circle cx={lookingAtEmail ? 123 : 120} cy={lookingAtEmail ? 95 : 93} r="2" fill="white"/>
          {/* Paupières */}
          <path d="M 69 90 Q 82 85 95 90" fill="none" stroke="#d4a574" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M 105 90 Q 118 85 131 90" fill="none" stroke="#d4a574" strokeWidth="1.5" strokeLinecap="round"/>
        </g>
      )}

      {/* Nez */}
      <path d="M 97 100 Q 95 112 97 115 Q 100 118 103 115 Q 105 112 103 100" fill="none" stroke="#e8a87c" strokeWidth="1.5" strokeLinecap="round"/>

      {/* Bouche */}
      {eyesClosed ? (
        <path d="M 88 122 Q 100 130 112 122" fill="none" stroke="#c97d5e" strokeWidth="3" strokeLinecap="round"/>
      ) : (
        <path d="M 87 122 Q 100 132 113 122" fill="none" stroke="#c97d5e" strokeWidth="3" strokeLinecap="round"/>
      )}

      {/* Joues */}
      <ellipse cx="72" cy="112" rx="10" ry="6" fill="#fca5a5" opacity="0.4"/>
      <ellipse cx="128" cy="112" rx="10" ry="6" fill="#fca5a5" opacity="0.4"/>

      {/* Oreilles */}
      <ellipse cx="53" cy="102" rx="7" ry="10" fill="#f9dbc0" stroke="#e8a87c" strokeWidth="1"/>
      <ellipse cx="147" cy="102" rx="7" ry="10" fill="#f9dbc0" stroke="#e8a87c" strokeWidth="1"/>

      {/* Croix médicale sur la blouse */}
      <rect x="94" y="172" width="12" height="4" rx="2" fill="#ef4444"/>
      <rect x="97" y="169" width="6" height="10" rx="2" fill="#ef4444"/>
    </svg>
  );
}

// ─── SVG AVATAR 2 : Médecin femme moderne ───────────────────────────────────
function DoctorAvatarModern({ focusedInput, showPassword }: { focusedInput: 'email' | 'password' | null; showPassword: boolean }) {
  const eyesClosed = focusedInput === 'password' && showPassword;
  const lookingAtEmail = focusedInput === 'email';

  return (
    <svg viewBox="0 0 200 220" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Fond dégradé */}
      <defs>
        <radialGradient id="skinGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fde8d0"/>
          <stop offset="100%" stopColor="#f9c9a0"/>
        </radialGradient>
        <radialGradient id="blouseGrad" cx="50%" cy="0%" r="100%">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="100%" stopColor="#f1f5f9"/>
        </radialGradient>
      </defs>

      {/* Corps blouse */}
      <path d="M 45 155 Q 45 210 55 215 H 145 Q 155 210 155 155 Q 135 148 100 148 Q 65 148 45 155 Z" fill="url(#blouseGrad)" stroke="#e2e8f0" strokeWidth="1.5"/>
      {/* Col V */}
      <path d="M 82 148 L 100 172 L 118 148" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5"/>
      {/* Poche */}
      <rect x="55" y="162" width="26" height="18" rx="4" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1"/>
      <rect x="60" y="160" width="3" height="15" rx="1.5" fill="#6366f1"/>
      <rect x="65" y="161" width="3" height="13" rx="1.5" fill="#ec4899"/>
      <rect x="70" y="160" width="3" height="14" rx="1.5" fill="#f59e0b"/>

      {/* Stéthoscope élégant */}
      <path d="M 75 152 C 68 165 65 178 65 188 C 65 200 80 206 100 206 C 120 206 135 200 135 188 C 135 178 132 165 125 152" fill="none" stroke="#0d9488" strokeWidth="3.5" strokeLinecap="round"/>
      <circle cx="100" cy="207" r="7" fill="#0d9488"/>
      <circle cx="100" cy="207" r="3.5" fill="#f0fdfa"/>
      <circle cx="75" cy="152" r="4.5" fill="#0d9488"/>
      <circle cx="125" cy="152" r="4.5" fill="#0d9488"/>

      {/* Cou */}
      <rect x="86" y="130" width="28" height="22" rx="10" fill="url(#skinGrad)"/>

      {/* Tête */}
      <ellipse cx="100" cy="100" rx="50" ry="54" fill="url(#skinGrad)"/>

      {/* Oreilles */}
      <ellipse cx="51" cy="103" rx="8" ry="11" fill="url(#skinGrad)" stroke="#f4b896" strokeWidth="1"/>
      <ellipse cx="149" cy="103" rx="8" ry="11" fill="url(#skinGrad)" stroke="#f4b896" strokeWidth="1"/>
      {/* Boucles d'oreilles */}
      <circle cx="51" cy="112" r="3" fill="#f59e0b"/>
      <circle cx="149" cy="112" r="3" fill="#f59e0b"/>

      {/* Cheveux longs */}
      <path d="M 52 88 Q 48 55 68 46 Q 100 35 132 46 Q 152 55 148 88 Q 145 65 128 58 Q 100 48 72 58 Q 55 65 52 88 Z" fill="#7c3aed"/>
      {/* Raie au milieu */}
      <path d="M 100 38 Q 100 55 100 65" fill="none" stroke="#6d28d9" strokeWidth="2"/>
      {/* Mèches latérales */}
      <path d="M 52 88 Q 50 120 54 140 Q 58 150 62 148" fill="none" stroke="#7c3aed" strokeWidth="8" strokeLinecap="round"/>
      <path d="M 148 88 Q 150 120 146 140 Q 142 150 138 148" fill="none" stroke="#7c3aed" strokeWidth="8" strokeLinecap="round"/>
      {/* Mèches courbes en haut */}
      <path d="M 72 58 Q 60 52 62 44 Q 70 38 80 42" fill="#7c3aed"/>
      <path d="M 128 58 Q 140 52 138 44 Q 130 38 120 42" fill="#7c3aed"/>

      {/* Sourcils */}
      {eyesClosed ? (
        <>
          <path d="M 70 80 Q 82 75 92 79" fill="none" stroke="#6d28d9" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M 108 79 Q 118 75 130 80" fill="none" stroke="#6d28d9" strokeWidth="2.5" strokeLinecap="round"/>
        </>
      ) : (
        <>
          <path d="M 70 82 Q 82 77 92 81" fill="none" stroke="#6d28d9" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M 108 81 Q 118 77 130 82" fill="none" stroke="#6d28d9" strokeWidth="2.5" strokeLinecap="round"/>
        </>
      )}

      {/* YEUX */}
      {eyesClosed ? (
        <g>
          {/* Paupières fermées + cils */}
          <path d="M 70 94 Q 82 104 94 94" fill="none" stroke="#6d28d9" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M 106 94 Q 118 104 130 94" fill="none" stroke="#6d28d9" strokeWidth="2.5" strokeLinecap="round"/>
          {/* Mains */}
          <ellipse cx="82" cy="95" rx="14" ry="11" fill="#fde8d0" stroke="#f4b896" strokeWidth="2"/>
          <ellipse cx="118" cy="95" rx="14" ry="11" fill="#fde8d0" stroke="#f4b896" strokeWidth="2"/>
          {/* Cils fermés */}
          <path d="M 72 94 Q 70 89 73 87" stroke="#6d28d9" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <path d="M 76 92 Q 75 87 78 85" stroke="#6d28d9" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <path d="M 128 94 Q 130 89 127 87" stroke="#6d28d9" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <path d="M 124 92 Q 125 87 122 85" stroke="#6d28d9" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        </g>
      ) : (
        <g>
          <ellipse cx="82" cy="95" rx="13" ry="12" fill="white" stroke="#f4b896" strokeWidth="0.5"/>
          <ellipse cx="118" cy="95" rx="13" ry="12" fill="white" stroke="#f4b896" strokeWidth="0.5"/>
          {/* Iris violet */}
          <circle cx={lookingAtEmail ? 85 : 82} cy={lookingAtEmail ? 97 : 95} r="7" fill="#7c3aed"/>
          <circle cx={lookingAtEmail ? 121 : 118} cy={lookingAtEmail ? 97 : 95} r="7" fill="#7c3aed"/>
          {/* Pupille */}
          <circle cx={lookingAtEmail ? 85 : 82} cy={lookingAtEmail ? 97 : 95} r="4" fill="#1e1b4b"/>
          <circle cx={lookingAtEmail ? 121 : 118} cy={lookingAtEmail ? 97 : 95} r="4" fill="#1e1b4b"/>
          {/* Reflets */}
          <circle cx={lookingAtEmail ? 87 : 84} cy={lookingAtEmail ? 95 : 93} r="2" fill="white"/>
          <circle cx={lookingAtEmail ? 87 : 84} cy={lookingAtEmail ? 99 : 97} r="1" fill="white" opacity="0.5"/>
          <circle cx={lookingAtEmail ? 123 : 120} cy={lookingAtEmail ? 95 : 93} r="2" fill="white"/>
          {/* Cils */}
          <path d="M 69 89 Q 82 83 95 89" fill="none" stroke="#6d28d9" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M 105 89 Q 118 83 131 89" fill="none" stroke="#6d28d9" strokeWidth="1.5" strokeLinecap="round"/>
          {/* Cils individuels */}
          <line x1="71" y1="91" x2="69" y2="86" stroke="#6d28d9" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="76" y1="88" x2="75" y2="83" stroke="#6d28d9" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="107" y1="91" x2="109" y2="86" stroke="#6d28d9" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="124" y1="88" x2="125" y2="83" stroke="#6d28d9" strokeWidth="1.5" strokeLinecap="round"/>
        </g>
      )}

      {/* Nez délicat */}
      <path d="M 97 102 Q 96 113 98 116 Q 100 118 102 116 Q 104 113 103 102" fill="none" stroke="#f4b896" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M 96 116 Q 100 119 104 116" fill="none" stroke="#f4b896" strokeWidth="1.5" strokeLinecap="round"/>

      {/* Bouche / lèvres */}
      {eyesClosed ? (
        <path d="M 88 124 Q 100 131 112 124" fill="none" stroke="#e879a0" strokeWidth="2.5" strokeLinecap="round"/>
      ) : (
        <>
          <path d="M 87 123 Q 100 132 113 123" fill="#fda4c0" stroke="#e879a0" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M 92 123 Q 100 128 108 123" fill="#f9a8d4"/>
          <path d="M 87 123 Q 100 121 113 123" fill="none" stroke="#e879a0" strokeWidth="1" strokeLinecap="round"/>
        </>
      )}

      {/* Joues roses */}
      <ellipse cx="71" cy="113" rx="11" ry="7" fill="#fda4c0" opacity="0.35"/>
      <ellipse cx="129" cy="113" rx="11" ry="7" fill="#fda4c0" opacity="0.35"/>

      {/* Tableau de bord / Badge médecin */}
      <rect x="130" y="165" width="22" height="28" rx="4" fill="#ede9fe" stroke="#7c3aed" strokeWidth="1.5"/>
      <text x="141" y="178" textAnchor="middle" fontSize="8" fill="#7c3aed" fontWeight="bold">DR</text>
      <rect x="133" y="182" width="16" height="2" rx="1" fill="#c4b5fd"/>
      <rect x="133" y="186" width="12" height="2" rx="1" fill="#c4b5fd"/>
    </svg>
  );
}

export function Login() {
  const [email, setEmail] = useState('demo@alshifa.com');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('admin');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'email' | 'password' | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [avatarIndex, setAvatarIndex] = useState(0); // 0 = classique, 1 = moderne

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email || 'demo@alshifa.com', password || 'demo123', role);
      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Connexion réussie !',
        description: 'Bienvenue sur votre espace de travail Al Shifa.'
      });
      setTimeout(() => navigate('/dashboard'), 800);
    } catch (err: any) {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Échec de connexion',
        description: err.message || 'Identifiants incorrects. Veuillez réessayer.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedOption = roleOptions.find(o => o.role === role);
  const AvatarComponent = avatarIndex === 0 ? DoctorAvatarClassic : DoctorAvatarModern;

  return (
    <div className="min-h-screen flex items-stretch overflow-hidden bg-slate-950 font-sans selection:bg-teal-500 selection:text-white">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* ======= PANNEAU GAUCHE — BRANDING & INTRO ======= */}
      <div
        className="hidden lg:flex flex-col justify-between w-[48%] relative p-12 overflow-hidden"
        style={{
          background: 'radial-gradient(circle at 10% 20%, #0f172a 0%, #092c42 50%, #064e3b 100%)',
        }}
      >
        {/* Logo & Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-white/10 flex items-center justify-center p-1">
              <img src="/logo.jpg" alt="Al Shifa" className="w-full h-full object-contain rounded-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-wider">AL SHIFA</h1>
              <p className="text-teal-400 text-xs font-semibold tracking-widest uppercase">Clinique Médicale Intelligence</p>
            </div>
          </div>
        </div>

        {/* Centre — Avatar animé avec switcher */}
        <div className="relative z-10 flex flex-col items-center text-center flex-1 justify-center py-6">
          <div className="relative mb-4 group">
            <div className="relative w-48 h-52 bg-slate-900 rounded-3xl border-2 border-teal-500/30 p-3 shadow-2xl flex items-center justify-center overflow-hidden">
              <AvatarComponent focusedInput={focusedInput} showPassword={showPassword} />
            </div>
          </div>

          {/* Bouton switcher d'avatar */}
          <button
            type="button"
            onClick={() => setAvatarIndex(prev => (prev + 1) % 2)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 hover:text-white text-xs font-semibold transition-all mb-6"
            title="Changer d'avatar"
          >
            <RefreshCw className="w-3 h-3" />
            {avatarIndex === 0 ? 'Avatara Dr. Sarah' : 'Avatar Dr. Karim'}
          </button>

          {/* Description réactive */}
          <div className="min-h-[48px] transition-all">
            {focusedInput === 'email' && (
              <p className="text-teal-300 text-sm font-semibold animate-pulse">👀 Je vois votre adresse email...</p>
            )}
            {focusedInput === 'password' && !showPassword && (
              <p className="text-yellow-300 text-sm font-semibold">🔐 Saisissez votre mot de passe</p>
            )}
            {focusedInput === 'password' && showPassword && (
              <p className="text-rose-300 text-sm font-semibold">🙈 Je regarde ailleurs, promis !</p>
            )}
            {!focusedInput && (
              <p className="text-slate-400 text-sm">Votre assistant médical numérique</p>
            )}
          </div>

          <h2 className="text-3xl font-black text-white mb-2 leading-tight">
            Plateforme Médicale <span className="text-teal-400">Intégrée</span>
          </h2>
          <p className="text-slate-300 text-sm max-w-sm leading-relaxed">
            Dossiers patients unifiés, pharmacie intelligente, laboratoire avec pièces jointes et facturation des soins.
          </p>
        </div>

        {/* Footer bas */}
        <div className="relative z-10 text-center">
          <p className="text-slate-400 text-xs font-medium">© 2026 Al Shifa · Système de Gestion Médicale Haute Performance</p>
        </div>
      </div>

      {/* ======= PANNEAU DROIT — FORMULAIRE DE CONNEXION ======= */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 bg-white relative overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Avatar mini au-dessus du form (visible sur mobile et desktop) */}
          <div className="flex flex-col items-center mb-6">
            {/* Mobile branding */}
            <div className="lg:hidden flex flex-col items-center mb-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg border border-teal-200 mb-2">
                <img src="/logo.jpg" alt="Al Shifa" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-xl font-black text-slate-800">AL SHIFA</h1>
              <p className="text-teal-600 text-xs font-bold">Clinique Médicale</p>
            </div>

            {/* Mini avatar au-dessus du champ email */}
            <div className="relative group">
              <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-teal-400/40 p-1.5 shadow-xl overflow-hidden flex items-center justify-center">
                <AvatarComponent focusedInput={focusedInput} showPassword={showPassword} />
              </div>
              {/* Bulle de statut */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-white text-[8px] font-bold">✓</span>
              </div>
            </div>

            {/* Petit texte réactif sous l'avatar */}
            <p className="text-xs text-slate-400 mt-2 h-4 transition-all text-center">
              {focusedInput === 'password' && showPassword ? '🙈 Je regarde ailleurs !' :
               focusedInput === 'password' ? '🔐 Mot de passe...' :
               focusedInput === 'email' ? '👀 Email en cours...' : 'Bienvenue !'}
            </p>
          </div>

          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-teal-600 animate-spin-slow" />
              <h2 className="text-2xl font-black text-slate-800">Espace Connexion</h2>
            </div>
            <p className="text-slate-500 text-sm">
              Choisissez votre rôle et accédez à vos fonctionnalités
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Adresse Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="demo@alshifa.com"
                  value={email}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all text-slate-800 text-sm font-semibold"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mot de Passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border-2 border-slate-200 rounded-xl outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all text-slate-800 text-sm font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition-colors p-1"
                  title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Sélection des Rôles */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Sélection du Rôle Métier
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                {roleOptions.map((opt) => (
                  <button
                    key={opt.role}
                    type="button"
                    onClick={() => setRole(opt.role)}
                    className={`p-2.5 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1 text-center ${
                      role === opt.role
                        ? `${opt.borderColor} ${opt.bgColor} shadow-md scale-[1.02]`
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span className={role === opt.role ? opt.color : 'text-slate-500'}>
                      {opt.icon}
                    </span>
                    <span className={`text-[11px] font-bold leading-tight ${role === opt.role ? opt.color : 'text-slate-600'}`}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>

              {selectedOption && (
                <div className={`mt-2 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold ${selectedOption.bgColor} ${selectedOption.color} border ${selectedOption.borderColor}`}>
                  <span className="flex items-center gap-2">
                    {selectedOption.icon}
                    Rôle actif : {selectedOption.label}
                  </span>
                  <span className="text-[10px] bg-white/80 px-2 py-0.5 rounded-md shadow-xs">Sélectionné</span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl font-extrabold text-white text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-xl hover:shadow-teal-500/25 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connexion sécurisée...
                </>
              ) : (
                <>
                  Accéder au Tableau de Bord
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Mode Démo Card */}
          <div className="mt-5 p-3.5 rounded-2xl bg-teal-50/80 border border-teal-200/80 text-xs text-teal-950 flex items-start gap-3 shadow-xs">
            <span className="text-base">🔑</span>
            <div>
              <p className="font-bold text-teal-900">Accès Démonstration Rapide</p>
              <p className="mt-0.5 text-teal-700">Email : <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold">demo@alshifa.com</code> | Pass : <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold">demo123</code></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
