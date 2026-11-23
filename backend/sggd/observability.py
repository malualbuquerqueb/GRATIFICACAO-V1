from django.conf import settings
from django.db import connection
from django.http import JsonResponse
from django.views.decorators.http import require_GET


@require_GET
def observability_check(request):
    if not settings.DEBUG:
        return JsonResponse(
            {"detail": "Not found."},
            status=404,
        )

    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        resultado = cursor.fetchone()[0]

    return JsonResponse({"database": resultado})