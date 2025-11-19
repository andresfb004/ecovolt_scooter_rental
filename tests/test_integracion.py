# tests/test_integracion.py
import requests

BASE = "http://localhost:3000/api"

def test_get_stations():
    r = requests.get(f"{BASE}/stations")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)

def test_register_and_login_then_reserve():
    # 1) Registro
    user = {"email": "test@test.com", "password": "123456"}
    r1 = requests.post(f"{BASE}/auth/register", json=user)
    assert r1.status_code in (200, 400)  # 200 creado, 400 ya existe

    # 2) Login
    r2 = requests.post(
        f"{BASE}/auth/login",
        json={"email": user["email"], "password": user["password"]}
    )
    assert r2.status_code == 200  # 🔥 Aquí estaba el error
    token = r2.json()["token"]

    # 3) Obtener estaciones
    r3 = requests.get(
        f"{BASE}/stations",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert r3.status_code == 200
    estaciones = r3.json()
    assert len(estaciones) > 0

    # 4) Reservar
    station_id = estaciones[0]["id"]
    r4 = requests.post(
        f"{BASE}/reservations",
        json={"stationId": station_id},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert r4.status_code in (200, 201)

    reserva_data = r4.json()
    assert "qrCode" in reserva_data


if __name__ == "__main__":
    test_get_stations()
    test_register_and_login_then_reserve()
    print("✅ Todos los tests de integración pasaron")