# Bloom is a static frontend (HTML/CSS/JS) that talks to Supabase over the
# network, so a plain static web server is all we need at runtime.
FROM nginx:1.27-alpine

# Serve the project root: Site/index.html references ../js for its modules.
COPY Site/ /usr/share/nginx/html/Site/
COPY js/   /usr/share/nginx/html/js/

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -fsS http://127.0.0.1/Site/index.html >/dev/null || exit 1
