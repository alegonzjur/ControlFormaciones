from django.contrib.auth import authenticate, login, logout
from django.db.models import Count, Prefetch, ProtectedError, Sum
from django.db.models.functions import Coalesce
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status, viewsets
from rest_framework.exceptions import APIException
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .authentication import SesionConCsrfSiempre
from .models import Curso, Empleado, Formacion, Sede, TipoContrato
from .permissions import PermisosPorModelo
from .serializers import (
    CursoResumenSerializer,
    CursoSerializer,
    EmpleadoResumenSerializer,
    EmpleadoSerializer,
    FormacionSerializer,
    SedeSerializer,
    TipoContratoSerializer,
)


# --- Utilidades comunes --------------------------------------------------------

class Conflicto(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "No se puede borrar porque tiene registros asociados."
    default_code = "conflicto"


class BaseViewSet(viewsets.ModelViewSet):
    """Permisos por modelo + borrado protegido convertido en 409.

    Sin capturar ProtectedError, borrar un curso con alumnos daría un 500.
    """

    permission_classes = [PermisosPorModelo]
    mensaje_borrado_protegido = Conflicto.default_detail

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except ProtectedError:
            raise Conflicto(self.mensaje_borrado_protegido)


# --- Empleados -----------------------------------------------------------------

class EmpleadoViewSet(BaseViewSet):
    """
    list:     /api/empleados/?search=texto&activo=true|false
    retrieve: /api/empleados/{id}/  (ficha completa con sus cursos)
    """

    search_fields = ["nombre", "apellido1", "apellido2", "num_empleado"]
    ordering_fields = ["apellido1", "fecha_antiguedad", "num_cursos", "total_horas"]
    mensaje_borrado_protegido = (
        "No se puede borrar un empleado con formaciones registradas. "
        "Borra antes sus formaciones o registra su fecha de baja."
    )

    def get_serializer_class(self):
        return EmpleadoResumenSerializer if self.action == "list" else EmpleadoSerializer

    def get_queryset(self):
        qs = Empleado.objects.select_related("sede", "contrato")

        if self.action == "list":
            qs = qs.annotate(
                num_cursos=Count("formaciones"),
                total_horas=Coalesce(Sum("formaciones__horas"), 0),
                # Orden explícito: con annotate+Count/Sum Django ignora el
                # Meta.ordering, y sin orden la paginación podría repetir o
                # saltarse empleados entre páginas. "id" desempata homónimos.
            ).order_by("apellido1", "apellido2", "nombre", "id")
            activo = self.request.query_params.get("activo")
            if activo == "true":
                qs = qs.filter(fecha_baja__isnull=True)
            elif activo == "false":
                qs = qs.filter(fecha_baja__isnull=False)
        else:
            qs = qs.prefetch_related(
                Prefetch(
                    "formaciones",
                    queryset=Formacion.objects.select_related("curso").order_by(
                        "-fecha_realizacion"
                    ),
                )
            )
        return qs


# --- Cursos --------------------------------------------------------------------

class CursoViewSet(BaseViewSet):
    """
    list:     /api/cursos/?search=texto
    retrieve: /api/cursos/{id}/  (ficha con todos sus empleados y niveles)
    """

    search_fields = ["nombre"]
    ordering_fields = ["nombre", "num_empleados"]
    mensaje_borrado_protegido = (
        "No se puede borrar un curso que tiene empleados registrados. "
        "Borra antes esas formaciones."
    )

    def get_serializer_class(self):
        return CursoResumenSerializer if self.action == "list" else CursoSerializer

    def get_queryset(self):
        qs = Curso.objects.all()
        if self.action == "list":
            qs = qs.annotate(
                num_empleados=Count("formaciones__empleado", distinct=True)
            ).order_by("nombre", "id")  # mismo motivo que en EmpleadoViewSet
        else:
            qs = qs.prefetch_related(
                Prefetch(
                    "formaciones",
                    queryset=Formacion.objects.select_related("empleado").order_by(
                        "nivel", "empleado__apellido1", "empleado__apellido2", "empleado__nombre"
                    ),
                )
            )
        return qs


# --- Formaciones (alta/edición/borrado de un curso de un empleado) ----------

class FormacionViewSet(BaseViewSet):
    serializer_class = FormacionSerializer
    queryset = Formacion.objects.select_related("empleado", "curso")


# --- Catálogos para desplegables (sin paginar) -------------------------------

class SedeViewSet(BaseViewSet):
    serializer_class = SedeSerializer
    queryset = Sede.objects.all()
    pagination_class = None
    mensaje_borrado_protegido = "No se puede borrar una sede con empleados asignados."


class TipoContratoViewSet(BaseViewSet):
    serializer_class = TipoContratoSerializer
    queryset = TipoContrato.objects.all()
    pagination_class = None
    mensaje_borrado_protegido = "No se puede borrar un tipo de contrato con empleados asignados."


# --- Autenticación (sesión de Django + CSRF) ---------------------------------

def datos_usuario(user):
    return {
        "username": user.username,
        "nombre": user.get_full_name() or user.username,
        "grupos": list(user.groups.values_list("name", flat=True)),
        # El frontend lo usa para mostrar/ocultar botones de edición.
        # La seguridad real la imponen los permisos en cada endpoint.
        "puede_editar": user.has_perm("formacion.change_empleado"),
    }


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    """GET: deja la cookie cf_csrftoken en el navegador antes del login."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"detail": "ok"})


class LoginView(APIView):
    """POST {username, password} con la cabecera X-CSRFToken."""

    authentication_classes = [SesionConCsrfSiempre]
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        user = authenticate(
            request,
            username=request.data.get("username", ""),
            password=request.data.get("password", ""),
        )
        if user is None:
            return Response(
                {"detail": "Usuario o contraseña incorrectos."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        login(request, user)
        return Response(datos_usuario(user))


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """GET: usuario actual. Devuelve 401 si no hay sesión iniciada."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(datos_usuario(request.user))