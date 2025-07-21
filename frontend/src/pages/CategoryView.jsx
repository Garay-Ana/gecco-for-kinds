import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import './home.css';

export default function CategoryView() {
  const { nombre } = useParams();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setIsLoading(true);
    // Normalizar el nombre de la categoría para soportar variantes con y sin tilde
    function normalize(str) {
      return (str || '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    }
    const categoryParam = normalize(nombre.replace(/-/g, ' '));
    const params = new URLSearchParams();
    params.append('category', categoryParam === 'ropa para nino' ? 'Ropa para Niño' : categoryParam === 'ropa para nina' ? 'Ropa para Niña' : nombre.replace(/-/g, ' '));
    if (search.trim()) params.append('search', search.trim());
    axios.get(`https://gecco-for-kinds.onrender.com/api/products?${params.toString()}`)
      .then(res => {
        setProducts(res.data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [nombre, search]);

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-content">
          <h1 className="logo">
            <span className="logo-accent">GECCO</span> FOR KIDS
          </h1>
          <h2 style={{fontWeight:700, fontSize:'1.3rem', marginLeft:'2rem'}}>
            Categoría: {nombre.replace(/-/g, ' ').replace('nino', 'niño').replace('nina', 'niña').replace(/\b\w/g, l => l.toUpperCase())}
          </h2>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar en esta categoría..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{marginLeft:'2rem'}}
          />
          <Link to="/" className="header-button" style={{marginLeft:'2rem', minWidth: '120px', maxWidth: '160px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', padding: '0 16px', borderRadius: '12px', textAlign: 'center'}}>
            Volver al inicio
          </Link>
        </div>
      </header>
      <main className="main-content">
        {isLoading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : (() => {
          // Filtrar productos con categoría válida y que coincida exactamente (insensible a mayúsculas, espacios y acentos)
          function normalize(str) {
            return (str || '')
              .normalize('NFD')
              .replace(/\p{Diacritic}/gu, '')
              .replace(/\s+/g, ' ')
              .trim()
              .toLowerCase();
          }
          const catParam = normalize(nombre.replace(/-/g, ' '));
          const filtered = products.filter(product => normalize(product.category) === catParam ||
            (catParam === 'ropa para nino' && normalize(product.category) === 'ropa para niño') ||
            (catParam === 'ropa para nina' && normalize(product.category) === 'ropa para niña')
          );
          return filtered.length === 0 ? (
            <div className="no-products-message">No hay productos en esta categoría.</div>
          ) : (
            <div className="products-grid">
              {filtered.map(product => {
                // Galería y selección de color/talla por producto
                const images = product.images && product.images.length > 0 ? product.images : (product.image ? [product.image] : []);
                const colors = Array.isArray(product.colors) ? product.colors : (product.colors ? String(product.colors).split(',').map(c => c.trim()).filter(Boolean) : []);
                const sizes = Array.isArray(product.sizes) ? product.sizes : (product.sizes ? String(product.sizes).split(',').map(s => s.trim()).filter(Boolean) : []);
                // Estado local por producto (usando useState dentro del map NO es válido, así que lo movemos a un subcomponente)
                return <ProductCard key={product._id} product={product} images={images} colors={colors} sizes={sizes} />;
              })}
            </div>
          );
        })()}
      </main>
    </div>
  );
}

// Subcomponente para manejar estado local de galería y selección
function ProductCard({ product, images, colors, sizes }) {
  const [mainImg, setMainImg] = useState(images[0] || '');
  const [selectedColor, setSelectedColor] = useState(colors[0] || '');
  const [selectedSize, setSelectedSize] = useState(sizes[0] || '');
  return (
    <div className="product-card pro-card-modern">
      <div className="pro-gallery-layout">
        <div className="pro-thumbs-vertical">
          {images.length > 1 && images.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt={`Miniatura ${idx+1}`}
              className={`pro-thumb-img${mainImg === img ? ' selected' : ''}`}
              onMouseEnter={() => setMainImg(img)}
              style={{width:48, height:48, objectFit:'cover', borderRadius:8, marginBottom:6, border: mainImg === img ? '2px solid #0077ff' : '2px solid #eee', cursor:'pointer', background:'#fff'}}
            />
          ))}
        </div>
        <div className="pro-main-img-container">
          <img src={mainImg} alt={product.name} className="pro-main-img" style={{width:220, height:220, objectFit:'cover', borderRadius:12, background:'#fff'}} />
        </div>
      </div>
      <div className="product-details pro-details-modern">
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
        <Link to={`/product/${product._id}`} className="details-button pro-details-btn">Ver Detalles</Link>
      </div>
    </div>
  );
}
