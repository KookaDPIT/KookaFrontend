import { useState } from 'react';
import { Link } from 'react-router-dom';
import kookaLogo from '../../assets/kooka-logo-clean.png';
import kookaLogoFull from '../../assets/kooka-logo-full.png';
import foodBackground from '../../assets/food-background.png';
import './Auth.css';

export default function Signup() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
  };

  return (
    <div className="signup-container" style={{ backgroundImage: `url(${foodBackground})` }}>
      <div className="auth-content">
        {/* Left Section - Kooka Branding (SAME AS LOGIN) */}
        <div className="branding-section">
          <div className="logo-wrapper">
            <img src={kookaLogoFull} alt="Kooka Logo" className="main-logo" />
          </div>

          <div className="divider-line">
            <div className="line"></div>
            <img src={kookaLogo} alt="Small Logo" className="small-logo" />
            <div className="line"></div>
          </div>
          
          <div className="motto">
            <p className="motto-main">Pregătește-ți cutitele.</p>
            <p className="motto-secondary">Daily challenge-ul de azi te așteaptă!</p>
          </div>
        </div>

        {/* Right Section - Signup Form (Bigger) */}
        <div className="form-section signup-form">
          <div className="auth-card signup-card">
            {/* Header */}
            <div className="auth-header">
              <h1>Creează cont</h1>
              <p>Alăturați-vă provocării KOOKA!</p>
            </div>

            {/* Signup Form */}
            <form onSubmit={handleSignup} className="auth-form">
              {/* Full Name Input */}
              <div className="form-group">
                <input
                  type="text"
                  name="fullName"
                  placeholder="Nume complet"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  maxLength={CHAR_LIMITS.fullName}
                  className="form-input"
                />
                <span className="char-count">{formData.fullName.length}/{CHAR_LIMITS.fullName}</span>
              </div>

              {/* Email Input */}
              <div className="form-group">
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  maxLength={CHAR_LIMITS.email}
                  className="form-input"
                />
                <span className="char-count">{formData.email.length}/{CHAR_LIMITS.email}</span>
              </div>

              {/* Username Input */}
              <div className="form-group">
                <input
                  type="text"
                  name="username"
                  placeholder="Nume de utilizator"
                  value={formData.username}
                  onChange={handleInputChange}
                  maxLength={CHAR_LIMITS.username}
                  className="form-input"
                />
                <p className="helper-text">Alege un nume de utilizator unic</p>
                <span className="char-count">{formData.username.length}/{CHAR_LIMITS.username}</span>
              </div>

              {/* Password Input */}
              <div className="form-group">
                <div className="input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Parolă"
                    value={formData.password}
                    onChange={handleInputChange}
                    maxLength={CHAR_LIMITS.password}
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <span className="char-count">{formData.password.length}/{CHAR_LIMITS.password}</span>
              </div>

              {/* Confirm Password Input */}
              <div className="form-group">
                <div className="input-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Confirmă parola"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    maxLength={CHAR_LIMITS.confirmPassword}
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <span className="char-count">{formData.confirmPassword.length}/{CHAR_LIMITS.confirmPassword}</span>
              </div>

              {/* Terms Agreement */}
              <div className="terms-group">
                <label>
                  <input
                    type="checkbox"
                    name="agreeTerms"
                    checked={formData.agreeTerms}
                    onChange={handleInputChange}
                  />
                  <span>
                    Sunt de acord cu <Link to="/terms">Termenii și Condițiile</Link> și <Link to="/privacy">Politica de Confidențialitate</Link>
                  </span>
                </label>
              </div>

              {/* Signup Button */}
              <button type="submit" className="auth-button">
                Creează cont
              </button>

              {/* Divider */}
              <div className="divider">
                <span>sau</span>
              </div>

              {/* Login Link */}
              <div className="auth-link">
                <p>Ai deja cont? <Link to="/login">Conectează-te</Link></p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
