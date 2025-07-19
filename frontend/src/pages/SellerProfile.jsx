import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './seller-profile.css';

export default function SellerProfile() {
  const [seller, setSeller] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem('sellerToken');

  useEffect(() => {
    if (!token) { 
      navigate('/seller/login'); 
      return; 
    }
    fetchProfile();
    // eslint-disable-next-line
  }, [token]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:5000/api/sellers/profile', { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setSeller(res.data);
      setMsg('');
    } catch {
      setMsg('No se pudo cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMsg(''); 
    setSuccess(false);
    
    if (password !== confirmPassword) {
      setMsg('Las contraseñas no coinciden');
      return;
    }

    try {
      await axios.put(
        'http://localhost:5000/api/sellers/change-password', 
        { password }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg('Contraseña actualizada correctamente');
      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
    } catch {
      setMsg('Error al cambiar la contraseña');
      setSuccess(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sellerToken'); 
    navigate('/seller/login'); 
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Cargando perfil...</p>
      </div>
    );
  }

  return (
    <div className="seller-profile-container">
      <header className="profile-header">
        <h1 className="profile-title">
          <i className="fas fa-user-circle"></i> Perfil del Vendedor
        </h1>
        <button 
          className="logout-button"
          onClick={handleLogout}
        >
          <i className="fas fa-sign-out-alt"></i> Cerrar sesión
        </button>
      </header>

      <div className="profile-content">
        {seller ? (
          <>
            <div className="profile-card">
              <div className="profile-avatar">
                <i className="fas fa-user-tie"></i>
              </div>
              <div className="profile-info">
                <h2 className="profile-name">{seller.name}</h2>
                <div className="profile-detail">
                  <i className="fas fa-map-marker-alt"></i>
                  <span>Zona: {seller.zone}</span>
                </div>
                <div className="profile-detail">
                  <i className="fas fa-envelope"></i>
                  <span>{seller.email}</span>
                </div>
                <div className="profile-detail">
                  <i className="fas fa-id-card"></i>
                  <span>Código: {seller.code || 'No asignado'}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="password-form">
              <h3 className="form-title">
                <i className="fas fa-lock"></i> Cambiar Contraseña
              </h3>
              
              <div className="form-group">
                <label>Nueva Contraseña</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              
              <div className="form-group">
                <label>Confirmar Contraseña</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required 
                  minLength={6}
                  placeholder="Repite la contraseña"
                />
              </div>
              
              <div className="form-actions">
                <button type="submit" className="submit-button">
                  <i className="fas fa-save"></i> Actualizar Contraseña
                </button>
              </div>
              
              {msg && (
                <div className={`message ${success ? 'success' : 'error'}`}>
                  {msg}
                </div>
              )}
            </form>

            <div className="back-to-panel">
              <button 
                className="panel-button"
                onClick={() => navigate('/seller/panel')}
              >
                <i className="fas fa-arrow-left"></i> Volver al Panel
              </button>
            </div>
          </>
        ) : (
          <div className="profile-error">
            <i className="fas fa-exclamation-triangle"></i>
            <p>No se pudo cargar la información del perfil</p>
          </div>
        )}
      </div>
    </div>
  );
}