from django.contrib.auth.management import create_permissions
from django.db import migrations


def atribuir_permissao(apps, schema_editor):
    app_config = apps.get_app_config("acesso")
    app_config.models_module = True
    create_permissions(app_config, verbosity=0, apps=apps)
    app_config.models_module = None

    Permission = apps.get_model("auth", "Permission")
    Group = apps.get_model("auth", "Group")

    permissao = Permission.objects.get(
        content_type__app_label="acesso",
        codename="consultar_auditoria",
    )

    for nome in ["CAM/SECOGE", "Avaliado"]:
        grupo = Group.objects.get(name=nome)
        grupo.permissions.add(permissao)


def remover_permissao(apps, schema_editor):
    Permission = apps.get_model("auth", "Permission")
    Group = apps.get_model("auth", "Group")

    permissao = Permission.objects.filter(
        content_type__app_label="acesso",
        codename="consultar_auditoria",
    ).first()

    if permissao:
        for grupo in Group.objects.filter(
            name__in=["CAM/SECOGE", "Avaliado"]
        ):
            grupo.permissions.remove(permissao)


class Migration(migrations.Migration):
    dependencies = [
        ("acesso", "0005_alter_operacao_options"),
    ]

    operations = [
        migrations.RunPython(
            atribuir_permissao,
            remover_permissao,
        ),
    ]