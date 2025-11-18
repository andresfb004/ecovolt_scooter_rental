const apiBase = 'http://localhost:3000/api';

let map;
let mapPreview;
let markers = [];
let selectedStation = null;
let token = localStorage.getItem('token') || null;

document.addEventListener('DOMContentLoaded', () => {
    if (token) {
        showMainView();
    } else {
        showSplitView();
    }
});

function showSplitView() {
    document.getElementById('split-view').style.display = 'flex';
    document.getElementById('main-view').style.display = 'none';

    setTimeout(() => {
        if (!mapPreview) {
            mapPreview = L.map('map-preview').setView([7.13, -73.12], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap Contributors'
            }).addTo(mapPreview);
            loadStationsPreview();
        }
    }, 100);

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

function showMainView() {
    document.getElementById('split-view').style.display = 'none';
    document.getElementById('main-view').style.display = 'block';

    setTimeout(() => {
        initMap();
        loadStations();
    }, 100);

    setupAuthButtons();
    setupReservationClose();
    setupProfileClose();
    showProfileButton();
}

function initMap() {
    if (!map) {
        map = L.map('map').setView([7.13, -73.12], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap Contributors'
        }).addTo(map);
    }
}

function loadStations() {
    fetch(`${apiBase}/stations`)
    .then(res => res.json())
    .then(data => {
        clearMarkers();
        data.forEach(station => {
            const marker = L.marker([station.latitude, station.longitude]).addTo(map);
            marker.bindPopup(`
                <b>${station.name}</b><br/>
                Patinetas disponibles: ${station.available_scooters}<br/>
                <button onclick="reserveScooter(${station.id})" ${station.available_scooters === 0 ? 'disabled' : ''}>Reservar</button>
            `);
            markers.push({ marker, station });
        });
        loadStationsList(data);
    })
    .catch(err => alert('Error cargando estaciones: ' + err.message));
}

function loadStationsList(stations) {
    const stationsList = document.getElementById('stations-list');
    if (!stationsList) return;
    stationsList.innerHTML = '';
    stations.forEach(station => {
        const li = document.createElement('li');
        li.className = 'station-item';
        li.dataset.stationId = station.id;

        let availabilityClass = '';
        if (station.available_scooters === 0) availabilityClass = 'empty';
        else if (station.available_scooters <= 2) availabilityClass = 'low';

        li.innerHTML = `
            <h3>${station.name}</h3>
            <div class="station-availability">
                <span class="availability-badge ${availabilityClass}">
                    🛴 ${station.available_scooters} disponibles
                </span>
            </div>
            <button 
                class="btn-reserve-station" 
                onclick="reserveScooter(${station.id})" 
                ${station.available_scooters === 0 ? 'disabled' : ''}>
                ${station.available_scooters === 0 ? 'Sin disponibilidad' : 'Reservar'}
            </button>
        `;
        li.addEventListener('click', (e) => {
            if (!e.target.classList.contains('btn-reserve-station')) {
                centerMapOnStation(station);
                highlightStation(li);
            }
        });
        stationsList.appendChild(li);
    });
    setupStationSearch(stations);
}

function centerMapOnStation(station) {
    map.setView([station.latitude, station.longitude], 15);

    // Abrir popup del marcador correspondiente
    markers.forEach(m => {
        if (m.station.id === station.id) {
            m.marker.openPopup();
        }
    });
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
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.station-item').forEach(item => {
            const stationName = item.querySelector('h3').textContent.toLowerCase();
            if (stationName.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    });
}

function loadStationsPreview() {
    fetch(`${apiBase}/stations`)
    .then(res => res.json())
    .then(data => {
        data.forEach(station => {
            const marker = L.marker([station.latitude, station.longitude]).addTo(mapPreview);
            marker.bindPopup(`
                <b>${station.name}</b><br/>
                Patinetas disponibles: ${station.available_scooters}
            `);
        });
    })
    .catch(err => console.error('Error cargando estaciones preview:', err));
}

function clearMarkers() {
    markers.forEach(m => {
        if (m.marker) {
            map.removeLayer(m.marker);
        } else {
            map.removeLayer(m);
        }
    });
    markers = [];
}

function reserveScooter(stationId) {
    if (!token) {
        alert('Por favor inicia sesión para reservar.');
        return;
    }
    fetch(`${apiBase}/reservations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ stationId })
    })
    .then(async res => {
        if (res.status === 401) {
            alert('Tu sesión expiró. Vuelve a iniciar sesión.');
            logout();
            return;
        }
        if (!res.ok) {
            const errorData = await res.json().catch(()=>({error:'Error desconocido'}));
            throw new Error(errorData.error || 'Error en la reserva');
        }
        return res.json();
    })
    .then(data => {
        if (!data) return;
        showReservation(data);
        setTimeout(() => loadStations(), 500);
    })
    .catch(err => alert('No se pudo realizar la reserva: ' + err.message));
}

function showReservation(reservation) {
    const resSection = document.getElementById('reservation-section');
    resSection.style.display = 'flex';

    const infoDiv = document.getElementById('reservation-info');
    infoDiv.innerHTML = `
        Reserva exitosa para la estación ID: ${reservation.stationId}<br/>
        Código QR de reserva:`;

    const canvas = document.getElementById('qr-code');
    QRCode.toCanvas(canvas, reservation.qrCode, function (error) {
        if (error) console.error(error);
    });
}

function setupReservationClose() {
    const btnClose = document.getElementById('btn-close-reservation');
    if (btnClose) {
        btnClose.addEventListener('click', () => {
            document.getElementById('reservation-section').style.display = 'none';
        });
    }
}

function setupProfileClose() {
    const btnClose = document.getElementById('btn-close-profile');
    if (btnClose) {
        btnClose.addEventListener('click', () => {
            document.getElementById('profile-section').style.display = 'none';
        });
    }
}

function setupAuthButtons() {
    const btnProfile = document.getElementById('btn-profile');
    const btnLogout = document.getElementById('btn-logout');

    if (btnProfile) {
        btnProfile.addEventListener('click', () => showProfile());
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', () => logout());
    }
}

function handleAuthSplit(type) {
    const email = document.getElementById('email-split').value;
    const password = document.getElementById('password-split').value;

    fetch(`${apiBase}/auth/${type}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email, password })
    })
    .then(async res => {
        if (!res.ok) {
            const errorData = await res.json().catch(()=>({error:'Error desconocido'}));
            throw new Error(errorData.error || 'Error en autenticación');
        }
        return res.json();
    })
    .then(data => {
        token = data.token;
        localStorage.setItem('token', token);
        showMainView();
    })
    .catch(err => alert('Error de autenticación: ' + err.message));
}

function toggleAuthMode() {
    const title = document.getElementById('auth-title-split');
    const link = document.getElementById('toggle-register');
    const welcomeP = document.querySelector('.welcome-text p');
    if (title.textContent === 'Iniciar Sesión') {
        title.textContent = 'Crear Cuenta';
        link.textContent = '¿Ya tienes cuenta? Inicia sesión';
        if (welcomeP) welcomeP.textContent = 'Regístrate para comenzar';
    } else {
        title.textContent = 'Iniciar Sesión';
        link.textContent = 'Regístrate aquí';
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
    location.reload();
}

function showProfile() {
    document.getElementById('profile-section').style.display = 'flex';
    fetch(`${apiBase}/users/profile`, {
        headers: { Authorization: `Bearer ${token}` }
    })
    .then(async res => {
        if (res.status === 401) {
            alert('Tu sesión expiró o el token es inválido. Vuelve a iniciar sesión.');
            logout();
            return null;
        }
        if (!res.ok) {
            const errorData = await res.json().catch(()=>({error:'Error desconocido'}));
            throw new Error(errorData.error || 'Error al cargar el perfil');
        }
        return res.json();
    })
    .then(user => {
        if (!user) return;
        const info = document.getElementById('profile-info');
        info.innerHTML = `<strong>Email:</strong> ${user.email || '-'}<br/><strong>ID Usuario:</strong> ${user.id || '-'}`;

        const historyList = document.getElementById('reservation-history');
        historyList.innerHTML = '';

        if (!user.reservations || !Array.isArray(user.reservations) || user.reservations.length === 0) {
            historyList.innerHTML = '<li>No tienes reservas aún.</li>';
            return;
        }
        user.reservations.forEach(r => {
            const li = document.createElement('li');
            li.innerHTML = `
                Estación ID: ${r.station_id} - Fecha: ${new Date(r.created_at).toLocaleString()}
                <button onclick="showQr('${r.qr_code}')">Ver código QR</button>`;
            historyList.appendChild(li);
        });
    })
    .catch(err => alert('No se pudo cargar el perfil: ' + err.message));
}

function showQr(qrCodeData) {
    const qrSection = document.getElementById('qr-display-section');
    qrSection.style.display = 'flex';
    QRCode.toCanvas(document.getElementById('qr-display-canvas'), qrCodeData, error => {
        if (error) console.error(error);
    });
}
