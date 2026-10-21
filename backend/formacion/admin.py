"""Admin de Django: sirve para validar el modelo con datos de prueba antes
de construir la API y React. Refleja las dos "pestañas" de la app:
- Ficha de empleado -> sus cursos (inline editable).
- Ficha de curso    -> sus empleados (inline editable).
"""

from django.contrib import admin

from .models import Curso, Empleado, Formacion, Sede, TipoContrato


# --- Inlines: la tabla intermedia vista desde cada lado ----------------------

class FormacionDeEmpleadoInline(admin.TabularInline):
    model = Formacion
    fk_name = "empleado"
    extra = 0
    fields = ["curso", "nivel", "horas", "fecha_realizacion"]
    autocomplete_fields = ["curso"]


class FormacionDeCursoInline(admin.TabularInline):
    model = Formacion
    fk_name = "curso"
    extra = 0
    fields = ["empleado", "nivel", "horas", "fecha_realizacion"]
    autocomplete_fields = ["empleado"]


# --- Filtro: activo / de baja (se deduce de fecha_baja) ----------------------

class ActivoFilter(admin.SimpleListFilter):
    title = "situación"
    parameter_name = "situacion"

    def lookups(self, request, model_admin):
        return [("activo", "Activos"), ("baja", "De baja")]

    def queryset(self, request, queryset):
        if self.value() == "activo":
            return queryset.filter(fecha_baja__isnull=True)
        if self.value() == "baja":
            return queryset.filter(fecha_baja__isnull=False)
        return queryset


# --- Modelos ------------------------------------------------------------------

@admin.register(Empleado)
class EmpleadoAdmin(admin.ModelAdmin):
    list_display = [
        "nombre_completo",
        "num_empleado",
        "grupo_profesional",
        "sede",
        "contrato",
        "fecha_antiguedad",
        "es_activo",
    ]
    list_filter = [ActivoFilter, "grupo_profesional", "sede", "contrato"]
    search_fields = [
        "nombre__unaccent",
        "apellido1__unaccent",
        "apellido2__unaccent",
        "num_empleado",
    ]
    list_select_related = ["sede", "contrato"]
    inlines = [FormacionDeEmpleadoInline]

    @admin.display(description="nombre", ordering="apellido1")
    def nombre_completo(self, obj):
        return obj.nombre_completo

    @admin.display(description="activo", boolean=True)
    def es_activo(self, obj):
        return obj.activo


@admin.register(Curso)
class CursoAdmin(admin.ModelAdmin):
    list_display = ["nombre"]
    search_fields = ["nombre__unaccent"]
    inlines = [FormacionDeCursoInline]


@admin.register(Formacion)
class FormacionAdmin(admin.ModelAdmin):
    list_display = ["empleado", "curso", "nivel", "horas", "fecha_realizacion"]
    list_filter = ["curso", "nivel"]
    search_fields = [
        "empleado__nombre__unaccent",
        "empleado__apellido1__unaccent",
        "empleado__apellido2__unaccent",
        "curso__nombre__unaccent",
    ]
    autocomplete_fields = ["empleado", "curso"]
    list_select_related = ["empleado", "curso"]
    date_hierarchy = "fecha_realizacion"


@admin.register(Sede)
class SedeAdmin(admin.ModelAdmin):
    search_fields = ["nombre__unaccent"]


@admin.register(TipoContrato)
class TipoContratoAdmin(admin.ModelAdmin):
    search_fields = ["nombre__unaccent"]