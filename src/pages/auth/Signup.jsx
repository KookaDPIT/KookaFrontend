import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { checkAvailability } from '../../services/users';
import AuthLayout from './AuthLayout';

/* Basic shape check before we bother the server — an obviously invalid address
   can't be taken, so there is nothing to look up. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Signup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /* Last answer we got back, per field, tagged with the value it was about:
     { value, taken }. Storing the value alongside the verdict means a reply
     that lands after the user has typed on cannot mislabel the new value — the
     status is derived by comparing against what is in the box right now.
     The server enforces uniqueness on /register anyway; this only saves the
     user from filling the whole form to find out the handle is gone. */
  const [usernameCheck, setUsernameCheck] = useState(null);
  const [emailCheck, setEmailCheck] = useState(null);

  const CHAR_LIMITS = {
    fullName: 50,
    email: 50,
    username: 30,
    password: 50,
    confirmPassword: 50,
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;

    if (type !== 'checkbox' && value.length > CHAR_LIMITS[name]) {
      return;
    }

    setFormData({
      ...formData,
      [name]: fieldValue,
    });
  };

  const username = formData.username.trim().replace(/^@/, '');
  const email = formData.email.trim();

  /* Debounced lookups, one per field. A failed request stays silent — if we are
     offline, /register is still the one that decides. */
  useEffect(() => {
    if (username.length < 3) return undefined;
    let cancelled = false;
    const id = window.setTimeout(async () => {
      try {
        const res = await checkAvailability({ username });
        if (!cancelled) setUsernameCheck({ value: username, taken: !!res.username_taken });
      } catch { /* leave it unknown */ }
    }, 450);
    return () => { cancelled = true; window.clearTimeout(id); };
  }, [username]);

  useEffect(() => {
    if (!EMAIL_RE.test(email)) return undefined;
    let cancelled = false;
    const id = window.setTimeout(async () => {
      try {
        const res = await checkAvailability({ email });
        if (!cancelled) setEmailCheck({ value: email, taken: !!res.email_taken });
      } catch { /* leave it unknown */ }
    }, 450);
    return () => { cancelled = true; window.clearTimeout(id); };
  }, [email]);

  /* 'idle' until an answer about *this exact value* has come back */
  const stateOf = (check, value) => {
    if (!check || check.value !== value) return 'idle';
    return check.taken ? 'taken' : 'free';
  };
  const avail = {
    username: stateOf(usernameCheck, username),
    email: stateOf(emailCheck, email),
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.agreeTerms) {
      setError(t('auth.signup.errTerms'));
      return;
    }

    if (avail.username === 'taken') {
      setError(t('auth.signup.errUsernameTaken'));
      return;
    }

    if (avail.email === 'taken') {
      setError(t('auth.signup.errEmailTaken'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.signup.errMismatch'));
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/register', {
        full_name: formData.fullName,
        email: formData.email,
        username: formData.username,
        password: formData.password,
        password_confirm: formData.confirmPassword,
      });

      // If the backend logs the user in on signup, keep the token/user around.
      const token = data?.access_token || data?.token;
      if (token) localStorage.setItem('kooka_token', token);
      if (data?.user) localStorage.setItem('kooka_user', JSON.stringify(data.user));

      navigate('/home');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : t('auth.signup.errFailed'));
      // a race (someone claimed it between the check and submit) still lands here
      if (typeof detail === 'string') {
        if (/utilizator|username/i.test(detail)) setUsernameCheck({ value: username, taken: true });
        if (/email/i.test(detail)) setEmailCheck({ value: email, taken: true });
      }
    } finally {
      setLoading(false);
    }
  };

  /* Inline status line under a field. `checking` stays quiet on purpose —
     a flickering "checking…" on every keystroke is worse than nothing. */
  const statusNote = (field) => {
    const state = avail[field];
    if (state === 'free') {
      return <span className="auth-note auth-note--ok">{t(`auth.signup.${field}Free`)}</span>;
    }
    if (state === 'taken') {
      return <span className="auth-note auth-note--bad">{t(`auth.signup.${field}Taken`)}</span>;
    }
    return null;
  };

  const inputClass = (field) => {
    const state = avail[field];
    if (state === 'taken') return 'auth-input is-taken';
    if (state === 'free') return 'auth-input is-free';
    return 'auth-input';
  };

  const blocked = avail.username === 'taken' || avail.email === 'taken';

  return (
    <AuthLayout
      active="signup"
      title={t('auth.signup.title')}
      subtitle={t('auth.signup.subtitle')}
    >
      <form onSubmit={handleSignup} className="auth-form">
        <div className="field">
          <label htmlFor="signup-name">{t('auth.signup.fullName')}</label>
          <input
            id="signup-name"
            type="text"
            name="fullName"
            placeholder={t('auth.signup.fullNamePh')}
            value={formData.fullName}
            onChange={handleInputChange}
            maxLength={CHAR_LIMITS.fullName}
            className="auth-input"
          />
        </div>

        <div className="field">
          <label htmlFor="signup-email">{t('auth.signup.email')}</label>
          <input
            id="signup-email"
            type="email"
            name="email"
            placeholder={t('auth.emailPh')}
            value={formData.email}
            onChange={handleInputChange}
            maxLength={CHAR_LIMITS.email}
            className={inputClass('email')}
            aria-invalid={avail.email === 'taken'}
            aria-describedby="signup-email-note"
          />
          <span id="signup-email-note" role="status">{statusNote('email')}</span>
        </div>

        <div className="field">
          <label htmlFor="signup-username">{t('auth.signup.username')}</label>
          <input
            id="signup-username"
            type="text"
            name="username"
            placeholder={t('auth.signup.usernamePh')}
            value={formData.username}
            onChange={handleInputChange}
            maxLength={CHAR_LIMITS.username}
            className={inputClass('username')}
            aria-invalid={avail.username === 'taken'}
            aria-describedby="signup-username-note"
          />
          <span id="signup-username-note" role="status">{statusNote('username')}</span>
        </div>

        <div className="field">
          <label htmlFor="signup-password">{t('auth.signup.password')}</label>
          <input
            id="signup-password"
            type="password"
            name="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleInputChange}
            maxLength={CHAR_LIMITS.password}
            className="auth-input"
          />
        </div>

        <div className="field">
          <label htmlFor="signup-confirm">{t('auth.signup.confirm')}</label>
          <input
            id="signup-confirm"
            type="password"
            name="confirmPassword"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            maxLength={CHAR_LIMITS.confirmPassword}
            className="auth-input"
          />
        </div>

        <label className="auth-terms">
          <input
            type="checkbox"
            name="agreeTerms"
            checked={formData.agreeTerms}
            onChange={handleInputChange}
          />
          <span>
            {t('auth.signup.agreePre')}{' '}
            <Link to="/terms">{t('auth.signup.terms')}</Link>{' '}
            {t('auth.signup.and')}{' '}
            <Link to="/privacy">{t('auth.signup.privacy')}</Link>
          </span>
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={loading || blocked}>
          {loading ? t('auth.signup.submitting') : t('auth.signup.submit')}
        </button>
      </form>
    </AuthLayout>
  );
}
