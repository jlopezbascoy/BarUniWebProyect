const fs = require('fs');
const https = require('https');
const path = require('path');

const imagesDir = path.join(__dirname, 'images');

// Asegurar que el directorio existe
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}

// Mapa de imágenes y sus URLs de origen (Unsplash - Licencia gratuita)
const images = [
    {
        filename: 'hero-bg.jpg',
        url: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1920&auto=format&fit=crop', // Parrilla/Carne
        desc: 'Hero Background'
    },
    {
        filename: 'about-header.jpg',
        url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1920&auto=format&fit=crop', // Interior restaurante acogedor
        desc: 'About Header'
    },
    {
        filename: 'menu-header.jpg',
        url: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1920&auto=format&fit=crop', // Plato de carne (repetimos estilo hero o buscamos otro)
        // Cambiamos a uno de comida servida:
        url: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?q=80&w=1920&auto=format&fit=crop',
        desc: 'Menu Header'
    },
    {
        filename: 'gallery-header.jpg',
        url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1920&auto=format&fit=crop', // Comida variada / ambiente
        desc: 'Gallery Header'
    },
    {
        filename: 'reservation-header.jpg',
        url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1920&auto=format&fit=crop', // Mesa reservada / copas
        desc: 'Reservation Header'
    },
    {
        filename: 'reservation-bg.jpg',
        url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1920&auto=format&fit=crop', // Fuego / Brasas (textura)
        desc: 'Reservation CTA Background'
    },
    {
        filename: 'contact-header.jpg',
        url: 'https://images.unsplash.com/photo-1596524430615-b46475ddff6e?q=80&w=1920&auto=format&fit=crop', // Entrada restaurante / ambiente exterior
        desc: 'Contact Header'
    },
    {
        filename: 'faq-header.jpg',
        url: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=1920&auto=format&fit=crop', // Chef cocinando / cocina
        desc: 'FAQ Header'
    }
];

// Función de descarga
const downloadImage = (url, filepath) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Falló la descarga: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filepath, () => {}); // Borrar archivo incompleto
            reject(err);
        });
    });
};

// Ejecutar descargas
console.log('Iniciando descarga de imágenes de alta resolución...');

(async () => {
    for (const img of images) {
        const filepath = path.join(imagesDir, img.filename);
        try {
            console.log(`Descargando ${img.desc}...`);
            await downloadImage(img.url, filepath);
            console.log(`✅ ${img.filename} completada.`);
        } catch (error) {
            console.error(`❌ Error descargando ${img.filename}:`, error.message);
        }
    }
    console.log('¡Todas las imágenes han sido actualizadas!');
})();
