/**
 * PARRILLADA ALCUME - FAQ
 * Funcionalidad de acordeón para preguntas frecuentes
 */

document.addEventListener('DOMContentLoaded', function() {
    initFAQ();
});

/**
 * Inicializar acordeón de FAQ
 */
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', function() {
            // Cerrar otros items abiertos
            const isActive = item.classList.contains('active');
            
            // Cerrar todos
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
            });
            
            // Abrir el clickeado si no estaba abierto
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
    
    // Abrir el primer item por defecto
    if (faqItems.length > 0) {
        faqItems[0].classList.add('active');
    }
}

/**
 * Búsqueda en FAQ
 */
function searchFAQ(query) {
    const faqItems = document.querySelectorAll('.faq-item');
    const searchTerm = query.toLowerCase();
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question').textContent.toLowerCase();
        const answer = item.querySelector('.faq-answer-content').textContent.toLowerCase();
        
        if (question.includes(searchTerm) || answer.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}
