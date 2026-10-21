"""Entrega el frontend de React (compilado con `npm run build`) desde Django.

Reparto del trabajo en producción:
- WhiteNoise sirve los ficheros de frontend/dist (JS, CSS, fuentes, favicon)
  antes de que la petición llegue a las URLs de Django. Ver WHITENOISE_ROOT.
- Esta vista devuelve index.html para cualquier otra ruta que no sea de la API
  ni del admin (/empleados/12, /cursos...). Esas rutas solo existen dentro de
  React: sin esta vista, recargar la página daría un 404 de Django.
"""

from django.conf import settings
from django.http import HttpResponse

_AVISO_SIN_COMPILAR = """<!doctype html><meta charset="utf-8">
<title>Frontend sin compilar</title>
<p>No se encuentra <code>frontend/dist/index.html</code>.
Ejecuta <code>npm run build</code> en la carpeta <code>frontend</code>
y reinicia la aplicación.</p>"""


def index_react(request):
    indice = settings.FRONTEND_DIST / "index.html"
    try:
        contenido = indice.read_bytes()
    except FileNotFoundError:
        return HttpResponse(_AVISO_SIN_COMPILAR, status=503)

    respuesta = HttpResponse(contenido, content_type="text/html; charset=utf-8")
    # index.html no debe quedarse en caché: es el que apunta a los ficheros
    # JS/CSS del build actual (con hash en el nombre). Si el navegador
    # guardara uno antiguo, tras actualizar seguiría cargando la versión vieja.
    respuesta["Cache-Control"] = "no-cache"
    return respuesta