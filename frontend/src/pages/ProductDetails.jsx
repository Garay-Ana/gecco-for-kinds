import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './product-details.css';

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(0);
  const [sellerCode, setSellerCode] = useState('');
  const [sellerCodeMsg, setSellerCodeMsg] = useState('');
  const [selectedSize, setSelectedSize] = useState(null);
  const [isSellerCodeValid, setIsSellerCodeValid] = useState(true);

  // Función para validar el código de vendedor en el backend
  const validateSellerCode = useCallback(async (code) => {
    if (!code) {
      setSellerCodeMsg('');
      setIsSellerCodeValid(true);
      return;
    }
    try {
      const response = await axios.get(`https://gecco-for-kinds.onrender.com/api/sellers/${code.toUpperCase()}`);
      if (response.data) {
        setSellerCodeMsg('');
        setIsSellerCodeValid(true);
      } else {
        setSellerCodeMsg('Código de vendedor inválido');
        setIsSellerCodeValid(false);
      }
    } catch (error) {
      setSellerCodeMsg('Código de vendedor inválido');
      setIsSellerCodeValid(false);
    }
  }, []);

  // Validar el código de vendedor cada vez que cambia el input, con debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      validateSellerCode(sellerCode);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [sellerCode, validateSellerCode]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(`https://gecco-for-kinds.onrender.com/api/products/${id}`);
        setProduct(response.data);
      } catch (err) {
        setError('No se pudo cargar el producto. Por favor intenta nuevamente.');
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        <p>{error}</p>
        <Link to="/" className="back-link">&larr; Volver al inicio</Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="error-message">
        <p>Producto no encontrado</p>
        <Link to="/" className="back-link">&larr; Volver al inicio</Link>
      </div>
    );
  }

  // Filtrar imágenes válidas
  const validImages = Array.isArray(product.images)
    ? product.images.filter(img => typeof img === 'string' && img.trim() !== '')
    : [];
  const mainImage = validImages[selectedImage] || validImages[0] || product.image;

  const colorNameMap = {
    '#4caf50': 'Verde',
    '#ffeb3b': 'Amarillo',
    '#ff9800': 'Naranja',
    '#f44336': 'Rojo',
    '#2196f3': 'Azul',
    '#9c27b0': 'Morado',
    '#000000': 'Negro',
    '#ffffff': 'Blanco',
  };

  const colorsArray = (Array.isArray(product.colors) ? product.colors : String(product.colors).split(',')).filter(c => c && c.trim() !== '');
  const selectedColorCode = colorsArray[selectedColor] || '';
  const selectedColorName = colorNameMap[selectedColorCode.toLowerCase()] || selectedColorCode || '';

  const whatsappMessage = `Hola, estoy interesado en el producto: ${product.name} (${(product.price * 1000).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })})
Color: ${selectedColorName}
Talla: ${selectedSize || 'No seleccionada'}
${sellerCode ? `Código de vendedor: ${sellerCode}` : ''}`;

  return (
    <div className="product-details-container">
      <Link to="/" className="back-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
        </svg>
        Volver a productos
      </Link>

      <div className="product-details-card">
        <div className="product-details-image">
          {validImages.length > 0 ? (
            <div className="product-gallery-vsc">
              {validImages.length > 1 && (
                <div className="gallery-thumbnails-vsc">
                  {validImages.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Miniatura ${idx + 1}`}
                      className={`gallery-thumb-vsc${selectedImage === idx ? ' active' : ''}`}
                      onClick={() => setSelectedImage(idx)}
                    />
                  ))}
                </div>
              )}
              <div className="gallery-main-image-vsc">
                <img src={mainImage} alt={product.name} />
                {validImages.length > 1 && (
                  <>
                    <button
                      className="gallery-arrow left"
                      onClick={() => setSelectedImage((selectedImage - 1 + validImages.length) % validImages.length)}
                      aria-label="Anterior"
                    >&#8592;</button>
                    <button
                      className="gallery-arrow right"
                      onClick={() => setSelectedImage((selectedImage + 1) % validImages.length)}
                      aria-label="Siguiente"
                    >&#8594;</button>
                  </>
                )}
              </div>
            </div>
          ) : product.image ? (
            <img src={product.image} alt={product.name} className="gallery-main-image-vsc" />
          ) : (
            <div className="image-placeholder">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="#9ca3af" viewBox="0 0 16 16">
                <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/>
              </svg>
            </div>
          )}
        </div>
        <div className="product-details-info">
          <h2>{product.name}</h2>
          <p className="product-details-price">
            {(product.price * 1000).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
          </p>
          {product.colors && product.colors.length > 0 && (
            <div className="product-details-colors-vsc">
              <span className="color-label">Color:</span>
              <div className="colors-list-vsc">
                {(Array.isArray(product.colors) ? product.colors : String(product.colors).split(',')).filter(c => c && c.trim() !== '').map((color, idx) => (
                  <span
                    key={idx}
                    className={`color-dot-vsc${selectedColor === idx ? ' selected' : ''}`}
                    style={{ background: color.trim() }}
                    title={color.trim()}
                    onClick={() => setSelectedColor(idx)}
                  ></span>
                ))}
              </div>
            </div>
          )}
          {product.sizes && product.sizes.length > 0 && product.sizes.some(s => s && s.trim() !== '') && (
            <div className="product-details-sizes-vsc">
              <span className="sizes-label">Talla</span>
              <div className="sizes-list-vsc">
                {(Array.isArray(product.sizes)
                  ? product.sizes.filter(s => s && s.trim() !== '')
                  : String(product.sizes).split(',').filter(s => s && s.trim() !== '')
                ).map((size, idx) => (
                  <span
                    key={idx}
                    className={`size-badge-vsc${selectedSize === size ? ' selected' : ''}`}
                    onClick={() => setSelectedSize(size)}
                  >{size}</span>
                ))}
              </div>
            </div>
          )}

          {product.description && (
            <div className="product-details-description">
              <h3>Descripción</h3>
              <p>{product.description}</p>
            </div>
          )}

          {product.stock && (
            <p className="product-stock">
              <strong>Disponibilidad:</strong> {product.stock > 0 ? `${product.stock} unidades` : 'Agotado'}
            </p>
          )}

          <div className="seller-code-box" style={{margin:'1.5em 0'}}>
            <label style={{fontWeight:600, color:'#6366f1'}}>¿Tienes código de vendedor? Ingrésalo aquí:</label>
            <input
              type="text"
              value={sellerCode}
              onChange={e => setSellerCode(e.target.value.toUpperCase())}
              placeholder="Ej: ZONA2-JUAN"
              style={{marginTop:'0.5em',padding:'0.7em 1em',borderRadius:'0.7em',border:'1.5px solid #c7d2fe',width:'100%',maxWidth:'320px'}}
            />
            {sellerCodeMsg && <div style={{color:'#ef4444',marginTop:'0.3em'}}>{sellerCodeMsg}</div>}
          </div>

          <a
            href={isSellerCodeValid ? `https://wa.me/573106847094?text=${encodeURIComponent(whatsappMessage)}` : undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`whatsapp-order-btn${!isSellerCodeValid ? ' disabled' : ''}`}
            onClick={e => {
              if (!isSellerCodeValid) {
                e.preventDefault();
              }
            }}
            style={{pointerEvents: isSellerCodeValid ? 'auto' : 'none', opacity: isSellerCodeValid ? 1 : 0.5}}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
            </svg>
            Pedir
          </a>
        </div>
      </div>
    </div>
  );
}
