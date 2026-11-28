import { useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { api, ErroApi } from '../../services/api';

import type {
  IndicadorNormativa,
  RegraCalculo,
  DadosRegraCalculo,
} from '../../types/normativa';

interface FormRegraCalculoProps {
  indicador: IndicadorNormativa;
  regra?: RegraCalculo;
  regras: RegraCalculo[];
  onCancelar: () => void;
  onSalvo: () => void;
}

function decimalValido(
  valor: string,
  maximo = Infinity,
): boolean {
  return (
    /^\d+(\.\d+)?$/.test(valor) &&
    Number.isFinite(Number(valor)) &&
    Number(valor) >= 0 &&
    Number(valor) <= maximo
  );
}

export function FormRegraCalculo({
  indicador,
  regra,
  regras,
  onCancelar,
  onSalvo,
}: FormRegraCalculoProps) {
  const editando = regra !== undefined;

  const [cargo, setCargo] = useState(regra?.cargo ?? '');
  const [tipoUnidade, setTipoUnidade] =
    useState(regra?.tipo_unidade ?? '');

  const [abrangencia, setAbrangencia] =
    useState(regra?.abrangencia ?? '');

  const [pesoPortaria, setPesoPortaria] =
    useState(regra?.peso_portaria ?? '');

  const [pesoExcepcional, setPesoExcepcional] =
    useState(regra?.peso_excepcional ?? '');

  const [meta, setMeta] = useState(regra?.meta ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const envioEmAndamento = useRef(false);

  const pesoVigente =
    pesoExcepcional !== '' ? pesoExcepcional : pesoPortaria;

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (envioEmAndamento.current) return;

    setErro('');

    if (!decimalValido(pesoPortaria, 100)) {
      setErro('O peso da portaria deve estar entre 0 e 100.');
      return;
    }

    if (
      pesoExcepcional !== '' &&
      !decimalValido(pesoExcepcional, 100)
    ) {
      setErro('O peso excepcional deve estar entre 0 e 100.');
      return;
    }

    if (meta !== '' && !decimalValido(meta)) {
      setErro('A meta deve ser um número não negativo.');
      return;
    }

    const dados: DadosRegraCalculo = {
      indicador: indicador.id,
      cargo: cargo.trim(),
      tipo_unidade: tipoUnidade.trim(),
      abrangencia: abrangencia.trim(),
      peso_portaria: pesoPortaria,
      peso_excepcional: pesoExcepcional || null,
      meta: meta || null,
    };

    const duplicada = regras.some(
      (item) =>
        item.id !== regra?.id &&
        item.indicador === indicador.id &&
        item.cargo.toLowerCase() === dados.cargo.toLowerCase() &&
        item.tipo_unidade.toLowerCase() ===
          dados.tipo_unidade.toLowerCase(),
    );

    if (duplicada) {
      setErro(
        'Já existe uma regra para essa combinação. Edite a regra existente.',
      );
      return;
    }

    envioEmAndamento.current = true;
    setSalvando(true);

    try {
      await api.configurarRegraCalculo(dados);
    } catch (error) {
      setErro(
        error instanceof ErroApi
          ? error.status === 403
            ? 'Você não possui permissão para configurar regras.'
            : error.message
          : 'Não foi possível confirmar a operação. Atualize a listagem.',
      );

      return;
    } finally {
      envioEmAndamento.current = false;
      setSalvando(false);
    }

    onSalvo();
  }

  return (
    <form className="form-normativa" onSubmit={salvar}>
      <h3>
        {editando ? 'Editar regra de cálculo' : 'Nova regra de cálculo'}
      </h3>

      <p className="field-hint">
        {indicador.normativa_codigo} — {indicador.codigo} — {indicador.nome}
      </p>

      {erro && (
        <div className="form-normativa-erro" role="alert">
          {erro}
        </div>
      )}

      <fieldset disabled={salvando}>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="regra-cargo">Cargo</label>
            <input
              id="regra-cargo"
              maxLength={80}
              disabled={editando}
              value={cargo}
              placeholder="Todos os cargos"
              onChange={(e) => setCargo(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="regra-tipo-unidade">
              Tipo de unidade
            </label>
            <input
              id="regra-tipo-unidade"
              maxLength={40}
              disabled={editando}
              value={tipoUnidade}
              placeholder="Todos os tipos"
              onChange={(e) => setTipoUnidade(e.target.value)}
            />
          </div>

          <div className="form-field span-2">
            <span className="field-hint">
              {editando
                ? 'Cargo e tipo de unidade identificam a regra e não podem ser alterados.'
                : 'Deixe os campos vazios para configurar uma regra genérica.'}
            </span>
          </div>

          <div className="form-field span-2">
            <label htmlFor="regra-abrangencia">Abrangência</label>
            <textarea
              id="regra-abrangencia"
              value={abrangencia}
              onChange={(e) => setAbrangencia(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="regra-peso-portaria">
              Peso da portaria (%) *
            </label>
            <input
              id="regra-peso-portaria"
              type="number"
              required
              min={0}
              max={100}
              step="any"
              value={pesoPortaria}
              onChange={(e) => setPesoPortaria(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="regra-peso-excepcional">
              Peso excepcional (%)
            </label>
            <input
              id="regra-peso-excepcional"
              type="number"
              min={0}
              max={100}
              step="any"
              value={pesoExcepcional}
              onChange={(e) => setPesoExcepcional(e.target.value)}
            />
            <span className="field-hint">
              Opcional. Substitui o peso da portaria.
            </span>
          </div>

          <div className="form-field">
            <label htmlFor="regra-meta">
              Meta ({indicador.unidade_medida})
            </label>
            <input
              id="regra-meta"
              type="number"
              min={0}
              step="any"
              value={meta}
              onChange={(e) => setMeta(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="regra-peso-vigente">
              Peso vigente (%)
            </label>
            <input
              id="regra-peso-vigente"
              value={pesoVigente}
              readOnly
            />
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
          {salvando ? 'Salvando...' : 'Salvar regra'}
        </button>
      </div>
    </form>
  );
}