"""
Backend API Tests for DNVT Profile Functionality
Tests: GET /api/auth/me, PATCH /api/usuarios/me, BI validation
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = f"test_profile_{uuid.uuid4().hex[:8]}@test.com"
TEST_PASSWORD = "TestPass123!"
TEST_NAME = "Test Profile User"

# Admin credentials from requirements
ADMIN_EMAIL = "admin@dnvt.ao"
ADMIN_PASSWORD = "Admin123!"


class TestHealthEndpoints:
    """Health check tests - run first"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ Health check passed: {data}")
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "DNVT" in data.get("message", "")
        print(f"✓ Root endpoint passed: {data}")


class TestAuthAndProfile:
    """Authentication and Profile tests"""
    
    @pytest.fixture(scope="class")
    def registered_user(self):
        """Register a new test user and return credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "nome": TEST_NAME,
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD,
            "telefone": "+244923456789",
            "tipo": "CIDADAO"
        })
        
        if response.status_code == 400 and "já cadastrado" in response.text:
            # User already exists, try to login
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "senha": TEST_PASSWORD
            })
            if login_response.status_code == 200:
                data = login_response.json()
                return {"token": data["access_token"], "user": data["user"]}
            pytest.skip("Could not register or login test user")
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        print(f"✓ User registered: {data['user']['email']}")
        return {"token": data["access_token"], "user": data["user"]}
    
    def test_get_auth_me(self, registered_user):
        """Test GET /api/auth/me - returns logged user data with new fields"""
        token = registered_user["token"]
        
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        
        assert response.status_code == 200, f"GET /auth/me failed: {response.text}"
        data = response.json()
        
        # Verify required fields exist
        assert "user_id" in data
        assert "nome" in data
        assert "email" in data
        assert "tipo" in data
        assert "created_at" in data
        
        # Verify new profile fields exist
        assert "bilhete_identidade" in data, "Missing bilhete_identidade field"
        assert "endereco" in data, "Missing endereco field"
        assert "zonas_notificacao" in data, "Missing zonas_notificacao field"
        assert "alertas_novos_acidentes" in data, "Missing alertas_novos_acidentes field"
        assert "alertas_sonoros" in data, "Missing alertas_sonoros field"
        assert "alertas_sms" in data, "Missing alertas_sms field"
        
        print(f"✓ GET /auth/me passed with all profile fields")
        print(f"  - user_id: {data['user_id']}")
        print(f"  - bilhete_identidade: {data.get('bilhete_identidade')}")
        print(f"  - endereco: {data.get('endereco')}")
        print(f"  - alertas_novos_acidentes: {data.get('alertas_novos_acidentes')}")
    
    def test_patch_usuarios_me_update_nome(self, registered_user):
        """Test PATCH /api/usuarios/me - update nome"""
        token = registered_user["token"]
        new_name = f"Updated Name {uuid.uuid4().hex[:4]}"
        
        response = requests.patch(f"{BASE_URL}/api/usuarios/me", 
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={"nome": new_name}
        )
        
        assert response.status_code == 200, f"PATCH failed: {response.text}"
        data = response.json()
        assert data["nome"] == new_name, f"Nome not updated: expected {new_name}, got {data['nome']}"
        print(f"✓ PATCH /usuarios/me - nome updated to: {new_name}")
    
    def test_patch_usuarios_me_update_telefone(self, registered_user):
        """Test PATCH /api/usuarios/me - update telefone"""
        token = registered_user["token"]
        new_phone = "+244912345678"
        
        response = requests.patch(f"{BASE_URL}/api/usuarios/me", 
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={"telefone": new_phone}
        )
        
        assert response.status_code == 200, f"PATCH failed: {response.text}"
        data = response.json()
        assert data["telefone"] == new_phone
        print(f"✓ PATCH /usuarios/me - telefone updated to: {new_phone}")
    
    def test_patch_usuarios_me_update_endereco(self, registered_user):
        """Test PATCH /api/usuarios/me - update endereco"""
        token = registered_user["token"]
        new_endereco = "Rua da Missão, 123, Luanda"
        
        response = requests.patch(f"{BASE_URL}/api/usuarios/me", 
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={"endereco": new_endereco}
        )
        
        assert response.status_code == 200, f"PATCH failed: {response.text}"
        data = response.json()
        assert data["endereco"] == new_endereco
        print(f"✓ PATCH /usuarios/me - endereco updated to: {new_endereco}")
    
    def test_patch_usuarios_me_valid_bi(self, registered_user):
        """Test PATCH /api/usuarios/me - update bilhete_identidade with valid format"""
        token = registered_user["token"]
        valid_bi = "123456789LA123"  # Valid Angolan BI format
        
        response = requests.patch(f"{BASE_URL}/api/usuarios/me", 
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={"bilhete_identidade": valid_bi}
        )
        
        assert response.status_code == 200, f"PATCH with valid BI failed: {response.text}"
        data = response.json()
        assert data["bilhete_identidade"] == valid_bi
        print(f"✓ PATCH /usuarios/me - bilhete_identidade updated to: {valid_bi}")
    
    def test_patch_usuarios_me_invalid_bi_format(self, registered_user):
        """Test PATCH /api/usuarios/me - reject invalid BI format"""
        token = registered_user["token"]
        invalid_bi = "12345"  # Invalid format
        
        response = requests.patch(f"{BASE_URL}/api/usuarios/me", 
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={"bilhete_identidade": invalid_bi}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid BI, got {response.status_code}"
        data = response.json()
        assert "BI inválido" in data.get("detail", ""), f"Expected BI validation error, got: {data}"
        print(f"✓ PATCH /usuarios/me - correctly rejected invalid BI: {invalid_bi}")
    
    def test_patch_usuarios_me_invalid_bi_letters(self, registered_user):
        """Test PATCH /api/usuarios/me - reject BI with wrong letter position"""
        token = registered_user["token"]
        invalid_bi = "LA123456789123"  # Letters in wrong position
        
        response = requests.patch(f"{BASE_URL}/api/usuarios/me", 
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={"bilhete_identidade": invalid_bi}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid BI, got {response.status_code}"
        print(f"✓ PATCH /usuarios/me - correctly rejected invalid BI format: {invalid_bi}")
    
    def test_patch_usuarios_me_update_alertas(self, registered_user):
        """Test PATCH /api/usuarios/me - update alert preferences"""
        token = registered_user["token"]
        
        response = requests.patch(f"{BASE_URL}/api/usuarios/me", 
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={
                "alertas_novos_acidentes": False,
                "alertas_sonoros": False,
                "alertas_sms": True
            }
        )
        
        assert response.status_code == 200, f"PATCH failed: {response.text}"
        data = response.json()
        assert data["alertas_novos_acidentes"] == False
        assert data["alertas_sonoros"] == False
        assert data["alertas_sms"] == True
        print(f"✓ PATCH /usuarios/me - alert preferences updated")
    
    def test_patch_usuarios_me_update_zonas(self, registered_user):
        """Test PATCH /api/usuarios/me - update zonas_notificacao"""
        token = registered_user["token"]
        zonas = ["zona_test1", "zona_test2"]
        
        response = requests.patch(f"{BASE_URL}/api/usuarios/me", 
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={"zonas_notificacao": zonas}
        )
        
        assert response.status_code == 200, f"PATCH failed: {response.text}"
        data = response.json()
        assert data["zonas_notificacao"] == zonas
        print(f"✓ PATCH /usuarios/me - zonas_notificacao updated to: {zonas}")
    
    def test_patch_usuarios_me_empty_body(self, registered_user):
        """Test PATCH /api/usuarios/me - reject empty update"""
        token = registered_user["token"]
        
        response = requests.patch(f"{BASE_URL}/api/usuarios/me", 
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={}
        )
        
        assert response.status_code == 400, f"Expected 400 for empty body, got {response.status_code}"
        print(f"✓ PATCH /usuarios/me - correctly rejected empty update")
    
    def test_patch_usuarios_me_verify_persistence(self, registered_user):
        """Test that profile updates persist - GET after PATCH"""
        token = registered_user["token"]
        
        # Update profile
        update_data = {
            "nome": "Persistence Test User",
            "endereco": "Test Address Persistence",
            "bilhete_identidade": "987654321AB456"
        }
        
        patch_response = requests.patch(f"{BASE_URL}/api/usuarios/me", 
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json=update_data
        )
        assert patch_response.status_code == 200
        
        # Verify with GET
        get_response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert get_response.status_code == 200
        data = get_response.json()
        
        assert data["nome"] == update_data["nome"], "Nome not persisted"
        assert data["endereco"] == update_data["endereco"], "Endereco not persisted"
        assert data["bilhete_identidade"] == update_data["bilhete_identidade"], "BI not persisted"
        print(f"✓ Profile updates correctly persisted in database")
    
    def test_patch_usuarios_me_unauthorized(self):
        """Test PATCH /api/usuarios/me - reject without token"""
        response = requests.patch(f"{BASE_URL}/api/usuarios/me", 
            headers={"Content-Type": "application/json"},
            json={"nome": "Unauthorized Update"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ PATCH /usuarios/me - correctly rejected unauthorized request")


class TestAdminLogin:
    """Test admin credentials"""
    
    def test_admin_login(self):
        """Test login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "senha": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Admin login successful: {data['user']['email']} ({data['user']['tipo']})")
            assert data["user"]["tipo"] == "ADMIN", f"Expected ADMIN type, got {data['user']['tipo']}"
        elif response.status_code == 401:
            print(f"⚠ Admin user not found in database - needs to be created")
            pytest.skip("Admin user not in database")
        else:
            pytest.fail(f"Unexpected response: {response.status_code} - {response.text}")


class TestNotificationPolling:
    """Test notification/polling related endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for tests"""
        # Try to register or login
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "nome": "Polling Test User",
            "email": f"polling_test_{uuid.uuid4().hex[:8]}@test.com",
            "senha": "TestPass123!",
            "tipo": "CIDADAO"
        })
        
        if response.status_code == 200:
            return response.json()["access_token"]
        
        # Try login with existing test user
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        if login_response.status_code == 200:
            return login_response.json()["access_token"]
        
        pytest.skip("Could not get auth token")
    
    def test_get_acidentes_ativos(self, auth_token):
        """Test GET /api/acidentes/ativos - used by polling system"""
        response = requests.get(f"{BASE_URL}/api/acidentes/ativos", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of accidents"
        print(f"✓ GET /acidentes/ativos - returned {len(data)} active accidents")
    
    def test_get_zonas_criticas(self, auth_token):
        """Test GET /api/zonas-criticas - used by profile page"""
        response = requests.get(f"{BASE_URL}/api/zonas-criticas", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of critical zones"
        print(f"✓ GET /zonas-criticas - returned {len(data)} zones")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
