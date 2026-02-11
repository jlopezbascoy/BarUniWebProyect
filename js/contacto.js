/**
 * PARRILLADA ALCUME - Formulario de Contacto
 * Gestión del formulario de contacto
 */

// Configuración de API
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001/api'
    : 'https://api.parrilladaalcume.com/api'; // Cambiar por tu dominio real

document.addEventListener('DOMContentLoaded', function() {
    initContactForm();
    initHoursStatus();
});

/**
 * Inicializar formulario de contacto
 */
function initContactForm() {
    const form = document.getElementById('contactForm');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validar formulario
            if (!validateForm(form)) {
                showNotification('Por favor, completa todos los campos obligatorios correctamente.', 'error');
                return;
            }
            
            // Recoger datos del formulario
            const formData = new FormData(form);
            const data = {};
            formData.forEach((value, key) => {
                data[key] = value;
            });
            
            // Mostrar loading
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            submitBtn.disabled = true;
            
            // Enviar mensaje al backend
            fetch(`${API_URL}/contacto`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    // Éxito
                    showNotification('¡Mensaje enviado con éxito! Te responderemos lo antes posible.', 'success');
                    form.reset();
                    
                    // Guardar copia local por seguridad
                    const mensaje = { ...data, fecha: new Date().toISOString(), status: 'sent' };
                    let mensajes = JSON.parse(localStorage.getItem('parrillada_mensajes') || '[]');
                    mensajes.push(mensaje);
                    localStorage.setItem('parrillada_mensajes', JSON.stringify(mensajes));
                    
                } else {
                    // Error del servidor
                    if (result.errors) {
                        const errorMsg = result.errors.map(e => e.msg).join('\n');
                        showNotification(errorMsg, 'error');
                    } else {
                        showNotification(result.message || 'Error al enviar mensaje', 'error');
                    }
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error de conexión. Inténtalo de nuevo más tarde.', 'error');
            })
            .finally(() => {
                // Restaurar botón
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            });
            
            // No mostrar mensaje de éxito falso aquí
            // showNotification('¡Mensaje enviado con éxito! Te responderemos lo antes posible.', 'success');
            // form.reset();
        });
    }
}

/**
 * Actualizar estado de apertura según horario
 */
function initHoursStatus() {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const now = new Date();
    const currentDay = days[now.getDay()];
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinutes;
    
    // Horarios en minutos desde medianoche
    const horarios = {
        monday: [{ start: 13 * 60, end: 16 * 60 }, { start: 20 * 60, end: 23 * 60 }],
        tuesday: [{ start: 13 * 60, end: 16 * 60 }, { start: 20 * 60, end: 23 * 60 }],
        wednesday: [{ start: 13 * 60, end: 16 * 60 }, { start: 20 * 60, end: 23 * 60 }],
        thursday: [{ start: 13 * 60, end: 16 * 60 }, { start: 20 * 60, end: 23 * 60 }],
        friday: [{ start: 13 * 60, end: 16 * 60 }, { start: 20 * 60, end: 24 * 60 }],
        saturday: [{ start: 13 * 60, end: 16 * 60 }, { start: 20 * 60, end: 24 * 60 }],
        sunday: [{ start: 13 * 60, end: 16 * 60 }]
    };
    
    // Actualizar tarjetas de horario
    days.forEach((day, index) => {
        const card = document.getElementById(`day-${day}`);
        if (card) {
            const statusElement = card.querySelector('.status');
            
            // Destacar día actual
            if (day === currentDay) {
                card.classList.add('highlight');
                
                // Verificar si está abierto
                const horarioDia = horarios[day];
                let isOpen = false;
                
                if (horarioDia) {
                    isOpen = horarioDia.some(turno => {
                        return currentTime >= turno.start && currentTime < turno.end;
                    });
                }
                
                if (statusElement) {
                    if (isOpen) {
                        statusElement.textContent = 'Abierto ahora';
                        statusElement.classList.add('open');
                        statusElement.classList.remove('closed');
                    } else {
                        statusElement.textContent = 'Cerrado ahora';
                        statusElement.classList.add('closed');
                        statusElement.classList.remove('open');
                    }
                }
            }
        }
    });
}
