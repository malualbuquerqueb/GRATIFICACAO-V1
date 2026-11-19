import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './Login.css';

export function Login() {
  const { entrar } = useApp();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      await entrar(username.trim(), senha);
      navigate('/dashboard', { replace: true });
    } catch {
      setErro('Não foi possível entrar. Verifique suas credenciais.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-mark">SG</div>
          <div>
            <div className="login-brand-title">SGGD</div>
            <div className="login-brand-sub">Sistema de Gestão da Gratificação por Desempenho</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-field">
            <label htmlFor="username">Nome de Usuário</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              disabled={carregando}
            />
          </div>
          <div className="form-field">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
              required
              disabled={carregando}
            />
          </div>

          {erro && (
            <p role="alert" style={{ color: '#dc3545' }}>
              {erro}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary login-submit"
            disabled={carregando}
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="login-institucional">
          Ambiente de protótipo — Secretaria de Saúde. Dados fictícios utilizados exclusivamente para
          demonstração do fluxo de avaliação, validação e cálculo da gratificação por desempenho.
        </p>
      </div>
    </div>
  );
}
