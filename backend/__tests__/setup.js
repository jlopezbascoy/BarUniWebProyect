/**
 * Setup específico para tests de integración
 */

const fs = require('fs');
const path = require('path');
const { db } = require('../src/config/database');

// Inicializar schema antes de todos los tests
beforeAll((done) => {
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    db.exec(schema, (err) => {
        if (err && !err.message.includes('already exists')) {
            console.error('Error inicializando schema:', err);
            done(err);
        } else {
            done();
        }
    });
});

// Limpiar tablas antes de cada test
beforeEach((done) => {
    db.run('DELETE FROM reservas', (err) => {
        if (err) {
            done(err);
        } else {
            db.run('DELETE FROM audit_logs', (err2) => {
                done(err2);
            });
        }
    });
});
