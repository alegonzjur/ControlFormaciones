from rest_framework.permissions import DjangoModelPermissions


class PermisosPorModelo(DjangoModelPermissions):
    """Exige el permiso de Django que corresponde a cada operación.

    DjangoModelPermissions ya controla POST (add), PUT/PATCH (change) y
    DELETE (delete), pero deja las lecturas abiertas a cualquier usuario
    autenticado. Aquí exigimos también el permiso "view" para leer, de modo
    que un usuario sin grupo no ve nada.

    Resultado:
    - Lector        -> solo view_*      -> puede consultar, no editar.
    - Administrador -> view/add/change/delete.
    """

    perms_map = {
        **DjangoModelPermissions.perms_map,
        "GET": ["%(app_label)s.view_%(model_name)s"],
        "HEAD": ["%(app_label)s.view_%(model_name)s"],
    }