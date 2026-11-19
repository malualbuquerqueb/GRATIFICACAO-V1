
from django.urls import path

from . import views_auth

urlpatterns = [
    path("csrf/", views_auth.csrf, name="auth-csrf"),
    path("login/", views_auth.login_view, name="auth-login"),
    path("logout/", views_auth.logout_view, name="auth-logout"),
    path("me/", views_auth.me, name="auth-me"),
]
