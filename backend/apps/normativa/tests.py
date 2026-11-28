from decimal import Decimal
from pathlib import Path
import json
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import PermissionDenied, ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from apps.auditoria.interface import consultar

from . import services
from .interface import (
    CompetenciaNaoCadastrada,
    indicadores_para_coleta,
    regras_para_apuracao,
    soma_pesos_de_primeiro_nivel,
)
from .models import Indicador, RegraCalculo

EXEMPLO = Path(__file__).resolve().parent / "exemplo_indicadores.csv"
SENHA = "Senha-de-teste-123"


def _pessoa(username, papel=None):
    usuario = get_user_model().objects.create_user(username, password=SENHA)
    if papel:
        usuario.groups.add(Group.objects.get(name=papel))
    return usuario


class CadastroTests(TestCase):
    def setUp(self):
        self.configurador = _pessoa("diana", "Configurador")
        self.tecnico = _pessoa("ana", "Técnico")

    def _normativa(self):
        return services.cadastrar_normativa(
            self.configurador,
            {
                "codigo": "CAM-1.2",
                "nome": "Critérios de avaliação e monitoramento 1.2",
                "referencia_portaria": "Portaria da gratificação por desempenho",
                "vigencia_inicio": "2025-01-01",
                "vigencia_fim": "2025-12-31",
            },
        )

    def test_tecnico_nao_cadastra_normativa(self):
        with self.assertRaises(PermissionDenied):
            services.cadastrar_normativa(
                self.tecnico,
                {
                    "codigo": "CAM-1.2",
                    "nome": "Critérios",
                    "vigencia_inicio": "2025-01-01",
                },
            )

    def test_cadastro_de_normativa_competencia_e_indicador_vai_para_auditoria(self):
        normativa = self._normativa()
        services.cadastrar_competencia(
            self.configurador,
            {"normativa": normativa.id, "ano": 2025, "mes": 2},
        )
        indicador = services.cadastrar_indicador(
            self.configurador,
            {
                "normativa": normativa.id,
                "codigo": "1",
                "nome": "Materiais no Hórus",
                "formula": "Encerradas no prazo / total",
            },
        )
        regra = services.configurar_regra(
            self.configurador,
            {
                "indicador": indicador.id,
                "cargo": "coordenador_us",
                "tipo_unidade": "USF",
                "peso_portaria": "20",
                "peso_excepcional": "0",
                "meta": "100",
            },
        )

        self.assertEqual(regra.peso_portaria, Decimal("20.00"))
        self.assertEqual(regra.peso_vigente, Decimal("0.00"))
        entidades = {registro.entidade for registro in consultar()}
        self.assertEqual(entidades, {"normativa", "competencia", "indicador", "regra_calculo"})
        rastro = consultar(entidade="indicador", identificador="CAM-1.2/1")
        self.assertEqual(rastro[0].usuario_identificacao, "diana")
        self.assertEqual(rastro[0].operacao, "cadastrar_indicador")

    def test_competencia_fora_da_vigencia_e_recusada(self):
        normativa = self._normativa()

        with self.assertRaises(ValidationError) as bloco:
            services.cadastrar_competencia(
                self.configurador,
                {"normativa": normativa.id, "ano": 2024, "mes": 12},
            )

        self.assertIn("vigência", str(bloco.exception))

    def test_peso_acima_de_100_e_recusado(self):
        normativa = self._normativa()
        indicador = services.cadastrar_indicador(
            self.configurador,
            {"normativa": normativa.id, "codigo": "1", "nome": "Hórus"},
        )

        with self.assertRaises(ValidationError):
            services.configurar_regra(
                self.configurador,
                {"indicador": indicador.id, "peso_portaria": "150"},
            )

    def test_importacao_com_pai_inexistente_nao_grava_nada(self):
        normativa = self._normativa()
        conteudo = "codigo;nome;nivel;codigo_pai\n2.2;Abono;subindicador;9\n"

        with self.assertRaises(ValidationError) as bloco:
            services.importar_indicadores(self.configurador, normativa.id, conteudo)

        self.assertIn("9", str(bloco.exception))
        self.assertEqual(Indicador.objects.count(), 0)
        self.assertEqual(consultar(entidade="indicador"), [])

    def test_arquivo_de_exemplo_monta_regras_para_apuracao_e_coleta(self):
        normativa = self._normativa()
        services.cadastrar_competencia(
            self.configurador,
            {"normativa": normativa.id, "ano": 2025, "mes": 2},
        )
        services.importar_indicadores(self.configurador, normativa.id, EXEMPLO.read_text(encoding="utf-8"))

        regras = regras_para_apuracao(ano=2025, mes=2, cargo="coordenador_us", tipo_unidade="USF")
        self.assertEqual(soma_pesos_de_primeiro_nivel(regras), Decimal("100"))
        gestao = next(regra for regra in regras if regra.indicador_codigo == "2")
        self.assertEqual(gestao.forma_calculo, "media_subindicadores")
        self.assertIn("peso vigente", gestao.orientacao_calculo)

        snb2 = regras_para_apuracao(ano=2025, mes=2, cargo="SnB2")
        gestao_snb2 = next(regra for regra in snb2 if regra.indicador_codigo == "2")
        self.assertEqual(gestao_snb2.peso_portaria, Decimal("20.00"))
        self.assertEqual(gestao_snb2.peso_vigente, Decimal("15.00"))

        coleta = indicadores_para_coleta(ano=2025, mes=2, cargo="coordenador_us", tipo_unidade="USF")
        codigos = [item.codigo for item in coleta]
        self.assertEqual(codigos, ["1", "2", "2.2", "3", "4"])
        abono = next(item for item in coleta if item.codigo == "2.2")
        self.assertEqual(abono.pai_codigo, "2")
        self.assertIsNone(abono.meta)

        with self.assertRaises(CompetenciaNaoCadastrada):
            regras_para_apuracao(ano=2025, mes=3)


class ApiTests(TestCase):
    def setUp(self):
        self.configurador = _pessoa("diana", "Configurador")
        self.tecnico = _pessoa("ana", "Técnico")
        self.cliente = APIClient()

    def _preparar_exemplo(self):
        self.cliente.force_authenticate(user=self.configurador)
        normativa = self.cliente.post(
            "/api/normativa/normativas/",
            {
                "codigo": "CAM-1.2",
                "nome": "Critérios de avaliação e monitoramento 1.2",
                "vigencia_inicio": "2025-01-01",
                "vigencia_fim": "2025-12-31",
            },
            format="json",
        )
        self.assertEqual(normativa.status_code, 201, normativa.data)
        competencia = self.cliente.post(
            "/api/normativa/competencias/",
            {"normativa": normativa.data["id"], "ano": 2025, "mes": 2},
            format="json",
        )
        self.assertEqual(competencia.status_code, 201, competencia.data)
        arquivo = SimpleUploadedFile(
            "indicadores.csv",
            EXEMPLO.read_bytes(),
            content_type="text/csv",
        )
        importacao = self.cliente.post(
            "/api/normativa/indicadores/importar/",
            {"arquivo": arquivo, "normativa": normativa.data["id"]},
            format="multipart",
        )
        self.assertEqual(importacao.status_code, 201, importacao.data)
        self.assertEqual(importacao.data["quantidade"], 6)
        self.assertEqual(RegraCalculo.objects.count(), 6)
        return normativa.data["id"]

    def test_tecnico_nao_cadastra_pela_api_mas_le_o_que_a_coleta_precisa(self):
        self._preparar_exemplo()
        self.cliente.force_authenticate(user=self.tecnico)

        bloqueio = self.cliente.post(
            "/api/normativa/indicadores/",
            {"normativa": 1, "codigo": "9", "nome": "Fora do papel"},
            format="json",
        )
        self.assertEqual(bloqueio.status_code, 403)

        leitura = self.cliente.get(
            "/api/normativa/coleta/indicadores/",
            {"ano": 2025, "mes": 2, "cargo": "coordenador_us", "tipo_unidade": "USF"},
        )
        self.assertEqual(leitura.status_code, 200)
        codigos = [item["codigo"] for item in leitura.data]
        self.assertIn("2.2", codigos)
        self.assertNotIn("5", codigos)

        apuracao = self.cliente.get(
            "/api/normativa/apuracao/regras/",
            {"ano": 2025, "mes": 2, "cargo": "gg"},
        )
        self.assertEqual(apuracao.status_code, 200)
        self.assertEqual([item["indicador_codigo"] for item in apuracao.data], ["5"])
        self.assertEqual(apuracao.data[0]["peso_vigente"], "100.00")

    def test_sem_login_a_leitura_e_recusada(self):
        resposta = self.cliente.get("/api/normativa/coleta/indicadores/", {"ano": 2025, "mes": 2})

        self.assertEqual(resposta.status_code, 403)

    def test_competencia_desconhecida_responde_404(self):
        self.cliente.force_authenticate(user=self.tecnico)

        resposta = self.cliente.get("/api/normativa/apuracao/regras/", {"ano": 2025, "mes": 8})

        self.assertEqual(resposta.status_code, 404)


class EdicaoIndicadorTests(TestCase):
    def setUp(self):
        self.configurador = _pessoa("configurador_edicao", "Configurador")
        self.tecnico = _pessoa("tecnico_edicao", "Técnico")

        self.cliente = APIClient()
        self.cliente.force_authenticate(user=self.configurador)

        self.normativa = services.cadastrar_normativa(
            self.configurador,
            {
                "codigo": "NORM-TESTE",
                "nome": "Normativa de teste",
                "vigencia_inicio": "2026-01-01",
            },
        )

        self.indicador = services.cadastrar_indicador(
            self.configurador,
            {
                "normativa": self.normativa.id,
                "codigo": "1",
                "nome": "Indicador principal",
            },
        )

        self.filho = services.cadastrar_indicador(
            self.configurador,
            {
                "normativa": self.normativa.id,
                "codigo": "1.1",
                "nome": "Subindicador",
                "nivel": "subindicador",
                "codigo_pai": "1",
            },
        )

        self.url = (
            f"/api/normativa/indicadores/{self.indicador.id}/"
        )

    def test_editar_indicador(self):
        resposta = self.cliente.put(
            self.url,
            {"nome": "Nome atualizado"},
            format="json",
        )

        self.assertEqual(resposta.status_code, 200)

        self.indicador.refresh_from_db()
        self.assertEqual(self.indicador.nome, "Nome atualizado")

        registros = consultar(
            entidade="indicador",
            identificador="NORM-TESTE/1",
        )

        self.assertTrue(any(
            registro.operacao == "atualizar_indicador"
            for registro in registros
        ))

    def test_desativar_e_reativar_indicador(self):
        for ativo in (False, True):
            with self.subTest(ativo=ativo):
                resposta = self.cliente.put(
                    self.url,
                    {"ativo": ativo},
                    format="json",
                )

                self.assertEqual(resposta.status_code, 200)

                self.indicador.refresh_from_db()
                self.assertEqual(self.indicador.ativo, ativo)

        self.assertEqual(Indicador.objects.count(), 2)

    def test_nao_altera_nivel_de_indicador_com_filhos(self):
        outro = services.cadastrar_indicador(
            self.configurador,
            {
                "normativa": self.normativa.id,
                "codigo": "2",
                "nome": "Outro indicador",
            },
        )

        resposta = self.cliente.put(
            self.url,
            {
                "nivel": "subindicador",
                "codigo_pai": outro.codigo,
            },
            format="json",
        )

        self.assertEqual(resposta.status_code, 400)
        self.assertIn("nivel", resposta.data)

        self.indicador.refresh_from_db()
        self.filho.refresh_from_db()

        self.assertEqual(self.indicador.nivel, "indicador")
        self.assertEqual(self.filho.pai_id, self.indicador.id)

    def test_tecnico_nao_pode_editar_indicador(self):
        self.cliente.force_authenticate(user=self.tecnico)

        resposta = self.cliente.put(
            self.url,
            {"ativo": False},
            format="json",
        )

        self.assertEqual(resposta.status_code, 403)

        self.indicador.refresh_from_db()
        self.assertTrue(self.indicador.ativo)

class RegraCalculoTests(TestCase):
    URL = "/api/normativa/regras/"
    URL_APURACAO = "/api/normativa/apuracao/regras/"
    URL_COLETA = "/api/normativa/coleta/indicadores/"

    @classmethod
    def setUpTestData(cls):
        cls.configurador = _pessoa(
            "configurador_regras", "Configurador"
        )
        cls.tecnico = _pessoa(
            "tecnico_regras", "Técnico"
        )

        cls.normativa = services.cadastrar_normativa(
            cls.configurador,
            {
                "codigo": "NORM-REGRAS",
                "nome": "Normativa de teste",
                "vigencia_inicio": "2026-01-01",
                "vigencia_fim": "2026-12-31",
            },
        )

        services.cadastrar_competencia(
            cls.configurador,
            {
                "normativa": cls.normativa.id,
                "ano": 2026,
                "mes": 12,
            },
        )

        cls.indicador = services.cadastrar_indicador(
            cls.configurador,
            {
                "normativa": cls.normativa.id,
                "codigo": "1",
                "nome": "Gestão de materiais",
                "forma_calculo": "media_subindicadores",
            },
        )

        cls.subindicador = services.cadastrar_indicador(
            cls.configurador,
            {
                "normativa": cls.normativa.id,
                "codigo": "1.1",
                "nome": "Controle de estoque",
                "nivel": "subindicador",
                "codigo_pai": "1",
            },
        )

    def setUp(self):
        self.cliente = APIClient()
        self.cliente.force_authenticate(
            user=self.configurador
        )

    def _dados(self, **alteracoes):
        return {
            "indicador": self.indicador.id,
            "cargo": "",
            "tipo_unidade": "",
            "abrangencia": "Geral",
            "peso_portaria": "20",
            "peso_excepcional": None,
            "meta": "90",
            **alteracoes,
        }

    def _salvar(self, **alteracoes):
        resposta = self.cliente.post(
            self.URL,
            self._dados(**alteracoes),
            format="json",
        )

        self.assertEqual(
            resposta.status_code, 201, resposta.data
        )

        return resposta.data

    def _consultar(self, url, **filtros):
        resposta = self.cliente.get(
            url,
            {
                "ano": 2026,
                "mes": 12,
                **filtros,
            },
        )

        self.assertEqual(
            resposta.status_code, 200, resposta.data
        )

        return resposta.data

    def _auditoria(self):
        return [
            registro
            for registro in consultar(entidade="regra_calculo")
            if registro.operacao == "configurar_regra_calculo"
        ]

    def test_cadastrar_regra_generica(self):
        dados = self._salvar()

        regra = RegraCalculo.objects.get(pk=dados["id"])

        self.assertEqual(regra.indicador_id, self.indicador.id)
        self.assertEqual(regra.cargo, "")
        self.assertEqual(regra.tipo_unidade, "")
        self.assertEqual(regra.peso_portaria, Decimal("20"))
        self.assertEqual(regra.peso_vigente, Decimal("20"))
        self.assertEqual(regra.meta, Decimal("90"))
        self.assertIsNone(regra.peso_excepcional)

    def test_atualizar_regra_sem_duplicar(self):
        original = self._salvar()

        atualizada = self._salvar(
            peso_portaria="25",
            meta="95",
            abrangencia="Atualizada",
        )

        self.assertEqual(original["id"], atualizada["id"])
        self.assertEqual(RegraCalculo.objects.count(), 1)

        regra = RegraCalculo.objects.get(pk=original["id"])

        self.assertEqual(regra.peso_portaria, Decimal("25"))
        self.assertEqual(regra.meta, Decimal("95"))
        self.assertEqual(regra.abrangencia, "Atualizada")

    def test_regra_especifica_nao_sobrescreve_generica(self):
        generica = self._salvar()

        especifica = self._salvar(
            cargo="gg",
            tipo_unidade="USF",
            peso_portaria="25",
        )

        self.assertNotEqual(generica["id"], especifica["id"])
        self.assertEqual(RegraCalculo.objects.count(), 2)

        regra = RegraCalculo.objects.get(pk=generica["id"])
        self.assertEqual(regra.peso_portaria, Decimal("20"))

    def test_peso_excepcional_zero(self):
        dados = self._salvar(peso_excepcional="0")

        regra = RegraCalculo.objects.get(pk=dados["id"])

        self.assertEqual(regra.peso_excepcional, Decimal("0"))
        self.assertEqual(regra.peso_vigente, Decimal("0"))
        self.assertEqual(
            Decimal(dados["peso_vigente"]), Decimal("0")
        )

    def test_remover_peso_excepcional(self):
        original = self._salvar(peso_excepcional="30")

        atualizada = self._salvar(peso_excepcional=None)

        self.assertEqual(original["id"], atualizada["id"])

        regra = RegraCalculo.objects.get(pk=original["id"])

        self.assertIsNone(regra.peso_excepcional)
        self.assertEqual(regra.peso_vigente, Decimal("20"))

    def test_peso_acima_de_100_e_recusado(self):
        for campo in ("peso_portaria", "peso_excepcional"):
            with self.subTest(campo=campo):
                resposta = self.cliente.post(
                    self.URL,
                    self._dados(**{campo: "101"}),
                    format="json",
                )

                self.assertEqual(resposta.status_code, 400)

        self.assertFalse(RegraCalculo.objects.exists())
        self.assertEqual(self._auditoria(), [])

    def test_peso_negativo_e_recusado(self):
        for campo in ("peso_portaria", "peso_excepcional"):
            with self.subTest(campo=campo):
                resposta = self.cliente.post(
                    self.URL,
                    self._dados(**{campo: "-1"}),
                    format="json",
                )

                self.assertEqual(resposta.status_code, 400)

        self.assertFalse(RegraCalculo.objects.exists())
        self.assertEqual(self._auditoria(), [])

    def test_meta_negativa_e_recusada(self):
        resposta = self.cliente.post(
            self.URL,
            self._dados(meta="-10"),
            format="json",
        )

        self.assertEqual(resposta.status_code, 400)
        self.assertFalse(RegraCalculo.objects.exists())
        self.assertEqual(self._auditoria(), [])

    def test_tecnico_nao_configura_regra(self):
        self.cliente.force_authenticate(user=self.tecnico)

        resposta = self.cliente.post(
            self.URL,
            self._dados(),
            format="json",
        )

        self.assertEqual(resposta.status_code, 403)
        self.assertFalse(RegraCalculo.objects.exists())
        self.assertEqual(self._auditoria(), [])

    def test_cadastro_e_atualizacao_geram_auditoria(self):
        self._salvar()
        self._salvar(meta="95")

        registros = self._auditoria()

        self.assertEqual(len(registros), 2)

        for registro in registros:
            self.assertEqual(
                registro.usuario_identificacao,
                self.configurador.username,
            )

        atualizacao = next(
            registro
            for registro in registros
            if registro.valor_anterior
            and json.loads(registro.valor_anterior)
        )

        anterior = json.loads(atualizacao.valor_anterior)
        novo = json.loads(atualizacao.novo_valor)

        self.assertEqual(Decimal(anterior["meta"]), Decimal("90"))
        self.assertEqual(Decimal(novo["meta"]), Decimal("95"))

    def test_apuracao_seleciona_regra_mais_especifica(self):
        self._salvar()

        self._salvar(
            cargo="gg",
            peso_portaria="25",
            meta="95",
        )

        self._salvar(
            tipo_unidade="USF",
            peso_portaria="28",
            meta="96",
        )

        self._salvar(
            cargo="gg",
            tipo_unidade="USF",
            peso_portaria="30",
            meta="100",
        )

        cenarios = [
            ("gg", "USF", "30", "100"),
            ("gg", "CAPS", "25", "95"),
            ("sna", "USF", "28", "96"),
            ("sna", "CAPS", "20", "90"),
        ]

        for cargo, unidade, peso, meta in cenarios:
            with self.subTest(cargo=cargo, unidade=unidade):
                regras = self._consultar(
                    self.URL_APURACAO,
                    cargo=cargo,
                    tipo_unidade=unidade,
                )

                self.assertEqual(len(regras), 1)
                self.assertEqual(
                    Decimal(regras[0]["peso_vigente"]),
                    Decimal(peso),
                )
                self.assertEqual(
                    Decimal(regras[0]["meta"]),
                    Decimal(meta),
                )

    def test_coleta_retorna_meta_e_hierarquia(self):
        self._salvar(
            cargo="gg",
            tipo_unidade="USF",
            meta="95",
        )

        indicadores = self._consultar(
            self.URL_COLETA,
            cargo="gg",
            tipo_unidade="USF",
        )

        por_codigo = {
            item["codigo"]: item for item in indicadores
        }

        self.assertEqual(set(por_codigo), {"1", "1.1"})
        self.assertEqual(
            Decimal(por_codigo["1"]["meta"]),
            Decimal("95"),
        )
        self.assertEqual(por_codigo["1.1"]["pai_codigo"], "1")
        self.assertIsNone(por_codigo["1.1"]["meta"])

    def test_indicador_inativo_nao_aparece_nos_consumidores(self):
        self._salvar()

        services.atualizar_indicador(
            self.configurador,
            self.indicador.id,
            {"ativo": False},
        )

        regras = self._consultar(
            self.URL_APURACAO,
            cargo="gg",
            tipo_unidade="USF",
        )

        indicadores = self._consultar(
            self.URL_COLETA,
            cargo="gg",
            tipo_unidade="USF",
        )

        self.assertEqual(regras, [])
        self.assertNotIn(
            self.indicador.id,
            [item["indicador_id"] for item in indicadores],
        )

        self.assertTrue(
            RegraCalculo.objects.filter(
                indicador=self.indicador
            ).exists()
        )

    def test_soma_dos_pesos_nao_duplica_subindicadores(self):
        self._salvar(peso_portaria="20")

        self._salvar(
            indicador=self.subindicador.id,
            peso_portaria="50",
        )

        regras = regras_para_apuracao(
            ano=2026,
            mes=12,
            cargo="gg",
            tipo_unidade="USF",
        )

        self.assertEqual(len(regras), 2)
        self.assertEqual(
            soma_pesos_de_primeiro_nivel(regras),
            Decimal("20"),
        )