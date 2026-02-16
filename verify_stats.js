const Reserva = require('./backend/src/models/Reserva');
const { db } = require('./backend/src/config/database');

// Mockear el logger para evitar errores si no está configurado igual
// o simplemente dejar que use el logger real si funciona.
// Asumiendo que el logger está bien.

async function testStats() {
    try {
        const hoy = new Date().toISOString().split('T')[0];
        console.log(`Verificando estadísticas para hoy: ${hoy}`);
        
        const stats = await Reserva.obtenerEstadisticasDia(hoy);
        console.log('Stats obtenidos:', stats);
        
        // Verificar cuántas reservas confirmadas hay realmente
        const confirmadas = await new Promise((resolve, reject) => {
            db.get(`SELECT count(*) as count FROM reservas WHERE fecha = ? AND estado = 'confirmada'`, [hoy], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });
        
        console.log('Verificación directa DB:', confirmadas);

    } catch (error) {
        console.error('Error:', error);
    }
}

testStats();
