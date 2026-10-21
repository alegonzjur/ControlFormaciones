from django.conf import settings
from django.contrib import admin
from django.db import connection
from django.http import JsonResponse
from django.urls import include, path, re_path

from .frontend import index_react


def health(request):
    """Comprueba que Django arranca y llega a PostgreSQL.

    Endpoint provisional para validar el esqueleto; no requiere login.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT version()")
            db_version = cursor.fetchone()[0]
        return JsonResponse({"status": "ok", "database": db_version})
    except Exception as exc:
        body = {"status": "error"}
        if settings.DEBUG:
            body["detail"] = str(exc)
        return JsonResponse(body, status=503)


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health),
    path("api/", include("formacion.urls")),
]

if settings.DEBUG:
    # Solo en desarrollo: añade "Log in" a la API navegable de DRF para
    # probar los endpoints en el navegador antes de tener React.
    urlpatterns += [path("api-auth/", include("rest_framework.urls"))]

# Siempre la última: cualquier ruta que no sea de la API, del admin ni un
# estático se entrega a React (index.html), que decide qué pantalla mostrar.
urlpatterns += [
    # "(?:/|$)" para que "/admin" sin barra también quede fuera y Django lo
    # redirija a "/admin/" en lugar de mostrar la página 404 de React.
    # Grupos "(?:...)" (no capturadores) obligatorios: Django pasa cada grupo
    # "(...)" como argumento a la vista, aunque esté dentro del "(?!...)".
    re_path(r"^(?!(?:api|api-auth|admin|static)(?:/|$)).*$", index_react),
]