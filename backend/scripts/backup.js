/**
 * Script de Backup Automático de Base de Datos
 * Crea copias de seguridad periódicas de la base de datos SQLite
 * Versión corregida - Funciona sin conexión a BD activa
 */

const fs = require('fs');
const path = require('path');

// Configuración
const BACKUP_DIR = path.join(__dirname, '../backups');
const DB_PATH = path.join(__dirname, '../database/reservas.db');
const MAX_BACKUPS = 10; // Número máximo de backups a mantener

/**
 * Asegurar que el directorio de backups existe
 */
function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
        console.log('📁 Directorio de backups creado');
    }
}

/**
 * Generar nombre de archivo de backup con timestamp
 */
function generateBackupFilename() {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `reservas-backup-${timestamp}.db`;
}

/**
 * Crear backup de la base de datos
 */
async function createBackup() {
    try {
        ensureBackupDir();
        
        const backupFilename = generateBackupFilename();
        const backupPath = path.join(BACKUP_DIR, backupFilename);
        
        // Verificar que la base de datos existe
        if (!fs.existsSync(DB_PATH)) {
            throw new Error(`Base de datos no encontrada en: ${DB_PATH}`);
        }
        
        // Crear backup usando fs.copyFile
        fs.copyFileSync(DB_PATH, backupPath);
        
        // Verificar que se creó correctamente
        if (!fs.existsSync(backupPath)) {
            throw new Error('El archivo de backup no se creó correctamente');
        }
        
        // Obtener estadísticas del backup
        const stats = fs.statSync(backupPath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        
        console.log(`✅ Backup creado: ${backupFilename} (${sizeKB} KB)`);
        console.log(`📍 Ubicación: ${backupPath}`);
        
        return backupPath;
        
    } catch (error) {
        console.error('❌ Error al crear backup:', error.message);
        throw error;
    }
}

/**
 * Limpiar backups antiguos
 * Mantiene solo los MAX_BACKUPS más recientes
 */
function cleanOldBackups() {
    try {
        ensureBackupDir();
        
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.startsWith('reservas-backup-') && file.endsWith('.db'))
            .map(file => ({
                name: file,
                path: path.join(BACKUP_DIR, file),
                mtime: fs.statSync(path.join(BACKUP_DIR, file)).mtime
            }))
            .sort((a, b) => b.mtime - a.mtime); // Más recientes primero
        
        if (files.length > MAX_BACKUPS) {
            const filesToDelete = files.slice(MAX_BACKUPS);
            
            for (const file of filesToDelete) {
                try {
                    fs.unlinkSync(file.path);
                    console.log(`🗑️  Eliminado backup antiguo: ${file.name}`);
                } catch (err) {
                    console.error(`⚠️  Error al eliminar ${file.name}:`, err.message);
                }
            }
        }
        
        console.log(`📊 Backups actuales: ${Math.min(files.length, MAX_BACKUPS)}/${MAX_BACKUPS}`);
        
    } catch (error) {
        console.error('❌ Error al limpiar backups:', error.message);
    }
}

/**
 * Listar todos los backups disponibles
 */
function listBackups() {
    try {
        ensureBackupDir();
        
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.startsWith('reservas-backup-') && file.endsWith('.db'))
            .map(file => {
                const stats = fs.statSync(path.join(BACKUP_DIR, file));
                return {
                    filename: file,
                    created: stats.mtime,
                    size: (stats.size / 1024).toFixed(2) + ' KB'
                };
            })
            .sort((a, b) => b.created - a.created);
        
        return files;
        
    } catch (error) {
        console.error('❌ Error al listar backups:', error.message);
        return [];
    }
}

/**
 * Restaurar base de datos desde un backup
 */
async function restoreBackup(backupFilename) {
    try {
        const backupPath = path.join(BACKUP_DIR, backupFilename);
        
        if (!fs.existsSync(backupPath)) {
            throw new Error(`Backup no encontrado: ${backupFilename}`);
        }
        
        // Crear backup de seguridad antes de restaurar
        const safetyBackup = path.join(BACKUP_DIR, `safety-backup-${Date.now()}.db`);
        if (fs.existsSync(DB_PATH)) {
            fs.copyFileSync(DB_PATH, safetyBackup);
            console.log(`📋 Backup de seguridad creado: ${path.basename(safetyBackup)}`);
        }
        
        // Restaurar
        fs.copyFileSync(backupPath, DB_PATH);
        
        console.log(`✅ Base de datos restaurada desde: ${backupFilename}`);
        
    } catch (error) {
        console.error('❌ Error al restaurar backup:', error.message);
        throw error;
    }
}

/**
 * Función principal
 */
async function main() {
    const command = process.argv[2];
    
    switch (command) {
        case 'create':
        case undefined:
            // Crear backup
            try {
                await createBackup();
                cleanOldBackups();
            } catch (error) {
                process.exit(1);
            }
            break;
            
        case 'list':
            // Listar backups
            const backups = listBackups();
            if (backups.length === 0) {
                console.log('📂 No hay backups disponibles');
            } else {
                console.log('\n📋 Backups disponibles:\n');
                backups.forEach((backup, index) => {
                    console.log(`${index + 1}. ${backup.filename}`);
                    console.log(`   Fecha: ${backup.created.toLocaleString('es-ES')}`);
                    console.log(`   Tamaño: ${backup.size}\n`);
                });
            }
            break;
            
        case 'restore':
            // Restaurar backup
            const backupName = process.argv[3];
            if (!backupName) {
                console.error('❌ Debes especificar el nombre del backup a restaurar');
                console.log('Uso: npm run backup -- restore <nombre-del-backup>');
                process.exit(1);
            }
            try {
                await restoreBackup(backupName);
            } catch (error) {
                process.exit(1);
            }
            break;
            
        case 'clean':
            // Limpiar backups antiguos
            cleanOldBackups();
            break;
            
        default:
            console.log('\n🗄️  Utilidad de Backup - Parrillada Alcume\n');
            console.log('Uso: npm run backup -- [comando]\n');
            console.log('Comandos:');
            console.log('  create        Crear un nuevo backup (por defecto)');
            console.log('  list          Listar todos los backups disponibles');
            console.log('  restore <file> Restaurar la base de datos desde un backup');
            console.log('  clean         Eliminar backups antiguos\n');
            console.log('Ejemplos:');
            console.log('  npm run backup                    # Crear backup');
            console.log('  npm run backup -- list            # Listar backups');
            console.log('  npm run backup -- restore <file>  # Restaurar backup\n');
    }
    
    process.exit(0);
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main();
}

module.exports = {
    createBackup,
    listBackups,
    restoreBackup,
    cleanOldBackups
};
