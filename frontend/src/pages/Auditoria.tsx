import { useState } from 'react';
import { useApp } from '../context/AppContext';

const ROTULOS_OPERACAO: Record<string, string> = {
  cadastrar_normativa: 'Normativa cadastrada',
  cadastrar_competencia: 'Competência cadastrada',
  cadastrar_indicador: 'Indicador cadastrado',
  atualizar_indicador: 'Indicador atualizado',
  configurar_regra_calculo: 'Regra de cálculo configurada',
};

const ROTULOS_ENTIDADE: Record<string, string> = {
  normativa: 'Normativa',
  competencia: 'Competência',
  indicador: 'Indicador',
  regra_calculo: 'Regra de cálculo',
};

const ROTULOS_CAMPO: Record<string, string> = {
  ativo: 'Ativo',
  abrangencia: 'Abrangência',
  cargo: 'Cargo',
  codigo: 'Código',
  codigo_pai: 'Código do pai',
  forma_calculo: 'Forma de cálculo',
  formula: 'Fórmula',
  meta: 'Meta',
  mes: 'Mês',
  nivel: 'Nível',
  nome: 'Nome',
  normativa: 'Normativa',
  pai: 'Indicador pai',
  peso_excepcional: 'Peso excepcional',
  peso_portaria: 'Peso da portaria',
  peso_vigente: 'Peso vigente',
  referencia_portaria: 'Referência da portaria',
  situacao: 'Situação',
  tipo_unidade: 'Tipo de unidade',
  unidade_medida: 'Unidade de medida',
  vigencia_fim: 'Fim da vigência',
  vigencia_inicio: 'Início da vigência',
  ano: 'Ano',
  indicador: 'Indicador',
};

function textoLegivel(valor: unknown): string {
  if (valor === null) return 'Não informado';
  if (valor === '') return 'Não informado';
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
  if (typeof valor === 'number') return String(valor);
  if (typeof valor === 'string') {
    const conteudo = valor.trim();
    if (!conteudo || conteudo === '—') return 'Não informado';
    return conteudo;
  }
  return JSON.stringify(valor);
}

function ValoresAuditoria({ valor }: { valor: string }) {
  if (!valor || valor.trim() === '' || valor.trim() === '—') {
    return <span className="auditoria-vazio">Não informado</span>;
  }

  try {
    const dados: unknown = JSON.parse(valor);
    if (dados && typeof dados === 'object' && !Array.isArray(dados)) {
      return (
        <dl className="auditoria-valores">
          {Object.entries(dados as Record<string, unknown>).map(([campo, conteudo]) => (
            <div key={campo}>
              <dt>{ROTULOS_CAMPO[campo] ?? campo}</dt>
              <dd>{textoLegivel(conteudo)}</dd>
            </div>
          ))}
        </dl>
      );
    }
  } catch {
    // Texto legado permanece inalterado e é exibido sem interpretar HTML.
  }

  return <span>{textoLegivel(valor)}</span>;
}

export function Auditoria() {
  const { auditoria, estadoAuditoria } = useApp();
  const [operacaoFiltro, setOperacaoFiltro] = useState('todas');

  const operacoes = Array.from(new Set(auditoria.map((a) => a.operacao)));
  const listaFiltrada = auditoria.filter((a) => operacaoFiltro === 'todas' || a.operacao === operacaoFiltro);

  if (estadoAuditoria === 'carregando') {
  return <div className="section">Carregando registros de auditoria...</div>;
}

if (estadoAuditoria === 'sem_permissao') {
  return (
    <div className="section" role="alert">
      Você não possui permissão para consultar os registros de auditoria.
    </div>
  );
}

if (estadoAuditoria === 'erro') {
  return (
    <div className="section" role="alert">
      Não foi possível carregar os registros de auditoria.
      Verifique a conexão com o servidor.
    </div>
  );
}

  return (
    <div>
      <div className="page-header">
        <div className="page-header-titles">
          <div className="breadcrumb">Rastreabilidade</div>
          <h1>Auditoria / Histórico</h1>
        </div>
      </div>

      <div className="section">
        <p className="helper-text">
          Registro completo de operações realizadas no sistema, para fins de rastreabilidade e auditabilidade.
          Esta tela não determina automaticamente fraude — apenas apresenta o histórico de alterações.
        </p>
      </div>

      <div className="section">
        <div className="filter-bar">
          <div className="filter-field">
            <label>Operação</label>
            <select value={operacaoFiltro} onChange={(e) => setOperacaoFiltro(e.target.value)}>
              <option value="todas">Todas</option>
              {operacoes.map((operacao) => (
                <option key={operacao} value={operacao}>
                  {ROTULOS_OPERACAO[operacao] ?? operacao}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Data</th>
                <th>Horário</th>
                <th>Operação</th>
                <th>Entidade</th>
                <th>Identificação</th>
                <th>Registro afetado</th>
                <th>Valor anterior</th>
                <th>Novo valor</th>
                <th>Perfil</th>
                <th>Unidade/Distrito</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((a) => (
                <tr key={a.id}>
                  <td className="cell-strong">{a.usuario}</td>
                  <td className="cell-muted">{a.data}</td>
                  <td className="cell-muted">{a.horario}</td>
                  <td>{ROTULOS_OPERACAO[a.operacao] ?? a.operacao}</td>
                  <td>{ROTULOS_ENTIDADE[a.entidade ?? ''] ?? textoLegivel(a.entidade)}</td>
                  <td>{textoLegivel(a.identificador)}</td>
                  <td>{a.registroAfetado}</td>
                  <td className="cell-muted"><ValoresAuditoria valor={a.valorAnterior} /></td>
                  <td><ValoresAuditoria valor={a.novoValor} /></td>
                  <td>{textoLegivel(a.perfil)}</td>
                  <td className="cell-muted">{textoLegivel(a.localizacao) === 'Não informado'
                    ? 'Sem escopo territorial'
                    : a.localizacao}</td>
                </tr>
              ))}
              {listaFiltrada.length === 0 && (
                <tr>
                  <td colSpan={11}>
                    <div className="empty-state">Nenhum registro encontrado.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
