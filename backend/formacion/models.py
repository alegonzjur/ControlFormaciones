from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import F, Q
from django.db.models.functions import Lower
from django.utils import timezone


# --- Catálogos auxiliares ----------------------------------------------------

class Sede(models.Model):
    nombre = models.CharField("nombre", max_length=100)

    class Meta:
        verbose_name = "sede"
        verbose_name_plural = "sedes"
        ordering = ["nombre"]
        constraints = [
            # Único sin distinguir mayúsculas: "Bormujos" == "bormujos"
            models.UniqueConstraint(
                Lower("nombre"),
                name="sede_nombre_unico",
                violation_error_message="Ya existe una sede con ese nombre.",
            ),
        ]

    def __str__(self):
        return self.nombre


class TipoContrato(models.Model):
    nombre = models.CharField("nombre", max_length=100)

    class Meta:
        verbose_name = "tipo de contrato"
        verbose_name_plural = "tipos de contrato"
        ordering = ["nombre"]
        constraints = [
            models.UniqueConstraint(
                Lower("nombre"),
                name="tipocontrato_nombre_unico",
                violation_error_message="Ya existe un tipo de contrato con ese nombre.",
            ),
        ]

    def __str__(self):
        return self.nombre


# --- Entidades principales ---------------------------------------------------

class Empleado(models.Model):
    class GrupoProfesional(models.TextChoices):
        PAS = "PAS", "PAS"
        PDI = "PDI", "PDI"

    # El id autoincremental lo crea Django automáticamente.
    num_empleado = models.CharField(
        "nº de empleado",
        max_length=20,
        unique=True,
        null=True,   # NULL (no '') cuando está vacío: así varios vacíos no chocan con unique
        blank=True,
    )
    nombre = models.CharField("nombre", max_length=100)
    apellido1 = models.CharField("primer apellido", max_length=100)
    apellido2 = models.CharField("segundo apellido", max_length=100, blank=True)
    grupo_profesional = models.CharField(
        "grupo profesional",
        max_length=3,
        choices=GrupoProfesional.choices,
    )
    sede = models.ForeignKey(Sede, on_delete=models.PROTECT, related_name="empleados")
    contrato = models.ForeignKey(
        TipoContrato,
        on_delete=models.PROTECT,
        related_name="empleados",
        verbose_name="contrato",
    )
    fecha_antiguedad = models.DateField("fecha de antigüedad")
    fecha_baja = models.DateField("fecha de baja", null=True, blank=True)

    class Meta:
        verbose_name = "empleado"
        verbose_name_plural = "empleados"
        ordering = ["apellido1", "apellido2", "nombre"]
        constraints = [
            models.CheckConstraint(
                condition=Q(fecha_baja__isnull=True) | Q(fecha_baja__gte=F("fecha_antiguedad")),
                name="empleado_baja_posterior_antiguedad",
                violation_error_message="La fecha de baja no puede ser anterior a la de antigüedad.",
            ),
        ]

    def __str__(self):
        return self.nombre_completo

    @property
    def nombre_completo(self):
        """Formato 'Apellido1 Apellido2, Nombre'."""
        apellidos = " ".join(p for p in (self.apellido1, self.apellido2) if p)
        return f"{apellidos}, {self.nombre}"

    @property
    def activo(self):
        """Activo = sin fecha de baja. Se calcula; no se guarda para que no pueda contradecirse."""
        return self.fecha_baja is None


class Curso(models.Model):
    nombre = models.CharField("nombre", max_length=200)

    class Meta:
        verbose_name = "curso"
        verbose_name_plural = "cursos"
        ordering = ["nombre"]
        constraints = [
            models.UniqueConstraint(
                Lower("nombre"),
                name="curso_nombre_unico",
                violation_error_message="Ya existe un curso con ese nombre.",
            ),
        ]

    def __str__(self):
        return self.nombre


class Formacion(models.Model):
    """Un curso completado por un empleado (tabla intermedia Empleado <-> Curso)."""

    empleado = models.ForeignKey(Empleado, on_delete=models.PROTECT, related_name="formaciones")
    curso = models.ForeignKey(Curso, on_delete=models.PROTECT, related_name="formaciones")
    # Opcional: '' (no NULL) para cursos sin nivel, así la restricción de
    # duplicados también funciona en ese caso (en SQL, NULL != NULL).
    nivel = models.CharField("nivel", max_length=20, blank=True)
    horas = models.PositiveSmallIntegerField("horas", validators=[MinValueValidator(1)])
    fecha_realizacion = models.DateField("fecha de realización")

    class Meta:
        verbose_name = "formación"
        verbose_name_plural = "formaciones"
        ordering = ["-fecha_realizacion"]
        constraints = [
            models.UniqueConstraint(
                fields=["empleado", "curso", "nivel"],
                name="formacion_sin_duplicados",
                violation_error_message="Este empleado ya tiene registrado este curso con ese nivel.",
            ),
        ]

    def __str__(self):
        nivel = f" (nivel {self.nivel})" if self.nivel else ""
        return f"{self.empleado} – {self.curso}{nivel}"

    def clean(self):
        # Solo se registran cursos completados: la fecha no puede ser futura.
        # Va aquí y no como CheckConstraint porque "hoy" cambia cada día.
        if self.fecha_realizacion and self.fecha_realizacion > timezone.localdate():
            raise ValidationError(
                {"fecha_realizacion": "La fecha de realización no puede ser futura."}
            )
