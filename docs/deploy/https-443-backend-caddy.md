# HTTPS (puerto 443) para el backend con Caddy — `smca.mydatavibe.com`

Este documento explica cómo exponer el backend (que corre en Docker en el puerto **3000**) a Internet por **HTTPS en 443**, usando **Caddy** como reverse proxy con certificados automáticos de Let's Encrypt.

También cubre el error típico: **abrir el 443 en Security Group pero seguir viendo `Connection refused`**, y por qué ocurre.

---

## 1. Síntoma típico y causa

### Síntoma

Desde tu PC:

- `curl https://smca.mydatavibe.com/...` → `Connection refused`
- En CloudFront (cuando `air.mydatavibe.com` proxya `/api/*` al backend): `504 Gateway Timeout`

### Causa

Abrir el **Security Group** permite *llegar* a la instancia, pero **si no hay ningún proceso escuchando en `:443`**, el sistema operativo responde:

- **Connection refused** (no hay listener)

En tu caso, `ss` mostraba listeners en `:3000` (docker-proxy) pero no en `:443`.

---

## 2. Prerrequisitos

### 2.1 DNS

En Hostinger (DNS):

- `smca.mydatavibe.com` debe ser un registro **A** hacia la **Elastic IP** de tu EC2.

### 2.2 Security Group (Inbound)

Recomendado (mínimo):

- **80/tcp**: `0.0.0.0/0` (Let's Encrypt HTTP-01 challenge y redirección)
- **443/tcp**: `0.0.0.0/0`
- **22/tcp**: solo tu IP (SSH)

---

## 3. Verificar el estado actual (EC2)

En la instancia:

```bash
cd /opt/smca/IoT_Sistema_Monitoreo_Calidad_Aire
docker compose ps
sudo ss -tlnp | grep -E ':443|:80|:3000'
```

Esperado antes de Caddy:

- `:3000` escuchando (docker-proxy).
- `:443` no aparece.

---

## 4. Lo importante: Caddy usa `/etc/caddy/Caddyfile`

Si instalaste Caddy por `apt`, su servicio systemd típicamente ejecuta:

- `ExecStart=/usr/bin/caddy run --config /etc/caddy/Caddyfile`

Conclusión:

- **No sirve** editar un `Caddyfile` dentro del repo (por ejemplo `/opt/smca/.../Caddyfile`) si el servicio está leyendo **`/etc/caddy/Caddyfile`**.

---

## 5. Configurar Caddy para `smca.mydatavibe.com` → `localhost:3000`

Edita el archivo que usa el servicio:

```bash
sudo nano /etc/caddy/Caddyfile
```

Contenido recomendado (reemplaza lo default `:80 { file_server }`):

```caddy
smca.mydatavibe.com {
  reverse_proxy localhost:3000
}
```

Luego:

```bash
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl restart caddy
```

### 5.1 Verificar que ahora escucha en 80 y 443

```bash
sudo ss -tlnp | grep -E ':443|:80'
```

Debe aparecer Caddy escuchando en `:80` y `:443` (al menos luego de que pueda emitir el certificado).

---

## 6. Probar desde afuera (tu PC)

Una vez reiniciado:

```bash
curl -vk https://smca.mydatavibe.com/api/login
```

Qué mirar:

- Ya **no** debe decir `Connection refused`.
- Si el backend responde 404/405, está bien: significa que **hay TLS y ruta**; luego ajustas el método/endpoint.

---

## 7. Si 443 sigue sin aparecer: qué revisar

1. **DNS mal apuntado** (A record no es la Elastic IP).
2. **Security Group sin 80**: Caddy no puede completar el desafío HTTP-01 y no llega a emitir cert.
3. **Caddyfile incorrecto** o el servicio sigue leyendo el default.
4. Logs de Caddy:

```bash
sudo journalctl -u caddy -n 200 --no-pager
```

Busca errores de ACME/Let's Encrypt, permisos o bind.

---

## 8. Relación con el frontend `air.mydatavibe.com` (CloudFront)

En CloudFront, el behavior `/api/*` suele usar como origen `smca.mydatavibe.com` con **HTTPS:443**.

Si `smca.mydatavibe.com:443` no responde, CloudFront devuelve **504** en:

- `https://air.mydatavibe.com/api/login`

Por eso es clave que **primero** funcione:

- `https://smca.mydatavibe.com/api/...`

antes de debuggear CloudFront o el frontend.

