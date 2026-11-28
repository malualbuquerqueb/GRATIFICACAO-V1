
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { RotaProtegida } from './components/RotaProtegida';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
//import { Indicadores } from './pages/Indicadores';
import { Preenchimento } from './pages/Preenchimento';
import { Validacao } from './pages/Validacao';
import { Fechamento } from './pages/Fechamento';
import { ConfiguracaoIndicadores } from './pages/ConfiguracaoIndicadores';
import { UsuariosPermissoes } from './pages/UsuariosPermissoes';
import { Auditoria } from './pages/Auditoria';
import {Navigate} from 'react-router-dom'
import { RotaComPermissao } from './components/RotaComPermissao';
import './components/ui.css';

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          {/* Rota pública */}
          <Route path="/" element={<Login />} />

          {/* Rotas que exigem autenticação */}
          <Route element={<RotaProtegida />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/configuracao-indicadores" element={
              <RotaComPermissao rota="/configuracao-indicadores">
                <ConfiguracaoIndicadores />
              </RotaComPermissao>
              }
/>
              <Route path="/preenchimento" element={<RotaComPermissao rota="/preenchimento"> <Preenchimento /> </RotaComPermissao>} />
              <Route path="/validacao" element={<RotaComPermissao rota="/validacao"> <Validacao /> </RotaComPermissao>} />
              <Route path="/fechamento" element={<RotaComPermissao rota="/fechamento"> <Fechamento /> </RotaComPermissao>} />
              <Route
                path="/usuarios-permissoes"
                element={<RotaComPermissao rota="/usuarios-permissoes"> <UsuariosPermissoes /> </RotaComPermissao>}
              />
              <Route path="/auditoria" element={<RotaComPermissao rota="/auditoria"> <Auditoria /> </RotaComPermissao>} />
            </Route>
          </Route>

          {/* Rotas desconhecidas */}
          <Route path="*" element={<RotaProtegida />}>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}
