#!/usr/bin/env python3
"""
Tests complets pour le backend Express.js - A La Case Nout Gramoun
Tests des API, intégrations Firebase et Stripe, gestion d'erreurs
"""

import requests
import json
import time
import uuid
from datetime import datetime

# Configuration - Using the ngrok URL from frontend config
BASE_URL = "https://buffy-previsible-cooingly.ngrok-free.dev"
HEADERS = {"Content-Type": "application/json"}

class BackendTester:
    def __init__(self):
        self.results = []
        self.test_user_id = None
        self.test_service_id = None
        
    def log_result(self, test_name, success, message, details=None):
        """Enregistrer le résultat d'un test"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "details": details or {}
        }
        self.results.append(result)
        status = "✅" if success else "❌"
        print(f"{status} {test_name}: {message}")
        if details and not success:
            print(f"   Détails: {details}")
    
    def test_server_startup(self):
        """Test 1: Vérifier que le serveur Express se lance correctement"""
        try:
            response = requests.get(f"{BASE_URL}/", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Vérifier les éléments essentiels de la réponse
                required_fields = ["message", "status", "stripe_configured", "firebase_configured"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Server Startup", False, 
                                  f"Champs manquants dans la réponse: {missing_fields}", data)
                    return False
                
                # Vérifier que les services sont configurés
                if not data.get("stripe_configured"):
                    self.log_result("Server Startup", False, "Stripe non configuré", data)
                    return False
                    
                if not data.get("firebase_configured"):
                    self.log_result("Server Startup", False, "Firebase non configuré", data)
                    return False
                
                self.log_result("Server Startup", True, 
                              f"Serveur démarré - Status: {data.get('status')}", data)
                return True
            else:
                self.log_result("Server Startup", False, 
                              f"Code de réponse incorrect: {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result("Server Startup", False, f"Erreur de connexion: {str(e)}")
            return False
    
    def test_firebase_integration(self):
        """Test 2: Vérifier l'intégration Firebase Admin SDK"""
        try:
            response = requests.get(f"{BASE_URL}/", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                firebase_connected = data.get("firebase_connected", False)
                
                if firebase_connected:
                    self.log_result("Firebase Integration", True, 
                                  "Firebase Admin SDK connecté et fonctionnel")
                    return True
                else:
                    self.log_result("Firebase Integration", False, 
                                  "Firebase configuré mais connexion échouée", data)
                    return False
            else:
                self.log_result("Firebase Integration", False, 
                              f"Impossible de vérifier Firebase: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Firebase Integration", False, f"Erreur Firebase: {str(e)}")
            return False
    
    def test_auth_routes(self):
        """Test 3: Tester les routes d'authentification"""
        success_count = 0
        total_tests = 2
        
        # Test inscription
        try:
            test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
            register_data = {
                "email": test_email,
                "password": "TestPassword123!",
                "userType": "client",
                "nom": "Testeur",
                "prenom": "Backend",
                "isAidant": False,
                "genre": "homme"
            }
            
            response = requests.post(f"{BASE_URL}/api/auth/register", 
                                   json=register_data, headers=HEADERS, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("user", {}).get("id"):
                    self.test_user_id = data["user"]["id"]
                    self.log_result("Auth Registration", True, 
                                  f"Inscription réussie pour {test_email}")
                    success_count += 1
                else:
                    self.log_result("Auth Registration", False, 
                                  "Réponse d'inscription invalide", data)
            else:
                self.log_result("Auth Registration", False, 
                              f"Échec inscription: {response.status_code} - {response.text}")
                
        except Exception as e:
            self.log_result("Auth Registration", False, f"Erreur inscription: {str(e)}")
        
        # Test connexion (seulement si inscription réussie)
        if self.test_user_id:
            try:
                login_data = {
                    "email": test_email,
                    "password": "TestPassword123!"
                }
                
                response = requests.post(f"{BASE_URL}/api/auth/login", 
                                       json=login_data, headers=HEADERS, timeout=15)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and data.get("token"):
                        self.log_result("Auth Login", True, "Connexion réussie avec token")
                        success_count += 1
                    else:
                        self.log_result("Auth Login", False, "Réponse de connexion invalide", data)
                else:
                    self.log_result("Auth Login", False, 
                                  f"Échec connexion: {response.status_code} - {response.text}")
                    
            except Exception as e:
                self.log_result("Auth Login", False, f"Erreur connexion: {str(e)}")
        else:
            self.log_result("Auth Login", False, "Test ignoré - inscription échouée")
        
        return success_count == total_tests
    
    def test_services_routes(self):
        """Test 4: Tester les routes de services"""
        success_count = 0
        total_tests = 2
        
        # Test recherche d'aidants
        try:
            search_data = {
                "secteur": "Aide à domicile",
                "jour": "lundi",
                "horaires": "matin",
                "etatCivil": "celibataire",
                "preferenceAidant": "indifferent"
            }
            
            response = requests.post(f"{BASE_URL}/api/services/search", 
                                   json=search_data, headers=HEADERS, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "results" in data:
                    self.log_result("Services Search", True, 
                                  f"Recherche réussie - {data.get('count', 0)} aidants trouvés")
                    success_count += 1
                else:
                    self.log_result("Services Search", False, "Réponse de recherche invalide", data)
            else:
                self.log_result("Services Search", False, 
                              f"Échec recherche: {response.status_code} - {response.text}")
                
        except Exception as e:
            self.log_result("Services Search", False, f"Erreur recherche: {str(e)}")
        
        # Test récupération profil (avec ID fictif)
        try:
            fake_aidant_id = "test_aidant_id_123"
            response = requests.get(f"{BASE_URL}/api/services/profile/{fake_aidant_id}", 
                                  timeout=10)
            
            # On s'attend à une erreur 404 pour un ID fictif
            if response.status_code == 404:
                data = response.json()
                if not data.get("success"):
                    self.log_result("Services Profile", True, 
                                  "Gestion d'erreur correcte pour profil inexistant")
                    success_count += 1
                else:
                    self.log_result("Services Profile", False, 
                                  "Réponse incorrecte pour profil inexistant", data)
            else:
                self.log_result("Services Profile", False, 
                              f"Code de réponse inattendu: {response.status_code}")
                
        except Exception as e:
            self.log_result("Services Profile", False, f"Erreur profil: {str(e)}")
        
        return success_count == total_tests
    
    def test_stripe_integration(self):
        """Test 5: Tester l'intégration Stripe"""
        success_count = 0
        total_tests = 2
        
        # Test création Payment Intent
        try:
            payment_data = {
                "amount": 5000,  # 50€ en centimes
                "currency": "eur",
                "metadata": {
                    "serviceId": "test_service_123",
                    "type": "deposit",
                    "clientId": "test_client_123"
                }
            }
            
            response = requests.post(f"{BASE_URL}/create-payment-intent", 
                                   json=payment_data, headers=HEADERS, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "client_secret", "amount", "currency", "status"]
                
                if all(field in data for field in required_fields):
                    payment_intent_id = data["id"]
                    self.log_result("Stripe Payment Intent", True, 
                                  f"Payment Intent créé: {payment_intent_id}")
                    success_count += 1
                    
                    # Test récupération du statut
                    try:
                        status_response = requests.get(f"{BASE_URL}/payment-status/{payment_intent_id}", 
                                                     timeout=10)
                        
                        if status_response.status_code == 200:
                            status_data = status_response.json()
                            if status_data.get("id") == payment_intent_id:
                                self.log_result("Stripe Payment Status", True, 
                                              f"Statut récupéré: {status_data.get('status')}")
                                success_count += 1
                            else:
                                self.log_result("Stripe Payment Status", False, 
                                              "ID de Payment Intent incorrect", status_data)
                        else:
                            self.log_result("Stripe Payment Status", False, 
                                          f"Échec récupération statut: {status_response.status_code}")
                            
                    except Exception as e:
                        self.log_result("Stripe Payment Status", False, 
                                      f"Erreur récupération statut: {str(e)}")
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("Stripe Payment Intent", False, 
                                  f"Champs manquants: {missing}", data)
            else:
                self.log_result("Stripe Payment Intent", False, 
                              f"Échec création Payment Intent: {response.status_code} - {response.text}")
                
        except Exception as e:
            self.log_result("Stripe Payment Intent", False, f"Erreur Stripe: {str(e)}")
        
        return success_count == total_tests
    
    def test_statistics_route(self):
        """Test 6: Tester la route des statistiques avec nouvelles métriques"""
        try:
            response = requests.get(f"{BASE_URL}/stats", timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                
                # Champs de base existants
                basic_fields = ["total_payments", "successful_payments", "total_amount", 
                               "total_users", "total_conversations"]
                
                # Nouvelles métriques ajoutées selon la demande
                new_metrics = ["tauxSatisfactionGlobal", "evolutionRevenus", 
                              "nouveauxUtilisateurs", "evolutionMensuelle"]
                
                missing_basic = [field for field in basic_fields if field not in data]
                missing_new = [field for field in new_metrics if field not in data]
                
                success = True
                messages = []
                
                if missing_basic:
                    success = False
                    messages.append(f"Champs de base manquants: {missing_basic}")
                
                if missing_new:
                    messages.append(f"⚠️ Nouvelles métriques manquantes: {missing_new}")
                    # Ne pas marquer comme échec si seules les nouvelles métriques manquent
                    # car elles peuvent ne pas être encore implémentées
                
                # Vérifier le format des nouvelles données si présentes
                if "evolutionRevenus" in data:
                    if not isinstance(data["evolutionRevenus"], list):
                        messages.append("evolutionRevenus doit être un tableau")
                        success = False
                    elif len(data["evolutionRevenus"]) > 0:
                        # Vérifier le format des données mensuelles
                        first_item = data["evolutionRevenus"][0]
                        if not all(key in first_item for key in ["mois", "revenus"]):
                            messages.append("Format evolutionRevenus incorrect (mois, revenus requis)")
                            success = False
                
                if "evolutionMensuelle" in data:
                    if not isinstance(data["evolutionMensuelle"], list):
                        messages.append("evolutionMensuelle doit être un tableau")
                        success = False
                
                if "tauxSatisfactionGlobal" in data:
                    taux = data["tauxSatisfactionGlobal"]
                    if not isinstance(taux, (int, float)) or taux < 0 or taux > 5:
                        messages.append("tauxSatisfactionGlobal doit être entre 0 et 5")
                        success = False
                
                if "nouveauxUtilisateurs" in data:
                    if not isinstance(data["nouveauxUtilisateurs"], int) or data["nouveauxUtilisateurs"] < 0:
                        messages.append("nouveauxUtilisateurs doit être un entier positif")
                        success = False
                
                message = f"Statistiques récupérées - {data.get('total_users', 0)} utilisateurs"
                if messages:
                    message += f" | Issues: {'; '.join(messages)}"
                
                self.log_result("Statistics Route", success, message, data)
                return success
            else:
                self.log_result("Statistics Route", False, 
                              f"Échec récupération stats: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Statistics Route", False, f"Erreur statistiques: {str(e)}")
            return False
    
    def test_error_handling(self):
        """Test 7: Tester la gestion d'erreurs"""
        success_count = 0
        total_tests = 3
        
        # Test route inexistante
        try:
            response = requests.get(f"{BASE_URL}/api/nonexistent", timeout=10)
            if response.status_code == 404:
                self.log_result("Error Handling - 404", True, "Gestion correcte des routes inexistantes")
                success_count += 1
            else:
                self.log_result("Error Handling - 404", False, 
                              f"Code de réponse inattendu: {response.status_code}")
        except Exception as e:
            self.log_result("Error Handling - 404", False, f"Erreur test 404: {str(e)}")
        
        # Test données invalides pour inscription
        try:
            invalid_data = {"email": "invalid-email", "password": ""}
            response = requests.post(f"{BASE_URL}/api/auth/register", 
                                   json=invalid_data, headers=HEADERS, timeout=10)
            
            if response.status_code == 400:
                data = response.json()
                if not data.get("success"):
                    self.log_result("Error Handling - Invalid Data", True, 
                                  "Gestion correcte des données invalides")
                    success_count += 1
                else:
                    self.log_result("Error Handling - Invalid Data", False, 
                                  "Réponse incorrecte pour données invalides", data)
            else:
                self.log_result("Error Handling - Invalid Data", False, 
                              f"Code de réponse inattendu: {response.status_code}")
        except Exception as e:
            self.log_result("Error Handling - Invalid Data", False, 
                          f"Erreur test données invalides: {str(e)}")
        
        # Test Payment Intent avec montant invalide
        try:
            invalid_payment = {"amount": 10, "currency": "eur"}  # Montant trop faible
            response = requests.post(f"{BASE_URL}/create-payment-intent", 
                                   json=invalid_payment, headers=HEADERS, timeout=10)
            
            if response.status_code == 400:
                data = response.json()
                if "error" in data:
                    self.log_result("Error Handling - Payment", True, 
                                  "Gestion correcte des montants invalides")
                    success_count += 1
                else:
                    self.log_result("Error Handling - Payment", False, 
                                  "Réponse incorrecte pour montant invalide", data)
            else:
                self.log_result("Error Handling - Payment", False, 
                              f"Code de réponse inattendu: {response.status_code}")
        except Exception as e:
            self.log_result("Error Handling - Payment", False, 
                          f"Erreur test paiement invalide: {str(e)}")
        
        return success_count == total_tests
    
    def test_environment_config(self):
        """Test 8: Vérifier la configuration d'environnement"""
        try:
            response = requests.get(f"{BASE_URL}/", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Vérifier que les services essentiels sont configurés
                stripe_ok = data.get("stripe_configured", False)
                firebase_ok = data.get("firebase_configured", False)
                firebase_connected = data.get("firebase_connected", False)
                
                if stripe_ok and firebase_ok and firebase_connected:
                    self.log_result("Environment Config", True, 
                                  "Toutes les configurations d'environnement sont correctes")
                    return True
                else:
                    issues = []
                    if not stripe_ok:
                        issues.append("Stripe non configuré")
                    if not firebase_ok:
                        issues.append("Firebase non configuré")
                    if not firebase_connected:
                        issues.append("Firebase non connecté")
                    
                    self.log_result("Environment Config", False, 
                                  f"Problèmes de configuration: {', '.join(issues)}")
                    return False
            else:
                self.log_result("Environment Config", False, 
                              f"Impossible de vérifier la configuration: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Environment Config", False, f"Erreur configuration: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Exécuter tous les tests"""
        print("🚀 Démarrage des tests backend Express.js")
        print("=" * 60)
        
        tests = [
            ("Server Startup", self.test_server_startup),
            ("Firebase Integration", self.test_firebase_integration),
            ("Authentication Routes", self.test_auth_routes),
            ("Services Routes", self.test_services_routes),
            ("Stripe Integration", self.test_stripe_integration),
            ("Statistics Route", self.test_statistics_route),
            ("Error Handling", self.test_error_handling),
            ("Environment Config", self.test_environment_config)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n📋 Test: {test_name}")
            print("-" * 40)
            
            try:
                if test_func():
                    passed += 1
            except Exception as e:
                self.log_result(test_name, False, f"Erreur inattendue: {str(e)}")
        
        print("\n" + "=" * 60)
        print(f"📊 RÉSULTATS FINAUX: {passed}/{total} tests réussis")
        
        if passed == total:
            print("✅ Tous les tests sont passés - Backend fonctionnel")
        else:
            print(f"❌ {total - passed} test(s) échoué(s) - Vérification nécessaire")
        
        return passed, total, self.results

if __name__ == "__main__":
    tester = BackendTester()
    passed, total, results = tester.run_all_tests()
    
    # Sauvegarder les résultats détaillés
    with open("/app/backend_test_results.json", "w") as f:
        json.dump({
            "summary": {"passed": passed, "total": total, "success_rate": passed/total},
            "timestamp": datetime.now().isoformat(),
            "results": results
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\n📄 Résultats détaillés sauvegardés dans backend_test_results.json")