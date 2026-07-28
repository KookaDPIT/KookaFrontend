import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const EMAIL_MAX = 50;
  const PASSWORD_MAX = 50;

  const handleLogin = (e) => {
    e.preventDefault();
    console.log('Login:', { email, password });
    // TODO: Add authentication logic here
    navigate('/home');
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

        <button type="submit" className="btn-primary">
          Autentificare
        </button>
      </form>
    </AuthLayout>
  );
}
