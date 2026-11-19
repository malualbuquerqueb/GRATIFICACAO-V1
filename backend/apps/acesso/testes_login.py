
import json

from django.test import TestCase, Client
from django.contrib.auth import get_user_model


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
