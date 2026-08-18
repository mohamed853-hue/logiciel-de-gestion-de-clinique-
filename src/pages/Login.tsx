import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../hooks/useLanguage';
import { Toast } from '../components/Toast';
import type { ToastMessage } from '../components/Toast';
import { AnimatedAvatar } from '../components/AnimatedAvatar';
import { Lock, Mail, ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   BULLES DÉCORATIVES FLOTTANTES
──────────────────────────────────────────────────────────────────────────── */
const ORBS = [
  { w: 340, h: 340, top: '-60px', left: '-80px',  bg: 'radial-gradient(circle, rgba(20,184,166,0.14), transparent 70%)' },
  { w: 280, h: 280, top: '55%',  left: '-40px',   bg: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)' },
  { w: 320, h: 320, top: '-50px', right: '-60px',  bg: 'radial-gradient(circle, rgba(16,185,129,0.12), transparent 70%)' },
  { w: 240, h: 240, bottom: '2%', right: '-30px',  bg: 'radial-gradient(circle, rgba(20,184,166,0.10), transparent 70%)' },
];

export function Login() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [isSuccess, setIsSuccess]       = useState(false);
  const [isError, setIsError]           = useState(false);
  const [focusedInput, setFocusedInput] = useState<'email' | 'password' | null>(null);
  const [toast, setToast]               = useState<ToastMessage | null>(null);
  const [mounted, setMounted]           = useState(false);

  const { login }                     = useAuth();
  const { language, setLanguage, isArabic, t } = useLanguage();
  const navigate                      = useNavigate();
  const emailRef                      = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      emailRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsError(false);
    try {
      await login(email, password);
      setIsSuccess(true);
      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: isArabic ? 'تم تسجيل الدخول بنجاح !' : 'Connexion réussie !',
        description: isArabic ? 'مرحباً بكم في منصة الشفاء الطبية.' : 'Bienvenue sur la plateforme Al Shifa.'
      });
      setTimeout(() => navigate('/dashboard'), 850);
    } catch (err: any) {
      setIsError(true);
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: isArabic ? 'فشل تسجيل الدخول' : 'Échec de connexion',
        description: err.message || (isArabic ? 'بيانات الدخول غير صحيحة.' : 'Identifiants incorrects.')
      });
      setTimeout(() => setIsError(false), 2500);
    } finally {
      setIsLoading(false);
    }
  };

  /* Message interactif de l'avatar selon la langue choisie */
  const avatarMsg = isSuccess
    ? (isArabic ? '🎉 تم التحقق من هويتكم ! جاري التوجيه...' : '🎉 Connexion validée ! Redirection en cours...')
    : isError
    ? (isArabic ? '❌ بيانات الدخول غير صحيحة، يرجى المحاولة' : '❌ Identifiants incorrects, veuillez réessayer.')
    : focusedInput === 'password' && showPassword
    ? (isArabic ? '👀 ألقي نظرة حذرة...' : '👀 Je jette un petit coup d\'œil...')
    : focusedInput === 'password'
    ? (isArabic ? '🙈 العينان مغلقتان، السرية محفوظة تماماً !' : '🙈 Yeux bien fermés, mot de passe protégé !')
    : focusedInput === 'email'
    ? (email.includes('@')
        ? (isArabic ? '✅ عنوان بريد إلكتروني صالح ومسجل' : '✅ Adresse email valide reconnue !')
        : (isArabic ? '📧 يرجى كتابة عنوان بريدك الإلكتروني...' : '📧 Saisissez votre adresse email...'))
    : (isArabic ? 'مساعدكم الذكي لمستوصف الشفاء' : 'Votre assistant de connexion Al Shifa');

  const avatarColor = isSuccess ? '#059669' : isError ? '#e11d48' : focusedInput === 'password' ? (showPassword ? '#d97706' : '#7c3aed') : focusedInput === 'email' ? '#0d9488' : '#475569';

  return (
    <div
      dir={isArabic ? 'rtl' : 'ltr'}
      className="min-h-screen flex overflow-hidden selection:bg-teal-500 selection:text-white"
      style={{ background: '#f8fafc', fontFamily: isArabic ? "'Cairo', 'Inter', system-ui, sans-serif" : "'Inter', system-ui, sans-serif" }}
    >
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* ── Styles embarqués ─────────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Cairo:wght@400;600;700;800;900&display=swap');
        
        .ar-font { font-family: 'Cairo', 'Inter', system-ui, sans-serif; }

        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-5px); }
        }
        .avatar-bob { animation: bob 4s ease-in-out infinite; }

        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0   rgba(20,184,166,0.35); }
          50%      { box-shadow: 0 0 0 10px rgba(20,184,166,0.06); }
        }
        .pulse-ring { animation: pulse-ring 3s ease-in-out infinite; }

        @keyframes shimmer-btn {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }

        .login-field {
          width: 100%;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          color: #0f172a;
          font-size: 15px;
          font-weight: 500;
          outline: none;
          transition: border-color .2s, box-shadow .2s;
        }
        .login-field::placeholder { color: #94a3b8; }
        .login-field:focus {
          border-color: #14b8a6;
          box-shadow: 0 0 0 4px rgba(20,184,166,0.12);
        }
        .login-field.err { border-color: #f43f5e; box-shadow: 0 0 0 4px rgba(244,63,94,0.10); }

        .btn-submit {
          width: 100%;
          border: none;
          cursor: pointer;
          border-radius: 14px;
          font-weight: 700;
          letter-spacing: .02em;
          transition: transform .18s, filter .18s;
          position: relative;
          overflow: hidden;
        }
        .btn-submit::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%);
          background-size: 200% 100%;
          animation: shimmer-btn 2.5s linear infinite;
        }
        .btn-submit:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.06); }
        .btn-submit:active:not(:disabled) { transform: translateY(0); }
        .btn-submit:disabled { opacity: .65; cursor: not-allowed; }

        .clean-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 18px;
          border-radius: 999px;
          background: rgba(255,255,255,0.92);
          border: 1px solid rgba(20,184,166,0.25);
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          backdrop-filter: blur(8px);
        }
      `}</style>

      {/* ════════════════════════════════════════════════════════════════════════
          PANNEAU GAUCHE — BRANDING CLINIQUE AL SHIFA (desktop)
      ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex flex-col w-[44%] relative overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at 30% 40%, #0f766e 0%, #0d2d3a 50%, #020817 100%)',
        }}
      >
        {/* Grille décorative */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Orbes de lumière */}
        <div className="absolute" style={{ width: 450, height: 450, top: '25%', left: '50%', transform: 'translate(-50%,-50%)', background: 'radial-gradient(circle, rgba(20,184,166,0.22) 0%, transparent 65%)', borderRadius: '50%', filter: 'blur(50px)' }} />
        <div className="absolute" style={{ width: 300, height: 300, bottom: '8%', left: '10%', background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)', borderRadius: '50%', filter: 'blur(40px)' }} />

        {/* Contenu branding */}
        <div className="relative z-10 flex flex-col h-full p-12 justify-between">
          {/* Logo & Titre Haut */}
          <div className={`flex items-center gap-4 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <div style={{
              width: 58, height: 58, borderRadius: 18,
              background: 'rgba(255,255,255,0.12)',
              border: '1.5px solid rgba(255,255,255,0.3)',
              overflow: 'hidden', padding: 4,
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
            }}>
              <img src="/logo.jpg" alt="Al Shifa" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 14 }} />
            </div>
            <div>
              <div className="text-white font-black text-2xl tracking-wider leading-none">
                {isArabic ? 'مستوصف الشفاء الطبي' : 'AL SHIFA'}
              </div>
              <div className="text-teal-300 text-xs font-bold tracking-wider uppercase mt-1">
                {isArabic ? 'عيادة ومستوصف طبي متكامل' : 'Clinique Médicale & Dispensaire'}
              </div>
            </div>
          </div>

          {/* Centre — Message de Bienvenue Chaleureux dans la langue active */}
          <div className="flex flex-col items-center text-center gap-6 my-auto">
            {/* Grand badge logo central */}
            <div style={{
              width: 115, height: 115, borderRadius: 32,
              background: 'linear-gradient(135deg, rgba(20,184,166,0.35), rgba(16,185,129,0.25))',
              border: '2px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 25px 60px rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,255,255,0.3)',
              padding: 10,
            }}>
              <img src="/logo.jpg" alt="Logo Grand" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 22 }} />
            </div>

            {/* Phrases de bienvenue */}
            <div className="space-y-3 max-w-md">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isArabic ? 'مستوصف الشفاء يرحب بكم' : 'Le Dispensaire Al Shifa vous souhaite la bienvenue'}</span>
              </div>

              <div>
                <h2 className="text-white font-black text-3xl leading-tight mb-2">
                  {isArabic ? 'مستوصف الشفاء الطبي يرحب بكم' : 'Bienvenue chez Al Shifa'}
                </h2>
                <p className="text-teal-200 font-medium text-base leading-relaxed">
                  {isArabic
                    ? 'فضاء عمل طبي متكامل لإدارة المرضى، الاستشارات، التحاليل والصيدلية بكل أمان وسلاسة.'
                    : 'Le Dispensaire Médical Al Shifa vous souhaite la bienvenue dans votre espace sécurisé.'}
                </p>
              </div>
            </div>

            {/* Piliers du dispensaire */}
            <div className="flex gap-6 mt-4 pt-4 border-t border-white/10">
              <div className="text-center">
                <div className="text-teal-300 font-black text-base">{isArabic ? 'عناية فائقة' : 'Soins Dédiés'}</div>
                <div className="text-slate-300 text-xs mt-0.5">{isArabic ? 'أعلى معايير الجودة' : 'Qualité & Rigueur'}</div>
              </div>
              <div className="w-px h-8 bg-white/15" />
              <div className="text-center">
                <div className="text-teal-300 font-black text-base">{isArabic ? 'سرية تامة' : 'Confidentialité'}</div>
                <div className="text-slate-300 text-xs mt-0.5">{isArabic ? 'بيانات طبية محمية' : 'Données Sécurisées'}</div>
              </div>
              <div className="w-px h-8 bg-white/15" />
              <div className="text-center">
                <div className="text-teal-300 font-black text-base">{isArabic ? 'جاهزية 24/7' : 'Disponibilité'}</div>
                <div className="text-slate-300 text-xs mt-0.5">{isArabic ? 'خدمة متواصلة' : 'Service Continu'}</div>
              </div>
            </div>
          </div>

          {/* Footer gauche */}
          <div className="text-center text-slate-400 text-xs">
            <p>© 2026 {isArabic ? 'مستوصف الشفاء الطبي · نظام التدبير الصحي المتطور' : 'Clinique Al Shifa · Système de Gestion Médicale Haute Performance'}</p>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          PANNEAU DROIT — FORMULAIRE AVEC LOGO EN GROS & AVATAR EN HAUT
      ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className="flex-1 flex flex-col items-center justify-center relative overflow-y-auto"
        style={{ background: '#f1f5f9', padding: '32px 20px' }}
      >
        {/* Orbes fond clair */}
        {ORBS.map((o, i) => (
          <div key={i} className="absolute pointer-events-none" style={{
            width: o.w, height: o.h,
            top: o.top, left: (o as any).left, right: (o as any).right, bottom: (o as any).bottom,
            background: o.bg, borderRadius: '50%', filter: 'blur(50px)',
          }} />
        ))}

        {/* Bouton de bascule de langue en haut */}
        <div className={`absolute top-5 ${isArabic ? 'left-6' : 'right-6'} z-20`}>
          <button
            type="button"
            onClick={() => setLanguage(language === 'fr' ? 'ar' : 'fr')}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 shadow-sm text-xs font-black flex items-center gap-2 transition-all text-slate-800 hover:scale-105 cursor-pointer"
            title={language === 'fr' ? 'Passer en Arabe (العربية)' : 'Passer en Français'}
          >
            <span className="text-base">{language === 'fr' ? '🇸🇦' : '🇫🇷'}</span>
            <span className="font-bold">{language === 'fr' ? 'العربية' : 'Français'}</span>
          </button>
        </div>

        {/* Carte de connexion blanche */}
        <div
          className={`relative z-10 w-full transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          style={{
            maxWidth: 460,
            background: '#ffffff',
            borderRadius: 28,
            boxShadow: '0 4px 6px rgba(0,0,0,0.03), 0 20px 50px rgba(15,23,42,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}
        >
          {/* ── BANDEAU HAUT COLORÉ AVEC LOGO EN GROS & AVATAR ── */}
          <div style={{
            background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 50%, #0d9488 100%)',
            padding: '28px 36px 0',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            position: 'relative',
          }}>
            {/* LOGO EN GROS DE LA CLINIQUE AL SHIFA */}
            <div className="flex items-center gap-3.5 mb-4 bg-white/15 px-5 py-2.5 rounded-2xl border border-white/30 backdrop-blur-md shadow-md">
              <div style={{
                width: 48, height: 48, borderRadius: 14, overflow: 'hidden',
                background: '#fff', padding: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                flexShrink: 0,
              }}>
                <img src="/logo.jpg" alt="Logo Clinique Al Shifa" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 12 }} />
              </div>
              <div className={isArabic ? 'text-right' : 'text-left'}>
                <div className="text-white font-black text-lg tracking-wider leading-tight">
                  {isArabic ? 'مستوصف الشفاء الطبي' : 'CLINIQUE AL SHIFA'}
                </div>
                <div className="text-teal-100 text-[10px] font-bold tracking-widest uppercase">
                  {isArabic ? 'فضاء الدخول الآمن' : 'Espace Professionnel Sécurisé'}
                </div>
              </div>
            </div>

            {/* ── AVATAR INTERACTIF CENTRÉ EN HAUT ── */}
            <div className="avatar-bob" style={{ marginBottom: -48 }}>
              <div className="pulse-ring" style={{
                width: 132, height: 132,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.18)',
                border: '3px solid rgba(255,255,255,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(6px)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.25), inset 0 2px 0 rgba(255,255,255,0.3)',
              }}>
                <AnimatedAvatar
                  focusedInput={focusedInput}
                  emailValue={email}
                  showPassword={showPassword}
                  isSubmitting={isLoading}
                  isSuccess={isSuccess}
                  isError={isError}
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>

          {/* ── CORPS DU FORMULAIRE (FOND BLANC NET ET ÉPURÉ) ── */}
          <div style={{ padding: '60px 36px 36px', background: '#fff' }}>

            {/* Bulle interactive réactive de l'avatar */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div className="clean-pill">
                <span className="text-xs font-bold" style={{ color: avatarColor }}>
                  {avatarMsg}
                </span>
              </div>
            </div>

            {/* Titre & Message de Bienvenue dans la langue sélectionnée */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h1 className="font-black text-2xl text-slate-900 leading-tight mb-1">
                {isArabic ? 'مرحباً بكم في فضائكم الصحي الآمن' : 'Bienvenue dans votre espace sécurisé'}
              </h1>
              <p className="text-slate-500 text-sm">
                {isArabic
                  ? 'سجل دخولك للوصول إلى مساحة عملك الطبية'
                  : 'Connectez-vous pour accéder à votre espace de travail.'}
              </p>
            </div>

            {/* ── FORMULAIRE DE CONNEXION ── */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Champ Adresse Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 px-1">
                  {t('login.email_label', 'Adresse Email')}
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{
                    position: 'absolute',
                    [isArabic ? 'right' : 'left']: 14,
                    top: '50%', transform: 'translateY(-50%)',
                    width: 18, height: 18,
                    color: focusedInput === 'email' ? '#0d9488' : '#94a3b8',
                    transition: 'color .2s',
                  }} />
                  <input
                    ref={emailRef}
                    type="email"
                    required
                    placeholder={t('login.email_placeholder', 'nom@alshifa.com')}
                    value={email}
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput(null)}
                    onChange={e => setEmail(e.target.value)}
                    className={`login-field${isError ? ' err' : ''}`}
                    style={{
                      paddingLeft: isArabic ? 16 : 44,
                      paddingRight: isArabic ? 44 : 16,
                      paddingTop: 13,
                      paddingBottom: 13,
                    }}
                  />
                </div>
              </div>

              {/* Champ Mot de Passe */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 px-1">
                  {t('login.password_label', 'Mot de Passe')}
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{
                    position: 'absolute',
                    [isArabic ? 'right' : 'left']: 14,
                    top: '50%', transform: 'translateY(-50%)',
                    width: 18, height: 18,
                    color: focusedInput === 'password' ? '#0d9488' : '#94a3b8',
                    transition: 'color .2s',
                  }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder={t('login.password_placeholder', '••••••••••')}
                    value={password}
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput(null)}
                    onChange={e => setPassword(e.target.value)}
                    className={`login-field${isError ? ' err' : ''}`}
                    style={{
                      paddingLeft: isArabic ? 48 : 44,
                      paddingRight: isArabic ? 44 : 48,
                      paddingTop: 13,
                      paddingBottom: 13,
                    }}
                  />
                  {/* Bouton pour afficher / masquer le mot de passe sans perte de focus */}
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      position: 'absolute',
                      [isArabic ? 'left' : 'right']: 14,
                      top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                      color: showPassword ? '#0d9488' : '#94a3b8',
                      transition: 'color .2s', display: 'flex', alignItems: 'center',
                    }}
                    tabIndex={-1}
                    title={showPassword ? (isArabic ? 'إخفاء' : 'Masquer') : (isArabic ? 'إظهار' : 'Afficher')}
                  >
                    {showPassword ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
                  </button>
                </div>
              </div>

              {/* Bouton de Connexion */}
              <button
                id="btn-login-submit"
                type="submit"
                disabled={isLoading || isSuccess}
                className="btn-submit"
                style={{
                  padding: '14px 20px',
                  marginTop: 6,
                  background: isSuccess
                    ? 'linear-gradient(135deg, #059669, #10b981)'
                    : 'linear-gradient(135deg, #0f766e, #14b8a6 60%, #0d9488)',
                  color: '#fff',
                  boxShadow: '0 6px 20px rgba(20,184,166,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {isLoading ? (
                  <>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff', display: 'inline-block',
                      animation: 'spin .7s linear infinite',
                    }} />
                    <span>{t('btn.login_loading', 'Connexion en cours...')}</span>
                  </>
                ) : isSuccess ? (
                  <span>{isArabic ? '✓ تم التحقق بنجاح !' : '✓ Connexion autorisée !'}</span>
                ) : (
                  <>
                    <span className="text-base font-bold">{t('btn.login', 'Accéder à mon espace')}</span>
                    <ArrowRight className={isArabic ? 'rotate-180 w-4 h-4' : 'w-4 h-4'} />
                  </>
                )}
              </button>

              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </form>

            {/* Note de Sécurité et Confidentialité */}
            <div style={{
              marginTop: 22, paddingTop: 16,
              borderTop: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                border: '1px solid #a7f3d0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ShieldCheck style={{ width: 20, height: 20, color: '#059669' }} />
              </div>
              <div className={isArabic ? 'text-right' : 'text-left'}>
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  {isArabic ? 'دخول محمي ومشفر بالكامل' : 'Accès sécurisé et personnalisé'}
                </p>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  {isArabic
                    ? 'يتم توجيهكم تلقائياً حسب حسابكم الطبي المعتمد.'
                    : 'Votre espace de travail est attribué automatiquement selon votre compte.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <p className="text-center mt-6 text-slate-400 text-xs">
          © 2026 {isArabic ? 'مستوصف الشفاء الطبي · جميع الحقوق محفوظة' : 'Dispensaire Médical Al Shifa · Plateforme de Santé Intelligente'}
        </p>
      </div>
    </div>
  );
}
