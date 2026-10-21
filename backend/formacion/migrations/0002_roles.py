"""Migración de datos: crea los grupos "Administrador" y "Lector".

Al ser una migración, los grupos aparecen solos al ejecutar `migrate`
tanto en el portátil como en el servidor.
"""

from django.contrib.auth.management import create_permissions
from django.db import migrations

MODELOS = ["empleado", "curso", "formacion", "sede", "tipocontrato"]


def crear_roles(apps, schema_editor):
    # Django crea los permisos (view/add/change/delete) DESPUÉS de migrar,
    # mediante la señal post_migrate. En una base de datos nueva todavía no
    # existen en este punto, así que los forzamos aquí.
    for app_config in apps.get_app_configs():
        app_config.models_module = True
        create_permissions(app_config, apps=apps, verbosity=0)
        app_config.models_module = None

    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")

    permisos = Permission.objects.filter(
        content_type__app_label="formacion",
        content_type__model__in=MODELOS,
    )

    administrador, _ = Group.objects.get_or_create(name="Administrador")
    administrador.permissions.set(permisos)

    lector, _ = Group.objects.get_or_create(name="Lector")
    lector.permissions.set(permisos.filter(codename__startswith="view_"))


def borrar_roles(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Group.objects.filter(name__in=["Administrador", "Lector"]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("formacion", "0001_initial"),
        ("auth", "0012_alter_user_first_name_max_length"),
        ("contenttypes", "0002_remove_content_type_name"),
    ]

    operations = [
        migrations.RunPython(crear_roles, borrar_roles),
    ]