
/**
 * Configuración de Mesas del Restaurante
 * Define el inventario físico y las combinaciones posibles.
 */

// Inventario Físico (Mesas Reales)
const mesasFisicas = [
    // Mesas pequeñas (2 personas)
    { id: 'm1', capacidad: 2, ubicacion: 'interior' },
    { id: 'm2', capacidad: 2, ubicacion: 'interior' },
    { id: 'm3', capacidad: 2, ubicacion: 'interior' },
    { id: 'm4', capacidad: 2, ubicacion: 'terraza' },

    // Mesas medianas (4 personas)
    { id: 'm5', capacidad: 4, ubicacion: 'interior' },
    { id: 'm6', capacidad: 4, ubicacion: 'interior' },
    { id: 'm7', capacidad: 4, ubicacion: 'interior' },
    { id: 'm8', capacidad: 4, ubicacion: 'terraza' },
    { id: 'm9', capacidad: 4, ubicacion: 'terraza' },
    { id: 'm10', capacidad: 4, ubicacion: 'interior' },

    // Mesas grandes (6 personas)
    { id: 'm11', capacidad: 6, ubicacion: 'interior' },
    { id: 'm12', capacidad: 6, ubicacion: 'interior' },

    // Mesa muy grande (8 personas)
    { id: 'm13', capacidad: 8, ubicacion: 'interior' }
];

// Combinaciones (Mesas Virtuales)
// Define qué mesas se pueden juntar para crear capacidades mayores
const combinaciones = [
    // Combinar dos mesas de 2 para hacer una de 4 (Interior)
    { id: 'c1', componentes: ['m1', 'm2'], capacidad: 4, ubicacion: 'interior' },
    
    // Combinar una mesa de 2 con una de 4 para hacer una de 6 (Interior)
    { id: 'c2', componentes: ['m3', 'm5'], capacidad: 6, ubicacion: 'interior' },

    // Combinar dos mesas de 4 para hacer una de 8 (Terraza)
    { id: 'c3', componentes: ['m8', 'm9'], capacidad: 8, ubicacion: 'terraza' },
    
    // Combinar dos mesas de 4 para hacer una de 8 (Interior)
    { id: 'c4', componentes: ['m6', 'm7'], capacidad: 8, ubicacion: 'interior' },

    // Combinar mesa de 6 + mesa de 2 para grupo muy grande (10)
    { id: 'c5', componentes: ['m11', 'm3'], capacidad: 8, ubicacion: 'interior' }
];

module.exports = {
    mesasFisicas,
    combinaciones
};
