import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './seller.css';

export default function SellerRegister() {
  const [form, setForm] = useState({ name: '', email: '', password: '', zone: '' });
  const [msg, setMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    setSuccess(false);
    try {
      await axios.post('http://localhost:5000/api/sellers/register', form);
      setMsg('Vendedor registrado correctamente');
      setSuccess(true);
      setTimeout(() => navigate('/seller/login'), 1200);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error al registrar');
      setSuccess(false);
    }
  };

  return (
    <div className="sellerlogin-bg-gradient">
      <div className="sellerlogin-center-container">
        <div className="sellerlogin-card">
          <div className="sellerlogin-icon-circle">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 48 48" stroke="currentColor" className="sellerlogin-main-icon">
              <circle cx="24" cy="24" r="22" stroke="#10b981" strokeWidth="2" fill="#f5f7ff" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 32c0-4 8-4 8-8s-8-4-8-8 8-4 8-8" stroke="#10b981" />
            </svg>
          </div>
          <h1 className="sellerlogin-title">Registro de Vendedor</h1>
          <p className="sellerlogin-subtitle">Crea tu cuenta de vendedor</p>
          <form onSubmit={handleSubmit} className="sellerlogin-form">
            <div className="sellerlogin-input-group">
              <label htmlFor="name" className="sellerlogin-label">Nombre</label>
              <input
                id="name"
                type="text"
                className="sellerlogin-input"
                placeholder="Nombre completo"
                value={form.name}
                onChange={e => setForm(f => ({...f, name: e.target.value}))}
                required
                autoFocus
              />
            </div>
            <div className="sellerlogin-input-group">
              <label htmlFor="email" className="sellerlogin-label">Correo electrónico</label>
              <input
                id="email"
                type="email"
                className="sellerlogin-input"
                placeholder="tu@correo.com"
                value={form.email}
                onChange={e => setForm(f => ({...f, email: e.target.value}))}
                required
              />
            </div>
            <div className="sellerlogin-input-group">
              <label htmlFor="password" className="sellerlogin-label">Contraseña</label>
              <input
                id="password"
                type="password"
                className="sellerlogin-input"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({...f, password: e.target.value}))}
                required
              />
            </div>
            <div className="sellerlogin-input-group">
              <label htmlFor="zone" className="sellerlogin-label">Zona</label>
              <input
                id="zone"
                type="text"
                className="sellerlogin-input"
                placeholder="Zona o región"
                value={form.zone}
                onChange={e => setForm(f => ({...f, zone: e.target.value}))}
                required
              />
            </div>
            {msg && (
              <div className={success ? 'sellerlogin-message-success' : 'sellerlogin-message-error'}>
                {success ? (
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#10b981" style={{marginRight:8}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                ) : (
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#ef4444" style={{marginRight:8}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12A9 9 0 113 12a9 9 0 0118 0z"/></svg>
                )}
                {msg}
              </div>
            )}
            <button
              type="submit"
              className="sellerlogin-button"
            >
              Registrar
            </button>
          </form>
          <div className="sellerlogin-footer">
            <p>¿Ya tienes cuenta?{' '}
              <span
                style={{ color: '#10b981', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                onClick={() => navigate('/seller/login')}
              >
                Inicia sesión
              </span>
            </p>
          </div>
          <span
            className="back-home-arrow"
            onClick={() => navigate('/')}
            title="Volver al inicio"
          >
            &#8592;
          </span>
        </div>
      </div>
    </div>
  );
}
