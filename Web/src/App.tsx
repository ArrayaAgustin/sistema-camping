import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import PrivateRoute from './components/PrivateRoute';
import CambiarContrasena from './components/CambiarContrasena';
import Home from './components/Home';
import CredencialDigital from './components/user/CredencialDigital';
import PerfilUsuario from './components/user/PerfilUsuario';
import ControlIngreso from './components/operador/ControlIngreso';
import AdminPanel from './components/admin/AdminPanel';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" richColors closeButton />
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/cambiar-password"
              element={
                <PrivateRoute>
                  <CambiarContrasena />
                </PrivateRoute>
              }
            />
            <Route
              path="/credencial"
              element={
                <PrivateRoute>
                  <CredencialDigital />
                </PrivateRoute>
              }
            />
            <Route
              path="/perfil"
              element={
                <PrivateRoute>
                  <PerfilUsuario />
                </PrivateRoute>
              }
            />
            <Route
              path="/operador"
              element={
                <PrivateRoute allowedRoles={['operador', 'admin']}>
                  <ControlIngreso />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <PrivateRoute allowedRoles={['admin']}>
                  <AdminPanel />
                </PrivateRoute>
              }
            />
            <Route
              path="/app"
              element={
                <PrivateRoute>
                  <div className="app-shell">Panel en construcción</div>
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
