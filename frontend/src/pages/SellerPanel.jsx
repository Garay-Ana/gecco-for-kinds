import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './seller-panel.css';

export default function SellerPanel() {
  const [clients, setClients] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState({ name: '', contact: '', address: '', notes: '', image: '' });
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('sellerToken');

  useEffect(() => {
    if (!token) {
      navigate('/seller/login');
      return;
    }
    loadData();
  }, [token, navigate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchClients(), fetchSummary()]);
    } catch (error) {
      setMsg({ text: 'Error al cargar datos', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
    const res = await axios.get('http://localhost:5000/api/sellers/clients', {
      headers: { Authorization: `Bearer ${token}` }
    });
    setClients(res.data);
  };

  const fetchSummary = async () => {
    const res = await axios.get('http://localhost:5000/api/sellers/zone-summary', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('zone-summary data:', res.data);
    setSummary(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ text: '', type: '' });
    setIsLoading(true);
    
    try {
      if (editingId) {
        await axios.put(
          `http://localhost:5000/api/sellers/clients/${editingId}`,
          form,
          { headers: { Authorization: `Bearer ${token}` } }
        );
          setMsg({ text: 'Vendedor actualizado con éxito', type: 'success' });
      } else {
        await axios.post(
          'http://localhost:5000/api/sellers/clients',
          form,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMsg({ text: 'Vendedor agregado con éxito', type: 'success' });
      }
      
      setForm({ name: '', contact: '', address: '', notes: '', image: '' });
      setEditingId(null);
      await loadData();
    } catch (err) {
      setMsg({
        text: err.response?.data?.message || 'Error al guardar cliente',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (client) => {
    setEditingId(client._id);
    setForm({
      name: client.name,
      contact: client.contact,
      address: client.address,
      notes: client.notes,
      image: client.image
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este vendedor?')) return;
    setIsLoading(true);
    
    try {
      await axios.delete(
        `http://localhost:5000/api/sellers/clients/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg({ text: 'Vendedor eliminado con éxito', type: 'success' });
      await loadData();
    } catch (err) {
      setMsg({
        text: err.response?.data?.message || 'Error al eliminar cliente',
        type: 'error'
      });
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    if (!e.target.files[0]) return;
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    
    try {
      const res = await axios.post(
        'http://localhost:5000/api/upload-client',
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setForm(f => ({...f, image: res.data.url}));
    } catch (err) {
      setMsg({
        text: 'Error al subir archivo',
        type: 'error'
      });
    }
  };

  const filteredClients = clients.filter(client => {
    return client.name.toLowerCase().includes(search.toLowerCase()) ||
      (client.address && client.address.toLowerCase().includes(search.toLowerCase()));
  });

  const recentActivity = [...clients]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 5);

  return (
    <div className="seller-panel">
      {/* Header */}
      <header className="panel-header">
        <h1 className="panel-title">
          <span className="title-icon">📊</span>
          Panel de Vendedor
        </h1>
        <div className="header-actions">
          <button 
            className="btn profile-btn"
            onClick={() => navigate('/seller/profile')}
          >
            <i className="fas fa-user"></i> Perfil
          </button>
          <button 
            className="btn sales-btn"
            onClick={() => navigate('/seller/eVentas')}
          >
            <i className="fas fa-chart-line"></i> Ventas
          </button>
          <button 
            className="btn logout-btn"
            onClick={() => { localStorage.removeItem('sellerToken'); navigate('/seller/login'); }}
          >
            <i className="fas fa-sign-out-alt"></i> Cerrar sesión
          </button>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="panel-content">
        {/* Dashboard */}
        <section className="dashboard-section">
          <div className="welcome-card">
            <h2 className="welcome-title">
              ¡Bienvenido{summary && summary.sellerName ? `, ${summary.sellerName}` : ''}!
            </h2>
            <p className="zone-info">Zona asignada: {summary?.zone || '-'}</p>
            
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">{summary?.totalClients ?? 0}</span>
                <span className="stat-label">Personas a cargo</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{summary?.totalSalesClients ?? 0}</span>
                <span className="stat-label">Ventas personas a cargo</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{summary?.totalSalesLeader ?? 0}</span>
                <span className="stat-label">Ventas personales</span>
              </div>
            </div>
          </div>

          <div className="activity-card">
            <h3 className="activity-title">
              <i className="fas fa-clock"></i> Actividad reciente
            </h3>
            <ul className="activity-list">
              {recentActivity.length === 0 && <li className="empty-activity">Sin actividad reciente</li>}
              {recentActivity.map(c => (
                <li key={c._id}>
                  <span className="client-name">{c.name}</span>
                  <span className="client-location">({c.address})</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Barra de búsqueda */}
        <div className="search-container">
          <div className="search-wrapper">
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              placeholder="Buscar por nombre o dirección..."
              className="search-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button 
                className="clear-search"
                onClick={() => setSearch('')}
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="client-form">
          <h2 className="form-title">
            {editingId ? (
              <><i className="fas fa-edit"></i> Editar Vendedor</>
            ) : (
              <><i className="fas fa-plus"></i> Agregar Vendedor</>
            )}
          </h2>
          
          {msg.text && (
            <div className={`message message-${msg.type}`}>
              <i className={`fas ${msg.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
              {msg.text}
            </div>
          )}

          <div className="form-grid">
            <div className="form-group">
              <label>
                <i className="fas fa-user"></i> Nombre completo
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({...f, name: e.target.value}))}
                required
              />
            </div>
            
            <div className="form-group">
              <label>
                <i className="fas fa-phone"></i> Teléfono o correo
              </label>
              <input
                type="text"
                value={form.contact}
                onChange={e => setForm(f => ({...f, contact: e.target.value}))}
              />
            </div>
            
            <div className="form-group">
              <label>
                <i className="fas fa-map-marker-alt"></i> Dirección / zona
              </label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm(f => ({...f, address: e.target.value}))}
              />
            </div>
            
            <div className="form-group">
              <label>
                <i className="fas fa-sticky-note"></i> Notas
              </label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({...f, notes: e.target.value}))}
              />
            </div>
            
            <div className="form-group file-upload-group">
              <label>
                <i className="fas fa-image"></i> Imagen o documento (opcional)
              </label>
              <div className="file-upload-wrapper">
                <label className="file-upload-label">
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                  />
                  <span className="upload-btn">
                    <i className="fas fa-cloud-upload-alt"></i> Seleccionar archivo
                  </span>
                  <span className="file-name">
                    {form.image ? 'Archivo seleccionado' : 'Ningún archivo seleccionado'}
                  </span>
                </label>
                {form.image && (
                  <div className="file-preview">
                    <img
                      src={`http://localhost:5000${form.image}`}
                      alt="Previsualización"
                      className="uploaded-image"
                    />
                    <button
                      type="button"
                      className="remove-image"
                      onClick={() => setForm(f => ({...f, image: ''}))}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="form-actions">
            {editingId && (
              <button
                type="button"
                className="btn cancel-btn"
                onClick={() => {
                  setEditingId(null);
                  setForm({ name: '', contact: '', address: '', notes: '', image: '' });
                }}
                disabled={isLoading}
              >
                <i className="fas fa-times"></i> Cancelar
              </button>
            )}
            <button
              type="submit"
              className="btn submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Procesando...
                </>
              ) : editingId ? (
                <>
                  <i className="fas fa-save"></i> Guardar Cambios
                </>
              ) : (
                <>
                  <i className="fas fa-user-plus"></i> Agregar Persona
                </>
              )}
            </button>
          </div>
        </form>

        {/* Lista de clientes */}
        <section className="clients-section">
          <div className="section-header">
            <h2 className="section-title">
              <i className="fas fa-users"></i> Vendedores a Cargo
            </h2>
            <div className="total-count">
              Total: {filteredClients.length} {filteredClients.length === 1 ? 'vendedor' : 'vendedores'}
            </div>
          </div>
          
          <div className="clients-grid">
            {filteredClients.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-user-friends empty-icon"></i>
                <h3>No hay personas a mostrar</h3>
                {search && (
                  <button
                    className="clear-search-btn"
                    onClick={() => setSearch('')}
                  >
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            ) : (
              filteredClients.map(client => (
                <div key={client._id} className="client-card">
                  <div className="client-header">
                    <div className="client-avatar">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="client-main-info">
                      <h3 className="client-name">{client.name}</h3>
                      <div className="client-code">
                        <i className="fas fa-id-card"></i> {client.code}
                      </div>
                    </div>
                  </div>
                  
                  <div className="client-details">
                    <div className="client-detail">
                      <i className="fas fa-phone"></i>
                      <span>{client.contact}</span>
                    </div>
                    <div className="client-detail">
                      <i className="fas fa-map-marker-alt"></i>
                      <span>{client.address}</span>
                    </div>
                    {client.notes && (
                      <div className="client-notes">
                        <i className="fas fa-sticky-note"></i>
                        <span>{client.notes}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="client-actions">
                    <button
                      onClick={() => handleDelete(client._id)}
                      className="btn delete-btn"
                    >
                      <i className="fas fa-trash"></i> Eliminar
                    </button>
                    <button
                      onClick={() => navigate(`/seller/client/${client._id}`)}
                      className="btn detail-btn"
                    >
                      <i className="fas fa-eye"></i> Detalle
                    </button>
                    <button
                      onClick={() => handleEdit(client)}
                      className="btn edit-btn"
                    >
                      <i className="fas fa-edit"></i> Editar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Loading overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
    </div>
  );
}