# tests/test_aceptacion.py
import requests

BASE = "http://localhost:3000/api"

def test_flujo_completo():
    # Login
    login = requests.post(f"{BASE}/auth/login", json={
        "email": "test@test.com", 
        "password": "123456"
    })
    
    if login.status_code != 200:
        # Si falla login, registrar
        registro = requests.post(f"{BASE}/auth/register", json={
            "email": "test@test.com", 
            "password": "123456"
        })
        assert registro.status_code == 200, f"Registro falló: {registro.text}"
        login = requests.post(f"{BASE}/auth/login", json={
            "email": "test@test.com", 
            "password": "123456"
        })
    
    assert login.status_code == 200, f"Login falló: {login.text}"
    token = login.json()["token"]

    # Obtener estaciones
    estaciones = requests.get(f"{BASE}/stations", headers={"Authorization": f"Bearer {token}"}).json()
    assert len(estaciones) > 0

    # Reservar en primera estación
    station_id = estaciones[0]["id"]
    reserva = requests.post(
        f"{BASE}/reservations", 
        json={"stationId": station_id}, 
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert reserva.status_code in (200, 201), f"Reserva falló: {reserva.text}"
    print("✅ Test completado exitosamente")

if __name__ == "__main__":
    test_flujo_completo()