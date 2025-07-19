import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './register-admin.css';

export default function RegisterAdmin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/auth/register-admin', {
        email,
        password
      });
      setMsg('success');
      setTimeout(() => navigate('/admin/login'), 1500); // Redirige al login
    } catch (err) {
      console.error(err);
      setMsg('error');
    }
  };

  return (
    <div className="register-admin-bg">
      <div className="register-admin-card">
        <h1 className="register-admin-title">Registro de Administrador</h1>
        <p className="register-admin-subtitle">Crea una cuenta de administrador para gestionar la tienda</p>
        <form onSubmit={handleRegister} className="register-admin-form">
          <div className="register-admin-input-group">
            <label htmlFor="email" className="register-admin-label">Correo electrónico</label>
            <input
              id="email"
              type="email"
              className="register-admin-input"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="register-admin-input-group">
            <label htmlFor="password" className="register-admin-label">Contraseña</label>
            <input
              id="password"
              type="password"
              className="register-admin-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="register-admin-button">
            Registrar
          </button>
        </form>
        {msg && (
          <div className={`register-admin-message ${msg === 'success' ? 'success' : 'error'}`}>
            {msg === 'success' ? '✅ Registrado con éxito' : '❌ Error al registrar'}
          </div>
        )}
      </div>
    </div>
  );
}
