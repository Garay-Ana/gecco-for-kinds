import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './admin-panel.css';


const CATEGORIES = ['Ropa para Niño', 'Ropa para Niña'];

export default function AdminPanel() {
  // Estados principales
  const [form, setForm] = useState({
    name: '', price: '', stock: '', description: '', image: null,
    images: [], sizes: '', colors: '', category: ''
  });
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [galleryInputs, setGalleryInputs] = useState([null]);
  
  // Estados para vendedores
  const [showSellers, setShowSellers] = useState(false);
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [sellerClients, setSellerClients] = useState([]);
  const [sellerSales, setSellerSales] = useState([]);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);

  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  // Efectos
  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    fetchProducts();
  }, [token, navigate]);

  // Funciones para productos
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get('https://gecco-for-kinds.onrender.com/api/products');
      setProducts(res.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Error al cargar productos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'image' ? files[0] : name === 'images' ? Array.from(files) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      alert('No hay token de autenticación');
      return;
    }

    const formData = new FormData();
    if (form.images && form.images.length > 0) {
      form.images.forEach(img => formData.append('images', img));
    } else if (form.image) {
      formData.append('image', form.image);
    }
    formData.append('sizes', form.sizes || '');
    formData.append('colors', form.colors || '');
    
    Object.entries(form).forEach(([key, val]) => {
      if (["images", "image", "sizes", "colors"].includes(key)) return;
      if (val) formData.append(key, val);
    });

    try {
      setIsLoading(true);
      if (editingId) {
        await axios.put(
          `https://gecco-for-kinds.onrender.com/api/products/${editingId}`,
          formData,
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
        );
        alert('Producto actualizado correctamente');
        setEditingId(null);
      } else {
        await axios.post(
          'https://gecco-for-kinds.onrender.com/api/products',
          formData,
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
        );
        alert('Producto agregado correctamente');
      }

      setForm({ 
        name: '', price: '', stock: '', description: '', 
        image: null, images: [], sizes: '', colors: '', category: '' 
      });
      fetchProducts();
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
      alert('Error al guardar el producto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (product) => {
    setEditingId(product._id);
    setForm({
      name: product.name,
      price: product.price,
      stock: product.stock,
      description: product.description,
      image: null,
      images: [],
      sizes: product.sizes ? product.sizes.join(', ') : '',
      colors: product.colors ? product.colors.join(', ') : '',
      category: product.category || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!token) {
      alert('No hay token de autenticación');
      return;
    }
    
    if (!window.confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
      setIsLoading(true);
      await axios.delete(`https://gecco-for-kinds.onrender.com/api/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Producto eliminado correctamente');
      fetchProducts();
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      alert('Error al eliminar el producto');
    } finally {
      setIsLoading(false);
    }
  };

  // Funciones para vendedores
  const fetchSellers = async () => {
    try {
      setLoadingSellers(true);
      const res = await axios.get('https://gecco-for-kinds.onrender.com/api/admin-sellers/sellers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSellers(res.data);
    } catch (error) {
      console.error('Error fetching sellers:', error);
      alert('Error al cargar vendedores');
    } finally {
      setLoadingSellers(false);
    }
  };

  const fetchSellerClients = async (sellerId) => {
    try {
      setLoadingClients(true);
      const res = await axios.get(`https://gecco-for-kinds.onrender.com/api/admin-sellers/sellers/${sellerId}/clients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSellerClients(res.data);
    } catch (error) {
      console.error('Error fetching seller clients:', error);
      alert('Error al cargar clientes del vendedor');
    } finally {
      setLoadingClients(false);
    }
  };

  const fetchSellerSales = async (sellerId) => {
    try {
      setLoadingSales(true);
      const res = await axios.get(`https://gecco-for-kinds.onrender.com/api/admin-sellers/sellers/${sellerId}/sales`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSellerSales(res.data);
    } catch (error) {
      console.error('Error fetching seller sales:', error);
      alert('Error al cargar ventas del vendedor');
    } finally {
      setLoadingSales(false);
    }
  };

  const handleSelectSeller = (seller) => {
    setSelectedSeller(seller);
    fetchSellerClients(seller._id);
    fetchSellerSales(seller._id);
  };

  const generateSalesReport = () => {
  if (!sellerSales || sellerSales.length === 0) {
    alert('No hay ventas para generar el reporte');
    return;
  }

  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(`Reporte de Ventas - ${selectedSeller.name}`, 14, 20);
  doc.setFontSize(11);
  doc.text(`Código del Vendedor: ${selectedSeller.code}`, 14, 28);

  const tableData = sellerSales.map((sale, idx) => [
    idx + 1,
    new Date(sale.createdAt).toLocaleDateString(),
    sale.customerName,
    `$${sale.total.toLocaleString('es-CO')}`,
    sale.paymentMethod || 'No especificado',
  ]);

  autoTable(doc, {
    startY: 36,
    head: [['#', 'Fecha', 'Vendedor', 'Total', 'Método de Pago']],
    body: tableData,
  });

  doc.save(`reporte_ventas_${selectedSeller.name}.pdf`);
};



  const handleToggleSellers = () => {
    setShowSellers(prev => !prev);
    setShowProducts(false);
    if (!showSellers) {
      fetchSellers();
      setSelectedSeller(null);
      setSellerClients([]);
      setSellerSales([]);
    }
  };

  const handleToggleProducts = () => {
    setShowProducts(prev => !prev);
    setShowSellers(false);
    if (!showProducts) {
      fetchProducts();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  // Render
  return (
    <div className="admin-panel-container">
      <header className="admin-header">
        <div className="admin-title-container">
          <h1 className="admin-title">
            {editingId ? '✏️ Editar Producto' : '➕ Panel de Administración'}
          </h1>
          <p className="admin-subtitle">Gestión de productos y vendedores</p>
        </div>
        <nav className="admin-navbar">
          <button 
            onClick={handleToggleProducts} 
            className={`nav-btn${showProducts ? ' active' : ''}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 1a2.5 2.5 0 0 1 2.5 2.5V4h-5v-.5A2.5 2.5 0 0 1 8 1zm3.5 3v-.5a3.5 3.5 0 1 0-7 0V4H1v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4h-3.5zM2 5h12v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5z"/>
            </svg>
            Productos
          </button>
          <button 
            onClick={handleToggleSellers} 
            className={`nav-btn${showSellers ? ' active' : ''}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816zM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275zM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
            </svg>
            Vendedores
          </button>
          <button onClick={handleLogout} className="logout-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/>
              <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
            </svg>
            Cerrar Sesión
          </button>
        </nav>
      </header>

      <main className="admin-main-content">
        {!showSellers && (
          <form onSubmit={handleSubmit} className="product-form">
            <h2 className="form-title">{editingId ? 'Editar Producto' : 'Agregar Nuevo Producto'}</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Nombre del Producto</label>
                <input
                  id="name" name="name" type="text"
                  placeholder="Ej: Conjunto deportivo infantil"
                  value={form.name} onChange={handleChange} required
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="price">Precio (COP)</label>
                <div className="input-with-icon">
                  <span className="input-icon">$</span>
                  <input
                    id="price" name="price" type="number"
                    placeholder="Ej: 59900" value={form.price}
                    onChange={handleChange} required min="0" step="100"
                    className="form-input"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="stock">Cantidad en Stock</label>
                <input
                  id="stock" name="stock" type="number"
                  placeholder="Ej: 50" value={form.stock}
                  onChange={handleChange} required min="0"
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="category">Categoría</label>
                <select
                  id="category" name="category"
                  value={form.category} onChange={handleChange} required
                  className="form-input"
                >
                  <option value="">Selecciona una categoría</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Descripción del Producto</label>
                <textarea
                  id="description" name="description"
                  placeholder="Describe las características del producto..."
                  value={form.description}
                  onChange={handleChange} required
                  className="form-textarea"
                  rows="4"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="sizes">Tallas Disponibles</label>
                <input
                  id="sizes" name="sizes" type="text"
                  placeholder="Separadas por comas. Ej: 4A, 6A, 8A, 10A"
                  value={form.sizes}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="colors">Colores Disponibles</label>
                <div className="color-palette-admin">
                  {['#ff0000','#00bcd4','#4caf50','#ffeb3b','#ff9800','#e91e63','#9c27b0','#795548','#607d8b','#000000','#ffffff'].map((color, idx) => (
                    <span
                      key={idx}
                      className={`color-dot${form.colors.split(',').map(c => c.trim().toLowerCase()).includes(color.toLowerCase()) ? ' selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        let arr = form.colors.split(',').map(c => c.trim()).filter(Boolean);
                        if (arr.map(c => c.toLowerCase()).includes(color.toLowerCase())) {
                          arr = arr.filter(c => c.toLowerCase() !== color.toLowerCase());
                        } else {
                          arr.push(color);
                        }
                        setForm(f => ({ ...f, colors: arr.join(', ') }));
                      }}
                    />
                  ))}
                </div>
                <input
                  id="colors" name="colors" type="text"
                  placeholder="Separados por comas. Ej: rojo, azul, #ff0000"
                  value={form.colors}
                  onChange={handleChange}
                  className="form-input mt-1"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="image">Imagen Principal</label>
                <div className="file-upload-wrapper">
                  <label htmlFor="image" className="file-upload-label">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M4.502 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
                      <path d="M14.002 13a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2V5A2 2 0 0 1 2 3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-1.998 2zM14 2H4a1 1 0 0 0-1 1h9.002a2 2 0 0 1 2 2v7A1 1 0 0 0 15 11V3a1 1 0 0 0-1-1zM2.002 4a1 1 0 0 0-1 1v8l2.646-2.354a.5.5 0 0 1 .63-.062l2.66 1.773 3.71-3.71a.5.5 0 0 1 .577-.094l1.777 1.947V5a1 1 0 0 0-1-1h-10z"/>
                    </svg>
                    <span>{form.image ? form.image.name : 'Seleccionar imagen'}</span>
                  </label>
                  <input
                    id="image" name="image" type="file"
                    accept="image/*" onChange={handleChange}
                    className="file-upload-input"
                  />
                </div>
              </div>
            </div>
            
            <div className="form-actions">
              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    Procesando...
                  </>
                ) : editingId ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M2 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H9.5a1 1 0 0 0-1 1v4.5a.5.5 0 0 0 .764.424l5.592-4.186a.5.5 0 0 1 .615.077l3.55 3.55a.5.5 0 0 1-.077.615l-4.186 5.592a.5.5 0 0 0 .424.764H14a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2z"/>
                    </svg>
                    Actualizar Producto
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                    </svg>
                    Agregar Producto
                  </>
                )}
              </button>
              
              {editingId && (
                <button 
                  type="button" 
                  onClick={() => {
                    setEditingId(null);
                    setForm({ 
                      name: '', price: '', stock: '', description: '', 
                      image: null, images: [], sizes: '', colors: '', category: '' 
                    });
                  }}
                  className="cancel-btn"
                >
                  Cancelar Edición
                </button>
              )}
            </div>
          </form>
        )}

        {showProducts && (
          <div className="products-section">
            <div className="section-header">
              <h2>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 1a2.5 2.5 0 0 1 2.5 2.5V4h-5v-.5A2.5 2.5 0 0 1 8 1zm3.5 3v-.5a3.5 3.5 0 1 0-7 0V4H1v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4h-3.5zM2 5h12v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5z"/>
                </svg>
                Listado de Productos
              </h2>
              <div className="products-count">
                {products.length} {products.length === 1 ? 'producto' : 'productos'} registrados
              </div>
            </div>
            
            {isLoading && products.length === 0 ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Cargando productos...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="#a0aec0" viewBox="0 0 16 16">
                  <path d="M8 1a2.5 2.5 0 0 1 2.5 2.5V4h-5v-.5A2.5 2.5 0 0 1 8 1zm3.5 3v-.5a3.5 3.5 0 1 0-7 0V4H1v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4h-3.5zM2 5h12v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5z"/>
                </svg>
                <h3>No hay productos registrados</h3>
                <p>Comienza agregando tu primer producto</p>
              </div>
            ) : (
              <div className="products-grid">
                {products.map(product => (
                  <div key={product._id} className="product-card">
                    <div className="product-image-container">
                      {product.image ? (
                        <img 
                          src={product.image} alt={product.name}
                          className="product-image" loading="lazy"
                        />
                      ) : (
                        <div className="image-placeholder">
                          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="#a0aec0" viewBox="0 0 16 16">
                            <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                            <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    <div className="product-info">
                      <div className="product-header">
                        <h3 className="product-name">{product.name}</h3>
                        <span className="product-category">{product.category}</span>
                      </div>
                      
                      <div className="product-price-stock">
                        <span className="product-price">
                          {(product.price * 1000).toLocaleString('es-CO', { 
                            style: 'currency', currency: 'COP', minimumFractionDigits: 0 
                          })}
                        </span>
                        <span className={`product-stock ${product.stock <= 5 ? 'low-stock' : ''}`}>
                          {product.stock} en stock
                        </span>
                      </div>
                      
                      <p className="product-description">{product.description}</p>
                      
                      <div className="product-attributes">
                        {product.sizes && product.sizes.length > 0 && (
                          <div className="attribute">
                            <span className="attribute-label">Tallas:</span>
                            <span className="attribute-value">{product.sizes.join(', ')}</span>
                          </div>
                        )}
                        
                        {product.colors && product.colors.length > 0 && (
                          <div className="attribute">
                            <span className="attribute-label">Colores:</span>
                            <div className="color-dots">
                              {product.colors.slice(0, 5).map((color, idx) => (
                                <span 
                                  key={idx} className="color-dot" 
                                  style={{ backgroundColor: color.trim() }}
                                  title={color.trim()}
                                />
                              ))}
                              {product.colors.length > 5 && (
                                <span className="more-colors">+{product.colors.length - 5}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="product-actions">
                      <button 
                        onClick={() => handleEdit(product)} 
                        className="edit-btn"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                        </svg>
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDelete(product._id)} 
                        className="delete-btn"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                          <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showSellers && (
          <div className="sellers-section">
            <div className="section-header">
              <h2>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816zM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275zM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
                </svg>
                Gestión de Vendedores
              </h2>
            </div>
            
            <div className="sellers-content">
              <div className="sellers-list-container">
                <h3>Lista de Vendedores</h3>
                {loadingSellers ? (
                  <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Cargando vendedores...</p>
                  </div>
                ) : sellers.length === 0 ? (
                  <div className="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="#a0aec0" viewBox="0 0 16 16">
                      <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816zM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275zM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
                    </svg>
                    <h3>No hay vendedores registrados</h3>
                  </div>
                ) : (
                  <ul className="seller-list">
                    {sellers.map(seller => (
                      <li 
                        key={seller._id} 
                        onClick={() => handleSelectSeller(seller)} 
                        className={`seller-item${selectedSeller?._id === seller._id ? ' selected' : ''}`}
                      >
                        <div className="seller-avatar">
                          {seller.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="seller-info">
                          <strong>{seller.name}</strong>
                          <span>{seller.email}</span>
                          <div className="seller-meta">
                            <span>Código: {seller.code}</span>
                            <span>Zona: {seller.zone}</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              {selectedSeller && (
                <div className="seller-details-container">
                  <div className="seller-profile">
                    <div className="seller-avatar large">
                      {selectedSeller.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="seller-profile-info">
                      <h3>{selectedSeller.name}</h3>
                      <p>{selectedSeller.email}</p>
                      <div className="seller-stats">
                        <div className="stat">
                          <span className="stat-value">{sellerClients.length}</span>
                          <span className="stat-label">Clientes</span>
                        </div>
                        <div className="generate-report-btn">
                        <button 
                          onClick={generateSalesReport}
                            style={{
                                background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)',
                             color: 'white',
                             border: 'none',
                             padding: '0.6rem 1.2rem',
                             borderRadius: '8px',
                             fontWeight: '600',
                             fontSize: '0.9rem',
                             cursor: 'pointer',
                             display: 'flex',
                             alignItems: 'center',
                             gap: '0.5rem',
                             boxShadow: '0 4px 6px rgba(79, 70, 229, 0.2)',
                             transition: 'all 0.3s ease'
                          }}
                   >
                    📄 Descargar Reporte PDF
                  </button>
                      </div>

                    <div className="stat">
                          <span className="stat-value">{sellerSales.length}</span>
                          <span className="stat-label">Ventas</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="seller-tabs">
                    <div className="tab-content">
                      <h4>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                        </svg>
                        Personas a cargo
                      </h4>
                      
                      {loadingClients ? (
                        <div className="loading-spinner">
                          <div className="spinner"></div>
                          <p>Cargando clientes...</p>
                        </div>
                      ) : sellerClients.length > 0 ? (
                        <div className="clients-table">
                          <table>
                            <thead>
                              <tr>
                                <th>Nombre</th>
                                <th>Contacto</th>
                                <th>Código</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sellerClients.map(client => (
                                <tr key={client._id}>
                                  <td>{client.name}</td>
                                  <td>{client.contact}</td>
                                  <td>{client.code}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="empty-state small">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#a0aec0" viewBox="0 0 16 16">
                            <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                          </svg>
                          <p>No hay personas a cargo registradas</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="tab-content">
                      <h4>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M0 1a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1v4.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 1 7.5V3a1 1 0 0 1-1-1V1zm2 3v4.5A1.5 1.5 0 0 0 3.5 10h9a1.5 1.5 0 0 0 1.5-1.5V4H2zm13-3H1v1h14V1zM5 7.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z"/>
                        </svg>
                        Historial de Ventas
                      </h4>
                      
                      {loadingSales ? (
                        <div className="loading-spinner">
                          <div className="spinner"></div>
                          <p>Cargando ventas...</p>
                        </div>
                      ) : sellerSales.length > 0 ? (
                        <div className="sales-table">
                          <table>
                            <thead>
                            <tr>
                              <th>Fecha</th>
                              <th>Vendedor</th>
                              <th>Total</th>
                              <th>Método de pago</th>
                            </tr>
                            </thead>
                            <tbody>
{sellerSales.map(sale => (
  <tr key={sale._id}>
    <td>{new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}</td>
    <td>{sale.customerName}</td>
    <td>${sale.total.toLocaleString()}</td>
    <td>{sale.paymentMethod || 'No especificado'}</td>
  </tr>
))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="empty-state small">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#a0aec0" viewBox="0 0 16 16">
                            <path d="M0 1a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1v4.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 1 7.5V3a1 1 0 0 1-1-1V1zm2 3v4.5A1.5 1.5 0 0 0 3.5 10h9a1.5 1.5 0 0 0 1.5-1.5V4H2zm13-3H1v1h14V1zM5 7.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z"/>
                          </svg>
                          <p>No hay ventas registradas</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}