from django.conf import settings
from django.db import models


class RegistroAuditoria(models.Model):
    """Rastro do que os componentes cadastram ou alteram.

    A normativa grava aqui cada normativa, competência, indicador e regra.
    O registro é só inclusão: a tela de consulta do histórico continua
    responsabilidade deste componente, em cima destes dados.
    """

    ocorrido_em = models.DateTimeField(auto_now_add=True, db_index=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="registros_de_auditoria",
    )
    # Nome de usuário no momento do fato. O cadastro da pessoa pode mudar depois.
    usuario_identificacao = models.CharField(max_length=200, blank=True)
    componente = models.CharField(
        max_length=30,
        help_text="App que gerou o registro (ex.: cadastro).",
    )

    perfil = models.CharField(
        max_length=60,
        blank=True,
    )
    operacao = models.CharField(max_length=100)
    entidade = models.CharField(max_length=64, blank=True)
    identificador = models.CharField(max_length=120, blank=True)
    registro_afetado = models.CharField(
        max_length=300,
    )
    valor_anterior = models.TextField(blank=True)
    novo_valor = models.TextField(blank=True)
    localizacao = models.CharField(max_length=200, blank=True)
    unidade = models.ForeignKey(
        "cadastro.Unidade",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="registros_auditoria",
    )

    distrito = models.ForeignKey(
        "cadastro.Distrito",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="registros_auditoria",
    )

    class Meta:
        verbose_name = "registro de auditoria"
        verbose_name_plural = "registros de auditoria"
        ordering = ["-ocorrido_em", "-id"]
        indexes = [
            models.Index(fields=["entidade", "identificador"], name="auditoria_entidade_id_idx"),
        ]

    def __str__(self):
        return f"{self.operacao} {self.entidade or self.componente} {self.identificador or self.registro_afetado}"
