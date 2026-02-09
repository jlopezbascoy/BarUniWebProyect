/**
 * Script para añadir índices de rendimiento a la base de datos
 */
const path = require('path');
const { db, close } = require('../src/config/database');

console.log('🔄 Añadiendo índices de rendimiento...');

const indices = [
    'CREATE INDEX IF NOT EXISTS idx_reservas_fecha ON reservas(fecha)',
    'CREATE INDEX IF NOT EXISTS idx_reservas_email ON reservas(email)',
    'CREATE INDEX IF NOT EXISTS idx_reservas_codigo ON reservas(codigo)',
    'CREATE INDEX IF NOT EXISTS idx_reservas_estado ON reservas(estado)'
];

db.serialize(() => {
    indices.forEach(sql => {
        db.run(sql, (err) => {
            if (err) {
                console.error(`❌ Error ejecutando: ${sql}`, err.message);
            } else {
                console.log(`✅ Índice creado/verificado: ${sql.split(' ON ')[1]}`);
            }
        });
    });
});

// Cerrar conexión después de un segundo
setTimeout(() => {
    close();
    console.log('✨ Optimización completada');
}, 1000);
