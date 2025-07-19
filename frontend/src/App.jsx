import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AdminLogin from './pages/AdminLogin';
import AdminPanel from './pages/AdminPanel';
import RegisterAdmin from './pages/RegisterAdmin';
import ProductDetails from './pages/ProductDetails';
import CategoryView from './pages/CategoryView';
import AdminOrders from './pages/AdminOrders';
import SellerLogin from './pages/SellerLogin';
import SellerPanel from './pages/SellerPanel';
import SellerRegister from './pages/SellerRegister';
import SellerProfile from './pages/SellerProfile';
import ClientDetail from './pages/ClientDetail';
import EVentas from './pages/eVentas';
import VerVentas from './pages/VerVentas';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/panel" element={<AdminPanel />} />
      <Route path="/admin/register" element={<RegisterAdmin />} />
      <Route path="/admin/pedidos" element={<AdminOrders />} />
      <Route path="/product/:id" element={<ProductDetails />} />
      <Route path="/categoria/:nombre" element={<CategoryView />} />
      <Route path="/seller/login" element={<SellerLogin />} />
      <Route path="/seller/panel" element={<SellerPanel />} />
      <Route path="/seller/register" element={<SellerRegister />} />
      <Route path="/seller/profile" element={<SellerProfile />} />
      <Route path="/seller/client/:id" element={<ClientDetail />} />
      <Route path="/seller/eVentas" element={<EVentas />} />
      <Route path="/seller/VerVentas" element={<VerVentas />} />
    </Routes>
  );
}

export default App;
