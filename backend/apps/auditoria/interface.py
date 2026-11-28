"""Contrato do registro de auditoria.

Os outros componentes importam somente este módulo. A normativa chama
`registrar` ao gravar normativa, competência, indicador e regra de cálculo.
Quem for evoluir a tela de auditoria deve manter estas duas funções.
"""

from dataclasses import dataclass
from datetime import datetime
from django.contrib.auth import get_user_model
from .models import RegistroAuditoria


@dataclass(frozen=True)
class RegistroConsulta:
    id: int
    ocorrido_em: datetime
    usuario_id: int | None
    usuario_identificacao: str
    operacao: str
    entidade: str
    identificador: str
    valor_anterior: str
    novo_valor: str


def _perfil_snapshot(usuario) -> str:
    if usuario.is_superuser:
        return "Superusuário"
    return ", ".join(
        usuario.groups.order_by("name").values_list("name", flat=True)
    )


def registrar(
    *,
    usuario,
    operacao: str,
    componente: str = "normativa",
    entidade: str = "",
    identificador: str = "",
    perfil: str = "",
    registro_afetado: str = "",
    valor_anterior: str = "",
    valor_novo: str | None = None,
    novo_valor: str | None = None,
    localizacao: str = "",
    unidade_id: str | None = None,
    distrito_id: str | None = None,
):
    """Registra operações dos componentes na auditoria centralizada."""

    usuario_obj = None

    # Compatibilidade com o contrato original de Cadastro.
    if isinstance(usuario, str):
        if componente != "cadastro":
            raise ValueError(
                "Identificação textual permitida apenas "
                "para o contrato legado de Cadastro."
            )

        usuario_identificacao = usuario.strip()

        if not usuario_identificacao:
            raise ValueError(
                "A identificação do usuário é obrigatória."
            )

    # Contrato utilizado por Normativa.
    elif (
        isinstance(usuario, get_user_model())
        and usuario.is_authenticated
        and usuario.pk is not None
    ):
        usuario_obj = usuario
        usuario_identificacao = usuario.get_username()
        if not perfil:
            perfil = _perfil_snapshot(usuario_obj)

    else:
        raise ValueError(
            "É necessário informar um autor válido."
        )

    # Normaliza os dois nomes utilizados para o novo valor.
    if (
        novo_valor is not None
        and valor_novo is not None
        and novo_valor != valor_novo
    ):
        raise ValueError(
            "Os parâmetros novo_valor e valor_novo "
            "não podem possuir valores diferentes."
        )

    valor_final = (
        novo_valor
        if novo_valor is not None
        else valor_novo
    )

    # Mantém a descrição esperada pelo frontend.
    if not registro_afetado:
        registro_afetado = (
            f"{entidade} {identificador}".strip()
        )

    return RegistroAuditoria.objects.create(
        usuario=usuario_obj,
        usuario_identificacao=usuario_identificacao,
        componente=componente,
        perfil=perfil,
        operacao=operacao,
        entidade=entidade,
        identificador=identificador,
        registro_afetado=registro_afetado,
        valor_anterior=valor_anterior or "",
        novo_valor=valor_final or "",
        localizacao=localizacao,
        unidade_id=unidade_id,
        distrito_id=distrito_id,
    )


def consultar(*, entidade="", identificador=""):
    """Devolve os registros já gravados, do mais antigo para o mais novo.

    Filtros vazios não restringem. Serve para a futura tela de auditoria e
    para os outros componentes conferirem o que enviaram.
    """
    consulta = RegistroAuditoria.objects.order_by("id")
    if entidade:
        consulta = consulta.filter(entidade=entidade)
    if identificador:
        consulta = consulta.filter(identificador=identificador)
    return [
        RegistroConsulta(
            id=registro.id,
            ocorrido_em=registro.ocorrido_em,
            usuario_id=registro.usuario_id,
            usuario_identificacao=registro.usuario_identificacao,
            operacao=registro.operacao,
            entidade=registro.entidade,
            identificador=registro.identificador,
            valor_anterior=registro.valor_anterior,
            novo_valor=registro.novo_valor,
        )
        for registro in consulta
    ]

def registros(componente=None):
    """Retorna os registros de auditoria para consultas internas."""

    consulta = RegistroAuditoria.objects.all()

    if componente is not None:
        consulta = consulta.filter(componente=componente)

    return consulta