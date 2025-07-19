import { useEffect, useState } from 'react';
import axios from 'axios';
import './admin-orders.css';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Cambia la URL según tu backend
      const res = await axios.get('http://localhost:5000/api/orders', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setOrders(res.data);
    } catch (err) {
      setError('Error al cargar pedidos');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!orders.length) return;
    const header = 'ID,Cliente,Fecha,Estado,Total\n';
    const rows = orders.map(o => `${o._id},${o.customerName || ''},${o.createdAt ? new Date(o.createdAt).toLocaleString() : ''},${o.status || ''},${o.total || ''}`).join('\n');
    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pedidos.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-orders-bg">
      <div className="admin-orders-card">
        <h1 className="admin-orders-title">Pedidos</h1>
        <button className="admin-orders-download" onClick={downloadCSV} disabled={!orders.length}>
          Descargar reporte CSV
        </button>
        {isLoading ? (
          <div className="admin-orders-loading">Cargando pedidos...</div>
        ) : error ? (
          <div className="admin-orders-error">{error}</div>
        ) : (
          <div className="admin-orders-table-wrapper">
            <table className="admin-orders-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order._id}>
                    <td>{order._id}</td>
                    <td>{order.customerName || '-'}</td>
                    <td>{order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}</td>
                    <td>{order.status || '-'}</td>
                    <td>{order.total ? `$${order.total.toLocaleString('es-CO')}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
