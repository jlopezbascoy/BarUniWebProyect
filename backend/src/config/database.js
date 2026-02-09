/**
 * Configuración de Base de Datos
 * SQLite con seguridad OWASP
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Asegurar que el directorio database existe
const dbDir = path.join(__dirname, '../../database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dbDir, 'reservas.db');

// Configuración de conexión
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error al conectar con la base de datos:', err.message);
        process.exit(1);
    }
    console.log('✅ Conexión exitosa a SQLite');
});

// Habilitar foreign keys (OWASP)
db.run('PRAGMA foreign_keys = ON');

// Configuración de rendimiento y concurrencia
db.run('PRAGMA journal_mode = WAL'); // Write-Ahead Logging para mejor concurrencia
db.run('PRAGMA busy_timeout = 5000'); // Esperar 5s si la DB está ocupada

// Configurar modo seguro
db.run('PRAGMA secure_delete = ON');
db.run('PRAGMA synchronous = NORMAL'); // Balance entre seguridad y rendimiento con WAL

/**
 * Ejecutar query con promesas (prepared statements OWASP)
 * @param {string} sql - SQL query con placeholders ?
 * @param {Array} params - Parámetros para el query
 * @returns {Promise} - Resultado de la query
 */
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

/**
 * Ejecutar query de inserción/actualización con promesas
 * @param {string} sql - SQL query con placeholders ?
 * @param {Array} params - Parámetros para el query
 * @returns {Promise} - Resultado con lastID y changes
 */
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({
                    lastID: this.lastID,
                    changes: this.changes
                });
            }
        });
    });
}

/**
 * Obtener un único registro
 * @param {string} sql - SQL query
 * @param {Array} params - Parámetros
 * @returns {Promise} - Primer resultado o null
 */
function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row || null);
            }
        });
    });
}

/**
 * Ejecutar múltiples queries en una transacción
 * @param {Array} queries - Array de {sql, params}
 * @returns {Promise} - Resultados
 */
async function transaction(queries) {
    return new Promise((resolve, reject) => {
        db.run('BEGIN TRANSACTION', (err) => {
            if (err) {
                reject(err);
                return;
            }
            
            const results = [];
            let index = 0;
            
            function executeNext() {
                if (index >= queries.length) {
                    // Todas las queries ejecutadas, hacer commit
                    db.run('COMMIT', (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            reject(err);
                        } else {
                            resolve(results);
                        }
                    });
                    return;
                }
                
                const q = queries[index];
                index++;
                
                db.run(q.sql, q.params, function(err) {
                    if (err) {
                        db.run('ROLLBACK');
                        reject(err);
                        return;
                    }
                    
                    results.push({
                        lastID: this.lastID,
                        changes: this.changes
                    });
                    
                    executeNext();
                });
            }
            
            executeNext();
        });
    });
}

/**
 * Cerrar conexión de base de datos
 */
function close() {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) {
                reject(err);
            } else {
                console.log('✅ Conexión a base de datos cerrada');
                resolve();
            }
        });
    });
}

module.exports = {
    db,
    query,
    run,
    get,
    transaction,
    close
};
