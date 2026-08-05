import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import AuthLayout from './AuthLayout';

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

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.agreeTerms) {
      setError(t('auth.signup.errTerms'));
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
    } finally {
      setLoading(false);
    }
  };

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
            className="auth-input"
          />
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
            className="auth-input"
          />
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

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? t('auth.signup.submitting') : t('auth.signup.submit')}
        </button>
      </form>
    </AuthLayout>
  );
}
