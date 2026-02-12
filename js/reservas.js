/**
 * PARRILLADA ALCUME - Sistema de Reservas
 * Cliente API para conectar con backend
 */

// Configuración de API
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001/api'
    : 'https://api.parrilladaalcume.com/api'; // Cambiar por tu dominio real

document.addEventListener('DOMContentLoaded', function() {
    initReservationForm();
    initDateRestrictions();
    loadHorariosDisponibles();
});

/**
 * Inicializar formulario de reservas
 */
function initReservationForm() {
    const form = document.getElementById('reservationForm');
    const successMessage = document.getElementById('reservationSuccess');
    const codigoReserva = document.getElementById('codigoReserva');
    
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Mostrar loading
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
            submitBtn.disabled = true;
            
            try {
                // Recoger datos del formulario
                const formData = new FormData(form);
                const data = {};
                formData.forEach((value, key) => {
                    if (key !== 'politica') { // No enviar checkbox de política
                        data[key] = value;
                    }
                });
                
                // Enviar al backend
                const response = await fetch(`${API_URL}/reservas`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    // Mostrar mensaje de éxito
                    form.style.display = 'none';
                    successMessage.classList.add('active');
                    codigoReserva.textContent = result.data.codigo;
                    
                    // Guardar en localStorage como backup
                    const reservaLocal = {
                        ...data,
                        codigo: result.data.codigo,
                        tokenCancelacion: result.data.tokenCancelacion || null, // Guardar token para cancelar
                        fechaReserva: new Date().toISOString(),
                        estado: 'confirmada'
                    };
                    let reservas = JSON.parse(localStorage.getItem('parrillada_reservas') || '[]');
                    reservas.push(reservaLocal);
                    localStorage.setItem('parrillada_reservas', JSON.stringify(reservas));
                    
                    showNotification('¡Reserva realizada con éxito! Revisa tu email.', 'success');
                    
                    // Scroll al mensaje de éxito
                    successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    // Mostrar errores de validación
                    if (result.errors && result.errors.length > 0) {
                        const errorMessages = result.errors.map(e => e.message).join('\n');
                        showNotification(errorMessages, 'error');
                    } else {
                        showNotification(result.message || 'Error al crear la reserva', 'error');
                    }
                }
                
            } catch (error) {
                console.error('Error:', error);
                showNotification('Error de conexión. Inténtalo de nuevo.', 'error');
            } finally {
                // Restaurar botón
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
}

/**
 * Cargar horarios disponibles desde el backend
 */
async function loadHorariosDisponibles() {
    const fechaInput = document.getElementById('fecha');
    const horaSelect = document.getElementById('hora');
    const personasSelect = document.getElementById('personas');
    
    // Deshabilitar selector de hora inicialmente hasta que se seleccione fecha y personas
    if (horaSelect) {
        // Guardar estado original
        if (!fechaInput.value || !personasSelect.value) {
             horaSelect.disabled = true;
             // Mensaje helper
             const defaultOption = horaSelect.querySelector('option[value=""]');
             if (defaultOption) {
                 defaultOption.dataset.originalText = defaultOption.textContent;
                 defaultOption.textContent = "Selecciona fecha y personas";
             }
        }
    }

    // Función para cargar horarios
    const fetchHorarios = async () => {
        const fecha = fechaInput.value;
        const personas = personasSelect.value;
        const defaultOption = horaSelect.querySelector('option[value=""]');
        
        if (!fecha || !personas) {
            horaSelect.disabled = true;
            if (defaultOption) defaultOption.textContent = "Selecciona fecha y personas";
            return;
        }

        // Habilitar temporalmente para mostrar carga (opcional) o mantener deshabilitado
        horaSelect.disabled = true;
        if (defaultOption) defaultOption.textContent = "Cargando disponibilidad...";
            
        try {
            const response = await fetch(`${API_URL}/reservas/horarios?fecha=${fecha}&personas=${personas}`);
            const result = await response.json();
            
            if (response.ok && result.success) {
                horaSelect.disabled = false;
                if (defaultOption) defaultOption.textContent = defaultOption.dataset.originalText || "Selecciona hora";

                // Actualizar select de horas
                const horarios = result.data.horarios;
                const optgroups = horaSelect.querySelectorAll('optgroup');
                
                optgroups.forEach(group => {
                    // No usamos el turno del grupo para evitar errores de coincidencia con backend
                    const options = group.querySelectorAll('option');
                    
                    options.forEach(option => {
                        const hora = option.value;
                        // Buscar la info de esta hora en la respuesta del backend
                        const horarioInfo = horarios.find(h => h.hora === hora);
                        
                        // Resetear estado base (limpiar texto anterior)
                        option.textContent = hora;
                        
                        if (horarioInfo) {
                            // Si el backend devuelve info para esta hora, aplicar disponibilidad
                            if (!horarioInfo.disponible) {
                                option.disabled = true;
                                option.textContent += ' (Completo)';
                            } else {
                                option.disabled = false;
                            }
                        } else {
                            // Si el backend NO devuelve info para esta hora (ej. Cenas en domingo),
                            // asumimos que no está disponible y la deshabilitamos por seguridad.
                            option.disabled = true;
                        }
                    });
                });

                // Si la hora seleccionada ya no está disponible, limpiar selección
                if (horaSelect.value) {
                    const selectedOption = horaSelect.querySelector(`option[value="${horaSelect.value}"]`);
                    if (selectedOption && selectedOption.disabled) {
                        horaSelect.value = "";
                    }
                }
            }
        } catch (error) {
            console.error('Error al cargar horarios:', error);
            showNotification('Error al cargar disponibilidad. Inténtalo de nuevo.', 'error');
            horaSelect.disabled = true;
        }
    };

    if (fechaInput && horaSelect && personasSelect) {
        // Escuchar cambios en fecha y personas
        fechaInput.addEventListener('change', fetchHorarios);
        personasSelect.addEventListener('change', fetchHorarios);
    }
}

/**
 * Verificar disponibilidad
 */
async function checkDisponibilidad(fecha, hora, personas) {
    try {
        const response = await fetch(
            `${API_URL}/reservas/disponibilidad?fecha=${fecha}&hora=${hora}&personas=${personas}`
        );
        const result = await response.json();
        return result.success && result.data.disponible;
    } catch (error) {
        console.error('Error al verificar disponibilidad:', error);
        return false;
    }
}

/**
 * Restricciones de fecha
 */
function initDateRestrictions() {
    const fechaInput = document.getElementById('fecha');
    
    if (fechaInput) {
        // Establecer fecha mínima (hoy)
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        fechaInput.min = `${yyyy}-${mm}-${dd}`;
        
        // Establecer fecha máxima (30 días en el futuro)
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 30);
        const maxYyyy = maxDate.getFullYear();
        const maxMm = String(maxDate.getMonth() + 1).padStart(2, '0');
        const maxDd = String(maxDate.getDate()).padStart(2, '0');
        fechaInput.max = `${maxYyyy}-${maxMm}-${maxDd}`;
        
        // Validar día de la semana
        fechaInput.addEventListener('change', function() {
            const selectedDate = new Date(this.value);
            const dayOfWeek = selectedDate.getDay();
            
            const horaSelect = document.getElementById('hora');
            if (horaSelect) {
                const options = horaSelect.querySelectorAll('option');
                options.forEach(option => {
                    if (dayOfWeek === 0) {
                        if (option.parentElement && option.parentElement.label === 'Cenas') {
                            option.disabled = true;
                        }
                    }
                });
            }
        });
    }
}

/**
 * Consultar reserva existente
 */
async function consultarReserva(codigo) {
    try {
        const response = await fetch(`${API_URL}/reservas/${codigo}`);
        const result = await response.json();
        
        if (response.ok && result.success) {
            return result.data;
        } else {
            showNotification('Reserva no encontrada', 'error');
            return null;
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error de conexión', 'error');
        return null;
    }
}

/**
 * Cancelar reserva
 */
async function cancelarReserva(codigo, motivo = '') {
    try {
        const response = await fetch(`${API_URL}/reservas/${codigo}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ motivo })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification('Reserva cancelada exitosamente', 'success');
            return true;
        } else {
            showNotification(result.message || 'Error al cancelar', 'error');
            return false;
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error de conexión', 'error');
        return false;
    }
}

// Exportar funciones para uso global
window.consultarReserva = consultarReserva;
window.cancelarReserva = cancelarReserva;

/**
 * Buscar reserva por código desde la UI
 */
async function buscarReserva() {
    const codigoInput = document.getElementById('codigoConsulta');
    const codigo = codigoInput.value.trim();
    
    if (!codigo) {
        showNotification('Por favor, introduce un código de reserva', 'error');
        return;
    }
    
    const reserva = await consultarReserva(codigo);
    
    if (reserva) {
        mostrarDetallesReserva(reserva);
    }
}

/**
 * Mostrar detalles de la reserva en la UI
 */
function mostrarDetallesReserva(reserva) {
    const infoDiv = document.getElementById('reservaInfo');
    const detallesDiv = document.getElementById('reservaDetalles');
    
    detallesDiv.innerHTML = `
        <p><strong>Nombre:</strong> ${reserva.nombre} ${reserva.apellidos}</p>
        <p><strong>Fecha:</strong> ${formatearFecha(reserva.fecha)}</p>
        <p><strong>Hora:</strong> ${reserva.hora}</p>
        <p><strong>Personas:</strong> ${reserva.personas}</p>
        <p><strong>Email:</strong> ${reserva.email}</p>
        <p><strong>Teléfono:</strong> ${reserva.telefono}</p>
        <p><strong>Estado:</strong> <span class="estado-${reserva.estado}">${reserva.estado.toUpperCase()}</span></p>
        ${reserva.ubicacion && reserva.ubicacion !== 'indiferente' ? `<p><strong>Ubicación:</strong> ${reserva.ubicacion}</p>` : ''}
        ${reserva.ocasion ? `<p><strong>Ocasión:</strong> ${reserva.ocasion}</p>` : ''}
    `;
    
    infoDiv.style.display = 'block';
    document.getElementById('cancelacionForm').style.display = 'none';
    
    // Guardar código para cancelación
    infoDiv.dataset.codigo = reserva.codigo;
}

/**
 * Formatear fecha para mostrar
 */
function formatearFecha(fechaStr) {
    const fecha = new Date(fechaStr);
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return fecha.toLocaleDateString('es-ES', opciones);
}

/**
 * Mostrar formulario de cancelación
 */
function mostrarCancelacion() {
    document.getElementById('reservaInfo').style.display = 'none';
    document.getElementById('cancelacionForm').style.display = 'block';
}

/**
 * Ocultar formulario de cancelación
 */
function ocultarCancelacion() {
    document.getElementById('cancelacionForm').style.display = 'none';
    document.getElementById('reservaInfo').style.display = 'block';
}

/**
 * Confirmar cancelación de reserva
 */
async function confirmarCancelacion() {
    const infoDiv = document.getElementById('reservaInfo');
    const codigo = infoDiv.dataset.codigo;
    const motivo = document.getElementById('motivoCancelacion').value.trim();
    
    // Referencia al botón para añadir efecto de carga
    const btnConfirmar = document.querySelector('#cancelacionForm .btn-danger');
    const textoOriginal = btnConfirmar.innerHTML;
    
    if (!codigo) {
        showNotification('Error: No se encontró el código de reserva', 'error');
        return;
    }
    
    // Feedback visual de carga (más profesional que un alert)
    btnConfirmar.disabled = true;
    btnConfirmar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelando...';
    
    try {
        const exito = await cancelarReserva(codigo, motivo);
        
        if (exito) {
            document.getElementById('cancelacionForm').style.display = 'none';
            document.getElementById('reservaInfo').style.display = 'none';
            document.getElementById('codigoConsulta').value = '';
        }
    } finally {
        // Restaurar botón (por si hay error o para futuras acciones)
        if (btnConfirmar) {
            btnConfirmar.disabled = false;
            btnConfirmar.innerHTML = textoOriginal;
        }
    }
}

// Hacer funciones disponibles globalmente para los onclick
window.buscarReserva = buscarReserva;
window.mostrarDetallesReserva = mostrarDetallesReserva;
window.mostrarCancelacion = mostrarCancelacion;
window.ocultarCancelacion = ocultarCancelacion;
window.confirmarCancelacion = confirmarCancelacion;
