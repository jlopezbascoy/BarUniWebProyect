/**
 * Script de Migración - Agregar campos de recordatorios
 * Ejecutar después de actualizar el schema
 */

const { db, run } = require('../src/config/database');

async function migrate() {
    console.log('🔄 Ejecutando migraciones...\n');
    
    try {
        // Verificar si las columnas ya existen
        const tableInfo = await new Promise((resolve, reject) => {
            db.all("PRAGMA table_info(reservas)", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        const columns = tableInfo.map(col => col.name);
        
        // Agregar columna reminder_sent si no existe
        if (!columns.includes('reminder_sent')) {
            await run('ALTER TABLE reservas ADD COLUMN reminder_sent BOOLEAN DEFAULT 0');
            console.log('✅ Columna reminder_sent agregada');
        } else {
            console.log('ℹ️  Columna reminder_sent ya existe');
        }
        
        // Agregar columna reminder_sent_at si no existe
        if (!columns.includes('reminder_sent_at')) {
            await run('ALTER TABLE reservas ADD COLUMN reminder_sent_at DATETIME');
            console.log('✅ Columna reminder_sent_at agregada');
        } else {
            console.log('ℹ️  Columna reminder_sent_at ya existe');
        }
        
        console.log('\n✅ Migraciones completadas exitosamente');
        
    } catch (error) {
        console.error('\n❌ Error en migración:', error.message);
        process.exit(1);
    }
    
    process.exit(0);
}

migrate();
