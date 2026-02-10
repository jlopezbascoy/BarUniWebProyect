const sqlite3 = require('./backend/node_modules/sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'backend/database/reservas.db');
console.log(`Intentando conectar a: ${dbPath}`);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('ERROR CONECTANDO:', err.message);
        process.exit(1);
    }
    console.log('CONEXIÓN EXITOSA.');
});

db.serialize(() => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
        if (err) {
            console.error('ERROR CONSULTANDO:', err.message);
        } else {
            console.log('TABLAS ENCONTRADAS:', tables);
        }
        db.close();
    });
});
