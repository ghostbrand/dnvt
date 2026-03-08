"""
DNVT - Sistema de Gestão de Acidentes de Trânsito - Backend API Tests
Tests for: Authentication, Accidents, Statistics, Critical Zones, User Profile
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = f"test_{uuid.uuid4().hex[:8]}@dnvt.ao"
TEST_PASSWORD = "TestPass123!"
TEST_NAME = "Test User DNVT"

# Admin credentials from requirements
ADMIN_EMAIL = "admin@dnvt.ao"
ADMIN_PASSWORD = "Admin123!"


class TestHealthEndpoints:
    """Health check endpoints - should work without authentication"""
    
    def test_root_endpoint(self):
        """Test root API endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "status" in data
        print(f"✓ Root endpoint: {data}")
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        print(f"✓ Health check: {data}")


class TestAuthenticationFlow:
    """Authentication endpoints - register, login, get current user"""
    
    @pytest.fixture(scope="class")
    def registered_user(self):
        """Register a new test user"""
        payload = {
            "nome": TEST_NAME,
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD,
            "telefone": "+244923456789",
            "tipo": "CIDADAO"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        if response.status_code == 200:
            data = response.json()
            return {
                "token": data["access_token"],
                "user": data["user"],
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
        elif response.status_code == 400 and "já cadastrado" in response.text:
            # User already exists, try to login
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "senha": TEST_PASSWORD
            })
            if login_response.status_code == 200:
                data = login_response.json()
                return {
                    "token": data["access_token"],
                    "user": data["user"],
                    "email": TEST_EMAIL,
                    "password": TEST_PASSWORD
                }
        pytest.skip(f"Could not register or login test user: {response.text}")
    
    def test_register_user(self, registered_user):
        """Test user registration"""
        assert registered_user is not None
        assert "token" in registered_user
        assert registered_user["user"]["email"] == TEST_EMAIL
        print(f"✓ User registered: {registered_user['user']['email']}")
    
    def test_login_with_valid_credentials(self, registered_user):
        """Test login with valid credentials"""
        payload = {
            "email": registered_user["email"],
            "senha": registered_user["password"]
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == registered_user["email"]
        print(f"✓ Login successful for: {data['user']['email']}")
    
    def test_login_with_invalid_credentials(self):
        """Test login with invalid credentials"""
        payload = {
            "email": "invalid@test.com",
            "senha": "wrongpassword"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        assert response.status_code == 401
        print("✓ Invalid credentials rejected correctly")
    
    def test_get_current_user(self, registered_user):
        """Test GET /api/auth/me endpoint"""
        headers = {"Authorization": f"Bearer {registered_user['token']}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == registered_user["email"]
        assert "user_id" in data
        assert "tipo" in data
        print(f"✓ Current user retrieved: {data['email']}, tipo: {data['tipo']}")
    
    def test_get_me_without_token(self):
        """Test GET /api/auth/me without authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code in [401, 403]
        print("✓ Unauthenticated request rejected correctly")


class TestAdminLogin:
    """Test admin credentials from requirements"""
    
    def test_admin_login(self):
        """Test login with admin credentials"""
        payload = {
            "email": ADMIN_EMAIL,
            "senha": ADMIN_PASSWORD
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        if response.status_code == 200:
            data = response.json()
            assert data["user"]["tipo"] == "ADMIN"
            print(f"✓ Admin login successful: {data['user']['email']}, tipo: {data['user']['tipo']}")
        else:
            print(f"⚠ Admin user not found in database (status: {response.status_code})")
            pytest.skip("Admin user not seeded in database")


class TestUserProfile:
    """User profile update endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        # First try to register
        payload = {
            "nome": f"Profile Test {uuid.uuid4().hex[:6]}",
            "email": f"profile_{uuid.uuid4().hex[:8]}@dnvt.ao",
            "senha": "ProfileTest123!",
            "tipo": "CIDADAO"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Could not get auth token")
    
    def test_update_profile_nome(self, auth_token):
        """Test PATCH /api/usuarios/me - update name"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        payload = {"nome": "Updated Name Test"}
        response = requests.patch(f"{BASE_URL}/api/usuarios/me", json=payload, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["nome"] == "Updated Name Test"
        print(f"✓ Profile name updated: {data['nome']}")
    
    def test_update_profile_telefone(self, auth_token):
        """Test PATCH /api/usuarios/me - update phone"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        payload = {"telefone": "+244912345678"}
        response = requests.patch(f"{BASE_URL}/api/usuarios/me", json=payload, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["telefone"] == "+244912345678"
        print(f"✓ Profile phone updated: {data['telefone']}")
    
    def test_update_profile_bilhete_identidade_valid(self, auth_token):
        """Test PATCH /api/usuarios/me - update BI with valid format"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        payload = {"bilhete_identidade": "123456789LA123"}
        response = requests.patch(f"{BASE_URL}/api/usuarios/me", json=payload, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["bilhete_identidade"] == "123456789LA123"
        print(f"✓ Profile BI updated: {data['bilhete_identidade']}")
    
    def test_update_profile_bilhete_identidade_invalid(self, auth_token):
        """Test PATCH /api/usuarios/me - update BI with invalid format"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        payload = {"bilhete_identidade": "invalid-bi"}
        response = requests.patch(f"{BASE_URL}/api/usuarios/me", json=payload, headers=headers)
        assert response.status_code == 400
        print("✓ Invalid BI format rejected correctly")
    
    def test_update_profile_without_auth(self):
        """Test PATCH /api/usuarios/me without authentication"""
        payload = {"nome": "Should Fail"}
        response = requests.patch(f"{BASE_URL}/api/usuarios/me", json=payload)
        assert response.status_code in [401, 403]
        print("✓ Unauthenticated profile update rejected")


class TestAcidentesEndpoints:
    """Accident management endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for accident tests"""
        payload = {
            "nome": f"Acidente Test {uuid.uuid4().hex[:6]}",
            "email": f"acidente_{uuid.uuid4().hex[:8]}@dnvt.ao",
            "senha": "AcidenteTest123!",
            "tipo": "POLICIA"  # Police can create accidents
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Could not get auth token for accident tests")
    
    @pytest.fixture(scope="class")
    def created_accident(self, auth_token):
        """Create an accident for testing"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        payload = {
            "latitude": -8.8383,
            "longitude": 13.2344,
            "endereco": "Rua Teste, Luanda",
            "descricao": "TEST_Acidente de teste automatizado",
            "gravidade": "MODERADO",
            "tipo_acidente": "COLISAO",
            "causa_principal": "Excesso de velocidade",
            "numero_vitimas": 1,
            "numero_veiculos": 2,
            "origem_registro": "WEB_POLICIA"
        }
        response = requests.post(f"{BASE_URL}/api/acidentes", json=payload, headers=headers)
        if response.status_code == 200:
            return response.json()
        pytest.skip(f"Could not create test accident: {response.text}")
    
    def test_list_acidentes_ativos(self):
        """Test GET /api/acidentes/ativos - list active accidents"""
        response = requests.get(f"{BASE_URL}/api/acidentes/ativos")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Active accidents listed: {len(data)} accidents")
    
    def test_list_acidentes_with_filters(self):
        """Test GET /api/acidentes with query filters"""
        response = requests.get(f"{BASE_URL}/api/acidentes?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 10
        print(f"✓ Accidents with limit filter: {len(data)} accidents")
    
    def test_create_acidente(self, auth_token, created_accident):
        """Test POST /api/acidentes - create new accident"""
        assert created_accident is not None
        assert "acidente_id" in created_accident
        assert created_accident["descricao"] == "TEST_Acidente de teste automatizado"
        assert created_accident["gravidade"] == "MODERADO"
        print(f"✓ Accident created: {created_accident['acidente_id']}")
    
    def test_get_acidente_by_id(self, created_accident):
        """Test GET /api/acidentes/{id} - get accident by ID"""
        acidente_id = created_accident["acidente_id"]
        response = requests.get(f"{BASE_URL}/api/acidentes/{acidente_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["acidente_id"] == acidente_id
        print(f"✓ Accident retrieved by ID: {acidente_id}")
    
    def test_update_acidente(self, auth_token, created_accident):
        """Test PATCH /api/acidentes/{id} - update accident"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        acidente_id = created_accident["acidente_id"]
        payload = {"status": "VALIDADO", "gravidade": "GRAVE"}
        response = requests.patch(f"{BASE_URL}/api/acidentes/{acidente_id}", json=payload, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "VALIDADO"
        assert data["gravidade"] == "GRAVE"
        print(f"✓ Accident updated: status={data['status']}, gravidade={data['gravidade']}")
    
    def test_get_nonexistent_acidente(self):
        """Test GET /api/acidentes/{id} with non-existent ID"""
        response = requests.get(f"{BASE_URL}/api/acidentes/nonexistent_id_12345")
        assert response.status_code == 404
        print("✓ Non-existent accident returns 404")
    
    def test_create_acidente_without_auth(self):
        """Test POST /api/acidentes without authentication"""
        payload = {
            "latitude": -8.8383,
            "longitude": 13.2344,
            "descricao": "Should fail",
            "gravidade": "LEVE"
        }
        response = requests.post(f"{BASE_URL}/api/acidentes", json=payload)
        assert response.status_code in [401, 403]
        print("✓ Unauthenticated accident creation rejected")


class TestEstatisticasEndpoints:
    """Statistics endpoints"""
    
    def test_get_resumo(self):
        """Test GET /api/estatisticas/resumo - general statistics"""
        response = requests.get(f"{BASE_URL}/api/estatisticas/resumo")
        assert response.status_code == 200
        data = response.json()
        # Check expected fields in statistics
        assert isinstance(data, dict)
        print(f"✓ Statistics summary retrieved: {data}")
    
    def test_get_mensal(self):
        """Test GET /api/estatisticas/mensal - monthly statistics"""
        response = requests.get(f"{BASE_URL}/api/estatisticas/mensal")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print(f"✓ Monthly statistics retrieved")
    
    def test_get_por_hora(self):
        """Test GET /api/estatisticas/por-hora - hourly statistics"""
        response = requests.get(f"{BASE_URL}/api/estatisticas/por-hora")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Hourly statistics retrieved: {len(data)} entries")
    
    def test_get_por_dia_semana(self):
        """Test GET /api/estatisticas/por-dia-semana - weekly statistics"""
        response = requests.get(f"{BASE_URL}/api/estatisticas/por-dia-semana")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Weekly statistics retrieved: {len(data)} entries")


class TestZonasCriticasEndpoints:
    """Critical zones endpoints"""
    
    def test_list_zonas_criticas(self):
        """Test GET /api/zonas-criticas - list critical zones"""
        response = requests.get(f"{BASE_URL}/api/zonas-criticas")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Critical zones listed: {len(data)} zones")
    
    def test_calcular_zonas_criticas(self):
        """Test GET /api/zonas-criticas/calcular - calculate critical zones"""
        response = requests.get(f"{BASE_URL}/api/zonas-criticas/calcular")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Critical zones calculated: {len(data)} zones")


class TestRotasEndpoints:
    """Route verification endpoints"""
    
    def test_verificar_acidentes_rota(self):
        """Test POST /api/rotas/verificar-acidentes - check accidents on route"""
        params = {
            "lat_origem": -8.8383,
            "lng_origem": 13.2344,
            "lat_destino": -8.8500,
            "lng_destino": 13.2500
        }
        response = requests.post(f"{BASE_URL}/api/rotas/verificar-acidentes", params=params)
        assert response.status_code == 200
        data = response.json()
        assert "possui_acidentes" in data
        assert "total_acidentes" in data
        assert "acidentes" in data
        print(f"✓ Route accidents check: {data['total_acidentes']} accidents found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
