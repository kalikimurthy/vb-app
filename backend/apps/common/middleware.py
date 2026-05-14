class LocalAuthCsrfBypassMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path in {"/api/auth/login/", "/api/auth/logout/"}:
            request._dont_enforce_csrf_checks = True

        return self.get_response(request)
