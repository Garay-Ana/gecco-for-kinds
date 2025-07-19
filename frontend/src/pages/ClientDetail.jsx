import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './client-detail.css';

export default function ClientDetail() {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('sellerToken');

  useEffect(() => {
    fetchClient();
    // eslint-disable-next-line
  }, []);

  const fetchClient = async () => {
    try {
      setLoading(true);
      const clientId = window.location.pathname.split('/').pop();
const res = await axios.get(
  `http://localhost:5000/api/sellers/clients/${clientId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);
      setClient(res.data);
      setError('');
    } catch (err) {
      setError('No se pudo cargar la información del cliente');
      console.error('Error fetching client:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/seller/panel');
  };

  if (loading) {
    return (
      <div className="client-detail-loading">
        <div className="loading-spinner"></div>
        <p>Cargando información del cliente...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="client-detail-error">
        <i className="fas fa-exclamation-triangle"></i>
        <p>{error}</p>
        <button className="back-button" onClick={handleBack}>
          Volver al panel
        </button>
      </div>
    );
  }

  return (
    <div className="client-detail-container">
      <header className="client-detail-header">
        <h1 className="client-detail-title">
          <i className="fas fa-user-tag"></i> Detalle del Cliente
        </h1>
        <button 
          className="back-button"
          onClick={handleBack}
        >
          <i className="fas fa-arrow-left"></i> Volver al Panel
        </button>
      </header>

      <div className="client-detail-content">
        {client && (
          <div className="client-card">
            <div className="client-avatar">
              <i className="fas fa-user"></i>
            </div>
            
            <div className="client-info">
              <h2 className="client-name">{client.name}</h2>
              
              <div className="client-detail">
                <i className="fas fa-map-marked-alt"></i>
                <div>
                  <span className="detail-label">Zona:</span>
                  <span>{client.zone || 'No especificada'}</span>
                </div>
              </div>
              
              <div className="client-detail">
                <i className="fas fa-id-card"></i>
                <div>
                  <span className="detail-label">Código:</span>
                  <span>{client.code || 'No asignado'}</span>
                </div>
              </div>
              
              <div className="client-detail">
                <i className="fas fa-phone-alt"></i>
                <div>
                  <span className="detail-label">Contacto:</span>
                  <span>{client.contact || 'No especificado'}</span>
                </div>
              </div>
              
              <div className="client-detail">
                <i className="fas fa-map-marker-alt"></i>
                <div>
                  <span className="detail-label">Dirección:</span>
                  <span>{client.address || 'No especificada'}</span>
                </div>
              </div>
              
              {client.notes && (
                <div className="client-notes">
                  <i className="fas fa-sticky-note"></i>
                  <div>
                    <span className="detail-label">Notas:</span>
                    <p>{client.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}