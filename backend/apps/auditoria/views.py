from django.utils import timezone
from rest_framework import mixins, serializers, viewsets
from apps.acesso.interface import ExigePermissao
from apps.cadastro.interface import escopo_do_request
from .models import RegistroAuditoria
from apps.acesso.interface import ExigePermissao, usuario_tem_permissao

class RegistroAuditoriaSerializer(serializers.ModelSerializer):
    """Mesmo formato de AuditoriaEntrada (front)."""

    id = serializers.SerializerMethodField()
    usuario = serializers.CharField(source="usuario_identificacao",read_only=True,)
    data = serializers.SerializerMethodField()
    horario = serializers.SerializerMethodField()
    registroAfetado = serializers.CharField(source="registro_afetado")
    valorAnterior = serializers.CharField(source="valor_anterior")
    novoValor = serializers.CharField(source="novo_valor")

    class Meta:
        model = RegistroAuditoria
        fields = [
            "id",
            "usuario",
            "data",
            "horario",
            "operacao",
            "registroAfetado",
            "valorAnterior",
            "novoValor",
            "perfil",
            "localizacao",
            "componente",
        ]

    def get_id(self, obj) -> str:
        return f"api-aud-{obj.pk}"

    def get_data(self, obj) -> str:
        return timezone.localtime(obj.ocorrido_em).strftime("%d/%m/%Y")

    def get_horario(self, obj) -> str:
        return timezone.localtime(obj.ocorrido_em).strftime("%H:%M")


class RegistroAuditoriaViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """GET /api/auditoria/?componente=cadastro"""

    serializer_class = RegistroAuditoriaSerializer
    permission_classes = [ExigePermissao]
    permissoes_exigidas = ("acesso.consultar_auditoria",)

    def get_queryset(self):
        qs = RegistroAuditoria.objects.all()
        usuario = self.request.user
        escopo = escopo_do_request(self.request)
        acesso_geral_cam = usuario.groups.filter(name="CAM/SECOGE").exists() and usuario_tem_permissao(usuario, "acesso.consultar_auditoria")
        if not (usuario.is_superuser or acesso_geral_cam):
            if escopo.vazio:
                return qs.none()
            if escopo.unidade_id:
                qs = qs.filter(unidade_id=escopo.unidade_id)
            elif escopo.distrito_id:
                qs = qs.filter(distrito_id=escopo.distrito_id)
            elif not escopo.municipal:
                return qs.none()
        if componente := self.request.query_params.get("componente"):
            qs = qs.filter(componente=componente)
        return qs[:500]
