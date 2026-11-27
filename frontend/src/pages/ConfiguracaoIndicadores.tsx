// import { INDICADORES_CATALOGO, VIGENCIAS, PERFIS } from '../data/mockData';
import { useEffect, useState } from 'react';

import { api } from '../services/api';

import type {
  Normativa,
  IndicadorNormativa,
  RegraCalculo,
} from '../types/normativa';

export function ConfiguracaoIndicadores() {
  const [normativas, setNormativas] =
    useState<Normativa[]>([]);

  const [indicadores, setIndicadores] =
    useState<IndicadorNormativa[]>([]);

  const [regras, setRegras] =
    useState<RegraCalculo[]>([]);

  const [normativaSelecionada, setNormativaSelecionada] =
    useState('');

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] =
    useState<string | null>(null);

  const [versaoConsulta, setVersaoConsulta] =
    useState(0);

  useEffect(() => {
    let ativo = true;

    setCarregando(true);
    setErro(null);

    Promise.all([
      api.listarNormativas(),
      api.listarIndicadoresNormativa(),
      api.listarRegrasCalculo(),
    ])
      .then(([normativasApi, indicadoresApi, regrasApi]) => {
        if (!ativo) return;

        setNormativas(normativasApi);
        setIndicadores(indicadoresApi);
        setRegras(regrasApi);
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
            disabled={carregando}
            onClick={() =>
              setVersaoConsulta((anterior) => anterior + 1)
            }
          >
            Atualizar
          </button>

          <button className="btn btn-primary" type="button">
            + Novo indicador
          </button>
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
          <span className="hint">Vigência atual aplicada por padrão aos novos cadastros</span>
        </div>

        <div className="select-field select-field--normativa">
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
</div>

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
              </tr>
            </thead>
            <tbody>
                  {linhas.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
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
                        {regra?.tipo_unidade || '—'}
                      </td>

                      <td>
                        {regra?.cargo || '—'}
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
                    </tr>
                  ))}
                </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Vigência / Versionamento</div>
        <p className="helper-text" style={{ marginBottom: 14 }}>
          Diferentes regras podem existir em períodos diferentes. Competências antigas continuam vinculadas à
          versão da regra utilizada no momento — uma nova versão não altera silenciosamente períodos já fechados.
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
          <button className="btn" type="button">
            + Criar nova versão da regra
          </button>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
