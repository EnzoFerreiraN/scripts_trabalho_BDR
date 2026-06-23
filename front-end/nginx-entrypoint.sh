#!/bin/sh
set -e

# Extrai o servidor DNS do container para que o nginx possa resolver
# o hostname interno do backend (backend.railway.internal) em runtime.
RAW_NS=$(awk '/^nameserver/{print $2; exit}' /etc/resolv.conf)

# Nginx exige IPv6 entre colchetes: [fd12::10]. IPv4 fica sem colchetes.
if echo "$RAW_NS" | grep -q ':'; then
    export NGINX_RESOLVER="[${RAW_NS}]"
else
    export NGINX_RESOLVER="$RAW_NS"
fi

echo "[nginx-entrypoint] DNS resolver configurado: $NGINX_RESOLVER"
echo "[nginx-entrypoint] Backend upstream: http://${BACKEND_HOST:-backend.railway.internal}:${BACKEND_PORT:-8000}"

exec /docker-entrypoint.sh "$@"
