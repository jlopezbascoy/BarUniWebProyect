const fs = require('fs');
const https = require('https');
const path = require('path');

const imagesDir = path.join(__dirname, 'images');

// Crear directorio si no existe
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
    console.log('📁 Carpeta "images" creada.');
}

// Lista de imágenes faltantes según los logs
const images = [
    { name: 'hero-bg.jpg', text: 'HERO BG (1920x1080)', width: 1920, height: 1080, color: '2c3e50' },
    { name: 'reservation-bg.jpg', text: 'RESERVATION BG (1920x1080)', width: 1920, height: 1080, color: '34495e' },
    { name: 'reservation-header.jpg', text: 'RESERVATION HEADER (1920x600)', width: 1920, height: 600, color: 'e74c3c' },
    { name: 'gallery-header.jpg', text: 'GALLERY HEADER (1920x600)', width: 1920, height: 600, color: '8e44ad' },
    { name: 'menu-header.jpg', text: 'MENU HEADER (1920x600)', width: 1920, height: 600, color: 'f39c12' },
    { name: 'about-header.jpg', text: 'ABOUT HEADER (1920x600)', width: 1920, height: 600, color: '27ae60' },
    { name: 'favicon.ico', text: 'FAV', width: 64, height: 64, color: '8B0000' } // Fake favicon como imagen
];

// Función para descargar imagen
const downloadImage = (img) => {
    const url = `https://placehold.co/${img.width}x${img.height}/${img.color}/FFFFFF/png?text=${encodeURIComponent(img.text)}`;
    const filePath = path.join(imagesDir, img.name);
    
    // Si el archivo ya existe y tiene tamaño > 0, saltar
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
        console.log(`⏭️  ${img.name} ya existe. Saltando.`);
        return;
    }

    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
        if (response.statusCode !== 200) {
            console.error(`❌ Error descargando ${img.name}: Status ${response.statusCode}`);
            return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
            file.close();
            console.log(`✅ ${img.name} descargada correctamente.`);
        });
    }).on('error', (err) => {
        fs.unlink(filePath, () => {}); // Borrar archivo corrupto
        console.error(`❌ Error descargando ${img.name}: ${err.message}`);
    });
};

console.log('⬇️  Iniciando descarga de imágenes placeholder...');
images.forEach(img => downloadImage(img));
