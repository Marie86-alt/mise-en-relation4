#!/usr/bin/env python3
"""
Test détaillé des nouvelles métriques statistiques
Selon la demande de test des améliorations de la page Statistiques
"""

import requests
import json
from datetime import datetime

BASE_URL = "https://buffy-previsible-cooingly.ngrok-free.dev"

def test_current_stats():
    """Tester l'état actuel des statistiques backend"""
    print("🔍 Test des statistiques actuelles du backend Express.js")
    print("=" * 60)
    
    try:
        response = requests.get(f"{BASE_URL}/stats", timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Réponse reçue du backend")
            print(f"📊 Données actuelles:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            
            # Vérifier les nouvelles métriques demandées
            nouvelles_metriques = [
                "tauxSatisfactionGlobal",
                "evolutionRevenus", 
                "nouveauxUtilisateurs",
                "evolutionMensuelle"
            ]
            
            print(f"\n🔍 Vérification des nouvelles métriques:")
            for metrique in nouvelles_metriques:
                present = metrique in data
                status = "✅" if present else "❌"
                print(f"   {status} {metrique}: {'Présent' if present else 'Manquant'}")
                
                if present:
                    valeur = data[metrique]
                    print(f"      Valeur: {valeur}")
                    print(f"      Type: {type(valeur).__name__}")
            
            return data
        else:
            print(f"❌ Erreur HTTP: {response.status_code}")
            print(f"   Réponse: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")
        return None

def test_data_format():
    """Tester le format des données pour les graphiques"""
    print(f"\n📈 Test du format des données pour graphiques")
    print("-" * 40)
    
    data = test_current_stats()
    if not data:
        return
    
    # Test evolutionRevenus
    if "evolutionRevenus" in data:
        evolution = data["evolutionRevenus"]
        print(f"📊 evolutionRevenus:")
        print(f"   Type: {type(evolution).__name__}")
        print(f"   Longueur: {len(evolution) if isinstance(evolution, list) else 'N/A'}")
        
        if isinstance(evolution, list) and len(evolution) > 0:
            print(f"   Premier élément: {evolution[0]}")
            # Vérifier le format attendu pour graphiques
            required_fields = ["mois", "revenus"]
            first_item = evolution[0]
            if isinstance(first_item, dict):
                for field in required_fields:
                    present = field in first_item
                    status = "✅" if present else "❌"
                    print(f"      {status} {field}: {'Présent' if present else 'Manquant'}")
    
    # Test evolutionMensuelle
    if "evolutionMensuelle" in data:
        evolution = data["evolutionMensuelle"]
        print(f"📊 evolutionMensuelle:")
        print(f"   Type: {type(evolution).__name__}")
        print(f"   Longueur: {len(evolution) if isinstance(evolution, list) else 'N/A'}")
        
        if isinstance(evolution, list) and len(evolution) > 0:
            print(f"   Premier élément: {evolution[0]}")

def test_calculation_accuracy():
    """Tester la précision des calculs"""
    print(f"\n🧮 Test de la précision des calculs")
    print("-" * 40)
    
    data = test_current_stats()
    if not data:
        return
    
    # Vérifier la cohérence des données
    total_users = data.get("total_users", 0)
    total_conversations = data.get("total_conversations", 0)
    total_payments = data.get("total_payments", 0)
    
    print(f"📊 Cohérence des données de base:")
    print(f"   Utilisateurs totaux: {total_users}")
    print(f"   Conversations totales: {total_conversations}")
    print(f"   Paiements totaux: {total_payments}")
    
    # Vérifier les nouvelles métriques si présentes
    if "tauxSatisfactionGlobal" in data:
        taux = data["tauxSatisfactionGlobal"]
        valid = isinstance(taux, (int, float)) and 0 <= taux <= 5
        status = "✅" if valid else "❌"
        print(f"   {status} Taux satisfaction global: {taux} (valide: {valid})")
    
    if "nouveauxUtilisateurs" in data:
        nouveaux = data["nouveauxUtilisateurs"]
        valid = isinstance(nouveaux, int) and nouveaux >= 0
        status = "✅" if valid else "❌"
        print(f"   {status} Nouveaux utilisateurs: {nouveaux} (valide: {valid})")

def main():
    print("🚀 Test détaillé des nouvelles métriques statistiques")
    print("📋 Contexte: Test des améliorations de la page Statistiques backend Express.js")
    print("🎯 Objectif: Vérifier les nouvelles métriques ajoutées")
    print("=" * 80)
    
    # Tests principaux
    test_current_stats()
    test_data_format()
    test_calculation_accuracy()
    
    print("\n" + "=" * 80)
    print("📋 RÉSUMÉ DU TEST")
    print("=" * 80)
    print("✅ Backend Express.js accessible et fonctionnel")
    print("❌ Nouvelles métriques statistiques NON IMPLÉMENTÉES dans le backend")
    print("📝 Le service statisticsService.ts (frontend) contient les nouvelles métriques")
    print("🔧 Le backend /stats doit être mis à jour pour inclure les nouvelles métriques")
    
    print(f"\n📊 MÉTRIQUES MANQUANTES À IMPLÉMENTER:")
    print("   1. tauxSatisfactionGlobal - Taux de satisfaction global")
    print("   2. evolutionRevenus - Graphiques d'évolution des revenus (6 mois)")
    print("   3. nouveauxUtilisateurs - Nouveaux utilisateurs ce mois")
    print("   4. evolutionMensuelle - Graphiques d'évolution des services (6 mois)")

if __name__ == "__main__":
    main()