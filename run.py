"""
Arranca Control de formación completo (API + frontend) con Waitress.

    python run.py                 # puerto de APP_PORT en .env (por defecto 8002)
    python run.py --port 8003     # otro puerto puntualmente

Un único proceso sirve todo desde el mismo puerto:
    /api/...     API de Django REST Framework
    /admin/...   admin de Django
    /static/...  estáticos del admin (collectstatic), vía WhiteNoise
    /assets/...  JS/CSS/fuentes de React (npm run build), vía WhiteNoise
    resto        index.html de React, que muestra la pantalla que toque

Este fichero es el que ejecutará el servicio de NSSM. Antes de arrancar
comprueba que todo está preparado y, si falta algo, dice exactamente qué
comando ejecutar, en lugar de arrancar y fallar después con errores 500.

Preparación (después de cada actualización del código):
    cd frontend  ->  npm ci  y  npm run build
    cd backend   ->  python manage.py migrate
                     python manage.py collectstatic --noinput
"""

import argparse
import logging
import os
import socket
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
BACKEND = RAIZ / "backend"

# Permite importar "config" y "formacion" aunque run.py esté en la raíz
sys.path.insert(0, str(BACKEND))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

log = logging.getLogger("run")


def fallo(mensaje):
    log.error(mensaje)
    sys.exit(1)


def leer_argumentos():
    # Valores por defecto desde .env (django-environ ya está instalado)
    import environ

    env = environ.Env()
    environ.Env.read_env(RAIZ / ".env")

    p = argparse.ArgumentParser(description="Arranca Control de formación con Waitress.")
    p.add_argument("--host", default=env("APP_HOST", default="0.0.0.0"),
                   help="Interfaz de escucha. 0.0.0.0 = accesible desde la red (por defecto: APP_HOST o 0.0.0.0)")
    p.add_argument("--port", type=int, default=env.int("APP_PORT", default=8002),
                   help="Puerto (por defecto: APP_PORT o 8002)")
    p.add_argument("--threads", type=int, default=env.int("APP_THREADS", default=8),
                   help="Hilos de Waitress = peticiones simultáneas (por defecto: APP_THREADS o 8)")
    return p.parse_args()


def comprobar_puerto(host, puerto):
    """Falla con un mensaje claro si el puerto ya lo usa otro programa.

    Prueba el puerto igual que lo abrirá Waitress: en Linux/macOS con
    SO_REUSEADDR, porque sin él un reinicio rápido daría un falso "ocupado"
    (las conexiones anteriores siguen unos segundos en TIME_WAIT). En Windows
    sin esa opción, que allí permitiría compartir un puerto ya en uso.
    """
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        if os.name == "posix":
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind((host, puerto))
        except OSError:
            fallo(
                f"El puerto {puerto} ya está en uso por otro programa.\n"
                f"  Averigua cuál con:  netstat -ano | findstr :{puerto}\n"
                f"  O usa otro puerto:  APP_PORT en .env, o  python run.py --port OTRO"
            )


def comprobar_preparacion():
    """Verifica build de React, estáticos, base de datos y migraciones."""
    from django.conf import settings
    from django.db import DEFAULT_DB_ALIAS, connections
    from django.db.migrations.executor import MigrationExecutor
    from django.db.utils import OperationalError

    if settings.DEBUG:
        log.warning(
            "DJANGO_DEBUG=True: muestra detalles internos si hay errores. "
            "Úsalo solo para pruebas; en el servidor pon DJANGO_DEBUG=False en .env."
        )

    if not (settings.FRONTEND_DIST / "index.html").is_file():
        fallo(
            "Falta el frontend compilado (frontend/dist/index.html).\n"
            "  Ejecuta en la carpeta frontend:  npm run build"
        )

    if not (Path(settings.STATIC_ROOT) / "staticfiles.json").is_file():
        fallo(
            "Faltan los estáticos de Django (admin). Sin ellos el admin da error 500.\n"
            "  Ejecuta en la carpeta backend:  python manage.py collectstatic --noinput"
        )

    conexion = connections[DEFAULT_DB_ALIAS]
    try:
        ejecutor = MigrationExecutor(conexion)
    except OperationalError as exc:
        fallo(
            "No se puede conectar con PostgreSQL. Revisa que el servicio esté arrancado "
            "y los valores DB_* del .env.\n"
            f"  Detalle: {exc}"
        )
    pendientes = ejecutor.migration_plan(ejecutor.loader.graph.leaf_nodes())
    if pendientes:
        nombres = ", ".join(f"{m.app_label}.{m.name}" for m, _ in pendientes)
        fallo(
            f"Hay migraciones sin aplicar: {nombres}\n"
            "  Ejecuta en la carpeta backend:  python manage.py migrate"
        )
    conexion.close()  # Waitress abrirá sus propias conexiones por hilo


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    args = leer_argumentos()

    comprobar_puerto(args.host, args.port)

    import django

    django.setup()
    comprobar_preparacion()

    from waitress import serve

    from config.wsgi import application

    direccion = "localhost" if args.host in ("0.0.0.0", "127.0.0.1") else args.host
    log.info(f"Control de formación disponible en http://{direccion}:{args.port}/  (Ctrl+C para detener)")
    serve(
        application,
        host=args.host,
        port=args.port,
        threads=args.threads,
        ident="control-formacion",  # cabecera Server, en lugar de "waitress"
    )


if __name__ == "__main__":
    main()