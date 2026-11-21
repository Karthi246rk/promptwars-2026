import { useState } from 'react';
import type { CitizenProfile } from '../types';
import { loginCitizen, registerCitizen, verifyCitizenOtp, requestPasswordResetOtp, resetPassword } from '../api';
import { translations, type Language } from '../i18n';

interface CitizenAuthModalProps {
  isOpen: boolean;
  onSuccess: (citizen: CitizenProfile) => void;
  onClose?: () => void;
  canClose?: boolean;
  currentLang?: Language;
}

export default function CitizenAuthModal({
  isOpen,
  onSuccess,
  onClose,
  canClose = false,
  currentLang = 'en',
}: CitizenAuthModalProps) {
  const t = translations[currentLang];
  const [mode, setMode] = useState<'login' | 'register' | 'otp' | 'forgot_step1' | 'forgot_step2'>('login');

  // Login inputs
  const [loginEmail, setLoginEmail] = useState('citizen@civicresolve.in');
  const [loginPassword, setLoginPassword] = useState('citizen123');

  // Register inputs
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // OTP inputs
  const [otpTempId, setOtpTempId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [demoOtp, setDemoOtp] = useState('482910');

  // Forgot Password inputs
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotDemoOtp, setForgotDemoOtp] = useState('654321');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState<string | null>(null);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await loginCitizen(loginEmail.trim(), loginPassword);
      sessionStorage.setItem('civicresolve_citizen_user', JSON.stringify(res.citizen));
      sessionStorage.setItem('civicresolve_citizen_token', res.token);
      onSuccess(res.citizen);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoCitizenLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await loginCitizen('citizen@civicresolve.in', 'citizen123');
      sessionStorage.setItem('civicresolve_citizen_user', JSON.stringify(res.citizen));
      sessionStorage.setItem('civicresolve_citizen_token', res.token);
      onSuccess(res.citizen);
    } catch (err: any) {
      setError(err.message || 'Demo citizen sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await registerCitizen({
        name: regName.trim(),
        email: regEmail.trim(),
        mobile: regMobile.trim(),
        password: regPassword,
      });
      setOtpTempId(res.tempId);
      setDemoOtp(res.demoOtp || '482910');
      setMode('otp');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const code = otpCode.trim() || demoOtp;
      const res = await verifyCitizenOtp(otpTempId, code);
      sessionStorage.setItem('civicresolve_citizen_user', JSON.stringify(res.citizen));
      sessionStorage.setItem('civicresolve_citizen_token', res.token);
      onSuccess(res.citizen);
    } catch (err: any) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await requestPasswordResetOtp(forgotEmail.trim(), 'citizen');
      if (res.demoOtp) setForgotDemoOtp(res.demoOtp);
      setMode('forgot_step2');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (forgotNewPassword !== forgotConfirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await resetPassword({
        email: forgotEmail.trim(),
        userType: 'citizen',
        otp: forgotOtp.trim() || forgotDemoOtp,
        newPassword: forgotNewPassword,
      });
      setForgotSuccessMsg('Password reset successfully! Please sign in with your new password.');
      setLoginEmail(forgotEmail.trim());
      setLoginPassword(forgotNewPassword);
      setMode('login');
      setTimeout(() => setForgotSuccessMsg(null), 8000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-slate-800 overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-700 text-white p-6 text-center relative">
          {canClose && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold"
            >
              ✕
            </button>
          )}
          <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2.5 shadow-inner">
            🇮🇳
          </div>
          <h3 className="text-lg font-bold">Citizen Portal Access Gate</h3>
          <p className="text-indigo-100 text-xs mt-0.5">
            Verified Indian citizen authentication for reporting municipal grievances & tracking case files
          </p>
        </div>

        {/* 1-Click Demo Citizen Sign-in Banner */}
        <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
              <span>⚡</span> Demo Evaluator Access
            </div>
            <div className="text-[11px] text-indigo-700 dark:text-indigo-400 font-mono">
              citizen@civicresolve.in (Score: 100)
            </div>
          </div>
          <button
            type="button"
            onClick={handleDemoCitizenLogin}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition-colors shadow-xs cursor-pointer shrink-0"
          >
            1-Click Demo Login →
          </button>
        </div>

        {/* Mode Switch Tabs */}
        {mode !== 'otp' && !mode.startsWith('forgot') && (
          <div className="flex border-b border-gray-200 dark:border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-3 text-center transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                  : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Citizen Sign-In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-3 text-center transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                  : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              First-Time Signup (Mobile OTP)
            </button>
          </div>
        )}

        <div className="p-6 space-y-4">
          {forgotSuccessMsg && (
            <div className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 text-xs p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 font-medium animate-fadeIn">
              ✅ {forgotSuccessMsg}
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-xs p-3 rounded-xl border border-red-200 dark:border-red-900/60 font-medium animate-fadeIn">
              ⚠️ {error}
            </div>
          )}

          {/* Form 1: Citizen Login */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Email or Mobile Number
                </label>
                <input
                  type="text"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="citizen@civicresolve.in"
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-700 rounded-xl text-xs dark:bg-slate-800 dark:text-white outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(loginEmail.includes('@') ? loginEmail : '');
                      setMode('forgot_step1');
                      setError(null);
                    }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {t.forgotPassword}
                  </button>
                </div>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-700 rounded-xl text-xs dark:bg-slate-800 dark:text-white outline-none focus:border-indigo-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md cursor-pointer mt-2"
              >
                {loading ? 'Authenticating...' : 'Sign In as Citizen →'}
              </button>
            </form>
          )}

          {/* Form 1.1: Forgot Password Step 1 (Send OTP) */}
          {mode === 'forgot_step1' && (
            <form onSubmit={handleForgotStep1Submit} className="space-y-4 animate-fadeIn">
              <div className="text-center pb-1">
                <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100">{t.resetPasswordTitle}</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Enter your registered email address to receive a 6-digit OTP</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="citizen@civicresolve.in"
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-700 rounded-xl text-xs dark:bg-slate-800 dark:text-white outline-none focus:border-indigo-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md cursor-pointer"
              >
                {loading ? 'Sending OTP...' : t.sendOtpBtn}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  ← {t.backToLogin}
                </button>
              </div>
            </form>
          )}

          {/* Form 1.2: Forgot Password Step 2 (Reset Password) */}
          {mode === 'forgot_step2' && (
            <form onSubmit={handleForgotStep2Submit} className="space-y-3.5 animate-fadeIn">
              <div className="text-center pb-1">
                <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100">{t.resetPasswordTitle}</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Enter the OTP sent to your email and your new password</p>
              </div>

              {/* Subtle Evaluator Demo Banner */}
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 p-2.5 rounded-xl text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold">⚡ Demo Reset OTP:</span> <code className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded text-amber-900 dark:text-amber-100 font-bold">{forgotDemoOtp}</code>
                </div>
                <button
                  type="button"
                  onClick={() => setForgotOtp(forgotDemoOtp)}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold px-2 py-1 rounded cursor-pointer"
                >
                  Auto-Fill
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  {t.otpLabel}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value)}
                  placeholder="654321"
                  required
                  className="w-full text-center tracking-widest text-base font-mono px-3.5 py-2 border border-gray-300 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  {t.newPasswordLabel}
                </label>
                <input
                  type="password"
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2 border border-gray-300 dark:border-slate-700 rounded-xl text-xs dark:bg-slate-800 dark:text-white outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  {t.confirmPasswordLabel}
                </label>
                <input
                  type="password"
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2 border border-gray-300 dark:border-slate-700 rounded-xl text-xs dark:bg-slate-800 dark:text-white outline-none focus:border-indigo-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md cursor-pointer mt-1"
              >
                {loading ? 'Resetting Password...' : t.resetPasswordBtn}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  ← {t.backToLogin}
                </button>
              </div>
            </form>
          )}

          {/* Form 2: Citizen Register */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Full Citizen Name
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-xl text-xs dark:bg-slate-800 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-xl text-xs dark:bg-slate-800 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Mobile Number (India)
                </label>
                <input
                  type="tel"
                  value={regMobile}
                  onChange={(e) => setRegMobile(e.target.value)}
                  placeholder="+91 98765 43210"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-xl text-xs dark:bg-slate-800 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Create Password
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-xl text-xs dark:bg-slate-800 dark:text-white outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md cursor-pointer mt-2"
              >
                {loading ? 'Sending OTP...' : 'Send Mobile Verification OTP →'}
              </button>
            </form>
          )}

          {/* Form 3: OTP Verification */}
          {mode === 'otp' && (
            <form onSubmit={handleVerifyOtpSubmit} className="space-y-4 animate-fadeIn">
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200">
                <span className="font-bold">📱 One-Time Mobile Verification:</span> An SMS OTP has been generated for <strong>{regMobile}</strong>.
              </div>

              {/* Hackathon Demo OTP Banner */}
              <div className="bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-300 dark:border-emerald-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                    Demo Mobile OTP (Evaluator)
                  </span>
                  <span className="text-xl font-mono font-black text-emerald-950 dark:text-emerald-200 tracking-widest">
                    {demoOtp}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOtpCode(demoOtp);
                    setTimeout(() => handleVerifyOtpSubmit(), 50);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors shadow-xs"
                >
                  ⚡ Auto-Fill & Verify
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Enter 6-Digit Mobile OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="482910"
                  autoFocus
                  required
                  className="w-full text-center tracking-widest text-lg font-mono px-3.5 py-2.5 border border-gray-300 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="w-1/3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-slate-300 font-bold py-2.5 rounded-xl text-xs"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md cursor-pointer"
                >
                  {loading ? 'Verifying...' : 'Verify OTP & Complete Signup'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
