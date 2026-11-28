export interface Normativa {
  id: number;
  codigo: string;
  nome: string;
  referencia_portaria: string;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  situacao: string;
}

export interface CompetenciaNormativa {
  id: number;
  ano: number;
  mes: number;
  normativa: number;
  normativa_codigo: string;
}

export interface DadosCompetencia {
  ano: number;
  mes: number;
  normativa: number;
}

export type NivelIndicador =
  | 'indicador'
  | 'subindicador'
  | 'sub_subindicador';

export type FormaCalculo =
  | 'proporcao'
  | 'media_subindicadores'
  | 'nota_informada';

export interface IndicadorNormativa {
  id: number;
  normativa: number;
  normativa_codigo: string;
  codigo: string;
  nome: string;
  nivel: NivelIndicador;
  pai: number | null;
  pai_codigo: string;
  unidade_medida: string;
  forma_calculo: FormaCalculo;
  formula: string;
  ativo: boolean;
}

export interface DadosIndicador {
  normativa: number;
  codigo: string;
  nome: string;
  nivel: NivelIndicador;
  codigo_pai: string;
  unidade_medida: string;
  forma_calculo: FormaCalculo;
  formula: string;
  ativo: boolean;
}

export type DadosAtualizacaoIndicador =
  Partial<Omit<DadosIndicador, 'normativa'>>;

export interface RegraCalculo {
  id: number;
  indicador: number;
  indicador_codigo: string;
  cargo: string;
  tipo_unidade: string;
  abrangencia: string;
  peso_portaria: string;
  peso_excepcional: string | null;
  peso_vigente: string;
  meta: string | null;
}

export interface DadosRegraCalculo {
  indicador: number;
  cargo: string;
  tipo_unidade: string;
  abrangencia: string;
  peso_portaria: string;
  peso_excepcional: string | null;
  meta: string | null;
}

export interface DadosNormativa {
  codigo: string;
  nome: string;
  referencia_portaria: string;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  situacao: 'vigente' | 'encerrada';
}