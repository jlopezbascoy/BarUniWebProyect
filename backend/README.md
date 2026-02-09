# Backend - Parrillada Alcume

Sistema de reservas con arquitectura segura siguiendo OWASP Top 10.

## ⚠️ Seguridad OWASP Implementada

### 1. Inyección SQL (A03:2021)
- ✅ Uso de prepared statements en todas las consultas
- ✅ Validación de inputs con express-validator
- ✅ Escapado de parámetros

### 2. Pérdida de Autenticación (A07:2021)
- ✅ Códigos de reserva únicos y hasheados
- ✅ Validación de tokens de confirmación
- ✅ Rate limiting en endpoints críticos

### 3. Exposición de Datos Sensibles (A02:2021)
- ✅ Variables de entorno para secrets
- ✅ Sanitización de logs (no datos PII)
- ✅ HTTPS obligatorio en producción

### 4. XSS (A03:2021)
- ✅ Headers CSP con Helmet
- ✅ Escapado de output HTML
- ✅ Content-Type headers correctos

### 5. Control de Acceso (A01:2021)
- ✅ CORS configurado restrictivamente
- ✅ Validación de origen de requests
- ✅ No expose stack traces

### 6. Configuración de Seguridad (A05:2021)
- ✅ Helmet para headers de seguridad
- ✅ X-Content-Type-Options: nosniff
- ✅ X-Frame-Options: DENY
- ✅ HSTS en producción

## 🚀 Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Inicializar base de datos
npm run db:init

# Iniciar servidor
npm run dev
```

## 📚 API Endpoints

### POST /api/reservas
Crear una nueva reserva.

**Body:**
```json
{
  "nombre": "Juan",
  "apellidos": "Pérez García",
  "email": "juan@example.com",
  "telefono": "+34612345678",
  "fecha": "2024-02-15",
  "hora": "14:00",
  "personas": 4,
  "ubicacion": "interior",
  "ocasion": "cumpleanos",
  "alergias": "Gluten",
  "comentarios": "Mesa cerca de la ventana"
}
```

### GET /api/reservas/:codigo
Obtener detalles de una reserva (requiere código).

### DELETE /api/reservas/:codigo
Cancelar una reserva (requiere código).

## 🔒 Variables de Entorno

Ver `.env.example` para todas las opciones.

## 📊 Estructura de Carpetas

```
backend/
├── src/
│   ├── config/         # Configuración DB
│   ├── controllers/    # Lógica de negocio
│   ├── middleware/     # Seguridad y validación
│   ├── models/         # Modelos de datos
│   ├── routes/         # Rutas API
│   └── utils/          # Utilidades
├── database/           # Esquema y seeders
└── tests/             # Tests unitarios
```
