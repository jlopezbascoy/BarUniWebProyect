/**
 * Script de inicialización de base de datos
 * Ejecuta el schema.sql
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { db, close } = require('../src/config/database');

async function initDatabase() {
    try {
        console.log('🔄 Inicializando base de datos...');
        
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Ejecutar schema
        db.exec(schema, (err) => {
            if (err) {
                if (err.message.includes('already exists')) {
                    console.log('ℹ️  Las tablas ya existen');
                } else {
                    console.error('❌ Error:', err.message);
                    process.exit(1);
                }
            } else {
                console.log('✅ Base de datos inicializada correctamente');
            }
        });
        
        // Esperar un momento y cerrar
        setTimeout(async () => {
            await close();
            process.exit(0);
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

initDatabase();
