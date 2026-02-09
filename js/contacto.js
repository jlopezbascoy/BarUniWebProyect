/**
 * PARRILLADA ALCUME - Formulario de Contacto
 * Gestión del formulario de contacto
 */

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
            
            // Guardar mensaje en localStorage (simulación)
            const mensaje = {
                ...data,
                fechaEnvio: new Date().toISOString(),
                estado: 'pendiente'
            };
            
            let mensajes = JSON.parse(localStorage.getItem('parrillada_mensajes') || '[]');
            mensajes.push(mensaje);
            localStorage.setItem('parrillada_mensajes', JSON.stringify(mensajes));
            
            // Mostrar mensaje de éxito
            showNotification('¡Mensaje enviado con éxito! Te responderemos lo antes posible.', 'success');
            
            // Resetear formulario
            form.reset();
            
            // En un entorno real, aquí se enviaría el mensaje al servidor
            console.log('Mensaje enviado:', mensaje);
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
