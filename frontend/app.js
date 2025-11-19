/* app.js - Versión corregida y mejorada
   - Arregla: 'onst' -> 'const'
   - Elimina duplicados (generateQRCode)
   - Corrige paso del event en botones de reserva (lista + popup)
   - Mejora cierre de modales (click en overlay)
   - Validaciones y defensas adicionales
*/

/* BASE API */
const apiBase = 'http://localhost:3000/api';

// Variables globales
let map = null;
let mapPreview = null;
let markers = []; // { marker, station }
let selectedStation = null;
let token = localStorage.getItem('token') || null;

/* ===========================
   Inicialización QR robusta
   =========================== */
function initializeQRCode() {
    if (typeof QRCode === 'undefined') {
        console.error('❌ QRCode no se cargó correctamente');
        showNotification('Error: No se pudo cargar el generador de QR', 'error');
        return false;
    }
    
    // Algunos paquetes exponen otra API; comprobamos la función común
    if (typeof QRCode.toCanvas !== 'function' && typeof QRCode.toDataURL !== 'function') {
        console.error('❌ QRCode.toCanvas/toDataURL no está disponible');
        showNotification('Error: Librería QR incompleta', 'error');
        return false;
    }
    
    console.log('✅ QRCode inicializado correctamente');
    return true;
}

/* ===========================
   Utilidades UI
   =========================== */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'};
        color: white;
        border-radius: 4px;
        z-index: 10000;
        max-width: 300px;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 4000);
}

/* ===========================
   Llamadas API centralizadas
   =========================== */
async function apiCall(endpoint, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        },
        ...options
    };

    if (options.body && typeof options.body === 'object') {
        try {
            config.body = JSON.stringify(options.body);
        } catch (err) {
            console.warn('No se pudo serializar body:', err);
        }
    }

    try {
        const response = await fetch(`${apiBase}${endpoint}`, config);

        if (response.status === 401) {
            showNotification('Tu sesión ha expirado', 'error');
            logout();
            throw new Error('Sesión expirada');
        }

        if (!response.ok) {
            // Intentamos extraer JSON; si no se puede, devolvemos status
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Error ${response.status}`);
        }

        // Algunas respuestas pueden no ser JSON; intentamos parsear
        return await response.json().catch(() => null);
    } catch (error) {
        console.error('API call failed:', error);
        if (error.message !== 'Sesión expirada') {
            showNotification(error.message || 'Error de conexión', 'error');
        }
        throw error;
    }
}

/* ===========================
   DOMContentLoaded
   =========================== */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Aplicación iniciada');
    
    // Inicializar QRCode
    setTimeout(() => {
        const qrLoaded = initializeQRCode();
        if (!qrLoaded) {
            console.warn('⚠️ La funcionalidad de QR estará limitada');
        }
    }, 100);
    
    if (token) {
        showMainView();
    } else {
        showSplitView();
    }
});

/* ===========================
   Vistas
   =========================== */
function showSplitView() {
    console.log('🔄 Mostrando vista de login');
    const split = document.getElementById('split-view');
    const main = document.getElementById('main-view');
    if (split) split.style.display = 'flex';
    if (main) main.style.display = 'none';

    setTimeout(() => {
        if (!mapPreview) {
            initMapPreview();
        }
    }, 100);

    setupAuthHandlers();
}

function showMainView() {
    console.log('🏠 Mostrando vista principal');
    const split = document.getElementById('split-view');
    const main = document.getElementById('main-view');
    if (split) split.style.display = 'none';
    if (main) main.style.display = 'block';

    setTimeout(() => {
        initMap();
        loadStations();
    }, 100);

    setupAuthButtons();
    setupReservationClose();
    setupProfileClose();
    showProfileButton();
}

/* ===========================
   Mapas (principal y preview)
   =========================== */
function initMapPreview() {
    try {
        console.log('🗺️ Inicializando mapa preview');
        mapPreview = L.map('map-preview').setView([7.13, -73.12], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap Contributors'
        }).addTo(mapPreview);
        loadStationsPreview();
    } catch (error) {
        console.error('Error inicializando mapa preview:', error);
    }
}

function initMap() {
    if (!map) {
        try {
            console.log('🗺️ Inicializando mapa principal');
            map = L.map('map').setView([7.13, -73.12], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap Contributors'
            }).addTo(map);
        } catch (error) {
            console.error('Error inicializando mapa:', error);
            showNotification('Error al cargar el mapa', 'error');
        }
    }
}

/* ===========================
   Cargar estaciones (main)
   =========================== */
function loadStations() {
    console.log('📡 Cargando estaciones...');
    
    apiCall('/stations')
        .then(data => {
            if (!data) {
                console.warn('No se devolvió data de estaciones');
                showNotification('No hay estaciones disponibles', 'info');
                return;
            }

            if (!Array.isArray(data) || data.length === 0) {
                console.warn('No se recibieron estaciones');
                showNotification('No hay estaciones disponibles', 'info');
                clearMarkers();
                loadStationsList([]);
                return;
            }

            console.log(`✅ ${data.length} estaciones cargadas`);

            clearMarkers();
            
            // Convertir strings a números para Leaflet con defensas
            data.forEach(station => {
                station.latitude = parseFloat(station.latitude);
                station.longitude = parseFloat(station.longitude);
                station.available_scooters = parseInt(station.available_scooters);
                if (isNaN(station.available_scooters)) station.available_scooters = 0;
            });

            data.forEach(station => {
                addStationToMap(station);
            });
            
            loadStationsList(data);
        })
        .catch(error => {
            console.error('Error cargando estaciones:', error);
            showNotification('Error cargando estaciones', 'error');
        });
}

/* ===========================
   Agregar estación al mapa (mejor handling del botón reservar)
   =========================== */
function addStationToMap(station) {
    try {
        if (!map) initMap();
        const marker = L.marker([station.latitude, station.longitude]).addTo(map);

        // Popup con id para el botón (para luego añadir listener)
        const popupContent = `
            <div style="min-width: 200px;">
                <h4>${escapeHtml(String(station.name ?? ''))}</h4>
                <p>🛴 ${station.available_scooters} disponibles</p>
                <button id="reserve-btn-${station.id}"
                        ${station.available_scooters === 0 ? 'disabled' : ''}
                        style="background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                    ${station.available_scooters === 0 ? 'Sin disponibilidad' : 'Reservar'}
                </button>
            </div>
        `;
        marker.bindPopup(popupContent);

        // Cuando se abra el popup, añadimos el listener al botón (evita problemas con event undefined)
        marker.on('popupopen', () => {
            setTimeout(() => {
                const btn = document.getElementById(`reserve-btn-${station.id}`);
                if (btn) {
                    // Evitar duplicar listeners
                    btn.replaceWith(btn.cloneNode(true));
                    const newBtn = document.getElementById(`reserve-btn-${station.id}`);
                    newBtn.addEventListener('click', (e) => reserveScooter(station.id, e));
                }
            }, 50);
        });

        markers.push({ marker, station });
    } catch (error) {
        console.error('Error agregando estación al mapa:', error, station);
    }
}

/* ===========================
   Lista lateral de estaciones
   =========================== */
function loadStationsList(stations) {
    const stationsList = document.getElementById('stations-list');
    if (!stationsList) {
        console.error('Elemento stations-list no encontrado');
        return;
    }
    
    stationsList.innerHTML = '';
    
    if (!Array.isArray(stations) || stations.length === 0) {
        stationsList.innerHTML = '<li class="no-stations">No hay estaciones disponibles</li>';
        return;
    }

    stations.forEach(station => {
        const li = document.createElement('li');
        li.className = 'station-item';
        li.dataset.stationId = station.id;

        let availabilityClass = '';
        if (station.available_scooters === 0) availabilityClass = 'empty';
        else if (station.available_scooters <= 2) availabilityClass = 'low';

        // No usamos onclick inline; creamos el botón y le añadimos event listener
        li.innerHTML = `
            <h3>${escapeHtml(String(station.name ?? ''))}</h3>
            <div class="station-availability">
                <span class="availability-badge ${availabilityClass}">
                    🛴 ${station.available_scooters} disponibles
                </span>
            </div>
        `;
        
        const btn = document.createElement('button');
        btn.className = 'btn-reserve-station';
        btn.textContent = station.available_scooters === 0 ? 'Sin disponibilidad' : 'Reservar';
        if (station.available_scooters === 0) btn.disabled = true;

        // Añadimos listener al botón (pasa event correctamente)
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            reserveScooter(station.id, e);
        });

        li.appendChild(btn);

        li.addEventListener('click', (e) => {
            // si se clickeó el botón, ya está manejado
            if (!e.target.classList.contains('btn-reserve-station')) {
                centerMapOnStation(station);
                highlightStation(li);
            }
        });
        
        stationsList.appendChild(li);
    });
    
    setupStationSearch(stations);
}

/* ===========================
   Center map + abrir popup
   =========================== */
function centerMapOnStation(station) {
    if (!map || !station) return;
    
    try {
        map.setView([station.latitude, station.longitude], 15);
        
        markers.forEach(m => {
            if (m.station.id === station.id) {
                m.marker.openPopup();
            }
        });
    } catch (error) {
        console.error('Error centrando mapa en estación:', error);
    }
}

function highlightStation(stationElement) {
    document.querySelectorAll('.station-item').forEach(item => {
        item.classList.remove('active');
    });
    stationElement.classList.add('active');
}

function setupStationSearch(stations) {
    const searchInput = document.getElementById('station-search');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        document.querySelectorAll('.station-item').forEach(item => {
            const stationName = (item.querySelector('h3')?.textContent || '').toLowerCase();
            if (searchTerm === '' || stationName.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    });
}

/* ===========================
   Preview stations (map preview)
   =========================== */
function loadStationsPreview() {
    console.log('📡 Cargando estaciones preview...');
    
    apiCall('/stations')
        .then(data => {
            if (!data || !Array.isArray(data)) {
                console.warn('No hay data para preview');
                return;
            }
            
            console.log(`✅ ${data.length} estaciones preview cargadas`);
            
            data.forEach(station => {
                try {
                    // Convertir strings a números con defensas
                    const lat = parseFloat(station.latitude);
                    const lng = parseFloat(station.longitude);
                    if (isNaN(lat) || isNaN(lng)) return;

                    const marker = L.marker([lat, lng]).addTo(mapPreview);
                    marker.bindPopup(`
                        <b>${escapeHtml(String(station.name ?? ''))}</b><br/>
                        Patinetas disponibles: ${station.available_scooters ?? 0}
                    `);
                } catch (error) {
                    console.error('Error agregando marcador preview:', error);
                }
            });
        })
        .catch(error => {
            console.error('Error cargando estaciones preview:', error);
        });
}

/* ===========================
   Limpiar marcadores
   =========================== */
function clearMarkers() {
    console.log('🧹 Limpiando marcadores...');
    markers.forEach(m => {
        try {
            if (m && m.marker && map && map.hasLayer(m.marker)) {
                map.removeLayer(m.marker);
            }
        } catch (error) {
            console.warn('Error removiendo marcador:', error);
        }
    });
    markers = [];
}

/* ===========================
   Reservar patineta
   =========================== */
async function reserveScooter(stationId, event) {
    console.log(`🛴 Intentando reservar en estación ${stationId}`);

    if (!token) {
        showNotification('Por favor inicia sesión para reservar', 'error');
        return;
    }

    const button = event?.target || null;
    if (button) {
        button.disabled = true;
        const prevText = button.textContent;
        button.dataset.prevText = prevText;
        button.textContent = 'Reservando...';
    }

    try {
        const data = await apiCall('/reservations', {
            method: 'POST',
            body: { stationId }
        });

        if (!data) {
            showNotification('No se recibió confirmación de reserva', 'error');
            return;
        }

        showReservation(data);
        showNotification('Reserva realizada exitosamente', 'success');

        // Recargamos estaciones (ligero retardo para que backend procese)
        setTimeout(() => loadStations(), 1000);
    } catch (error) {
        console.error('Error en reserva:', error);
        showNotification('Error al realizar la reserva', 'error');
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = button.dataset.prevText || 'Reservar';
            delete button.dataset.prevText;
        }
    }
}

/* ===========================
   Función única para generar QR
   =========================== */
function generateQRCode(qrData, canvasId, fallbackContainer = null) {
    if (!qrData) {
        console.error('No hay datos para generar QR');
        if (fallbackContainer) {
            fallbackContainer.innerHTML += `<p style="color: red;">Error: No se pudo generar el código QR</p>`;
        }
        return;
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas con ID ${canvasId} no encontrado`);
        if (fallbackContainer) {
            showFallbackCode(qrData, fallbackContainer);
        }
        return;
    }

    if (typeof QRCode === 'undefined' || (typeof QRCode.toCanvas !== 'function' && typeof QRCode.toDataURL !== 'function')) {
        console.error('QRCode o sus métodos no están disponibles');
        if (fallbackContainer) {
            showFallbackCode(qrData, fallbackContainer);
        }
        return;
    }

    canvas.width = 250;
    canvas.height = 250;
    canvas.style.display = 'block';

    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Si toCanvas existe, preferirlo; si no, usar toDataURL y dibujar
    if (typeof QRCode.toCanvas === 'function') {
        QRCode.toCanvas(canvas, qrData, {
            width: 230,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' },
            errorCorrectionLevel: 'H'
        }, (error) => {
            if (error) {
                console.error('❌ Error generando QR con toCanvas:', error);
                canvas.style.display = 'none';
                if (fallbackContainer) showFallbackCode(qrData, fallbackContainer);
            } else {
                console.log('✅ QR generado exitosamente (toCanvas)');
                canvas.style.display = 'block';
            }
        });
    } else if (typeof QRCode.toDataURL === 'function') {
        QRCode.toDataURL(qrData, { errorCorrectionLevel: 'H' }, (err, url) => {
            if (err) {
                console.error('❌ Error generando QR con toDataURL:', err);
                canvas.style.display = 'none';
                if (fallbackContainer) showFallbackCode(qrData, fallbackContainer);
                return;
            }
            const img = new Image();
            img.onload = () => {
                const ctx2 = canvas.getContext('2d');
                ctx2.clearRect(0, 0, canvas.width, canvas.height);
                ctx2.drawImage(img, 10, 10, 230, 230);
                console.log('✅ QR generado exitosamente (toDataURL)');
            };
            img.onerror = (e) => {
                console.error('❌ Error cargando dataURL de QR:', e);
                if (fallbackContainer) showFallbackCode(qrData, fallbackContainer);
            };
            img.src = url;
        });
    } else {
        console.error('❌ No hay método compatible para generar QR');
        canvas.style.display = 'none';
        if (fallbackContainer) showFallbackCode(qrData, fallbackContainer);
    }
}

/* ===========================
   Mostrar reserva con QR
   =========================== */
function showReservation(reservation) {
    console.log('📋 Mostrando reserva:', reservation);
    
    const resSection = document.getElementById('reservation-section');
    if (!resSection) {
        console.error('Modal de reserva no encontrado');
        return;
    }
    
    // Mostramos overlay/modal
    resSection.style.display = 'flex';

    const infoDiv = document.getElementById('reservation-info');
    if (infoDiv) {
        infoDiv.innerHTML = `
            <h3>¡Reserva Exitosa! 🎉</h3>
            <p><strong>Estación ID:</strong> ${escapeHtml(String(reservation.stationId ?? ''))}</p>
            <p><strong>Reserva ID:</strong> ${escapeHtml(String(reservation.reservationId ?? reservation.id ?? ''))}</p>
            <p>Escanea este código QR para retirar tu patineta:</p>
            <canvas id="qr-code" style="display:block; margin-top:8px;"></canvas>
        `;
    }

    // Generar QR CODE en canvas 'qr-code'
    const qrValue = reservation.qrCode ?? reservation.qr_code ?? reservation.code ?? reservation.reservationId;
    generateQRCode(qrValue, 'qr-code', infoDiv);
}

/* ===========================
   Fallback si falla QR
   =========================== */
function showFallbackCode(qrData, container) {
    if (!container) return;
    container.innerHTML += `
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; border: 1px solid #ffeaa7;">
            <strong>🔢 Código de Reserva (Alternativo):</strong><br>
            <code style="font-size: 14px; background: #f8f9fa; padding: 10px; border-radius: 4px; display: inline-block; margin-top: 8px; font-family: 'Courier New', monospace;">
                ${escapeHtml(String(qrData))}
            </code>
            <p style="margin-top: 8px; font-size: 12px; color: #856404;">
                ⚠️ El código QR no está disponible. Usa este código.
            </p>
        </div>
    `;
}

/* ===========================
   Cerrar modales (botones)
   =========================== */
function setupReservationClose() {
    const btnClose = document.getElementById('btn-close-reservation');
    if (btnClose) {
        btnClose.addEventListener('click', () => {
            const resSection = document.getElementById('reservation-section');
            if (resSection) {
                resSection.style.display = 'none';
            }
        });
    }
}

function setupProfileClose() {
    const btnClose = document.getElementById('btn-close-profile');
    if (btnClose) {
        btnClose.addEventListener('click', () => {
            const profileSection = document.getElementById('profile-section');
            if (profileSection) {
                profileSection.style.display = 'none';
            }
        });
    }
}

/* ===========================
   Auth UI
   =========================== */
function setupAuthHandlers() {
    const authFormSplit = document.getElementById('auth-form-split');
    if (authFormSplit) {
        authFormSplit.onsubmit = e => {
            e.preventDefault();
            const type = document.getElementById('auth-title-split').textContent === 'Iniciar Sesión' ? 'login' : 'register';
            handleAuthSplit(type);
        };
    }

    const toggleRegister = document.getElementById('toggle-register');
    if (toggleRegister) {
        toggleRegister.onclick = e => {
            e.preventDefault();
            toggleAuthMode();
        };
    }
}

function setupAuthButtons() {
    console.log('🔧 Configurando botones de autenticación...');
    
    const btnProfile = document.getElementById('btn-profile');
    const btnLogout = document.getElementById('btn-logout');

    if (btnProfile) {
        btnProfile.addEventListener('click', function(e) {
            console.log('🎯 Botón perfil clickeado');
            e.preventDefault();
            showProfile();
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', function(e) {
            console.log('🎯 Botón logout clickeado');
            e.preventDefault();
            logout();
        });
    }
}

async function handleAuthSplit(type) {
    const email = document.getElementById('email-split')?.value;
    const password = document.getElementById('password-split')?.value;
    const button = document.querySelector('#auth-form-split button[type="submit"]');

    if (!email || !password) {
        showNotification('Por favor completa todos los campos', 'error');
        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = type === 'login' ? 'Iniciando sesión...' : 'Registrando...';
    }

    try {
        const data = await apiCall(`/auth/${type}`, {
            method: 'POST',
            body: { email, password }
        });

        if (data && data.token) {
            token = data.token;
            localStorage.setItem('token', token);
            showNotification(type === 'login' ? '¡Bienvenido!' : '¡Cuenta creada exitosamente!', 'success');
            showMainView();
        } else {
            showNotification('Respuesta inválida del servidor', 'error');
        }
    } catch (error) {
        console.error('Authentication error:', error);
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = type === 'login' ? 'Iniciar Sesión' : 'Registrarse';
        }
    }
}

function toggleAuthMode() {
    const title = document.getElementById('auth-title-split');
    const link = document.getElementById('toggle-register');
    const welcomeP = document.querySelector('.welcome-text p');
    const button = document.querySelector('#auth-form-split button[type="submit"]');
    
    if (!title || !link || !button) return;

    if (title.textContent === 'Iniciar Sesión') {
        title.textContent = 'Crear Cuenta';
        link.textContent = '¿Ya tienes cuenta? Inicia sesión';
        button.textContent = 'Registrarse';
        if (welcomeP) welcomeP.textContent = 'Regístrate para comenzar';
    } else {
        title.textContent = 'Iniciar Sesión';
        link.textContent = 'Regístrate aquí';
        button.textContent = 'Iniciar Sesión';
        if (welcomeP) welcomeP.textContent = 'Accede a tu cuenta para comenzar';
    }
}

function showProfileButton() {
    const btnProfile = document.getElementById('btn-profile');
    const btnLogout = document.getElementById('btn-logout');
    if (btnProfile) btnProfile.style.display = 'inline-block';
    if (btnLogout) btnLogout.style.display = 'inline-block';
}

function logout() {
    token = null;
    localStorage.removeItem('token');
    showNotification('Sesión cerrada', 'info');
    setTimeout(() => {
        location.reload();
    }, 1000);
}

/* ===========================
   Mostrar perfil & reservas
   =========================== */
function showProfile() {
    console.log('📊 Abriendo perfil...');
    
    const profileSection = document.getElementById('profile-section');
    if (!profileSection) {
        console.error('❌ Sección de perfil no encontrada');
        return;
    }
    
    profileSection.style.display = 'flex';

    const info = document.getElementById('profile-info');
    const historyList = document.getElementById('reservation-history');
    
    if (info) info.innerHTML = 'Cargando...';
    if (historyList) historyList.innerHTML = 'Cargando reservas...';

    apiCall('/users/profile')
    .then(user => {
        console.log('✅ Datos de perfil recibidos:', user);
        
        if (!user) {
            if (info) info.innerHTML = 'No se encontró usuario';
            return;
        }
        
        if (info) {
            info.innerHTML = `
                <strong>Email:</strong> ${escapeHtml(String(user.email ?? '-'))}<br/>
                <strong>ID Usuario:</strong> ${escapeHtml(String(user.id ?? '-'))}
            `;
        }

        if (!historyList) return;

        historyList.innerHTML = '';

        if (!user.reservations || !Array.isArray(user.reservations) || user.reservations.length === 0) {
            historyList.innerHTML = '<li class="no-reservations">No tienes reservas aún.</li>';
            return;
        }
        
        user.reservations.forEach((r, index) => {
            const li = document.createElement('li');
            li.className = 'reservation-history-item';
            const created = r.created_at ? new Date(r.created_at).toLocaleString() : '-';
            const stationName = r.station_name ?? ('Estación ' + (r.station_id ?? '-'));
            li.innerHTML = `
                <div class="reservation-info">
                    <strong>Reserva #${index + 1}</strong><br/>
                    <strong>Estación:</strong> ${escapeHtml(String(stationName))}<br/>
                    <strong>Fecha:</strong> ${escapeHtml(String(created))}
                </div>
            `;
            const btn = document.createElement('button');
            btn.className = 'btn-view-qr';
            btn.textContent = 'Ver QR';
            btn.addEventListener('click', () => showQr(r.qr_code ?? r.qrCode ?? r.code ?? ''));
            li.appendChild(btn);
            historyList.appendChild(li);
        });
    })
    .catch(error => {
        console.error('❌ Error cargando perfil:', error);
        if (info) info.innerHTML = 'Error al cargar perfil';
        if (historyList) historyList.innerHTML = '<li>Error al cargar reservas</li>';
    });
}

/* ===========================
   Mostrar QR (modal)
   =========================== */
function showQr(qrCodeData) {
    console.log('🔖 Mostrando QR para:', qrCodeData);
    
    const qrSection = document.getElementById('qr-display-section');
    if (!qrSection) return;
    
    qrSection.style.display = 'flex';
    
    const canvasId = 'qr-display-canvas';
    // Asegurar que exista canvas en el modal (si no, lo creamos)
    let canvas = document.getElementById(canvasId);
    const container = document.getElementById('qr-display-content') || qrSection;
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = canvasId;
        container.appendChild(canvas);
    }
    
    generateQRCode(qrCodeData, canvasId, container);
}

/* ===========================
   Cerrar modales haciendo clic en overlay (mejorado)
   =========================== */
document.addEventListener('click', (e) => {
    const reservationSection = document.getElementById('reservation-section');
    const profileSection = document.getElementById('profile-section');
    const qrSection = document.getElementById('qr-display-section');

    // Sólo cerramos si se hizo click directamente sobre el overlay (no dentro del contenido)
    if (reservationSection && reservationSection.style.display === 'flex' && e.target === reservationSection) {
        reservationSection.style.display = 'none';
    }

    if (profileSection && profileSection.style.display === 'flex' && e.target === profileSection) {
        profileSection.style.display = 'none';
    }

    if (qrSection && qrSection.style.display === 'flex' && e.target === qrSection) {
        qrSection.style.display = 'none';
    }
});

/* ===========================
   Debug final
   =========================== */
setTimeout(() => {
    console.log('✅ Frontend completamente cargado');
    console.log('📍 Token:', token ? 'Presente' : 'No presente');
    console.log('🗺️ Map:', map ? 'Inicializado' : 'No inicializado');
    console.log('🔤 QRCode:', typeof QRCode !== 'undefined' ? 'Disponible' : 'No disponible');
}, 1000);

/* ===========================
   Helpers
   =========================== */
function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}