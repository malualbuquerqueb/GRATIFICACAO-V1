
from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import csrf_protect
from django.contrib.auth.decorators import login_required
from django.middleware.csrf import get_token
from django_ratelimit.decorators import ratelimit
import logging

import json

logger = logging.getLogger("sggd.seguranca")

@require_GET
@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({"csrfToken": get_token(request)})


@require_POST
@csrf_protect
@ratelimit(key="ip", rate="5/m", method="POST", block=False)
def login_view(request):
    if getattr(request, "limited", False):
        logger.warning("Login bloqueado por rate limiting")
        return JsonResponse(
            {"detail": "Muitas tentativas. Aguarde antes de tentar novamente."},
            status=429
        )

    try:
        dados = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse(
            {"detail": "JSON inválido."},
            status=400
        )

    if not isinstance(dados, dict):
        return JsonResponse(
            {"detail": "Formato de dados inválido."},
            status=400
        )

    username = dados.get("username")
    password = dados.get("password")

    if not isinstance(username, str) or not isinstance(password, str):
        return JsonResponse(
            {"detail": "Usuário e senha são obrigatórios."},
            status=400
        )

    usuario = authenticate(
        request,
        username=username,
        password=password
    )

    if usuario is None:
        logger.warning("Tentativa de autenticação malsucedida")
        return JsonResponse(
            {"detail": "Usuário ou senha inválidos."},
            status=401
        )

    login(request, usuario)

    return JsonResponse({
        "message": "Login realizado com sucesso.",
        "usuario": dados_usuario(usuario)
    })


def dados_usuario(usuario):
    return {
        "id": usuario.pk,
        "username": usuario.username,
        "nome": usuario.get_full_name() or usuario.username,
        "grupos": list(
            usuario.groups.values_list("name", flat=True)
        ),
        "permissoes": sorted(usuario.get_all_permissions()),
        "is_staff": usuario.is_staff,
        "is_superuser": usuario.is_superuser,
    }


@require_GET
def me(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {"detail": "Usuário não autenticado."},
            status=401
        )
    return JsonResponse({
        "usuario": dados_usuario(request.user)
    })


@require_POST
@csrf_protect
def logout_view(request):
    logout(request)
    return JsonResponse({
        "message": "Logout realizado com sucesso."
    })
