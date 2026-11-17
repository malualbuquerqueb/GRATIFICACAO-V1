from .models import RegistroAuditoria


def registrar(
    *,
    componente: str,
    usuario: str,
    perfil: str,
    operacao: str,
    registro_afetado: str,
    valor_anterior: str = "—",
    novo_valor: str = "—",
    localizacao: str = "",
    unidade_id: str | None = None,
    distrito_id: str | None = None,
) -> RegistroAuditoria:
    return RegistroAuditoria.objects.create(
        componente=componente,
        usuario=usuario,
        perfil=perfil,
        operacao=operacao,
        registro_afetado=registro_afetado,
        valor_anterior=valor_anterior,
        novo_valor=novo_valor,
        localizacao=localizacao,
        unidade_id=unidade_id,
        distrito_id=distrito_id,
    )
