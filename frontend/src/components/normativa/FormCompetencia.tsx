import { useState } from 'react';
import type { FormEvent } from 'react';

import { api, ErroApi } from '../../services/api';

import type {
  Normativa,
  DadosCompetencia,
} from '../../types/normativa';

interface FormCompetenciaProps {
  normativas: Normativa[];
  onCancelar: () => void;
  onSalvo: () => void;
}

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function FormCompetencia({
  normativas,
  onCancelar,
  onSalvo,
}: FormCompetenciaProps) {
  const hoje = new Date();

  const [ano, setAno] = useState(
    String(hoje.getFullYear()),
  );

  const [mes, setMes] = useState(
    String(hoje.getMonth() + 1),
  );

  const [normativaId, setNormativaId] =
    useState('');

  const [salvando, setSalvando] =
    useState(false);

  const [erro, setErro] = useState('');

  async function salvar(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (salvando) return;

    setErro('');

    const anoNumero = Number(ano);
    const mesNumero = Number(mes);

    if (
      !Number.isInteger(anoNumero) ||
      anoNumero < 2000 ||
      anoNumero > 2100
    ) {
      setErro('Informe um ano entre 2000 e 2100.');
      return;
    }

    if (
      !Number.isInteger(mesNumero) ||
      mesNumero < 1 ||
      mesNumero > 12
    ) {
      setErro('Selecione um mês válido.');
      return;
    }

    if (!normativaId) {
      setErro('Selecione uma normativa.');
      return;
    }

    const dados: DadosCompetencia = {
      ano: anoNumero,
      mes: mesNumero,
      normativa: Number(normativaId),
    };

    setSalvando(true);

    try {
      await api.cadastrarCompetencia(dados);
    } catch (error) {
      if (error instanceof ErroApi) {
        if (error.status === 403) {
          setErro(
            'Você não possui permissão para cadastrar competências.',
          );
        } else {
          setErro(error.message);
        }
      } else {
        setErro(
          'Não foi possível confirmar o cadastro. ' +
          'Atualize a listagem antes de tentar novamente.',
        );
      }

      return;
    } finally {
      setSalvando(false);
    }

    onSalvo();
  }

  return (
    <form
      className="form-normativa"
      onSubmit={salvar}
    >
      <h3>Nova competência</h3>

      <p className="field-hint">
        Vincule um período de avaliação à
        normativa correspondente.
      </p>

      {erro && (
        <div
          className="form-normativa-erro"
          role="alert"
        >
          {erro}
        </div>
      )}

      <fieldset disabled={salvando}>
        <div className="form-grid">

          <div className="form-field">
            <label htmlFor="competencia-ano">
              Ano *
            </label>

            <input
              id="competencia-ano"
              type="number"
              min={2000}
              max={2100}
              step={1}
              required
              value={ano}
              onChange={(event) =>
                setAno(event.target.value)
              }
            />
          </div>

          <div className="form-field">
            <label htmlFor="competencia-mes">
              Mês *
            </label>

            <select
              id="competencia-mes"
              required
              value={mes}
              onChange={(event) =>
                setMes(event.target.value)
              }
            >
              {MESES.map((nome, indice) => (
                <option
                  key={indice + 1}
                  value={indice + 1}
                >
                  {nome}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field span-2">
            <label htmlFor="competencia-normativa">
              Normativa vinculada *
            </label>

            <select
              id="competencia-normativa"
              required
              value={normativaId}
              onChange={(event) =>
                setNormativaId(event.target.value)
              }
            >
              <option value="">
                Selecione uma normativa
              </option>

              {normativas.map((normativa) => (
                <option
                  key={normativa.id}
                  value={normativa.id}
                >
                  {normativa.codigo}
                  {' — '}
                  {normativa.nome}
                </option>
              ))}
            </select>

            <span className="field-hint">
              A competência deve estar dentro do
              período de vigência da normativa.
            </span>
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
          disabled={salvando}
        >
          {salvando
            ? 'Salvando...'
            : 'Salvar competência'}
        </button>
      </div>
    </form>
  );
}