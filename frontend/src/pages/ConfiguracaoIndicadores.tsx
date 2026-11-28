// import { INDICADORES_CATALOGO, VIGENCIAS, PERFIS } from '../data/mockData';
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

import type {
  Normativa,
  IndicadorNormativa,
  RegraCalculo,
  CompetenciaNormativa,
} from '../types/normativa';

import { FormNormativa } from
  '../components/normativa/FormNormativa';

import { FormCompetencia } from
  '../components/normativa/FormCompetencia';

import { FormIndicador } from
  '../components/normativa/FormIndicador';

import { FormRegraCalculo } from
  '../components/normativa/FormRegraCalculo';

export function ConfiguracaoIndicadores() {
  const { usuarioLogado } = useApp();

  const [formNormativaAberto, setFormNormativaAberto] =
  useState(false);

  const [formCompetenciaAberto, setFormCompetenciaAberto] =
  useState(false);

  const [formIndicadorAberto, setFormIndicadorAberto] =
  useState(false);

  const [indicadorDaRegra, setIndicadorDaRegra] =
  useState<IndicadorNormativa | null>(null);

const [regraEmEdicao, setRegraEmEdicao] =
  useState<RegraCalculo | null>(null);

const [mensagemRegra, setMensagemRegra] =
  useState('');

  const [mensagemIndicador, setMensagemIndicador] =
  useState('');

  const [mensagemNormativa, setMensagemNormativa] =
  useState('');

  const [mensagemCompetencia, setMensagemCompetencia] =
  useState('');

  const [competencias, setCompetencias] =
  useState<CompetenciaNormativa[]>([]);

  const [normativas, setNormativas] =
    useState<Normativa[]>([]);

  const [indicadores, setIndicadores] =
    useState<IndicadorNormativa[]>([]);

  const [regras, setRegras] =
    useState<RegraCalculo[]>([]);

  const [normativaSelecionada, setNormativaSelecionada] =
    useState('');

  const [indicadorEmEdicao, setIndicadorEmEdicao] =
    useState<IndicadorNormativa | null>(null);

  const [indicadorEmAtualizacao, setIndicadorEmAtualizacao] =
    useState<number | null>(null);

  const [erroIndicador, setErroIndicador] =
    useState('');

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] =
    useState<string | null>(null);

  const [versaoConsulta, setVersaoConsulta] =
    useState(0);

  const podeCadastrarNormativa =
  usuarioLogado?.is_superuser === true ||
  usuarioLogado?.permissoes.includes(
    'acesso.cadastrar_indicador',
  ) === true;

  const podeCadastrarCompetencia =
  podeCadastrarNormativa;

  const podeCadastrarIndicador = podeCadastrarNormativa;

  const podeConfigurarRegra =
  usuarioLogado?.is_superuser === true ||
  usuarioLogado?.permissoes.includes(
    'acesso.configurar_regra_calculo',
  ) === true;

const podeExibirAcoes =
  podeCadastrarIndicador || podeConfigurarRegra;

const operacaoEmAndamento =
  formIndicadorAberto ||
  formNormativaAberto ||
  formCompetenciaAberto ||
  indicadorEmAtualizacao !== null ||
  indicadorDaRegra !== null;

  function aoSalvarNormativa() {
    setFormNormativaAberto(false);

    setMensagemNormativa(
      'Normativa cadastrada com sucesso.',
    );

    setVersaoConsulta((anterior) => anterior + 1);
  }

  function aoSalvarCompetencia() {
  setFormCompetenciaAberto(false);

  setMensagemCompetencia(
    'Competência cadastrada com sucesso.',
  );

  setVersaoConsulta((anterior) => anterior + 1);
  }

  function abrirCadastroIndicador() {
    setIndicadorEmEdicao(null);
    setMensagemIndicador('');
    setErroIndicador('');
    setFormIndicadorAberto(true);
  }

  function abrirEdicaoIndicador(
    indicador: IndicadorNormativa,
  ) {
    setIndicadorEmEdicao(indicador);
    setMensagemIndicador('');
    setErroIndicador('');
    setFormIndicadorAberto(true);
  }

  function fecharFormIndicador() {
    setFormIndicadorAberto(false);
    setIndicadorEmEdicao(null);
  }

  function aoSalvarIndicador() {
    setMensagemIndicador(
      indicadorEmEdicao
        ? 'Indicador atualizado com sucesso.'
        : 'Indicador cadastrado com sucesso.',
    );

    fecharFormIndicador();
    setVersaoConsulta((anterior) => anterior + 1);
  }

  async function alterarStatusIndicador(
    indicador: IndicadorNormativa,
  ) {
    if (
      !podeCadastrarIndicador ||
      indicadorEmAtualizacao !== null ||
      formIndicadorAberto
    ) return;

    const acao = indicador.ativo
      ? 'desativar'
      : 'reativar';

    const confirmado = window.confirm(
      `Deseja ${acao} o indicador ${indicador.codigo}?`,
    );

    if (!confirmado) return;

    setErroIndicador('');
    setMensagemIndicador('');
    setIndicadorEmAtualizacao(indicador.id);

    try {
      await api.atualizarIndicador(indicador.id, {
        ativo: !indicador.ativo,
      });

      setMensagemIndicador(
        indicador.ativo
          ? 'Indicador desativado com sucesso.'
          : 'Indicador reativado com sucesso.',
      );

      setVersaoConsulta((anterior) => anterior + 1);
    } catch (error) {
      setErroIndicador(
        error instanceof Error
          ? error.message
          : 'Não foi possível alterar o status do indicador.',
      );
    } finally {
      setIndicadorEmAtualizacao(null);
    }
  }

  function abrirFormRegra(
    indicador: IndicadorNormativa,
    regra: RegraCalculo | null = null,
  ) {
    if (
      !podeConfigurarRegra ||
      operacaoEmAndamento ||
      carregando ||
      erro
    ) return;

    setMensagemRegra('');
    setIndicadorDaRegra(indicador);
    setRegraEmEdicao(regra);
  }

  function fecharFormRegra() {
    setIndicadorDaRegra(null);
    setRegraEmEdicao(null);
  }

  function aoSalvarRegra() {
    setMensagemRegra(
      regraEmEdicao
        ? 'Regra atualizada com sucesso.'
        : 'Regra cadastrada com sucesso.',
    );

    fecharFormRegra();
    setVersaoConsulta((anterior) => anterior + 1);
  }

  useEffect(() => {
    let ativo = true;

    setCarregando(true);
    setErro(null);

    Promise.all([
      api.listarNormativas(),
      api.listarIndicadoresNormativa(),
      api.listarRegrasCalculo(),
      api.listarCompetenciasNormativa(),
    ])
      .then(([normativasApi, indicadoresApi, regrasApi, competenciasApi,]) => {
        if (!ativo) return;

        setNormativas(normativasApi);
        setIndicadores(indicadoresApi);
        setRegras(regrasApi);
        setCompetencias(competenciasApi);
      })
      .catch((error: unknown) => {
        if (!ativo) return;

        setErro(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os dados de Normativa.'
        );
      })
      .finally(() => {
        if (ativo) {
          setCarregando(false);
        }
      });

    return () => {
      ativo = false;
    };
  }, [versaoConsulta]);

  const indicadoresFiltrados = indicadores.filter(
    (indicador) =>
      !normativaSelecionada ||
      indicador.normativa === Number(normativaSelecionada)
  );

  const linhas = indicadoresFiltrados.flatMap((indicador) => {
    const regrasIndicador = regras.filter(
      (regra) => regra.indicador === indicador.id
    );

    if (regrasIndicador.length === 0) {
      return [
        {
          indicador,
          regra: null as RegraCalculo | null,
        },
      ];
    }

    return regrasIndicador.map((regra) => ({
      indicador,
      regra,
    }));
  });

  function formatarData(data: string | null) {
    if (!data) return 'Sem término definido';

    const [ano, mes, dia] = data.split('-');

    return `${dia}/${mes}/${ano}`;
  }

  function formatarNumero(valor: string | null) {
    if (valor === null || valor === '') return '—';

    return Number(valor).toLocaleString('pt-BR', {
      maximumFractionDigits: 2,
    });
  }

  function formatarCompetencia(
  ano: number,
  mes: number,
): string {
  const data = new Date(ano, mes - 1, 1);

  const nomeMes = new Intl.DateTimeFormat(
    'pt-BR',
    { month: 'long' },
  ).format(data);

  const mesFormatado =
    nomeMes.charAt(0).toUpperCase() +
    nomeMes.slice(1);

  return `${mesFormatado}/${ano}`;
}

  return (
    <div>
      <div className="page-header">
        <div className="page-header-titles">
          <div className="breadcrumb">Normativa e Indicadores</div>
          <h1>Configuração de Indicadores</h1>
        </div>
        <div className="page-header-actions">
          <button
            className="btn"
            type="button"
            disabled={carregando || operacaoEmAndamento}
            onClick={() =>
              setVersaoConsulta((anterior) => anterior + 1)
            }
          >
            Atualizar
          </button>

          {podeCadastrarIndicador && (
          <button
            className="btn btn-primary"
            type="button"
            disabled={
              carregando ||
              !!erro ||
              operacaoEmAndamento ||
              normativas.length === 0
            }
            onClick={abrirCadastroIndicador}
          >
            + Novo indicador
          </button>
        )}
        </div>
      </div>

          {carregando && (
        <div className="section">
          Carregando dados de Normativa...
        </div>
      )}

      {erro && (
        <div className="section" role="alert">
          <strong>Erro ao carregar os dados</strong>
          <p>{erro}</p>

          <button
            className="btn"
            type="button"
            onClick={() =>
              setVersaoConsulta((anterior) => anterior + 1)
            }
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!carregando && !erro && (
        <>
      <div className="section">
        <div className="section-title">
          Catálogo de indicadores
        </div>

        {mensagemIndicador && (
          <p role="status">{mensagemIndicador}</p>
        )}

        {erroIndicador && (
          <div className="form-normativa-erro" role="alert">
            {erroIndicador}
          </div>
        )}

        {mensagemRegra && (
          <p role="status">{mensagemRegra}</p>
        )}

        {formIndicadorAberto && podeCadastrarIndicador && (
          <FormIndicador
            key={indicadorEmEdicao?.id ?? 'novo'}
            normativas={normativas}
            indicadores={indicadores}
            indicador={indicadorEmEdicao ?? undefined}
            normativaInicial={
              normativaSelecionada
                ? Number(normativaSelecionada)
                : undefined
            }
            onCancelar={fecharFormIndicador}
            onSalvo={aoSalvarIndicador}
          />
        )}

        {indicadorDaRegra && podeConfigurarRegra && (
          <FormRegraCalculo
            key={`${indicadorDaRegra.id}-${regraEmEdicao?.id ?? 'nova'}`}
            indicador={indicadorDaRegra}
            regra={regraEmEdicao ?? undefined}
            regras={regras}
            onCancelar={fecharFormRegra}
            onSalvo={aoSalvarRegra}
          />
        )}
          <label
            className="select-field-label"
            htmlFor="filtro-normativa"
          >
            Normativa
          </label>

          <select
            id="filtro-normativa"
            className="select-control"
            value={normativaSelecionada}
            onChange={(event) =>
              setNormativaSelecionada(event.target.value)
            }
          >
            <option value="">
              Todas as normativas
            </option>

            {normativas.map((normativa) => (
              <option
                key={normativa.id}
                value={normativa.id}
              >
                {normativa.codigo} — {normativa.nome}
              </option>
            ))}
          </select>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nome</th>
                <th className="cell-num">Peso</th>
                <th className="cell-num">Meta</th>
                <th>Fórmula</th>
                <th>Tipo de unidade</th>
                <th>Cargo</th>
                <th>Status</th>
                {podeExibirAcoes && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
                  {linhas.length === 0 && (
                    <tr>
                      <td
                        colSpan={podeExibirAcoes ? 9 : 8}
                        style={{
                          textAlign: 'center',
                          padding: 24,
                        }}
                      >
                        Nenhum indicador cadastrado
                        para a seleção atual.
                      </td>
                    </tr>
                  )}

                  {linhas.map(({ indicador, regra }) => (
                    <tr
                      key={`${indicador.id}-${regra?.id ?? 'sem-regra'}`}
                    >
                      <td className="cell-strong">
                        {indicador.codigo}
                      </td>

                      <td>{indicador.nome}</td>

                      <td className="cell-num">
                        {regra
                          ? `${formatarNumero(regra.peso_vigente)}%`
                          : '—'}
                      </td>

                      <td className="cell-num">
                        {regra?.meta != null
                          ? `${formatarNumero(regra.meta)} ${indicador.unidade_medida}`
                          : '—'}
                      </td>

                      <td className="cell-muted">
                        {indicador.formula || '—'}
                      </td>

                      <td>
                        {regra ? regra.tipo_unidade || 'Todos' : '—'}
                      </td>

                      <td>
                        {regra ? regra.cargo || 'Todos' : '—'}
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            indicador.ativo
                              ? 'badge-validado'
                              : 'badge-rascunho'
                          }`}
                        >
                          <span className="badge-dot" />

                          {indicador.ativo
                            ? 'Ativo'
                            : 'Inativo'}
                        </span>
                      </td>

                      {podeExibirAcoes && (
                        <td>
                          <div
                            style={{
                              display: 'flex',
                              gap: 6,
                              flexWrap: 'wrap',
                            }}
                          >
                            {podeCadastrarIndicador && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  disabled={operacaoEmAndamento}
                                  onClick={() => abrirEdicaoIndicador(indicador)}
                                >
                                  Editar indicador
                                </button>

                                <button
                                  type="button"
                                  className={`btn btn-sm ${
                                    indicador.ativo ? 'btn-danger' : ''
                                  }`}
                                  disabled={operacaoEmAndamento}
                                  onClick={() => alterarStatusIndicador(indicador)}
                                >
                                  {indicadorEmAtualizacao === indicador.id
                                    ? 'Atualizando...'
                                    : indicador.ativo
                                      ? 'Desativar'
                                      : 'Reativar'}
                                </button>
                              </>
                            )}

                            {podeConfigurarRegra && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  disabled={operacaoEmAndamento}
                                  onClick={() => abrirFormRegra(indicador)}
                                >
                                  + Nova regra
                                </button>

                                {regra && (
                                  <button
                                    type="button"
                                    className="btn btn-sm"
                                    disabled={operacaoEmAndamento}
                                    onClick={() => abrirFormRegra(indicador, regra)}
                                  >
                                    Editar regra
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Vigência / Versionamento</div>
        <p className="helper-text" style={{ marginBottom: 14 }}>
          Cada competência está vinculada a uma normativa.
  Novas versões podem ser cadastradas sem alterar
  os vínculos das competências anteriores.
        </p>
         <p
              className="helper-text"
              style={{ marginBottom: 14 }}
            >
              Normativas e períodos de vigência
              cadastrados no sistema.
            </p>

            {normativas.length === 0 && (
              <p>Nenhuma normativa cadastrada.</p>
            )}

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {normativas.map((normativa) => (
                <div
                  key={normativa.id}
                  className="section"
                  style={{
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div className="cell-strong">
                      {normativa.codigo} — {normativa.nome}
                    </div>

                    <div className="cell-muted">
                      {formatarData(normativa.vigencia_inicio)}
                      {' até '}
                      {formatarData(normativa.vigencia_fim)}
                    </div>

                    <div className="cell-muted">
                      {normativa.referencia_portaria}
                    </div>
                  </div>

                  <span className="badge">
                    {normativa.situacao}
                  </span>
                </div>
              ))}
            </div>
        <div style={{ marginTop: 14 }}>
          {podeCadastrarNormativa && (
          <button
            type="button"
            className="btn"
            disabled={operacaoEmAndamento}
            onClick={() => {
              setMensagemNormativa('');
              setFormNormativaAberto(true);
            }}
          >
            + Nova normativa
          </button>
        )}
        {mensagemNormativa && (
          <p role="status">
            {mensagemNormativa}
          </p>
        )}

        {formNormativaAberto && podeCadastrarNormativa && (
            <FormNormativa
              onCancelar={() => setFormNormativaAberto(false)}
              onSalvo={aoSalvarNormativa}
            />
        )}
        </div>
      </div>
      <div className="section">
  <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <h3>Competências</h3>

        {podeCadastrarCompetencia && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={
              operacaoEmAndamento ||
              normativas.length === 0
            }
            onClick={() => {
              setMensagemCompetencia('');
              setFormCompetenciaAberto(true);
            }}
          >
            + Nova competência
          </button>
        )}
      </div>

      <p
        className="helper-text"
        style={{ marginBottom: 14 }}
      >
        Períodos de avaliação vinculados às
        normativas cadastradas no sistema.
      </p>

      {normativas.length === 0 && (
        <p className="helper-text">
          Cadastre uma normativa antes de criar
          uma competência.
        </p>
      )}

      {mensagemCompetencia && (
        <p role="status">
          {mensagemCompetencia}
        </p>
      )}

      <div className="data-table-wrap">
  <table className="data-table">
    <thead>
      <tr>
        <th>Competência</th>
        <th>Normativa</th>
        <th>Nome da normativa</th>
      </tr>
    </thead>

    <tbody>
      {competencias.length === 0 ? (
        <tr>
          <td colSpan={3} className="empty-state">
            Nenhuma competência cadastrada.
          </td>
        </tr>
      ) : (
        competencias.map((competencia) => {
          const normativa = normativas.find(
            (item) => item.id === competencia.normativa,
          );

          return (
            <tr key={competencia.id}>
              <td className="cell-strong">
                {formatarCompetencia(
                  competencia.ano,
                  competencia.mes,
                )}
              </td>

              <td>{competencia.normativa_codigo}</td>

              <td>{normativa?.nome ?? '—'}</td>
            </tr>
          );
        })
      )}
    </tbody>
  </table>
</div>

      {formCompetenciaAberto &&
        podeCadastrarCompetencia && (
          <FormCompetencia
            normativas={normativas}
            onCancelar={() =>
              setFormCompetenciaAberto(false)
            }
            onSalvo={aoSalvarCompetencia}
          />
        )}
    </div>
      </>
      )}
    </div>
  );
}
