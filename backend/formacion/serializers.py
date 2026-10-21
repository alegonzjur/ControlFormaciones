from copy import copy

from django.core.exceptions import NON_FIELD_ERRORS
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.serializers import as_serializer_error
from rest_framework.settings import api_settings

from .models import Curso, Empleado, Formacion, Sede, TipoContrato


class ValidacionModeloMixin:
    """Ejecuta las validaciones del modelo (full_clean) desde DRF.

    DRF NO llama a model.full_clean(). Sin este mixin:
    - Formacion.clean() (fecha no futura) nunca se ejecutaría.
    - Las restricciones con Lower() (curso "EXCEL" duplicado) solo las
      detectaría la base de datos, con un error 500 en lugar de un 400.
    """

    def validate(self, attrs):
        attrs = super().validate(attrs)
        # Copia para no modificar la instancia real si la validación falla
        instancia = copy(self.instance) if self.instance else self.Meta.model()
        for campo, valor in attrs.items():
            setattr(instancia, campo, valor)
        try:
            instancia.full_clean()
        except DjangoValidationError as exc:
            errores = as_serializer_error(exc)
            # Django usa "__all__" para errores generales y DRF usa
            # "non_field_errors": unificamos para que React maneje una sola clave.
            if NON_FIELD_ERRORS in errores:
                errores[api_settings.NON_FIELD_ERRORS_KEY] = errores.pop(NON_FIELD_ERRORS)
            raise serializers.ValidationError(errores)
        return attrs


# --- Catálogos auxiliares ----------------------------------------------------

class SedeSerializer(ValidacionModeloMixin, serializers.ModelSerializer):
    class Meta:
        model = Sede
        fields = ["id", "nombre"]


class TipoContratoSerializer(ValidacionModeloMixin, serializers.ModelSerializer):
    class Meta:
        model = TipoContrato
        fields = ["id", "nombre"]


# --- Formación vista desde cada lado (solo lectura, anidada) -----------------

class FormacionDeEmpleadoSerializer(serializers.ModelSerializer):
    """Una fila de la ficha del empleado: qué curso hizo."""

    curso_nombre = serializers.CharField(source="curso.nombre", read_only=True)

    class Meta:
        model = Formacion
        fields = ["id", "curso", "curso_nombre", "nivel", "horas", "fecha_realizacion"]


class FormacionDeCursoSerializer(serializers.ModelSerializer):
    """Una fila de la ficha del curso: quién lo hizo."""

    empleado_nombre = serializers.CharField(source="empleado.nombre_completo", read_only=True)
    empleado_activo = serializers.BooleanField(source="empleado.activo", read_only=True)

    class Meta:
        model = Formacion
        fields = [
            "id",
            "empleado",
            "empleado_nombre",
            "empleado_activo",
            "nivel",
            "horas",
            "fecha_realizacion",
        ]


# --- Formación (alta / edición) ----------------------------------------------

class FormacionSerializer(ValidacionModeloMixin, serializers.ModelSerializer):
    class Meta:
        model = Formacion
        fields = ["id", "empleado", "curso", "nivel", "horas", "fecha_realizacion"]


# --- Empleados -----------------------------------------------------------------

class EmpleadoResumenSerializer(serializers.ModelSerializer):
    """Tarjeta resumen del listado/búsqueda."""

    nombre_completo = serializers.CharField(read_only=True)
    sede = serializers.CharField(source="sede.nombre", read_only=True)
    contrato = serializers.CharField(source="contrato.nombre", read_only=True)
    activo = serializers.BooleanField(read_only=True)
    # Calculados en la consulta (annotate) de la vista
    num_cursos = serializers.IntegerField(read_only=True)
    total_horas = serializers.IntegerField(read_only=True)

    class Meta:
        model = Empleado
        fields = [
            "id",
            "num_empleado",
            "nombre_completo",
            "grupo_profesional",
            "sede",
            "contrato",
            "fecha_antiguedad",
            "fecha_baja",
            "activo",
            "num_cursos",
            "total_horas",
        ]


class EmpleadoSerializer(ValidacionModeloMixin, serializers.ModelSerializer):
    """Ficha completa: lectura del detalle y alta/edición del empleado.

    Para escribir, sede y contrato se envían como id. Para leer, se añaden
    sus nombres y la lista de formaciones (de solo lectura: los cursos se
    añaden o quitan con /api/formaciones/).
    """

    nombre_completo = serializers.CharField(read_only=True)
    sede_nombre = serializers.CharField(source="sede.nombre", read_only=True)
    contrato_nombre = serializers.CharField(source="contrato.nombre", read_only=True)
    activo = serializers.BooleanField(read_only=True)
    formaciones = FormacionDeEmpleadoSerializer(many=True, read_only=True)

    class Meta:
        model = Empleado
        fields = [
            "id",
            "num_empleado",
            "nombre",
            "apellido1",
            "apellido2",
            "nombre_completo",
            "grupo_profesional",
            "sede",
            "sede_nombre",
            "contrato",
            "contrato_nombre",
            "fecha_antiguedad",
            "fecha_baja",
            "activo",
            "formaciones",
        ]


# --- Cursos --------------------------------------------------------------------

class CursoResumenSerializer(serializers.ModelSerializer):
    num_empleados = serializers.IntegerField(read_only=True)

    class Meta:
        model = Curso
        fields = ["id", "nombre", "num_empleados"]


class CursoSerializer(ValidacionModeloMixin, serializers.ModelSerializer):
    formaciones = FormacionDeCursoSerializer(many=True, read_only=True)

    class Meta:
        model = Curso
        fields = ["id", "nombre", "formaciones"]