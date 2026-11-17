from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import status
from rest_framework.test import APITestCase
from apps.auditoria.models import RegistroAuditoria


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

