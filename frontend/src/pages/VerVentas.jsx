import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './view-sales.css';

export default function VerVentas() {
  const [sales, setSales] = useState([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: ''
  });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('sellerToken');

  // Mostrar la fecha tal cual sin ajuste para evitar desfase
  const formatDateAdjusted = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('es-CO');
  };

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const res = await axios.get('http://localhost:5000/api/sales', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setSales(res.data);
      setMsg('');
    } catch (error) {
      setMsg('Error al cargar las ventas');
    } finally {
      setLoading(false);
    }
  };


const downloadPDFReport = async () => {
  try {
    setLoading(true);
    setMsg('');
    
    // Validar que hay ventas para reportar
    if (sales.length === 0) {
      setMsg('No hay ventas para generar reporte');
      return;
    }

    const params = {
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined
    };

    // Debug: verificar parámetros
    console.log('Enviando parámetros:', params);

    const response = await axios.get('http://localhost:5000/api/sales/report', {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache' // Evitar caché
      },
      params,
      responseType: 'blob',
      timeout: 30000 // 30 segundos de timeout
    });

    // Verificar que la respuesta sea un PDF
    const contentType = response.headers['content-type'];
    if (!contentType.includes('application/pdf')) {
      throw new Error(`Respuesta inesperada: ${contentType}`);
    }

    // Crear el blob y descargar
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const downloadUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `reporte_ventas_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    
    // Limpieza
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      setMsg('Reporte descargado exitosamente');
    }, 100);

  } catch (error) {
    console.error('Error en downloadPDFReport:', error);
    
    // Manejo detallado de errores
    if (error.response) {
      if (error.response.status === 401) {
        setMsg('Sesión expirada. Por favor inicie sesión nuevamente');
      } else if (error.response.status === 500) {
        setMsg('Error en el servidor al generar el reporte');
      } else {
        setMsg(`Error ${error.response.status}: ${error.response.statusText}`);
      }
    } else {
      setMsg('Error al conectar con el servidor');
    }
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchSales();
    // eslint-disable-next-line
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(f => ({ ...f, [name]: value }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchSales();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="view-sales-container">
      <header className="view-sales-header">
        <h1 className="view-sales-title">
          <i className="fas fa-chart-line"></i> Ventas Realizadas
        </h1>
        <div className="header-buttons-container">
          <button 
            className="view-sales-back-button"
            onClick={() => navigate('/seller/eVentas')}
          >
            <i className="fas fa-plus-circle"></i> Registrar Nueva Venta
          </button>
          <button 
  className={`download-pdf-button ${loading ? 'loading' : ''}`}
  onClick={downloadPDFReport}
  disabled={loading || sales.length === 0}
  title={sales.length === 0 ? 'No hay ventas para reportar' : ''}
>
  {loading ? (
    <>
      <i className="fas fa-spinner fa-spin"></i>
      Generando...
    </>
  ) : (
    <>
      <i className="fas fa-file-pdf"></i>
      Descargar Reporte
    </>
  )}
</button>
        </div>
      </header>

      <div className="view-sales-content">
        <form onSubmit={handleFilterSubmit} className="sales-filter-form">
          <div className="filter-header">
            <h2><i className="fas fa-filter"></i> Filtros</h2>
            <p>Seleccione un rango de fechas para filtrar</p>
          </div>

          <div className="filter-grid">
            <div className="filter-group">
              <label>Fecha de inicio</label>
              <input 
                type="date" 
                name="startDate" 
                value={filters.startDate} 
                onChange={handleFilterChange} 
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>Fecha de fin</label>
              <input 
                type="date" 
                name="endDate" 
                value={filters.endDate} 
                onChange={handleFilterChange} 
                className="filter-input"
              />
            </div>
          </div>

          <div className="filter-actions">
            <button type="submit" className="filter-button">
              <i className="fas fa-search"></i> Aplicar Filtros
            </button>
            <button 
              type="button" 
              className="reset-button"
              onClick={() => {
                setFilters({ startDate: '', endDate: '' });
                fetchSales();
              }}
            >
              <i className="fas fa-undo"></i> Limpiar
            </button>
          </div>
        </form>

        {msg && <div className={`message ${msg.includes('Error') ? 'error' : 'success'}`}>{msg}</div>}

        <section className="sales-list-section">
          <h2 className="section-title">
            <i className="fas fa-list-alt"></i> Historial de Ventas
          </h2>

          {loading ? (
            <div className="loading-indicator">
              <i className="fas fa-spinner fa-spin"></i> Cargando ventas...
            </div>
          ) : sales.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-box-open"></i>
              <p>No se encontraron ventas para mostrar</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="sales-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Vendedor</th>
                    <th>Código</th>
                    <th>Productos</th>
                    <th>Cantidad</th>
                    <th>Total</th>
                    <th>Pago</th>
                    <th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map(sale => (
                    <tr key={sale._id}>
                      <td>{formatDateAdjusted(sale.saleDate || sale.createdAt)}</td>
                      <td>{sale.customerName || 'Cliente no especificado'}</td>
                      <td>{sale.sellerCode || 'VENTA DIRECTA'}</td>
                      <td>
                        {sale.items && sale.items.length > 0 
                          ? sale.items.map(item => item.name).join(', ') 
                          : sale.products || 'N/A'}
                      </td>
                      <td>
                        {sale.items && sale.items.length > 0 
                          ? sale.items.reduce((acc, item) => acc + (item.quantity || 0), 0) 
                          : sale.quantity || 'N/A'}
                      </td>
                      <td>{formatCurrency(sale.total)}</td>
                      <td>
                        <span className={`payment-method ${sale.paymentMethod?.toLowerCase() || 'other'}`}>
                          {sale.paymentMethod || '-'}
                        </span>
                      </td>
                      <td className="notes-cell">
                        {sale.notes ? (
                          <div className="notes-tooltip">
                            {sale.notes.length > 15 
                              ? `${sale.notes.substring(0, 15)}...` 
                              : sale.notes}
                            <span className="tooltip-text">{sale.notes}</span>
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
