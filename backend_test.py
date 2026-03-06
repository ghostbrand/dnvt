#!/usr/bin/env python3
"""
DNVT Backend API Testing Suite
Tests all API endpoints for the traffic accident management system
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class DNVTAPITester:
    def __init__(self, base_url="https://roadwatch-system-2.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request and return success status and response data"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}

            return success, response_data

        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}

    def test_health_check(self):
        """Test basic health endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        
        # Test root endpoint
        success, data = self.make_request('GET', '')
        self.log_test("Root endpoint", success and "DNVT" in str(data))
        
        # Test health endpoint
        success, data = self.make_request('GET', 'health')
        self.log_test("Health check", success and data.get("status") == "healthy")

    def test_authentication(self):
        """Test authentication endpoints"""
        print("\n🔍 Testing Authentication...")
        
        # Test user registration
        reg_data = {
            "nome": "Test User DNVT",
            "email": f"test_{datetime.now().strftime('%H%M%S')}@example.com",
            "senha": "TestPass123!",
            "telefone": "+244923456789",
            "tipo": "POLICIA"
        }
        
        success, data = self.make_request('POST', 'auth/register', reg_data, 200)
        if success and data.get("access_token"):
            self.token = data["access_token"]
            self.user_id = data["user"]["user_id"]
            self.log_test("User registration", True)
        else:
            self.log_test("User registration", False, str(data))
            return False

        # Test login with admin credentials
        login_data = {
            "email": "admin@dnvt.ao",
            "senha": "Admin123!"
        }
        
        success, data = self.make_request('POST', 'auth/login', login_data, 200)
        if success and data.get("access_token"):
            self.token = data["access_token"]  # Use admin token for subsequent tests
            self.user_id = data["user"]["user_id"]
            self.log_test("Admin login", True)
        else:
            self.log_test("Admin login", False, str(data))

        # Test get current user
        success, data = self.make_request('GET', 'auth/me')
        self.log_test("Get current user", success and data.get("user_id"))

        return True

    def test_acidentes(self):
        """Test accident management endpoints"""
        print("\n🔍 Testing Accident Management...")
        
        # Create accident
        acidente_data = {
            "latitude": -8.8383,
            "longitude": 13.2344,
            "endereco": "Rua da Missão, Luanda",
            "descricao": "Colisão entre dois veículos na intersecção",
            "gravidade": "MODERADO",
            "tipo_acidente": "COLISAO_FRONTAL",
            "causa_principal": "EXCESSO_VELOCIDADE",
            "numero_vitimas": 2,
            "numero_veiculos": 2,
            "origem_registro": "WEB_POLICIA"
        }
        
        success, data = self.make_request('POST', 'acidentes', acidente_data, 200)
        acidente_id = None
        if success and data.get("acidente_id"):
            acidente_id = data["acidente_id"]
            self.log_test("Create accident", True)
        else:
            self.log_test("Create accident", False, str(data))
            return False

        # List accidents
        success, data = self.make_request('GET', 'acidentes')
        self.log_test("List accidents", success and isinstance(data, list))

        # List active accidents
        success, data = self.make_request('GET', 'acidentes/ativos')
        self.log_test("List active accidents", success and isinstance(data, list))

        # Get specific accident
        success, data = self.make_request('GET', f'acidentes/{acidente_id}')
        self.log_test("Get accident by ID", success and data.get("acidente_id") == acidente_id)

        # Update accident
        update_data = {
            "status": "VALIDADO",
            "gravidade": "GRAVE"
        }
        success, data = self.make_request('PATCH', f'acidentes/{acidente_id}', update_data)
        self.log_test("Update accident", success and data.get("status") == "VALIDADO")

        return acidente_id

    def test_boletins(self, acidente_id: str):
        """Test bulletin management endpoints"""
        print("\n🔍 Testing Bulletin Management...")
        
        # Create bulletin
        boletim_data = {
            "acidente_id": acidente_id,
            "observacoes": "Boletim de teste para acidente registrado",
            "vitimas_info": [
                {"nome": "João Silva", "idade": 35, "estado": "Ferido leve"}
            ],
            "veiculos_info": [
                {"marca": "Toyota", "modelo": "Corolla", "placa": "LD-123-AB"}
            ]
        }
        
        success, data = self.make_request('POST', 'boletins', boletim_data, 200)
        boletim_id = None
        if success and data.get("boletim_id"):
            boletim_id = data["boletim_id"]
            self.log_test("Create bulletin", True)
        else:
            self.log_test("Create bulletin", False, str(data))
            return

        # List bulletins
        success, data = self.make_request('GET', 'boletins')
        self.log_test("List bulletins", success and isinstance(data, list))

        # Get specific bulletin
        success, data = self.make_request('GET', f'boletins/{boletim_id}')
        self.log_test("Get bulletin by ID", success and data.get("boletim_id") == boletim_id)

    def test_assistencias(self, acidente_id: str):
        """Test assistance management endpoints"""
        print("\n🔍 Testing Assistance Management...")
        
        # Create assistance
        assistencia_data = {
            "acidente_id": acidente_id,
            "tipo": "AMBULANCIA",
            "latitude_atual": -8.8383,
            "longitude_atual": 13.2344
        }
        
        success, data = self.make_request('POST', 'assistencias', assistencia_data, 200)
        assistencia_id = None
        if success and data.get("assistencia_id"):
            assistencia_id = data["assistencia_id"]
            self.log_test("Create assistance", True)
        else:
            self.log_test("Create assistance", False, str(data))
            return

        # List assistances
        success, data = self.make_request('GET', 'assistencias')
        self.log_test("List assistances", success and isinstance(data, list))

        # Update assistance
        update_data = {
            "status": "NO_LOCAL",
            "latitude_atual": -8.8400,
            "longitude_atual": 13.2350
        }
        success, data = self.make_request('PATCH', f'assistencias/{assistencia_id}', update_data)
        self.log_test("Update assistance", success and data.get("status") == "NO_LOCAL")

    def test_zonas_criticas(self):
        """Test critical zones management"""
        print("\n🔍 Testing Critical Zones...")
        
        # Calculate critical zones
        success, data = self.make_request('GET', 'zonas-criticas/calcular')
        self.log_test("Calculate critical zones", success and isinstance(data, list))

        # Create critical zone
        zona_data = {
            "latitude_centro": -8.8383,
            "longitude_centro": 13.2344,
            "raio_metros": 500,
            "nome": "Zona Teste Luanda Centro"
        }
        
        success, data = self.make_request('POST', 'zonas-criticas', zona_data, 200)
        zona_id = None
        if success and data.get("zona_id"):
            zona_id = data["zona_id"]
            self.log_test("Create critical zone", True)
        else:
            self.log_test("Create critical zone", False, str(data))
            return

        # List critical zones
        success, data = self.make_request('GET', 'zonas-criticas')
        self.log_test("List critical zones", success and isinstance(data, list))

        # Validate critical zone (admin only)
        success, data = self.make_request('PATCH', f'zonas-criticas/{zona_id}/validar')
        self.log_test("Validate critical zone", success)

    def test_estatisticas(self):
        """Test statistics endpoints"""
        print("\n🔍 Testing Statistics...")
        
        # Get summary statistics
        success, data = self.make_request('GET', 'estatisticas/resumo')
        expected_keys = ['total_acidentes', 'acidentes_hoje', 'acidentes_mes', 'acidentes_ativos']
        has_keys = all(key in data for key in expected_keys) if success else False
        self.log_test("Statistics summary", success and has_keys)

        # Get monthly statistics
        success, data = self.make_request('GET', 'estatisticas/mensal')
        expected_keys = ['ano', 'mes', 'total_acidentes']
        has_keys = all(key in data for key in expected_keys) if success else False
        self.log_test("Monthly statistics", success and has_keys)

        # Get hourly statistics
        success, data = self.make_request('GET', 'estatisticas/por-hora')
        self.log_test("Hourly statistics", success and isinstance(data, list))

        # Get weekly statistics
        success, data = self.make_request('GET', 'estatisticas/por-dia-semana')
        self.log_test("Weekly statistics", success and isinstance(data, list))

    def test_configuracoes(self):
        """Test configuration endpoints"""
        print("\n🔍 Testing Configuration...")
        
        # Get configurations (admin only)
        success, data = self.make_request('GET', 'configuracoes')
        self.log_test("Get configurations", success and data.get("config_id"))

        # Update configurations
        config_data = {
            "google_maps_api_key": "test_api_key_123",
            "ombala_sender_name": "DNVT_TEST"
        }
        success, data = self.make_request('PATCH', 'configuracoes', config_data)
        self.log_test("Update configurations", success)

        # Get Google Maps key (public endpoint)
        success, data = self.make_request('GET', 'configuracoes/google-maps-key')
        self.log_test("Get Google Maps key", success)

    def test_sms(self):
        """Test SMS endpoints"""
        print("\n🔍 Testing SMS...")
        
        # Get SMS balance
        success, data = self.make_request('GET', 'sms/saldo')
        self.log_test("Get SMS balance", success)

        # Note: Not testing actual SMS sending to avoid costs

    def test_rotas(self):
        """Test route checking endpoints"""
        print("\n🔍 Testing Route Checking...")
        
        # Check accidents on route
        params = "lat_origem=-8.8383&lng_origem=13.2344&lat_destino=-8.8500&lng_destino=13.2500"
        success, data = self.make_request('POST', f'rotas/verificar-acidentes?{params}')
        expected_keys = ['possui_acidentes', 'total_acidentes', 'acidentes']
        has_keys = all(key in data for key in expected_keys) if success else False
        self.log_test("Check route accidents", success and has_keys)

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting DNVT Backend API Tests...")
        print(f"📍 Testing against: {self.base_url}")
        
        # Test health endpoints
        self.test_health_check()
        
        # Test authentication
        if not self.test_authentication():
            print("❌ Authentication failed, stopping tests")
            return False
        
        # Test main functionality
        acidente_id = self.test_acidentes()
        if acidente_id:
            self.test_boletins(acidente_id)
            self.test_assistencias(acidente_id)
        
        self.test_zonas_criticas()
        self.test_estatisticas()
        self.test_configuracoes()
        self.test_sms()
        self.test_rotas()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"   Tests run: {self.tests_run}")
        print(f"   Tests passed: {self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Save detailed results
        with open('/app/backend_test_results.json', 'w') as f:
            json.dump({
                "summary": {
                    "tests_run": self.tests_run,
                    "tests_passed": self.tests_passed,
                    "success_rate": self.tests_passed/self.tests_run*100,
                    "timestamp": datetime.now().isoformat()
                },
                "results": self.test_results
            }, f, indent=2)
        
        return self.tests_passed == self.tests_run

def main():
    tester = DNVTAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())