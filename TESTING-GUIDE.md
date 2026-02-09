# Guía de Testing - Parrillada Alcume

## ✅ Tests Automáticos Creados

He creado **tests completos** para todo el sistema. Aquí está todo lo que necesitas saber:

### 📁 Estructura de Tests

```
backend/
├── __tests__/
│   ├── config.test.js       # Test de configuración
│   ├── reservas.test.js     # Tests de integración (endpoints)
│   ├── validators.test.js   # Tests unitarios
│   └── README.md           # Documentación
├── jest.setup.js           # Configuración de Jest
└── .env.test              # Variables de entorno
```

### 🧪 Tests Disponibles

#### 1. Tests de Configuración
```bash
cd backend
npm test -- config.test
```
Verifica que el entorno esté correctamente configurado.

#### 2. Tests de Integración (API)
```bash
cd backend
npm test -- reservas.test
```
Prueba **todos los endpoints**:
- ✅ Crear reserva
- ✅ Consultar reserva
- ✅ Cancelar reserva
- ✅ Actualizar reserva
- ✅ Verificar disponibilidad
- ✅ Obtener horarios
- ✅ Panel admin (listar reservas)

#### 3. Tests Unitarios (Validadores)
```bash
cd backend
npm test -- validators.test
```
Prueba **todas las funciones de validación**:
- ✅ Emails
- ✅ Teléfonos
- ✅ Nombres
- ✅ Fechas
- ✅ Horas
- ✅ Número de personas
- ✅ Sanitización

### 🚀 Cómo Ejecutar los Tests

#### Ejecutar todos los tests:
```bash
cd backend
npm test
```

#### Ejecutar con coverage (cobertura):
```bash
cd backend
npm test -- --coverage
```

#### Ejecutar en modo watch (auto-reload):
```bash
cd backend
npm test -- --watch
```

#### Ejecutar tests específicos:
```bash
# Solo tests de API
npm test -- reservas

# Solo validadores
npm test -- validators

# Solo configuración
npm test -- config
```

### 📊 Cobertura de Tests

Los tests cubren:
- ✅ **8 endpoints** de la API
- ✅ **7 funciones** de validación
- ✅ **Seguridad** (honeypot, sanitización)
- ✅ **Manejo de errores**
- ✅ **Base de datos**

### 🔧 Configuración

El archivo `jest.setup.js` configura automáticamente:
- Variables de entorno de testing
- Base de datos de tests separada
- Limpieza automática entre tests

### 📝 Notas Importantes

1. **Base de datos de tests**: Usa `reservas_test.db` separada
2. **Emails deshabilitados**: Los tests no envían emails reales
3. **Rate limiting**: Más permisivo en tests
4. **Logs**: Solo errores en consola durante tests

### 🐛 Si los Tests Fallan

#### Error: "Database is locked"
```bash
# Eliminar BD de tests y reintentar
rm backend/database/reservas_test.db
npm test
```

#### Error: "Cannot find module"
```bash
# Reinstalar dependencias
cd backend
rm -rf node_modules
npm install
```

#### Error: "Port already in use"
Los tests no usan puertos, van directo a la app. No debería pasar.

### 📈 Ejemplo de Salida Exitosa

```
 PASS  __tests__/config.test.js
 PASS  __tests__/validators.test.js
 PASS  __tests__/reservas.test.js

Test Suites: 3 passed, 3 total
Tests:       45 passed, 45 total
Snapshots:   0 total
Time:        3.245s
```

### 🎯 Próximos Pasos

1. **Instalar dependencias** (si no lo has hecho):
   ```bash
   cd backend
   npm install
   ```

2. **Ejecutar tests de configuración**:
   ```bash
   npm test -- config.test
   ```

3. **Ejecutar todos los tests**:
   ```bash
   npm test
   ```

4. **Ver cobertura**:
   ```bash
   npm test -- --coverage
   ```

### 💡 Consejos

- Los tests usan **SQLite en memoria** para ser rápidos
- Cada test limpia la BD antes de ejecutarse
- Puedes añadir más tests en `__tests__/`
- Los tests de integración usan `supertest` para simular HTTP

---

**¡Todo listo para ejecutar tests!** 🧪✨

Solo ejecuta `cd backend && npm test` para verificar que todo funciona correctamente.
