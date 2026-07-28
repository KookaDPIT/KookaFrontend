import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });

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

  const handleSignup = (e) => {
    e.preventDefault();

    if (!formData.agreeTerms) {
      alert('Trebuie să accepți termenii și condițiile!');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert('Parolele nu se potrivesc!');
      return;
    }

    console.log('Signup:', formData);
    // TODO: Add registration logic here
    navigate('/home');
  };

  return (
    <AuthLayout
      active="signup"
      title="Creează cont"
      subtitle="Alătură-te provocării KOOKA și gătește alături de noi."
    >
      <form onSubmit={handleSignup} className="auth-form">
        <div className="field">
          <label htmlFor="signup-name">Nume complet</label>
          <input
            id="signup-name"
            type="text"
            name="fullName"
            placeholder="Ion Popescu"
            value={formData.fullName}
            onChange={handleInputChange}
            maxLength={CHAR_LIMITS.fullName}
            className="auth-input"
          />
        </div>

        <div className="field">
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            name="email"
            placeholder="nume@exemplu.ro"
            value={formData.email}
            onChange={handleInputChange}
            maxLength={CHAR_LIMITS.email}
            className="auth-input"
          />
        </div>

        <div className="field">
          <label htmlFor="signup-username">Nume de utilizator</label>
          <input
            id="signup-username"
            type="text"
            name="username"
            placeholder="ion_bucatarul"
            value={formData.username}
            onChange={handleInputChange}
            maxLength={CHAR_LIMITS.username}
            className="auth-input"
          />
        </div>

        <div className="field">
          <label htmlFor="signup-password">Parolă</label>
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
          <label htmlFor="signup-confirm">Confirmă parola</label>
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
            Sunt de acord cu <Link to="/terms">Termenii și Condițiile</Link> și{' '}
            <Link to="/privacy">Politica de Confidențialitate</Link>
          </span>
        </label>

        <button type="submit" className="btn-primary">
          Creează cont
        </button>
      </form>
    </AuthLayout>
  );
}
