
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { podeAcessarRota } from '../utils/permissoes';

interface Props {
  rota: string;
  children: ReactNode;
}

export function RotaComPermissao({ rota, children }: Props) {
  const { usuarioLogado, verificandoSessao } = useApp();

  if (verificandoSessao) {
    return <div>Verificando permissões...</div>;
  }

  if (!usuarioLogado) {
    return <Navigate to="/" replace />;
  }

  if (!podeAcessarRota(usuarioLogado, rota)) {
    return (
      <main role="alert" style={{ padding: '2rem' }}>
        <h2>Acesso negado</h2>
        <p>Você não possui permissão para acessar esta funcionalidade.</p>
      </main>
    );
  }

  return <>{children}</>;
}
