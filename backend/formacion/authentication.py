from rest_framework.authentication import SessionAuthentication


class SesionAutenticacion(SessionAuthentication):
    """Sesión de Django que responde 401 (y no 403) cuando no hay sesión.

    DRF solo devuelve 401 si la clase de autenticación define una cabecera
    WWW-Authenticate. La SessionAuthentication original no la define, así que
    "no has iniciado sesión" y "no tienes permiso" llegaban ambos como 403.
    Con esto el frontend distingue sin ambigüedad:
      401 -> sin sesión o sesión caducada -> ir al login
      403 -> sesión válida pero sin permiso para esa acción

    El valor "Session" no es un esquema estándar, así que el navegador no
    muestra su ventana nativa de usuario/contraseña (eso solo ocurre con "Basic").
    """

    def authenticate_header(self, request):
        return "Session"


class SesionConCsrfSiempre(SesionAutenticacion):
    """Exige CSRF también a usuarios anónimos. Solo para la vista de login.

    SessionAuthentication solo comprueba el CSRF cuando el usuario ya ha
    iniciado sesión. En el login el usuario aún es anónimo, así que lo
    forzamos para impedir un login provocado desde otra web. Se hace aquí y no
    con el decorador csrf_protect de Django porque ese responde con una página
    HTML; así el rechazo es un 403 en JSON que React puede interpretar.
    """

    def authenticate(self, request):
        self.enforce_csrf(request)
        return super().authenticate(request)