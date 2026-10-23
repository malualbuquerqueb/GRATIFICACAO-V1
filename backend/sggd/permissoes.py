"""Perfil de quem faz a requisição.

Os perfis são os mesmos do front (src/types/index.ts → PerfilId):
gestor, coordenador, seab, configurador.

Hoje o front tem um seletor de perfil e não tem login real, então o perfil e o
nome do usuário chegam nos cabeçalhos X-Perfil e X-Usuario (URL-encoded).
Quando o componente de Controle de Acesso existir, ele substitui esta classe.
"""
from urllib.parse import unquote

from django.conf import settings
from rest_framework import permissions

PERFIS = {
    "gestor": "Gestor de Unidade",
    "coordenador": "Coordenador Distrital",
    "seab": "SEAB/CAM",
    "configurador": "Configurador SAB",
}

# Quem pode cadastrar/alterar unidades e avaliados (mesmo recorte do menu do front).
PERFIS_QUE_CADASTRAM = {"seab", "configurador"}


def perfil_da_requisicao(request) -> str | None:
    if not settings.SGGD_PERFIL_SIMULADO:
        return None
    perfil = request.headers.get("X-Perfil", "").strip()
    return perfil if perfil in PERFIS else None


def usuario_da_requisicao(request) -> str:
    nome = unquote(request.headers.get("X-Usuario", "")).strip()
    return nome or "Sistema"


class PorPerfil(permissions.BasePermission):
    message = "Seu perfil não pode realizar esta operação."

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return perfil_da_requisicao(request) in PERFIS_QUE_CADASTRAM
