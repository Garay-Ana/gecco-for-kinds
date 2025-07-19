import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './seller-panell.css';

export default function EVentas() {
  const [form, setForm] = useState({
    saleDate: '',
    customerName: '',
    customerPhone: '',
    products: '',
    quantity: '',
    totalPrice: '',
    hasSeller: 'No',
    sellerCode: '',
    paymentMethod: '',
    notes: '',
    address: 'No especificada'
  });

  const [msg, setMsg] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('sellerToken');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');

    if (!token) {
      setMsg('No hay token. Por favor inicia sesión.');
      return;
    }

    try {
      // Enviar la fecha tal cual sin ajuste para evitar desfase
      const adjustedSaleDate = form.saleDate || null;

      await axios.post(
        'http://localhost:5000/api/sales',
        {
          ...form,
          saleDate: adjustedSaleDate,
          customerPhone: form.customerPhone,
          address: form.address
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMsg('Venta registrada correctamente');
      setForm({
        saleDate: '',
        customerName: '',
        customerPhone: '',
        products: '',
        quantity: '',
        totalPrice: '',
        hasSeller: 'No',
        sellerCode: '',
        paymentMethod: '',
        notes: '',
        address: 'No especificada'
      });
    } catch (error) {
      console.log('Error al registrar:', error.response?.data); // 🛠 muestra más información
      setMsg(error.response?.data?.error || 'Error al registrar la venta');
    }
  };

  return (
    <div className="sales-container">
      <header className="sales-header">
        <h1 className="sales-title">Registrar Venta</h1>
        <button className="sales-back-button" onClick={() => navigate('/seller/panel')}>
          <i className="fas fa-arrow-left"></i> Volver al panel
        </button>
      </header>

      <div className="sales-content">
        <form onSubmit={handleSubmit} className="sales-form">
          <div className="form-header">
            <h2>Formulario de Venta</h2>
            <p>Complete todos los campos requeridos</p>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Fecha de la venta *</label>
              <input
                type="date"
                name="saleDate"
                value={form.saleDate}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Nombre del vendedor *</label>
              <input
                type="text"
                name="customerName"
                value={form.customerName}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div className="form-group">
            <label>Teléfono del vendedor</label>
            <input
              type="text"
              name="customerPhone"
              value={form.customerPhone}
              onChange={handleChange}
              className="form-input"
              placeholder="Ej: 3001234567"
            />
            </div>

            <div className="form-group">
              <label>Producto(s) vendido(s) *</label>
              <textarea
                name="products"
                value={form.products}
                onChange={handleChange}
                className="form-textarea"
                placeholder="Lista de productos separados por comas"
                required
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>Cantidad *</label>
              <input
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                min="1"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Precio total de la venta *</label>
              <div className="input-with-symbol">
                <span>$</span>
                <input
                  type="number"
                  name="totalPrice"
                  value={form.totalPrice}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  required
                  className="form-input"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="form-group">
              <label>¿Tiene asesor/vendedor adicional?</label>
              <select
                name="hasSeller"
                value={form.hasSeller}
                onChange={handleChange}
                className="form-select"
              >
                <option value="No">No</option>
                <option value="Sí">Sí</option>
              </select>
            </div>

            {form.hasSeller === 'Sí' && (
              <div className="form-group">
                <label>Código del vendedor adicional *</label>
                <input
                  type="text"
                  name="sellerCode"
                  value={form.sellerCode}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="Código de 6 dígitos"
                />
              </div>
            )}

            <div className="form-group">
              <label>Método de pago</label>
              <select
                name="paymentMethod"
                value={form.paymentMethod}
                onChange={handleChange}
                className="form-select"
              >
                <option value="">Seleccione...</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Nequi">Nequi</option>
                <option value="Daviplata">Daviplata</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>Notas o comentarios</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                className="form-textarea"
                placeholder="Observaciones adicionales sobre la venta"
                rows="3"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-button">
              <i className="fas fa-save"></i> Registrar Venta
            </button>
          </div>

          {msg && (
            <div className={`message ${msg.includes('correctamente') ? 'success' : 'error'}`}>
              {msg}
            </div>
          )}
        </form>

        <div className="additional-actions">
          <button className="view-sales-button" onClick={() => navigate('/seller/VerVentas')}>
            <i className="fas fa-list"></i> Ver Historial de Ventas
          </button>
        </div>
      </div>
    </div>
  );
}
