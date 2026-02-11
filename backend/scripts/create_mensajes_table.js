const db = require('../src/config/database').db;

const sql = `
CREATE TABLE IF NOT EXISTS mensajes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    email TEXT NOT NULL,
    telefono TEXT,
    asunto TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    fecha_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    leido BOOLEAN DEFAULT 0
);
`;

db.run(sql, (err) => {
    if (err) {
        console.error('Error al crear tabla mensajes:', err.message);
    } else {
        console.log('Tabla "mensajes" creada correctamente.');
    }
    // No cerramos la conexión aquí porque el módulo db la gestiona, 
    // pero para este script puntual forzamos salida tras un tiempo prudencial
    setTimeout(() => process.exit(0), 1000);
});
