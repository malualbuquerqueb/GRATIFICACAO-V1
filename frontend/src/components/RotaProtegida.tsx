
import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export function RotaProtegida() {
  const { autenticado, verificandoSessao } = useApp();

  // Aguarda a consulta da sessão ao backend.
  if (verificandoSessao) {
    return <div>Verificando autenticação...</div>;
  }

  // Impede o acesso sem uma sessão autenticada.
  if (!autenticado) {
    return <Navigate to="/" replace />;
  }

  // Libera as rotas internas.
  return <Outlet />;
}
