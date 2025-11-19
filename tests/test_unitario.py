# tests/test_unitarios.py

def test_station_data_structure():
    # Simula los datos que vienen de la base de datos
    station_data = {
        "id": 1,
        "name": "Parque San Pío",
        "latitude": 7.118609,
        "longitude": -73.122932,
        "available_scooters": 4
    }
    
    # Verifica la estructura de datos (esto es lo que usa tu frontend)
    assert station_data["id"] == 1
    assert station_data["name"] == "Parque San Pío"
    assert station_data["available_scooters"] == 4

def test_station_coordinates():
    station_data = {
        "id": 2,
        "name": "CC Cabecera", 
        "latitude": 7.133456,
        "longitude": -73.116789,
        "available_scooters": 3
    }
    
    # Verifica que las coordenadas sean números válidos
    assert isinstance(station_data["latitude"], float)
    assert isinstance(station_data["longitude"], float)
    assert -90 <= station_data["latitude"] <= 90
    assert -180 <= station_data["longitude"] <= 180

if __name__ == "__main__":
    test_station_data_structure()
    test_station_coordinates()
    print("✅ Todos los tests unitarios pasaron")