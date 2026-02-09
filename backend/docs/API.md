# Documentación API - Parrillada Alcume

## Autenticación
La API es pública, excepto el panel de administración.
* **Admin:** Basic Auth (Usuario: `admin`, Password: `admin123`)

## Endpoints

### 1. Crear Reserva
`POST /api/reservas`

**Body:**
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "telefono": "612345678",
  "fecha": "2026-05-20",
  "hora": "14:00",
  "personas": 4,
  "ubicacion": "terraza" // Opcional
}
```

**Respuesta (201 Created):**
```json
{
  "success": true,
  "data": {
    "codigo": "ALC-X7B...",
    "tokenCancelacion": "uuid-..."
  }
}
```

### 2. Verificar Disponibilidad
`GET /api/reservas/disponibilidad?fecha=YYYY-MM-DD&hora=HH:MM&personas=N`

**Respuesta:**
```json
{
  "success": true,
  "data": { "disponible": true }
}
```

### 3. Consultar Reserva
`GET /api/reservas/:codigo`

### 4. Cancelar Reserva
`DELETE /api/reservas/:codigo`

**Body (Opcional):**
```json
{ "motivo": "Cambio de planes" }
```

### 5. Listar Reservas (Admin)
`GET /api/reservas/admin/lista`
* **Auth:** Required (Basic Auth)
* **Query Params:**
  * `fecha`: Filtro por fecha (YYYY-MM-DD)
  * `estado`: Filtro por estado
  * `busqueda`: Búsqueda de texto
  * `page`: Número de página (default: 1)
  * `limit`: Resultados por página (default: 10)
  * `format`: Si es `csv`, descarga archivo

### 6. Actualizar Reserva
`PUT /api/reservas/:codigo`
* **Auth:** Required (Admin o Token)
* **Body:** Campos a actualizar (nombre, fecha, hora, personas, etc.)
