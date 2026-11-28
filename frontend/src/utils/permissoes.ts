
import type { UsuarioAutenticado } from '../services/api';

const PERMISSOES_ROTAS: Record<string, string> = {
  '/preenchimento': 'acesso.registrar_resultado',
  '/validacao': 'acesso.homologar_resultado',
  '/fechamento': 'acesso.encerrar_ciclo',
  '/configuracao-indicadores': 'acesso.cadastrar_indicador',
  '/auditoria': 'acesso.consultar_auditoria',
};

const ROTAS_PUBLICAS_PARA_AUTENTICADOS = new Set([
  '/dashboard',
  '/indicadores',
]);

export function podeAcessarRota(
  usuario: UsuarioAutenticado | null,
  rota: string,
): boolean {
  if (!usuario) return false;
  
  if (usuario.is_superuser) return true;

  if (ROTAS_PUBLICAS_PARA_AUTENTICADOS.has(rota)) {
    return true;
  }

  const permissao = PERMISSOES_ROTAS[rota];

  if (!permissao) return false;

  return usuario.permissoes.includes(permissao);
}
