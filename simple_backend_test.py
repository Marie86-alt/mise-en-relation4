#!/usr/bin/env python3
"""
Test simplifié du backend Express.js - A La Case Nout Gramoun
Test des fonctionnalités critiques avec le serveur en cours d'exécution
"""

import requests
import json
import uuid
from datetime import datetime

BASE_URL = "http://localhost:3000"
HEADERS = {"Content-Type": "application/json"}

def test_server_status():
    """Test 1: Vérifier le statut du serveur"""
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✅ Serveur: Démarré et fonctionnel")
            print(f"   - Stripe configuré: {data.get('stripe_configured')}")
            print(f"   - Firebase configuré: {data.get('firebase_configured')}")
            print(f"   - Firebase connecté: {data.get('firebase_connected')}")
            return True
        else:
            print(f"❌ Serveur: Code {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Serveur: Erreur - {str(e)}")
        return False

def test_authentication():
    """Test 2: Tester l'authentification"""
    try:
        # Test inscription
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
                               json=register_data, headers=HEADERS, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print("✅ Authentification: Inscription réussie")
                
                # Test connexion
                login_data = {"email": test_email, "password": "TestPassword123!"}
                login_response = requests.post(f"{BASE_URL}/api/auth/login", 
                                             json=login_data, headers=HEADERS, timeout=10)
                
                if login_response.status_code == 200:
                    login_data = login_response.json()
                    if login_data.get("success") and login_data.get("token"):
                        print("✅ Authentification: Connexion réussie")
                        return True
                    else:
                        print("❌ Authentification: Connexion échouée")
                        return False
                else:
                    print(f"❌ Authentification: Connexion code {login_response.status_code}")
                    return False
            else:
                print("❌ Authentification: Inscription échouée")
                return False
        else:
            print(f"❌ Authentification: Code {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Authentification: Erreur - {str(e)}")
        return False

def test_services():
    """Test 3: Tester les services"""
    try:
        # Test recherche
        search_data = {
            "secteur": "Aide à domicile",
            "jour": "lundi",
            "horaires": "matin",
            "etatCivil": "celibataire",
            "preferenceAidant": "indifferent"
        }
        
        response = requests.post(f"{BASE_URL}/api/services/search", 
                               json=search_data, headers=HEADERS, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print(f"✅ Services: Recherche réussie - {data.get('count', 0)} aidants")
                return True
            else:
                print("❌ Services: Recherche échouée")
                return False
        else:
            print(f"❌ Services: Code {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Services: Erreur - {str(e)}")
        return False

def test_stripe():
    """Test 4: Tester Stripe"""
    try:
        payment_data = {
            "amount": 5000,
            "currency": "eur",
            "metadata": {
                "serviceId": "test_service_123",
                "type": "deposit",
                "clientId": "test_client_123"
            }
        }
        
        response = requests.post(f"{BASE_URL}/create-payment-intent", 
                               json=payment_data, headers=HEADERS, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("id") and data.get("client_secret"):
                print(f"✅ Stripe: Payment Intent créé - {data.get('id')}")
                return True
            else:
                print("❌ Stripe: Réponse invalide")
                return False
        else:
            print(f"❌ Stripe: Code {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Stripe: Erreur - {str(e)}")
        return False

def test_statistics():
    """Test 5: Tester les statistiques avec nouvelles métriques"""
    try:
        response = requests.get(f"{BASE_URL}/stats", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            # Vérifier les métriques de base
            basic_fields = ["totalAidants", "totalClients", "chiffreAffaires"]
            missing_basic = [field for field in basic_fields if field not in data]
            
            # Vérifier les nouvelles métriques
            new_metrics = ["tauxSatisfactionGlobal", "evolutionRevenus", 
                          "nouveauxUtilisateurs", "evolutionMensuelle"]
            missing_new = [field for field in new_metrics if field not in data]
            
            if not missing_basic and not missing_new:
                print("✅ Statistiques: Toutes les métriques présentes")
                print(f"   - Aidants: {data.get('totalAidants')}")
                print(f"   - Clients: {data.get('totalClients')}")
                print(f"   - CA: {data.get('chiffreAffaires')}€")
                print(f"   - Satisfaction: {data.get('tauxSatisfactionGlobal')}/5")
                print(f"   - Nouveaux utilisateurs: {data.get('nouveauxUtilisateurs')}")
                return True
            else:
                if missing_basic:
                    print(f"❌ Statistiques: Métriques de base manquantes - {missing_basic}")
                if missing_new:
                    print(f"❌ Statistiques: Nouvelles métriques manquantes - {missing_new}")
                return False
        else:
            print(f"❌ Statistiques: Code {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Statistiques: Erreur - {str(e)}")
        return False

def main():
    """Exécuter tous les tests"""
    print("🚀 Tests Backend Express.js - A La Case Nout Gramoun")
    print("=" * 60)
    
    tests = [
        ("Statut Serveur", test_server_status),
        ("Authentification", test_authentication),
        ("Services", test_services),
        ("Stripe", test_stripe),
        ("Statistiques", test_statistics)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n📋 {test_name}:")
        print("-" * 40)
        
        try:
            if test_func():
                passed += 1
        except Exception as e:
            print(f"❌ {test_name}: Erreur inattendue - {str(e)}")
    
    print("\n" + "=" * 60)
    print(f"📊 RÉSULTATS: {passed}/{total} tests réussis")
    
    if passed == total:
        print("✅ Tous les tests sont passés - Backend fonctionnel")
        return True
    else:
        print(f"❌ {total - passed} test(s) échoué(s)")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)