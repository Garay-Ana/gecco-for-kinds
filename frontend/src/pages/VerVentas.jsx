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
  const [totals, setTotals] = useState({
    totalSales: '$0',
    salesCount: 0,
    totalItems: 0
  });
  const [pdfLoading, setPdfLoading] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('sellerToken');

  const formatDateAdjusted = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('es-CO');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const fetchSales = async () => {
    try {
      setLoading(true);
      setMsg('');
      
      if (!token) {
        navigate('/login');
        return;
      }

      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const res = await axios.get('http://localhost:5000/api/sales', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      if (res.data.success) {
        setSales(res.data.data || []);
        
        setTotals({
          totalSales: formatCurrency(res.data.summary?.totalVentas || 0),
          salesCount: res.data.summary?.cantidadVentas || 0,
          totalItems: res.data.summary?.totalProductos || 0
        });
        
        setMsg('');
      } else {
        setMsg(res.data.error || 'Error al cargar las ventas');
        setSales([]);
        resetTotals();
      }
    } catch (error) {
      console.error('Error:', error);
      setMsg(error.response?.data?.error || 'Error al cargar las ventas');
      setSales([]);
      resetTotals();
    } finally {
      setLoading(false);
    }
  };

  const resetTotals = () => {
    setTotals({
      totalSales: '$0',
      salesCount: 0,
      totalItems: 0
    });
  };

  const downloadPDFReport = async () => {
    try {
      setPdfLoading(true);
      setMsg('');
      
      if (sales.length === 0) {
        setMsg('No hay ventas para generar reporte');
        return;
      }

      const params = {
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      };

      const response = await axios.get('http://localhost:5000/api/sales/report', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        },
        params,
        responseType: 'blob',
        timeout: 30000
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `reporte_ventas_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
        setMsg('Reporte descargado exitosamente');
      }, 100);

    } catch (error) {
      console.error('Error en downloadPDFReport:', error);
      
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
      setPdfLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(f => ({ ...f, [name]: value }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchSales();
  };

  return (
    <div className="view-sales-container">
      {loading && (
        <div className="overlay-loader">
          <div className="loader-content">
            <i className="fas fa-spinner fa-spin fa-2x"></i>
            <p>Cargando ventas...</p>
          </div>
        </div>
      )}

      <header className="view-sales-header">
        <h1 className="view-sales-title">
          <i className="fas fa-chart-line"></i> Ventas Realizadas
        </h1>
        <div className="header-buttons-container">
          <button 
            className="view-sales-back-button"
            onClick={() => navigate('/seller/eVentas')}
            disabled={loading}
          >
            <i className="fas fa-plus-circle"></i> Registrar Nueva Venta
          </button>
          <button 
            className={`download-pdf-button ${pdfLoading ? 'loading' : ''}`}
            onClick={downloadPDFReport}
            disabled={pdfLoading || loading || sales.length === 0}
            title={sales.length === 0 ? 'No hay ventas para reportar' : ''}
          >
            {pdfLoading ? (
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
                max={filters.endDate || new Date().toISOString().split('T')[0]}
                disabled={loading}
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
                max={new Date().toISOString().split('T')[0]}
                min={filters.startDate}
                disabled={loading}
              />
            </div>
          </div>

          <div className="filter-actions">
            <button 
              type="submit" 
              className="filter-button"
              disabled={loading}
            >
              <i className="fas fa-search"></i> Aplicar Filtros
            </button>
            <button 
              type="button" 
              className="reset-button"
              onClick={() => {
                setFilters({ startDate: '', endDate: '' });
                fetchSales();
              }}
              disabled={loading}
            >
              <i className="fas fa-undo"></i> Limpiar
            </button>
          </div>
        </form>

        {msg && (
          <div className={`message ${msg.includes('Error') ? 'error' : 'success'}`}>
            {msg}
          </div>
        )}

        {/* Resumen de ventas */}
        <div className="sales-summary">
          <div className="summary-card">
            <h3>Total Ventas</h3>
            <p className="summary-value">{totals.totalSales}</p>
          </div>
          <div className="summary-card">
            <h3>Cantidad de Ventas</h3>
            <p className="summary-value">{totals.salesCount}</p>
          </div>
          <div className="summary-card">
            <h3>Total Productos Vendidos</h3>
            <p className="summary-value">{totals.totalItems}</p>
          </div>
        </div>

        <section className="sales-list-section">
          <h2 className="section-title">
            <i className="fas fa-list-alt"></i> Historial de Ventas
          </h2>

          {!loading && sales.length === 0 ? (
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
                  {sales.map((sale, index) => (
                    <tr key={sale._id || index} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
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
                      <td className="total-cell">
                        {formatCurrency(sale.total || 0)}
                      </td>
                      <td>
                        <span className={`payment-method ${(sale.paymentMethod || '').toLowerCase() || 'other'}`}>
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