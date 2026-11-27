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

export interface IndicadorNormativa {
  id: number;
  normativa: number;
  normativa_codigo: string;
  codigo: string;
  nome: string;
  nivel: number;
  pai: number | null;
  pai_codigo: string;
  unidade_medida: string;
  forma_calculo: string;
  formula: string;
  ativo: boolean;
}

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