import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './home.css';

const CATEGORIES = [
  'Ropa para Niño',
  'Ropa para Niña'
];

// Mapeo entre slug y nombre exacto de categoría
const CATEGORY_SLUGS = {
  'ropa-para-nino': 'Ropa para Niño',
  'ropa-para-niño': 'Ropa para Niño',
  'ropa-para-nina': 'Ropa para Niña',
  'ropa-para-niña': 'Ropa para Niña',
};

function getCategoryFromSlug(slug) {
  // Normaliza el slug para soportar variantes con y sin tilde
  return CATEGORY_SLUGS[slug] || CATEGORY_SLUGS[slug.replace('ñ', 'n')] || '';
}

function getSlugFromCategory(category) {
  // Devuelve el slug correcto para la categoría
  if (category === 'Ropa para Niño') return 'ropa-para-nino';
  if (category === 'Ropa para Niña') return 'ropa-para-nina';
  return '';
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Sincronizar selectedCategory con la URL
  useEffect(() => {
    const match = location.pathname.match(/^\/categoria\/(.+)$/);
    if (match) {
      const slug = match[1];
      const category = getCategoryFromSlug(slug);
      if (category && category !== selectedCategory) {
        setSelectedCategory(category);
      }
    } else if (selectedCategory) {
      setSelectedCategory('');
    }
    // eslint-disable-next-line
  }, [location.pathname]);

  // Mostrar el nombre de la categoría correctamente en el header
  const displayCategory = selectedCategory
    ? selectedCategory.replace('nino', 'niño').replace('nina', 'niña')
    : '';

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mostrar el spinner solo si la carga tarda más de 300ms
  useEffect(() => {
    let timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoading(true), 300);
    } else {
      setShowLoading(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  // Fetch products with filters
  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (selectedCategory) {
      params.append('category', selectedCategory);
    }
    const trimmedSearch = search.trim();
    if (trimmedSearch.length > 0) {
      params.append('search', trimmedSearch);
    }
    const url = `https://gecco-for-kinds.onrender.com/api/products${params.toString() ? '?' + params.toString() : ''}`;
    axios.get(url)
      .then(res => {
        setProducts(res.data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, [selectedCategory, search]);

  return (
    <div className="home-bg">
      {/* Header */}
      <header className="home-header">
        <div className="header-content">
          <h1 className="logo">
            <span className="logo-accent">GECCO</span> FOR KIDS
          </h1>
          {/* Categorías y búsqueda */}
          <nav className="navbar-categories">
            <div className="dropdown" ref={dropdownRef}>
              <button
                className="dropdown-toggle"
                onClick={() => setDropdownOpen((open) => !open)}
              >
                Categorías {selectedCategory ? `: ${selectedCategory}` : ''}
                <span className="dropdown-arrow">▼</span>
              </button>
              {dropdownOpen && (
                <ul className="dropdown-menu">
                  <li
                    className={!selectedCategory ? 'active' : ''}
                    onClick={() => { setSelectedCategory(''); setDropdownOpen(false); navigate('/'); }}
                  >
                    Todas
                  </li>
                  {CATEGORIES.map(cat => (
                    <li
                      key={cat}
                      className={selectedCategory === cat ? 'active' : ''}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setDropdownOpen(false);
                        navigate(`/categoria/${getSlugFromCategory(cat)}`);
                      }}
                    >
                      {cat}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <input
              type="text"
              className="search-input"
              placeholder="Buscar productos..."
              value={search}
              onChange={e => {
                const value = e.target.value;
                if (value === search) return;
                setSearch(value);
              }}
            />
          </nav>
          <div className="header-category-title">
            {selectedCategory && (
              <span style={{ fontWeight: 700, fontSize: '2rem', marginLeft: 40 }}>
                Categoría: {displayCategory}
              </span>
            )}
          </div>
          <div className="header-buttons">
            <Link to="/admin/login">
              <button className="header-button admin">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                Admin
              </button>
            </Link>
            <Link to="/seller/login">
              <button className="header-button register">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6z" />
                </svg>
                Vendedor
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="main-content">
        {showLoading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : products.length === 0 && (search.trim() || selectedCategory) ? (
          <div className="no-products-message">
            No hay productos con ese filtro.
          </div>
        ) : (
          <div className="products-grid">
            {products.map((product) => (
              <div key={product._id} className="product-card">
                <div className="product-image-container">
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="product-image"
                      loading="lazy"
                    />
                  ) : (
                    <div className="image-placeholder">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="product-details">
                  <h3 className="product-title">
                    {product.name}
                    <span className="product-price">
                      {(product.price * 1000).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                    </span>
                  </h3>
                  <p className="product-category">{product.category}</p>
                  <p className="product-description">{product.description}</p>
                  {/* COLORES */}
                  {product.colors && (Array.isArray(product.colors) ? product.colors.length : String(product.colors).split(',').filter(c => c && c.trim() !== '').length) > 0 && (
                    <div className="product-colors-row">
                      <span className="color-count">Colores:</span>
                      <div className="color-dot-list">
                        {(Array.isArray(product.colors) ? product.colors : String(product.colors).split(',').filter(c => c && c.trim() !== '')).slice(0, 5).map((color, idx) => (
                          <span key={idx} className="color-dot" style={{background: color.trim()}} title={color.trim()}></span>
                        ))}
                        {Array.isArray(product.colors) && product.colors.length > 5 && <span className="color-dot more">+{product.colors.length - 5}</span>}
                      </div>
                    </div>
                  )}
                  {/* TALLAS */}
                  {product.sizes && (Array.isArray(product.sizes) ? product.sizes.length : String(product.sizes).split(',').filter(s => s && s.trim() !== '').length) > 0 && (
                    <div className="product-sizes-row">
                      <span className="sizes-label">Tallas:</span>
                      {(Array.isArray(product.sizes) ? product.sizes : String(product.sizes).split(',').filter(s => s && s.trim() !== '')).map((size, idx) => (
                        <span key={idx} className="size-badge">{size}</span>
                      ))}
                    </div>
                  )}
                  {/* MINIATURAS DE GALERÍA */}
                  {product.images && product.images.length > 1 && (
                    <div className="product-thumbnails-row">
                      {product.images.map((img, idx) => (
                        <img key={idx} src={img} alt={`Miniatura ${idx+1}`} className="product-thumb" style={{width:32, height:32, objectFit:'cover', borderRadius:6, marginRight:4}} />
                      ))}
                    </div>
                  )}
                  <Link to={`/product/${product._id}`} className="details-button">Ver Detalles</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-content">
          <p className="footer-text">© {new Date().getFullYear()} GECCO FOR KIDS. Todos los derechos reservados.</p>
          <div className="social-links">
            <a href="#" className="social-link">
              <svg className="social-icon" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
              </svg>
            </a>
            <a href="#" className="social-link">
              <svg className="social-icon" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </a>
            <a href="#" className="social-link">
              <svg className="social-icon" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
          <p className="footer-authors" style={{marginTop: '0.7rem', fontSize: '1rem', color: '#64748b', textAlign: 'center'}}>Autores: Ana Gabriel Garay, Cesar Eduardo Galvis</p>
        </div>
      </footer>
    </div>
  );
}