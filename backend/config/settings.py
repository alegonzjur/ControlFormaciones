"""
Configuración de Django para control-formacion.

Todo lo que depende del entorno (secretos, base de datos, DEBUG, hosts) se lee
del fichero .env de la raíz del repositorio. El código es idéntico en
desarrollo y en producción; solo cambia el .env.
"""

import re
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent  # .../backend
REPO_DIR = BASE_DIR.parent                          # raíz del repositorio

env = environ.Env(
    DJANGO_DEBUG=(bool, False),
    DJANGO_ALLOWED_HOSTS=(list, []),
    DJANGO_CSRF_TRUSTED_ORIGINS=(list, []),
)
environ.Env.read_env(REPO_DIR / ".env")


# --- Seguridad ---------------------------------------------------------------

SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env("DJANGO_DEBUG")
ALLOWED_HOSTS = env("DJANGO_ALLOWED_HOSTS")
CSRF_TRUSTED_ORIGINS = env("DJANGO_CSRF_TRUSTED_ORIGINS")

# Las cookies se asocian al host, no al puerto. Con los nombres por defecto
# (sessionid / csrftoken), esta app y cualquier otra app Django servida desde
# el mismo host (localhost en desarrollo, el servidor en producción) se
# sobrescribirían las cookies mutuamente.
SESSION_COOKIE_NAME = "cf_sessionid"
CSRF_COOKIE_NAME = "cf_csrftoken"  # el frontend leerá el token de esta cookie


# --- Aplicaciones ------------------------------------------------------------

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Funciones propias de PostgreSQL. Aquí la usamos para el lookup
    # "__unaccent" (búsquedas que ignoran tildes).
    "django.contrib.postgres",
    # Terceros
    "rest_framework",
    # Propias
    "formacion",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # WhiteNoise sirve los estáticos en producción (Waitress no lo hace).
    # Debe ir justo después de SecurityMiddleware.
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# --- Base de datos -----------------------------------------------------------

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME"),
        "USER": env("DB_USER"),
        "PASSWORD": env("DB_PASSWORD"),
        "HOST": env("DB_HOST"),
        "PORT": env("DB_PORT"),
        # Reutiliza conexiones durante 60 s en lugar de abrir una por petición
        "CONN_MAX_AGE": 60,
    }
}


# --- Autenticación -----------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# --- Internacionalización ----------------------------------------------------

LANGUAGE_CODE = "es-es"
TIME_ZONE = "Europe/Madrid"
USE_I18N = True
USE_TZ = True


# --- Ficheros estáticos ------------------------------------------------------

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"  # destino de collectstatic en producción

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        # Comprime y versiona los estáticos para que el navegador los cachee
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}


# --- Frontend compilado (React) -----------------------------------------------

# Resultado de `npm run build`. En producción Django sirve la app entera
# (API + frontend) desde un solo puerto; en desarrollo se sigue usando Vite.
FRONTEND_DIST = REPO_DIR / "frontend" / "dist"

# WhiteNoise sirve en la raíz del sitio los ficheros de esta carpeta
# (/assets/index-AbC123.js, /favicon.svg...). Solo si existe: en desarrollo,
# sin build, evita el aviso "No directory at ...".
WHITENOISE_ROOT = FRONTEND_DIST if FRONTEND_DIST.is_dir() else None

_HASH_DJANGO = re.compile(r"\.[0-9a-f]{12}\.\w+$")


def _es_inmutable(path, url):
    """Ficheros con hash en el nombre: el navegador los guarda un año.

    Si su contenido cambia, cambia el nombre, así que nunca quedan obsoletos.
    - Vite pone el hash en todo lo que genera en /assets/ (index-BuTdScDf.js).
    - collectstatic de Django usa 12 caracteres hex (base.abcdef123456.css).
    """
    return url.startswith("/assets/") or bool(_HASH_DJANGO.search(url))


WHITENOISE_IMMUTABLE_FILE_TEST = _es_inmutable

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# --- Django REST Framework ---------------------------------------------------

REST_FRAMEWORK = {
    # Sesión de Django + CSRF: más simple y seguro que JWT para una app interna
    # Variante propia que responde 401 (no 403) cuando no hay sesión
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "formacion.authentication.SesionAutenticacion",
    ],
    # Por defecto, todo endpoint exige estar autenticado
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    # Búsqueda (?search=) y orden (?ordering=) en los listados
    "DEFAULT_FILTER_BACKENDS": [
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    # Listados paginados de 25 en 25 (?page=2)
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
    # Máximo 10 intentos de login por minuto y dirección IP
    "DEFAULT_THROTTLE_RATES": {
        "login": "10/minute",
    },
}


# --- Sesión --------------------------------------------------------------------

# La sesión caduca a las 8 horas (una jornada) en lugar de las 2 semanas
# que Django usa por defecto.
SESSION_COOKIE_AGE = 8 * 60 * 60


# --- Registro (logs) -------------------------------------------------------------

# Por defecto, con DEBUG=False Django NO muestra en consola los errores 500:
# solo intenta enviarlos por correo a ADMINS (que no tenemos). Sin esto, un
# fallo en producción no dejaría rastro. Todo va a la salida estándar, que
# run.py muestra en consola y que NSSM guardará en fichero.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "simple": {
            "format": "{asctime} {levelname} [{name}] {message}",
            "style": "{",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "consola": {"class": "logging.StreamHandler", "formatter": "simple"},
    },
    "root": {"handlers": ["consola"], "level": "INFO"},
    "loggers": {
        # Solo errores 500, con traceback completo. Con WARNING también saldría
        # cada 401/403/404 normal (p. ej. al abrir la app sin sesión): ruido.
        "django.request": {"handlers": ["consola"], "level": "ERROR", "propagate": False},
        # El servidor de desarrollo ya registra cada petición por su cuenta
        "django.server": {"handlers": ["consola"], "level": "INFO", "propagate": False},
    },
}