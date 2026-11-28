import { useState } from 'react';
import type { FormEvent } from 'react';

import { api, ErroApi } from '../../services/api';
import type { DadosNormativa } from '../../types/normativa';

interface FormNormativaProps {
  onCancelar: () => void;
  onSalvo: () => void;
}

const DADOS_INICIAIS: DadosNormativa = {
  codigo: '',
  nome: '',
  referencia_portaria: '',
  vigencia_inicio: '',
  vigencia_fim: null,
  situacao: 'vigente',
};

export function FormNormativa({
  onCancelar,
  onSalvo,
}: FormNormativaProps) {
  const [dados, setDados] =
    useState<DadosNormativa>(DADOS_INICIAIS);

  const [salvando, setSalvando] = useState(false);

  const [erro, setErro] = useState('');

  function atualizarCampo<K extends keyof DadosNormativa>(
    campo: K,
    valor: DadosNormativa[K],
  ) {
    setDados((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (salvando) return;

    setErro('');

    if (!dados.codigo.trim() || !dados.nome.trim()) {
      setErro('Informe o código e o nome da normativa.');
      return;
    }

    if (!dados.vigencia_inicio) {
      setErro('Informe o início da vigência.');
      return;
    }

    if (
      dados.vigencia_fim &&
      dados.vigencia_fim < dados.vigencia_inicio
    ) {
      setErro(
        'O fim da vigência não pode ser anterior ao início.',
      );
      return;
    }

    setSalvando(true);

    try {
      await api.cadastrarNormativa({
        ...dados,
        codigo: dados.codigo.trim(),
        nome: dados.nome.trim(),
        referencia_portaria:
          dados.referencia_portaria.trim(),
        vigencia_fim: dados.vigencia_fim || null,
      });
    } catch (error) {
      if (error instanceof ErroApi) {
        if (error.status === 403) {
          setErro(
            'Você não possui permissão para cadastrar normativas.',
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
      <h3>Nova normativa</h3>

      <p className="field-hint">
        Cadastre uma versão da portaria e seu
        período de vigência.
      </p>

      {erro && (
        <div className="form-normativa-erro" role="alert">
          {erro}
        </div>
      )}

      <fieldset disabled={salvando}>
        <div className="form-grid">

          <div className="form-field">
            <label htmlFor="normativa-codigo">
              Código *
            </label>

            <input
              id="normativa-codigo"
              type="text"
              maxLength={40}
              required
              value={dados.codigo}
              placeholder="NORM-2026-01"
              onChange={(event) =>
                atualizarCampo(
                  'codigo',
                  event.target.value,
                )
              }
            />
          </div>

          <div className="form-field">
            <label htmlFor="normativa-situacao">
              Situação
            </label>

            <select
              id="normativa-situacao"
              value={dados.situacao}
              onChange={(event) =>
                atualizarCampo(
                  'situacao',
                  event.target.value === 'encerrada'
                    ? 'encerrada'
                    : 'vigente',
                )
              }
            >
              <option value="vigente">
                Vigente
              </option>

              <option value="encerrada">
                Encerrada
              </option>
            </select>
          </div>

          <div className="form-field span-2">
            <label htmlFor="normativa-nome">
              Nome da normativa *
            </label>

            <input
              id="normativa-nome"
              type="text"
              maxLength={200}
              required
              value={dados.nome}
              onChange={(event) =>
                atualizarCampo(
                  'nome',
                  event.target.value,
                )
              }
            />
          </div>

          <div className="form-field span-2">
            <label htmlFor="normativa-portaria">
              Referência da portaria
            </label>

            <input
              id="normativa-portaria"
              type="text"
              maxLength={200}
              value={dados.referencia_portaria}
              onChange={(event) =>
                atualizarCampo(
                  'referencia_portaria',
                  event.target.value,
                )
              }
            />
          </div>

          <div className="form-field">
            <label htmlFor="normativa-inicio">
              Início da vigência *
            </label>

            <input
              id="normativa-inicio"
              type="date"
              required
              value={dados.vigencia_inicio}
              onChange={(event) =>
                atualizarCampo(
                  'vigencia_inicio',
                  event.target.value,
                )
              }
            />
          </div>

          <div className="form-field">
            <label htmlFor="normativa-fim">
              Fim da vigência
            </label>

            <input
              id="normativa-fim"
              type="date"
              min={dados.vigencia_inicio || undefined}
              value={dados.vigencia_fim ?? ''}
              onChange={(event) =>
                atualizarCampo(
                  'vigencia_fim',
                  event.target.value || null,
                )
              }
            />

            <span className="field-hint">
              Deixe vazio caso não exista uma data final.
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
            : 'Salvar normativa'}
        </button>
      </div>
    </form>
  );
}