import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import AuthLayout from './AuthLayout';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const EMAIL_MAX = 50;
  const PASSWORD_MAX = 50;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Completează emailul și parola.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/login', { email, password });

      // Persist whatever the backend hands back so the token interceptor
      // in api.js can authenticate later requests.
      const token = data?.access_token || data?.token;
      if (token) localStorage.setItem('kooka_token', token);
      if (data?.user) localStorage.setItem('kooka_user', JSON.stringify(data.user));

      navigate('/home');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === 'string'
          ? detail
          : 'Autentificare eșuată. Verifică datele și încearcă din nou.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      active="login"
      title="Bine ai revenit."
      subtitle="Continuă de unde ai rămas — tigaia te așteaptă."
    >
      <form onSubmit={handleLogin} className="auth-form">
        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            placeholder="nume@exemplu.ro"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={EMAIL_MAX}
            className="auth-input"
          />
        </div>

        <div className="field">
          <label htmlFor="login-password">Parolă</label>
          <input
            id="login-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={PASSWORD_MAX}
            className="auth-input"
          />
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Se autentifică…' : 'Autentificare'}
        </button>
      </form>
    </AuthLayout>
  );
}
