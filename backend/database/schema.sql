-- ==========================================
-- ESQUEMA DE BASE DE DATOS - PARRILLADA ALCUME
-- SQLite con prácticas OWASP
-- ==========================================

-- Habilitar foreign keys
PRAGMA foreign_keys = ON;

-- Tabla de Reservas
CREATE TABLE IF NOT EXISTS reservas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Datos del cliente (encriptados/hash donde sea necesario)
    nombre TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    email TEXT NOT NULL,
    telefono TEXT NOT NULL,
    
    -- Datos de la reserva
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    personas INTEGER NOT NULL CHECK(personas >= 1 AND personas <= 20),
    ubicacion TEXT CHECK(ubicacion IN ('interior', 'terraza', 'indiferente')),
    ocasion TEXT,
    alergias TEXT,
    comentarios TEXT,
    
    -- Seguridad y tracking
    codigo TEXT UNIQUE NOT NULL,              -- Código único de reserva
    codigo_hash TEXT NOT NULL,                -- Hash del código para verificación
    token_cancelacion TEXT UNIQUE,            -- Token para cancelar sin código
    ip_address TEXT,                          -- IP del solicitante (para seguridad)
    user_agent TEXT,                          -- User agent (para seguridad)
    
    -- Estado y timestamps
    estado TEXT DEFAULT 'confirmada' CHECK(estado IN ('confirmada', 'cancelada', 'completada', 'no_show')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    cancelled_at DATETIME,
    cancel_reason TEXT,
    
    -- Recordatorios
    reminder_sent BOOLEAN DEFAULT 0,
    reminder_sent_at DATETIME,
    
    -- Índices para performance
    CONSTRAINT idx_fecha_hora UNIQUE(fecha, hora, email)
);

-- Índices optimizados
CREATE INDEX IF NOT EXISTS idx_reservas_fecha ON reservas(fecha);
CREATE INDEX IF NOT EXISTS idx_reservas_email ON reservas(email);
CREATE INDEX IF NOT EXISTS idx_reservas_codigo ON reservas(codigo);
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON reservas(estado);
CREATE INDEX IF NOT EXISTS idx_reservas_created ON reservas(created_at);

-- Tabla de logs de auditoría (OWASP A09:2021 - Logging)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tabla TEXT NOT NULL,
    registro_id INTEGER,
    accion TEXT NOT NULL CHECK(accion IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT', 'CANCEL')),
    datos_anteriores TEXT,                    -- JSON con datos antes del cambio
    datos_nuevos TEXT,                        -- JSON con datos después del cambio
    ip_address TEXT,
    user_agent TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de intentos de reserva (protección contra abuso)
CREATE TABLE IF NOT EXISTS intentos_reserva (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    email TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    exitoso BOOLEAN DEFAULT 0,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_intentos_ip ON intentos_reserva(ip_address);
CREATE INDEX IF NOT EXISTS idx_intentos_timestamp ON intentos_reserva(timestamp);

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER IF NOT EXISTS update_reservas_timestamp 
AFTER UPDATE ON reservas
BEGIN
    UPDATE reservas SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger para logging de auditoría en INSERT
CREATE TRIGGER IF NOT EXISTS audit_reservas_insert
AFTER INSERT ON reservas
BEGIN
    INSERT INTO audit_logs (tabla, registro_id, accion, datos_nuevos, ip_address, user_agent)
    VALUES (
        'reservas',
        NEW.id,
        'INSERT',
        json_object(
            'id', NEW.id,
            'fecha', NEW.fecha,
            'hora', NEW.hora,
            'personas', NEW.personas,
            'estado', NEW.estado
        ),
        NEW.ip_address,
        NEW.user_agent
    );
END;

-- Trigger para logging de auditoría en UPDATE (solo estado)
CREATE TRIGGER IF NOT EXISTS audit_reservas_update
AFTER UPDATE ON reservas
WHEN OLD.estado != NEW.estado
BEGIN
    INSERT INTO audit_logs (tabla, registro_id, accion, datos_anteriores, datos_nuevos, ip_address)
    VALUES (
        'reservas',
        NEW.id,
        'UPDATE',
        json_object('estado', OLD.estado),
        json_object('estado', NEW.estado),
        NEW.ip_address
    );
END;

-- Trigger para logging de cancelaciones
CREATE TRIGGER IF NOT EXISTS audit_reservas_cancel
AFTER UPDATE ON reservas
WHEN NEW.estado = 'cancelada' AND OLD.estado != 'cancelada'
BEGIN
    INSERT INTO audit_logs (tabla, registro_id, accion, datos_anteriores, datos_nuevos, ip_address)
    VALUES (
        'reservas',
        NEW.id,
        'CANCEL',
        json_object('estado', OLD.estado, 'cancelled_at', OLD.cancelled_at),
        json_object('estado', NEW.estado, 'cancelled_at', NEW.cancelled_at, 'cancel_reason', NEW.cancel_reason),
        NEW.ip_address
    );
END;

-- Vista para reservas activas (sin datos sensibles completos)
CREATE VIEW IF NOT EXISTS vw_reservas_activas AS
SELECT 
    id,
    fecha,
    hora,
    personas,
    ubicacion,
    ocasion,
    estado,
    created_at,
    codigo
FROM reservas
WHERE estado = 'confirmada'
AND fecha >= date('now');

-- Vista para estadísticas (anónima)
CREATE VIEW IF NOT EXISTS vw_estadisticas_reservas AS
SELECT 
    date(created_at) as fecha,
    COUNT(*) as total_reservas,
    SUM(CASE WHEN estado = 'confirmada' THEN 1 ELSE 0 END) as confirmadas,
    SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
    AVG(personas) as promedio_personas
FROM reservas
GROUP BY date(created_at);
