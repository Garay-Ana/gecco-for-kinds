import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './seller.css';

export default function SellerLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const res = await axios.post('http://localhost:5000/api/sellers/login', {
        email,
        password,
      });
      localStorage.setItem('sellerToken', res.data.token);
      navigate('/seller/panel');
    } catch (err) {
      setMsg('Correo o contraseña incorrectos');
    }
  };

  return (
    <div className="sellerlogin-bg-gradient">
      <div className="sellerlogin-center-container" style={{ position: 'relative' }}>
        <div className="sellerlogin-card">
          <div className="sellerlogin-icon-circle">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 48 48" stroke="currentColor" className="sellerlogin-main-icon">
              <circle cx="24" cy="24" r="22" stroke="#10b981" strokeWidth="2" fill="#f5f7ff" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 32c0-4 8-4 8-8s-8-4-8-8 8-4 8-8" stroke="#10b981" />
            </svg>
          </div>
          <h1 className="sellerlogin-title">Panel de Vendedor</h1>
          <p className="sellerlogin-subtitle">Acceso exclusivo para vendedores</p>
          <form onSubmit={handleLogin} className="sellerlogin-form">
            <div className="sellerlogin-input-group">
              <label htmlFor="email" className="sellerlogin-label">Correo electrónico</label>
              <input
                id="email"
                type="email"
                className="sellerlogin-input"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="sellerlogin-input-group">
              <label htmlFor="password" className="sellerlogin-label">Contraseña</label>
              <input
                id="password"
                type="password"
                className="sellerlogin-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {msg && (
              <div className="sellerlogin-message-error">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#ef4444" style={{marginRight:8}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12A9 9 0 113 12a9 9 0 0118 0z"/></svg>
                {msg}
              </div>
            )}
            <button
              type="submit"
              className="sellerlogin-button"
            >
              Iniciar sesión
            </button>
          </form>
          <div className="sellerlogin-footer">
            <p>¿No tienes cuenta?{' '}
              <span
                style={{ color: '#10b981', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                onClick={() => navigate('/seller/register')}
              >
                Regístrate
              </span>
            </p>
          </div>
          <span
            className="back-home-arrow"
            onClick={() => navigate('/')}
            title="Volver al inicio"
            style={{ cursor: 'pointer', position: 'absolute', top: 24, left: 24, fontSize: '2rem', color: '#10b981', zIndex: 10 }}
          >
            &#8592;
          </span>
        </div>
      </div>
    </div>
  );
}
