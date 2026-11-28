import { useState } from 'react';
import type { FormEvent } from 'react';

import { api, ErroApi } from '../../services/api';

import type {
  Normativa,
  IndicadorNormativa,
  DadosIndicador,
  NivelIndicador,
  FormaCalculo,
} from '../../types/normativa';

interface FormIndicadorProps {
  normativas: Normativa[];
  indicadores: IndicadorNormativa[];
  indicador?: IndicadorNormativa;
  normativaInicial?: number;
  onCancelar: () => void;
  onSalvo: () => void;
}

const NIVEIS: Record<NivelIndicador, string> = {
  indicador: 'Indicador',
  subindicador: 'Subindicador',
  sub_subindicador: 'Sub-subindicador',
};

const FORMAS_CALCULO: Record<FormaCalculo, string> = {
  proporcao: 'Proporção do realizado sobre a meta',
  media_subindicadores: 'Média dos subindicadores',
  nota_informada: 'Nota informada (0 a 100)',
};

const NIVEL_PAI: Record<NivelIndicador, NivelIndicador | null> = {
  indicador: null,
  subindicador: 'indicador',
  sub_subindicador: 'subindicador',
};

export function FormIndicador({
  normativas,
  indicadores,
  indicador,
  normativaInicial,
  onCancelar,
  onSalvo,
}: FormIndicadorProps) {
  const [dados, setDados] = useState<DadosIndicador>({
    normativa: indicador?.normativa ?? normativaInicial ?? 0,
    codigo: indicador?.codigo ?? '',
    nome: indicador?.nome ?? '',
    nivel: indicador?.nivel ?? 'indicador',
    codigo_pai: indicador?.pai_codigo ?? '',
    unidade_medida: indicador?.unidade_medida ?? '%',
    forma_calculo: indicador?.forma_calculo ?? 'proporcao',
    formula: indicador?.formula ?? '',
    ativo: indicador?.ativo ?? true,
  });

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const editando = indicador !== undefined;
  const nivelPai = NIVEL_PAI[dados.nivel];

  const possuiFilhos = editando && indicadores.some(
    (item) => item.pai === indicador.id,
  );

  const paisDisponiveis = indicadores.filter(
    (item) =>
      String(item.normativa) === String(dados.normativa) &&
      item.nivel === nivelPai &&
      item.ativo &&
      item.id !== indicador?.id,
  );

  const nomeNivelPai = nivelPai
    ? NIVEIS[nivelPai]
    : '';

  function atualizarCampo<K extends keyof DadosIndicador>(
    campo: K,
    valor: DadosIndicador[K],
  ) {
    setDados((anterior) => ({
      ...anterior,
      [campo]: valor,
      ...(campo === 'normativa' || campo === 'nivel'
        ? { codigo_pai: '' }
        : {}),
    }));
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (salvando) return;

    setErro('');

    if (!normativas.some((item) => item.id === dados.normativa)) {
      setErro('Selecione uma normativa válida.');
      return;
    }

    if (!dados.codigo.trim() || !dados.nome.trim()) {
      setErro('Informe o código e o nome do indicador.');
      return;
    }

    if (!dados.unidade_medida.trim()) {
      setErro('Informe a unidade de medida.');
      return;
    }

    if (
      nivelPai &&
      !paisDisponiveis.some(
        (item) => item.codigo === dados.codigo_pai,
      )
    ) {
      setErro('Selecione um indicador pai válido.');
      return;
    }

    const payload: DadosIndicador = {
      ...dados,
      codigo: dados.codigo.trim(),
      nome: dados.nome.trim(),
      unidade_medida: dados.unidade_medida.trim(),
      formula: dados.formula.trim(),
      codigo_pai: nivelPai ? dados.codigo_pai : '',
    };

    setSalvando(true);

    try {
      if (indicador) {
        const { normativa: _, ...alteracoes } = payload;

        await api.atualizarIndicador(
          indicador.id,
          alteracoes,
        );
      } else {
        await api.cadastrarIndicador(payload);
      }
    } catch (error) {
      setErro(
        error instanceof ErroApi
          ? error.status === 403
            ? 'Você não possui permissão para esta operação.'
            : error.message
          : 'Não foi possível confirmar a operação. Atualize a listagem.',
      );

      return;
    } finally {
      setSalvando(false);
    }

    onSalvo();
  }

  return (
    <form className="form-normativa" onSubmit={salvar}>
      <h3>{editando ? 'Editar indicador' : 'Novo indicador'}</h3>

      <p className="field-hint">
        Configure o indicador e seu vínculo hierárquico.
      </p>

      {erro && (
        <div className="form-normativa-erro" role="alert">
          {erro}
        </div>
      )}

      <fieldset disabled={salvando}>
        <div className="form-grid">

          <div className="form-field span-2">
            <label htmlFor="indicador-normativa">
              Normativa *
            </label>
            <select
              id="indicador-normativa"
              required
              disabled={editando}
              value={dados.normativa || ''}
              onChange={(e) =>
                atualizarCampo('normativa', Number(e.target.value))
              }
            >
              <option value="">Selecione uma normativa</option>
              {normativas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.codigo} — {item.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="indicador-codigo">Código *</label>
            <input
              id="indicador-codigo"
              required
              maxLength={40}
              value={dados.codigo}
              onChange={(e) =>
                atualizarCampo('codigo', e.target.value)
              }
            />
          </div>

          <div className="form-field">
            <label htmlFor="indicador-nivel">Nível *</label>
            <select
              id="indicador-nivel"
              value={dados.nivel}
              disabled={possuiFilhos}
              onChange={(e) =>
                atualizarCampo('nivel', e.target.value as NivelIndicador)
              }
            >
              {Object.entries(NIVEIS).map(([valor, nome]) => (
                <option key={valor} value={valor}>
                  {nome}
                </option>
              ))}
            </select>

            {possuiFilhos && (
              <span className="field-hint">
                O nível não pode mudar enquanto existirem filhos.
              </span>
            )}
          </div>

          <div className="form-field span-2">
            <label htmlFor="indicador-nome">Nome *</label>
            <input
              id="indicador-nome"
              required
              maxLength={500}
              value={dados.nome}
              onChange={(e) =>
                atualizarCampo('nome', e.target.value)
              }
            />
          </div>

          {nivelPai && (
            <div className="form-field span-2">
              <label htmlFor="indicador-pai">
                Indicador pai *
              </label>
              <select
                id="indicador-pai"
                required
                value={dados.codigo_pai}
                onChange={(e) =>
                  atualizarCampo('codigo_pai', e.target.value)
                }
              >
                <option value="">Selecione o indicador pai</option>

                {paisDisponiveis.map((item) => (
                  <option key={item.id} value={item.codigo}>
                    {item.codigo} — {item.nome}
                  </option>
                ))}
              </select>

              {paisDisponiveis.length === 0 && (
                <span className="field-hint">
                  Cadastre primeiro um indicador ativo do nível {nomeNivelPai}.
                </span>
              )}
            </div>
          )}

          <div className="form-field">
            <label htmlFor="indicador-unidade">
              Unidade de medida *
            </label>
            <input
              id="indicador-unidade"
              required
              maxLength={40}
              value={dados.unidade_medida}
              onChange={(e) =>
                atualizarCampo('unidade_medida', e.target.value)
              }
            />
          </div>

          <div className="form-field">
            <label htmlFor="indicador-calculo">
              Forma de cálculo *
            </label>
            <select
              id="indicador-calculo"
              value={dados.forma_calculo}
              onChange={(e) =>
                atualizarCampo(
                  'forma_calculo',
                  e.target.value as FormaCalculo,
                )
              }
            >
              {Object.entries(FORMAS_CALCULO).map(([valor, nome]) => (
                <option key={valor} value={valor}>
                  {nome}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field span-2">
            <label htmlFor="indicador-formula">Fórmula</label>
            <textarea
              id="indicador-formula"
              value={dados.formula}
              onChange={(e) =>
                atualizarCampo('formula', e.target.value)
              }
            />
          </div>

          <div className="form-field span-2">
            <label>
              <input
                type="checkbox"
                checked={dados.ativo}
                onChange={(e) =>
                  atualizarCampo('ativo', e.target.checked)
                }
              />
              {' '}Indicador ativo
            </label>
          </div>

        </div>
      </fieldset>

      <div className="form-normativa-acoes">
        <button
          type="button"
          className="btn"
          disabled={salvando}
          onClick={onCancelar}
        >
          Cancelar
        </button>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={
            salvando ||
            (nivelPai !== null && paisDisponiveis.length === 0)
          }
        >
          {salvando ? 'Salvando...' : 'Salvar indicador'}
        </button>
      </div>
    </form>
  );
}