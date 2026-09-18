import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  Phone,
  RotateCw,
  User as UserIcon,
  Sparkles,
  CheckCircle2,
  Users,
  Heart,
} from 'lucide-react';
import Logo from '../Components/Logo';
import { useAuth } from '../lib/auth';

export default function AuthPage({
  initialMode,
  onSuccess,
  onSwitchMode,
  onNavigateHome,
}) {
  const { signIn, signUp, requestSignupOtp, requestSignInOtp } = useAuth();

  const [mode, setMode] = useState(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [signupCode, setSignupCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [userType, setUserType] = useState('customer');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [loginOtpRequired, setLoginOtpRequired] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [resetRequested, setResetRequested] = useState(false);
  const [errors, setErrors] = useState({});

  const switchMode = (newMode) => {
    setMode(newMode);
    setOtp('');
    setOtpSent(false);
    setLoginOtpRequired(false);
    setOtpCooldown(0);
    setResetRequested(false);
    setErrors({});
    onSwitchMode(newMode);
  };

  useEffect(() => {
    if (otpCooldown <= 0) return undefined;

    const timer = window.setInterval(() => {
      setOtpCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpCooldown]);

  const validate = () => {
    const e = {};

    if (mode === 'signup') {
      if (!fullName.trim()) {
        e.fullName = 'Please enter your name';
      } else if (fullName.trim().length < 2) {
        e.fullName = 'Name must be at least 2 characters';
      }

      if (!phone.trim()) {
        e.phone = 'Please enter your phone number';
      } else if (!/^\+?[\d\s-]{10,15}$/.test(phone.trim())) {
        e.phone = 'Enter a valid phone number';
      }

      if (!confirmPassword.trim()) {
        e.confirmPassword = 'Please confirm your password';
      } else if (password !== confirmPassword) {
        e.confirmPassword = 'Passwords do not match';
      }

      if (otpSent && (!otp.trim() || !/^\d{6}$/.test(otp.trim()))) {
        e.otp = 'Please enter the 6-digit OTP sent to your email';
      }
    }

    if (mode === 'forgot-password') {
      if (!email.trim()) {
        e.email = 'Please enter your email';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        e.email = 'Enter a valid email address';
      }

      if (resetRequested && (!otp.trim() || !/^\d{6}$/.test(otp.trim()))) {
        e.otp = 'Please enter the 6-digit reset code';
      }

      if (resetRequested && (!password.trim() || password.length < 6)) {
        e.password = 'Password must be at least 6 characters';
      }
    }

    if (mode === 'login' && loginOtpRequired && (!otp.trim() || !/^\d{6}$/.test(otp.trim()))) {
      e.otp = 'Please enter the 6-digit secure login code';
    }

    if (mode !== 'forgot-password' && !email.trim()) {
      e.email = 'Please enter your email';
    } else if (mode !== 'forgot-password' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      e.email = 'Enter a valid email address';
    }

    if (mode !== 'forgot-password' && !password.trim()) {
      e.password = 'Please enter your password';
    } else if (mode !== 'forgot-password' && password.length < 6) {
      e.password = 'Password must be at least 6 characters';
    }

    setErrors(e);

    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();

    if (loading) return;

    setErrors({});

    if (!validate()) return;

    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!otpSent) {
          const { error } = await requestSignupOtp({
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            password,
            userType,
            signupCode: signupCode.trim(),
          });

          if (error) {
            const cleanError = String(error || '').toLowerCase();
            const isAlreadyRegistered =
              cleanError.includes('already registered') ||
              cleanError.includes('already exists') ||
              cleanError.includes('email already') ||
              cleanError.includes('account with this email');

            if (isAlreadyRegistered) {
              setMode('login');
              setEmail(email.trim());
              setPassword('');
              setOtp('');
              setOtpSent(false);
              setErrors({
                general: 'An account with this email already exists. Please log in instead.',
              });
              return;
            }

            setErrors({ general: error });
            return;
          }

          setOtpSent(true);
          setOtpCooldown(30);
          setErrors({ general: 'OTP sent to your email. Please verify it to continue.' });
          return;
        }

        const { error } = await signUp({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          userType,
          otp: otp.trim(),
          signupCode: signupCode.trim(),
        });

        if (error) {
          setErrors({ general: error });
          return;
        }

        onSuccess(userType);
      } else if (mode === 'forgot-password') {
        if (!resetRequested) {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5005/api'}/auth/password/reset/request`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim() }),
          });

          const payload = await response.json().catch(() => null);
          if (!response.ok) {
            setErrors({ general: payload?.message || 'Unable to send reset code' });
            return;
          }

          setResetRequested(true);
          setErrors({ general: 'Reset code sent to your email. Enter the code and set a new password.' });
          return;
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5005/api'}/auth/password/reset`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            otp: otp.trim(),
            password,
          }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setErrors({ general: payload?.message || 'Password reset failed' });
          return;
        }

        setMode('login');
        setResetRequested(false);
        setPassword('');
        setOtp('');
        setErrors({ general: 'Password reset successful. You can now log in with your new password.' });
      } else {
        const { error } = await signIn(email.trim(), password, otp.trim() || undefined);

        if (error) {
          const cleanError = String(error || '').toLowerCase();
          const requiresLoginOtp =
            cleanError.includes('additional verification') ||
            cleanError.includes('otp_required') ||
            cleanError.includes('login verification') ||
            cleanError.includes('invalid login verification code');

          if (requiresLoginOtp) {
            setLoginOtpRequired(true);
            setOtp('');
            setOtpCooldown(30);
            setErrors({
              general: 'A secure login code has been sent to your email. Please enter it below.',
            });
            return;
          }

          setErrors({
            general:
              error === 'Invalid login credentials'
                ? 'Incorrect email or password'
                : error,
          });

          return;
        }

        setLoginOtpRequired(false);
        onSuccess('customer');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (loading || otpCooldown > 0) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrors({ email: 'Enter a valid email address first' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const result = mode === 'signup'
        ? await requestSignupOtp({
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            password,
            userType,
          })
        : await requestSignInOtp(email.trim());

      if (result.error) {
        setErrors({ general: result.error });
        return;
      }

      if (mode === 'login') setLoginOtpRequired(true);
      setOtpCooldown(30);
      setOtp('');
      setErrors({ general: 'A new OTP has been sent to your email.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffaf5] pt-20 pb-8">
      <div className="container-max section-pad">
        <div className="mx-auto max-w-md">

          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <button onClick={onNavigateHome}>
              <Logo size="lg" />
            </button>
          </div>

          <div className="rounded-4xl bg-white p-6 shadow-[0_8px_30px_rgba(83,67,43,0.08)] sm:p-8">

            {/* Mode Toggle */}
            {mode !== 'forgot-password' && (
              <div className="mb-6 flex rounded-full bg-[#fff0e3] p-1">
                <button
                  onClick={() => switchMode('login')}
                  className={`flex-1 rounded-full py-2.5 font-display text-sm font-bold transition-all ${
                    mode === 'login'
                      ? 'bg-[#ff7418] text-white shadow-soft'
                      : 'text-[#8a7a6a]'
                  }`}
                >
                  Log in
                </button>

                <button
                  onClick={() => switchMode('signup')}
                  className={`flex-1 rounded-full py-2.5 font-display text-sm font-bold transition-all ${
                    mode === 'signup'
                      ? 'bg-[#ff7418] text-white shadow-soft'
                      : 'text-[#8a7a6a]'
                  }`}
                >
                  Sign up
                </button>
              </div>
            )}

            <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#102038]">
              {mode === 'login'
                ? 'Welcome back'
                : mode === 'forgot-password'
                  ? 'Reset password'
                  : 'Create your account'}
            </h1>

            <p className="mt-1 text-sm text-[#6b7a8f]">
              {mode === 'login'
                ? 'Log in to continue your Haango journey.'
                : mode === 'forgot-password'
                  ? 'Enter your email to receive a reset code.'
                  : 'Join Haango and find your perfect companion.'}
            </p>

            {/* General Error */}
            {errors.general && (
              <div className="mt-4 rounded-2xl bg-error-50 px-4 py-3 text-sm font-medium text-error-600">
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">

              {/* User Type */}
              {mode === 'signup' && (
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#8a7a6a]">
                    I want to
                  </label>

                  <div className="grid grid-cols-2 gap-3">

                    <button
                      type="button"
                      onClick={() => setUserType('customer')}
                      className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-4 transition-all ${
                        userType === 'customer'
                          ? 'border-[#ff7418] bg-[#fff0e3]'
                          : 'border-[#ece3d8] hover:border-[#d4c8b8]'
                      }`}
                    >
                      <Sparkles
                        size={22}
                        className={
                          userType === 'customer'
                            ? 'text-[#ff7418]'
                            : 'text-[#a89a88]'
                        }
                      />

                      <span className="font-display text-sm font-bold text-[#102038]">
                        Find a Buddy
                      </span>

                      <span className="text-[10px] text-[#8a7a6a]">
                        Customer account
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setUserType('buddy')}
                      className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-4 transition-all ${
                        userType === 'buddy'
                          ? 'border-[#ff7418] bg-[#fff0e3]'
                          : 'border-[#ece3d8] hover:border-[#d4c8b8]'
                      }`}
                    >
                      <Heart
                        size={22}
                        className={
                          userType === 'buddy'
                            ? 'text-[#ff7418]'
                            : 'text-[#a89a88]'
                        }
                      />

                      <span className="font-display text-sm font-bold text-[#102038]">
                        Become a Buddy
                      </span>

                      <span className="text-[10px] text-[#8a7a6a]">
                        Earn & connect
                      </span>
                    </button>

                  </div>
                </div>
              )}

              {/* Full Name */}
              {mode === 'signup' && (
                <div>
                  <div className="relative">
                    <UserIcon
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a89a88]"
                    />

                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full name"
                      autoComplete="name"
                      className={`w-full rounded-2xl border-2 bg-[#fffaf5] py-3.5 pl-11 pr-4 text-sm text-[#102038] placeholder-[#a89a88] outline-none transition-all focus:border-[#ff7418] focus:bg-white ${
                        errors.fullName
                          ? 'border-error-400'
                          : 'border-[#ece3d8]'
                      }`}
                    />
                  </div>

                  {errors.fullName && (
                    <p className="mt-1.5 text-xs font-medium text-error-500">
                      {errors.fullName}
                    </p>
                  )}
                </div>
              )}

              {/* Email */}
              <div>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a89a88]"
                  />

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    autoComplete="email"
                    className={`w-full rounded-2xl border-2 bg-[#fffaf5] py-3.5 pl-11 pr-4 text-sm text-[#102038] placeholder-[#a89a88] outline-none transition-all focus:border-[#ff7418] focus:bg-white ${
                      errors.email
                        ? 'border-error-400'
                        : 'border-[#ece3d8]'
                    }`}
                  />
                </div>

                {errors.email && (
                  <p className="mt-1.5 text-xs font-medium text-error-500">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Phone */}
              {mode === 'signup' && (
                <div>
                  <div className="relative">
                    <Phone
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a89a88]"
                    />

                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone number"
                      autoComplete="tel"
                      className={`w-full rounded-2xl border-2 bg-[#fffaf5] py-3.5 pl-11 pr-4 text-sm text-[#102038] placeholder-[#a89a88] outline-none transition-all focus:border-[#ff7418] focus:bg-white ${
                        errors.phone
                          ? 'border-error-400'
                          : 'border-[#ece3d8]'
                      }`}
                    />
                  </div>

                  {errors.phone && (
                    <p className="mt-1.5 text-xs font-medium text-error-500">
                      {errors.phone}
                    </p>
                  )}
                </div>
              )}

              {/* Password */}
              {mode === 'signup' && (
                <div>
                  <input
                    type="text"
                    value={signupCode}
                    onChange={(event) => setSignupCode(event.target.value.toUpperCase())}
                    placeholder="Referral or coupon code (optional)"
                    className="w-full rounded-2xl border-2 border-[#ece3d8] bg-[#fffaf5] px-4 py-3.5 text-sm text-[#102038] placeholder-[#a89a88] outline-none focus:border-[#ff7418] focus:bg-white"
                  />
                </div>
              )}

              {/* Password */}
              {mode !== 'forgot-password' && (
                <div>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a89a88]"
                    />

                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      autoComplete={
                        mode === 'login'
                          ? 'current-password'
                          : 'new-password'
                      }
                      className={`w-full rounded-2xl border-2 bg-[#fffaf5] py-3.5 pl-11 pr-11 text-sm text-[#102038] placeholder-[#a89a88] outline-none transition-all focus:border-[#ff7418] focus:bg-white ${
                        errors.password
                          ? 'border-error-400'
                          : 'border-[#ece3d8]'
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a89a88] hover:text-[#102038]"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>

                  {errors.password && (
                    <p className="mt-1.5 text-xs font-medium text-error-500">
                      {errors.password}
                    </p>
                  )}
                </div>
              )}

              {/* Confirm Password */}
              {mode === 'signup' && (
                <div>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a89a88]"
                    />

                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) =>
                        setConfirmPassword(e.target.value)
                      }
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      className={`w-full rounded-2xl border-2 bg-[#fffaf5] py-3.5 pl-11 pr-4 text-sm text-[#102038] placeholder-[#a89a88] outline-none transition-all focus:border-[#ff7418] focus:bg-white ${
                        errors.confirmPassword
                          ? 'border-error-400'
                          : 'border-[#ece3d8]'
                      }`}
                    />
                  </div>

                  {errors.confirmPassword && (
                    <p className="mt-1.5 text-xs font-medium text-error-500">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              )}

              {/* OTP Verification */}
              {(mode === 'signup' && otpSent) || (mode === 'forgot-password' && resetRequested) || (mode === 'login' && loginOtpRequired) ? (
                <div>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a89a88]"
                    />

                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder={mode === 'forgot-password' ? 'Enter reset code' : mode === 'login' ? 'Enter secure login code' : 'Enter 6-digit OTP'}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      className={`w-full rounded-2xl border-2 bg-[#fffaf5] py-3.5 pl-11 pr-4 text-sm text-[#102038] placeholder-[#a89a88] outline-none transition-all focus:border-[#ff7418] focus:bg-white ${
                        errors.otp ? 'border-error-400' : 'border-[#ece3d8]'
                      }`}
                    />
                  </div>

                  {errors.otp && (
                    <p className="mt-1.5 text-xs font-medium text-error-500">
                      {errors.otp}
                    </p>
                  )}

                  {(mode === 'signup' || mode === 'login') && (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading || otpCooldown > 0}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#ff7418] transition-colors hover:text-[#ed5c07] disabled:cursor-not-allowed disabled:text-[#a89a88]"
                    >
                      <RotateCw size={13} />
                      {otpCooldown > 0 ? `Resend OTP in ${otpCooldown}s` : 'Resend OTP'}
                    </button>
                  )}
                </div>
              ) : null}

              {/* New password after reset */}
              {mode === 'forgot-password' && resetRequested && (
                <div>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a89a88]"
                    />

                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="New password"
                      autoComplete="new-password"
                      className={`w-full rounded-2xl border-2 bg-[#fffaf5] py-3.5 pl-11 pr-11 text-sm text-[#102038] placeholder-[#a89a88] outline-none transition-all focus:border-[#ff7418] focus:bg-white ${
                        errors.password ? 'border-error-400' : 'border-[#ece3d8]'
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a89a88] hover:text-[#102038]"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {errors.password && (
                    <p className="mt-1.5 text-xs font-medium text-error-500">
                      {errors.password}
                    </p>
                  )}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-3 rounded-full bg-[#ff7418] py-4 font-display text-sm font-bold text-white shadow-[0_12px_28px_rgba(255,116,24,0.25)] transition-all hover:bg-[#ed5c07] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />

                    {mode === 'login'
                      ? 'Logging in...'
                      : mode === 'forgot-password'
                        ? (resetRequested ? 'Resetting password...' : 'Sending reset code...')
                        : otpSent
                          ? 'Verifying OTP...'
                          : 'Sending OTP...'}
                  </>
                ) : (
                  <>
                    {mode === 'login'
                      ? 'Log in'
                      : mode === 'forgot-password'
                        ? (resetRequested ? 'Set new password' : 'Send reset code')
                        : otpSent
                          ? 'Verify OTP & Create account'
                          : 'Send OTP'}

                    <ArrowRight
                      size={17}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>
            </form>

            {/* Trust badges */}
            <div className="mt-6 flex items-center justify-center gap-4 text-[10px] font-semibold text-[#8a7a6a]">
              <span className="flex items-center gap-1">
                <CheckCircle2
                  size={13}
                  className="text-[#356ad1]"
                />
                Verified
              </span>

              <span className="flex items-center gap-1">
                <Users
                  size={13}
                  className="text-[#356ad1]"
                />
                Trusted
              </span>

              <span className="flex items-center gap-1">
                <Lock
                  size={13}
                  className="text-[#356ad1]"
                />
                Secure
              </span>
            </div>
          </div>

          {/* Switch link */}
          <p className="mt-5 text-center text-sm text-[#6b7a8f]">
            {mode === 'login' && (
              <>
                {"Don't have an account? "}
                <button
                  onClick={() => switchMode('signup')}
                  className="font-display font-bold text-[#ff7418] hover:underline"
                >
                  Sign up
                </button>
              </>
            )}

            {mode === 'signup' && (
              <>
                {'Already have an account? '}
                <button
                  onClick={() => switchMode('login')}
                  className="font-display font-bold text-[#ff7418] hover:underline"
                >
                  Log in
                </button>
              </>
            )}

            {mode === 'forgot-password' && (
              <>
                {'Remembered your password? '}
                <button
                  onClick={() => switchMode('login')}
                  className="font-display font-bold text-[#ff7418] hover:underline"
                >
                  Log in
                </button>
              </>
            )}
          </p>

          {mode !== 'forgot-password' && (
            <p className="mt-3 text-center text-sm">
              <button
                type="button"
                onClick={() => {
                  setMode('forgot-password');
                  setErrors({});
                }}
                className="font-medium text-[#ff7418] hover:underline"
              >
                Forgot password?
              </button>
            </p>
          )}

        </div>
      </div>
    </div>
  );
}
