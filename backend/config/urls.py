from django.conf import settings
from django.contrib import admin
from django.db import connection
from django.http import JsonResponse
from django.urls import path


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
]