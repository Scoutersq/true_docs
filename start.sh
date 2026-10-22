#!/bin/sh
set -e

node /app/backend/server.js &
backend_pid=$!

nginx -g 'daemon off;' &
nginx_pid=$!

trap 'kill "$backend_pid" "$nginx_pid" 2>/dev/null || true' INT TERM

while kill -0 "$backend_pid" 2>/dev/null && kill -0 "$nginx_pid" 2>/dev/null
do
    sleep 1
done

kill "$backend_pid" "$nginx_pid" 2>/dev/null || true
wait "$backend_pid" 2>/dev/null || true
wait "$nginx_pid" 2>/dev/null || true
exit 1
