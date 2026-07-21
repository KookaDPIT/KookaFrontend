import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import kookaLogo from '../../assets/kooka-logo-clean.png';
import foodBackground from '../../assets/food-background.png';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const EMAIL_MAX = 50;
  const PASSWORD_MAX = 50;

  const handleLogin = (e) => {
    e.preventDefault();
    console.log('Login:', { email, password });
    // TODO: Add authentication logic here
  };

  return (
    <div className="login-container" style={{ backgroundImage: `url(${foodBackground})` }}>
      <div className="auth-content">
        {/* Left Section - Kooka Branding */}
        <div className="branding-section">
          <div className="logo-wrapper">
            <img src={kookaLogo} alt="Kooka Logo" className="main-logo" />
          </div>
          
          <h2 className="brand-name">KOOKA</h2>
          
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

        {/* Right Section - Login Form */}
        <div className="form-section">
          <div className="auth-card">
            {/* Header */}
            <div className="auth-header">
              <h1>Bine ai revenit!</h1>
              <p>Autentifică-te pentru a continua</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="auth-form">
              {/* Email Input */}
              <div className="form-group">
                <input
                  type="email"
                  placeholder="Email / Utilizator"
                  value={email}
                  onChange={(e) => {
                    if (e.target.value.length <= EMAIL_MAX) {
                      setEmail(e.target.value);
                    }
                  }}
                  maxLength={EMAIL_MAX}
                  className="form-input"
                />
                <span className="char-count">{email.length}/{EMAIL_MAX}</span>
              </div>

              {/* Password Input */}
              <div className="form-group">
                <div className="input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Parolă"
                    value={password}
                    onChange={(e) => {
                      if (e.target.value.length <= PASSWORD_MAX) {
                        setPassword(e.target.value);
                      }
                    }}
                    maxLength={PASSWORD_MAX}
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
                <span className="char-count">{password.length}/{PASSWORD_MAX}</span>
              </div>

              {/* Forgot Password Link */}
              <div className="forgot-password">
                <Link to="/forgot">Ți-ai uitat parola?</Link>
              </div>

              {/* Login Button */}
              <button type="submit" className="auth-button">
                Pornim Provocarea!
              </button>

              {/* Divider */}
              <div className="divider">
                <span>sau</span>
              </div>

              {/* Signup Link */}
              <div className="auth-link">
                <p>Nu ai cont? <Link to="/signup">Înregistrează-te</Link></p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
