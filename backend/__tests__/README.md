# Tests - Parrillada Alcume Backend

Este directorio contiene los tests automatizados del sistema de reservas.

## Estructura de Tests

```
__tests__/
├── reservas.test.js    # Tests de integración de endpoints
└── validators.test.js  # Tests unitarios de validadores

jest.setup.js           # Configuración inicial de tests
.env.test              # Variables de entorno para testing
```

## Ejecutar Tests

### Todos los tests
```bash
npm test
```

### Tests en modo watch (durante desarrollo)
```bash
npm test -- --watch
```

### Tests con coverage
```bash
npm test -- --coverage
```

### Tests específicos
```bash
# Solo tests de integración
npm test -- reservas

# Solo tests de validadores
npm test -- validators
```

## Tests Incluidos

### Tests de Integración (reservas.test.js)

1. **POST /api/reservas**
   - Crear reserva exitosamente
   - Rechazar datos faltantes
   - Validar email
   - Validar fecha en pasado
   - Validar número de personas
   - Validar hora disponible
   - Prevenir duplicados
   - Detectar spam (honeypot)

2. **GET /api/reservas/:codigo**
   - Obtener reserva existente
   - Retornar 404 para reserva inexistente
   - No exponer datos sensibles

3. **DELETE /api/reservas/:codigo**
   - Cancelar reserva exitosamente
   - Rechazar cancelar reserva ya cancelada

4. **GET /api/reservas/disponibilidad**
   - Verificar disponibilidad
   - Validar parámetros requeridos

5. **GET /api/reservas/horarios**
   - Obtener horarios disponibles
   - Detectar domingo sin cenas

6. **PUT /api/reservas/:codigo**
   - Actualizar reserva
   - Rechazar actualizar reserva cancelada

7. **GET /api/reservas/admin/lista**
   - Listar reservas
   - Filtrar por fecha

### Tests Unitarios (validators.test.js)

- Validación de emails
- Validación de teléfonos
- Validación de nombres
- Validación de fechas
- Validación de horas
- Validación de número de personas
- Sanitización de texto
- Validación completa de reservas

## Cobertura

Los tests cubren:
- ✅ Todos los endpoints de la API
- ✅ Todas las funciones de validación
- ✅ Seguridad (honeypot, sanitización)
- ✅ Manejo de errores

## Base de Datos de Tests

Los tests utilizan una base de datos SQLite separada (`reservas_test.db`) para no afectar los datos de desarrollo/producción.

La BD de tests se limpia automáticamente antes de cada test.

## Troubleshooting

### Error: "Cannot find module"
Asegúrate de haber instalado las dependencias:
```bash
npm install
```

### Error: "Database is locked"
Cierra cualquier otro proceso que esté usando la base de datos de tests.

### Tests fallan por timeout
Aumenta el timeout en `jest.setup.js`:
```javascript
jest.setTimeout(15000);
```
