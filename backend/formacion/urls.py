from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("empleados", views.EmpleadoViewSet, basename="empleado")
router.register("cursos", views.CursoViewSet, basename="curso")
router.register("formaciones", views.FormacionViewSet, basename="formacion")
router.register("sedes", views.SedeViewSet, basename="sede")
router.register("contratos", views.TipoContratoViewSet, basename="contrato")

urlpatterns = [
    path("auth/csrf/", views.CsrfView.as_view()),
    path("auth/login/", views.LoginView.as_view()),
    path("auth/logout/", views.LogoutView.as_view()),
    path("auth/me/", views.MeView.as_view()),
    *router.urls,
]