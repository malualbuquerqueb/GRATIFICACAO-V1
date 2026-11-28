
import json

from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group


class LoginTests(TestCase):

    def setUp(self):
        self.usuario = get_user_model().objects.create_user(
            username="usuario_teste",
            password="SenhaForteTeste123!"
        )
        self.client = Client(enforce_csrf_checks=True)

    def obter_csrf(self):
        resposta = self.client.get("/api/auth/csrf/")
        self.assertEqual(resposta.status_code, 200)
        return resposta.json()["csrfToken"]

    def test_login_valido(self):
        token = self.obter_csrf()

        resposta = self.client.post(
            "/api/auth/login/",
            data=json.dumps({
                "username": "usuario_teste",
                "password": "SenhaForteTeste123!"
            }),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token
        )

        self.assertEqual(resposta.status_code, 200)

        resposta_me = self.client.get("/api/auth/me/")
        self.assertEqual(resposta_me.status_code, 200)
        self.assertEqual(
            resposta_me.json()["usuario"]["username"],
            "usuario_teste"
        )

    def test_login_invalido(self):
        token = self.obter_csrf()

        resposta = self.client.post(
            "/api/auth/login/",
            data=json.dumps({
                "username": "usuario_teste",
                "password": "senha_incorreta"
            }),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token
        )

        self.assertEqual(resposta.status_code, 401)

    def test_login_sem_csrf(self):
        resposta = self.client.post(
            "/api/auth/login/",
            data=json.dumps({
                "username": "usuario_teste",
                "password": "SenhaForteTeste123!"
            }),
            content_type="application/json"
        )

        self.assertEqual(resposta.status_code, 403)

    def test_usuario_nao_autenticado(self):
        resposta = self.client.get("/api/auth/me/")
        self.assertEqual(resposta.status_code, 401)

    def test_logout(self):
        token = self.obter_csrf()

        self.client.post(
            "/api/auth/login/",
            data=json.dumps({
                "username": "usuario_teste",
                "password": "SenhaForteTeste123!"
            }),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token
        )

        token = self.obter_csrf()

        resposta = self.client.post(
            "/api/auth/logout/",
            HTTP_X_CSRFTOKEN=token
        )

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(
            self.client.get("/api/auth/me/").status_code,
            401
        )

    def test_escrita_normativa_exige_sessao_csrf_e_permissao_real(self):
        usuario = get_user_model().objects.create_user(
            username="configurador_csrf",
            password="SenhaForteTeste123!",
        )
        usuario.groups.add(Group.objects.get(name="Configurador"))

        token = self.obter_csrf()
        login = self.client.post(
            "/api/auth/login/",
            data=json.dumps({
                "username": "configurador_csrf",
                "password": "SenhaForteTeste123!",
            }),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(login.status_code, 200)

        token = self.obter_csrf()
        sem_token = self.client.post(
            "/api/normativa/normativas/",
            data=json.dumps({
                "codigo": "SEM-CSRF",
                "nome": "Operação bloqueada",
                "vigencia_inicio": "2026-01-01",
            }),
            content_type="application/json",
        )
        self.assertEqual(sem_token.status_code, 403)

        normas = self.client.get("/api/normativa/normativas/")
        self.assertEqual(normas.status_code, 200)
        self.assertNotIn(
            "SEM-CSRF",
            {item["codigo"] for item in normas.json()},
        )

        com_token = self.client.post(
            "/api/normativa/normativas/",
            data=json.dumps({
                "codigo": "COM-CSRF",
                "nome": "Operação autorizada",
                "vigencia_inicio": "2026-01-01",
            }),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(com_token.status_code, 201)
        normas = self.client.get("/api/normativa/normativas/")
        self.assertEqual(normas.status_code, 200)
        self.assertIn(
            "COM-CSRF",
            {item["codigo"] for item in normas.json()},
        )
