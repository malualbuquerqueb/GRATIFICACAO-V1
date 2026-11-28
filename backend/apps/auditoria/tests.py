from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import status
from rest_framework.test import APITestCase
from apps.auditoria.models import RegistroAuditoria
from apps.auditoria.interface import registrar
from apps.auditoria.views import RegistroAuditoriaSerializer
from apps.cadastro.models import Avaliado, Distrito, Unidade


class PerfilSnapshotTest(APITestCase):
    def test_usuario_com_multiplos_papeis_tem_snapshot_deterministico(self):
        usuario = get_user_model().objects.create_user(
            username="perfil_multiplos",
            password="senha_teste_123",
        )
        usuario.groups.add(
            Group.objects.get(name="Técnico"),
            Group.objects.get(name="Configurador"),
        )

        registro = registrar(
            usuario=usuario,
            componente="normativa",
            operacao="cadastrar_normativa",
            entidade="normativa",
            identificador="CAM-TESTE",
        )

        self.assertEqual(registro.perfil, "Configurador, Técnico")

    def test_superusuario_tem_identificacao_sem_grupo_de_negocio(self):
        usuario = get_user_model().objects.create_superuser(
            username="administrador_teste",
            password="senha_teste_123",
        )

        registro = registrar(
            usuario=usuario,
            componente="normativa",
            operacao="cadastrar_normativa",
        )

        self.assertEqual(registro.perfil, "Superusuário")

    def test_alteracao_posterior_nao_reescreve_o_snapshot(self):
        usuario = get_user_model().objects.create_user(
            username="perfil_alterado",
            password="senha_teste_123",
        )
        usuario.groups.add(Group.objects.get(name="Configurador"))

        primeiro = registrar(
            usuario=usuario,
            componente="normativa",
            operacao="cadastrar_normativa",
        )

        usuario.groups.add(Group.objects.get(name="Técnico"))

        segundo = registrar(
            usuario=usuario,
            componente="normativa",
            operacao="cadastrar_competencia",
        )

        primeiro.refresh_from_db()
        segundo.refresh_from_db()
        self.assertEqual(primeiro.perfil, "Configurador")
        self.assertEqual(segundo.perfil, "Configurador, Técnico")


class ApresentacaoAuditoriaSerializerTest(APITestCase):
    def test_serializer_expoe_entidade_identificador_e_valores(self):
        usuario = get_user_model().objects.create_user(
            username="configurador_serializer",
            password="senha_teste_123",
        )
        usuario.groups.add(Group.objects.get(name="Configurador"))
        registro = registrar(
            usuario=usuario,
            componente="normativa",
            operacao="atualizar_indicador",
            entidade="indicador",
            identificador="CAM-1.2/1",
            valor_anterior='{"ativo": true, "meta": null}',
            novo_valor='{"ativo": false, "meta": "90.00"}',
        )

        dados = RegistroAuditoriaSerializer(registro).data

        self.assertEqual(dados["usuario"], "configurador_serializer")
        self.assertEqual(dados["perfil"], "Configurador")
        self.assertEqual(dados["componente"], "normativa")
        self.assertEqual(dados["entidade"], "indicador")
        self.assertEqual(dados["identificador"], "CAM-1.2/1")
        self.assertEqual(dados["valorAnterior"], '{"ativo": true, "meta": null}')
        self.assertEqual(dados["novoValor"], '{"ativo": false, "meta": "90.00"}')

    def test_valores_ausentes_permitem_tratamento_no_frontend(self):
        registro = RegistroAuditoria.objects.create(
            componente="normativa",
            usuario_identificacao="usuario_legado",
            perfil="",
            operacao="cadastrar_competencia",
            entidade="competencia",
            identificador="2026-12",
            registro_afetado="competencia 2026-12",
            valor_anterior="",
            novo_valor='{"mes": 12, "ano": 2026}',
            localizacao="",
        )

        dados = RegistroAuditoriaSerializer(registro).data

        self.assertEqual(dados["perfil"], "")
        self.assertEqual(dados["localizacao"], "")
        self.assertEqual(dados["valorAnterior"], "")


class AuditoriaPermissaoTest(APITestCase):

    def test_configurador_nao_pode_consultar_auditoria(self):
        # Cria um usuário para o teste.
        Usuario = get_user_model()

        usuario = Usuario.objects.create_user(
            username="configurador_teste",
            password="senha_teste_123"
        )

        # Associa o usuário ao grupo Configurador.
        grupo = Group.objects.get(name="Configurador")
        usuario.groups.add(grupo)

        # Autentica o usuário na API.
        self.client.force_authenticate(user=usuario)

        # Tenta consultar os registros de Auditoria.
        resposta = self.client.get("/api/auditoria/")

        # Verifica se o acesso foi negado.
        self.assertEqual(
            resposta.status_code,
            status.HTTP_403_FORBIDDEN
        )

    def test_tecnico_nao_pode_consultar_auditoria(self):
        # 1. Criar um usuário utilizando o modelo personalizado.
        Usuario = get_user_model()

        tecnico = Usuario.objects.create_user(
            username="tecnico_teste",
            password="senha_teste_123"
        )

        # 2. Associar o usuário ao grupo Técnico.
        grupo = Group.objects.get(name="Técnico")
        tecnico.groups.add(grupo)

        # 3. Autenticar o usuário na API.
        self.client.force_authenticate(user=tecnico)

        # 4. Tentar consultar os registros de Auditoria.
        resposta = self.client.get("/api/auditoria/")

        # 5. Verificar se o acesso foi negado.
        self.assertEqual(
            resposta.status_code,
            status.HTTP_403_FORBIDDEN
        )


class AuditoriaEscopoTest(APITestCase):
    def setUp(self):
        Usuario = get_user_model()
        self.d1 = Distrito.objects.create(id="d1", nome="Distrito 1")
        self.d2 = Distrito.objects.create(id="d2", nome="Distrito 2")
        self.u1 = Unidade.objects.create(id="u1", nome="Unidade 1", distrito=self.d1, tipo="USF")
        self.u2 = Unidade.objects.create(id="u2", nome="Unidade 2", distrito=self.d1, tipo="USF")
        self.u3 = Unidade.objects.create(id="u3", nome="Unidade 3", distrito=self.d2, tipo="USF")
        self.gestor = Usuario.objects.create_user(username="gestor_escopo", password="senha_teste_123")
        self.coordenador = Usuario.objects.create_user(username="coordenador_escopo", password="senha_teste_123")
        self.cam = Usuario.objects.create_user(username="cam_escopo", password="senha_teste_123")
        self.gestor.groups.add(Group.objects.get(name="Avaliado"))
        self.coordenador.groups.add(Group.objects.get(name="Avaliado"))
        self.cam.groups.add(Group.objects.get(name="CAM/SECOGE"))
        Avaliado.objects.create(id="us1", nome="Gestor Teste", email="gestor-teste@example.com", perfil="gestor", unidade=self.u1, distrito=self.d1, usuario=self.gestor)
        Avaliado.objects.create(id="us2", nome="Coordenador Teste", email="coordenador-teste@example.com", perfil="coordenador", distrito=self.d1, usuario=self.coordenador)
        self.registros = {}
        for nome, unidade, distrito in [("u1", self.u1, self.d1), ("u2", self.u2, self.d1), ("u3", self.u3, self.d2), ("d1", None, self.d1), ("d2", None, self.d2)]:
            registro = RegistroAuditoria.objects.create(
                        componente="cadastro",
                        usuario=None,
                        usuario_identificacao="sistema",
                        perfil="Configurador",
                        operacao=f"Operação {nome}",
                        registro_afetado=nome,
                        localizacao=nome,
                        unidade=unidade,
                        distrito=distrito,
                    )
            self.registros[nome] = f"api-aud-{registro.pk}"
    def consultar_ids(self, usuario):
        self.client.force_authenticate(user=usuario)
        resposta = self.client.get("/api/auditoria/")
        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        return {registro["id"] for registro in resposta.json()}
    def test_gestor_visualiza_somente_propria_unidade(self):
        ids = self.consultar_ids(self.gestor)
        self.assertSetEqual(ids, {self.registros["u1"]})
    def test_coordenador_visualiza_somente_proprio_distrito(self):
        ids = self.consultar_ids(self.coordenador)
        self.assertSetEqual(ids, {self.registros["u1"], self.registros["u2"], self.registros["d1"]})
    def test_cam_visualiza_todos_os_territorios(self):
        ids = self.consultar_ids(self.cam)
        self.assertSetEqual(ids, set(self.registros.values()))
    def test_usuario_anonimo_nao_consulta_auditoria(self):
        self.client.force_authenticate(user=None)
        resposta = self.client.get("/api/auditoria/")
        self.assertIn(resposta.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])



class AuditoriaAutenticacaoTest(APITestCase):
    def test_usuario_anonimo_nao_acessa_endpoints_protegidos(self):
        endpoints = ["/api/usuarios/", "/api/unidades/", "/api/auditoria/"]
        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                resposta_get = self.client.get(endpoint)
                resposta_post = self.client.post(endpoint, {}, format="json")
                self.assertIn(resposta_get.status_code, [401, 403])
                self.assertIn(resposta_post.status_code, [401, 403])
