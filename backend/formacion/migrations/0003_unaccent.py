"""Activa la extensión "unaccent" de PostgreSQL.

Permite buscar ignorando tildes: "sanchez" encuentra "Sánchez".
La usan los search_fields con "__unaccent" de views.py y admin.py.

Desde PostgreSQL 13, unaccent es una extensión "trusted": la puede crear el
propietario de la base de datos (control_formacion) sin ser superusuario.

Si la extensión ya existe, la operación no hace nada (CREATE EXTENSION
IF NOT EXISTS). Al revertir esta migración, se elimina.
"""

from django.contrib.postgres.operations import UnaccentExtension
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("formacion", "0002_roles"),
    ]

    operations = [
        UnaccentExtension(),
    ]