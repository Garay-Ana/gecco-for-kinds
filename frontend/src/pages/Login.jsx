import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password,
      });
      localStorage.setItem('token', res.data.token);
      navigate('/admin/panel');
    } catch (err) {
      setMsg('Correo o contraseña incorrectos');
    }
  };

  return (
    <div className="login-container" style={{ position: 'relative' }}>
      <span
        className="back-home-arrow"
        style={{ cursor: 'pointer', position: 'absolute', top: 24, left: 24, fontSize: '2rem', color: '#6366f1', zIndex: 10 }}
        onClick={() => navigate('/')}
        title="Volver al inicio"
      >
        &#8592;
      </span>
      <h2>Iniciar Sesión</h2>
      <form onSubmit={handleLogin} className="login-form">
        <input type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Entrar</button>
      </form>
      {msg && <p className="login-error">{msg}</p>}
      <div className="login-register-link">
        ¿No tienes cuenta?{' '}
        <span
          style={{ color: '#6366f1', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
          onClick={() => navigate('/admin/register')}
        >
          Regístrate
        </span>
      </div>
    </div>
  );
}
