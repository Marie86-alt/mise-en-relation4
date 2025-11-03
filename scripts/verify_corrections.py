#!/usr/bin/env python3
"""Script de vérification des corrections appliquées au projet"""

import os
import sys
import json
from pathlib import Path

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def check(description, condition):
    """Affiche le résultat d'une vérification"""
    status = f"{Colors.GREEN}✅{Colors.RESET}" if condition else f"{Colors.RED}❌{Colors.RESET}"
    print(f"{status} {description}")
    return condition

def main():
    print(f"\n{Colors.BLUE}🔍 VÉRIFICATION DES CORRECTIONS{Colors.RESET}\n")
    
    root = Path.cwd()
    checks_passed = 0
    checks_total = 0
    
    # 1. Vérifier que les clés API ne sont plus dans app.json
    print(f"\n{Colors.YELLOW}📱 Frontend - Sécurité{Colors.RESET}")
    app_json_path = root / 'frontend' / 'app.json'
    if app_json_path.exists():
        with open(app_json_path) as f:
            app_json = json.load(f)
            extra = app_json.get('expo', {}).get('extra', {})
            
            checks_total += 1
            if check("Clé Stripe retirée de app.json", 'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY' not in extra):
                checks_passed += 1
            
            checks_total += 1
            if check("URL Backend retirée de app.json", 'EXPO_PUBLIC_BACKEND_URL' not in extra):
                checks_passed += 1
    
    # 2. Vérifier que .env.example existe
    print(f"\n{Colors.YELLOW}🔐 Variables d'environnement{Colors.RESET}")
    checks_total += 1
    if check("backend/.env.example existe", (root / 'backend' / '.env.example').exists()):
        checks_passed += 1
    
    checks_total += 1
    if check("frontend/.env.example existe", (root / 'frontend' / '.env.example').exists()):
        checks_passed += 1
    
    # 3. Vérifier que .gitignore contient .env
    print(f"\n{Colors.YELLOW}📝 .gitignore{Colors.RESET}")
    gitignore_path = root / '.gitignore'
    if gitignore_path.exists():
        gitignore_content = gitignore_path.read_text()
        
        checks_total += 1
        if check(".env dans .gitignore", '.env' in gitignore_content):
            checks_passed += 1
        
        checks_total += 1
        if check("*.backup dans .gitignore", '*.backup' in gitignore_content):
            checks_passed += 1
    
    # 4. Vérifier qu'il n'y a plus de fichiers backup
    print(f"\n{Colors.YELLOW}🗑️ Fichiers backup{Colors.RESET}")
    backup_files = list(root.glob('*.backup'))
    checks_total += 1
    if check("Aucun fichier .backup à la racine", len(backup_files) == 0):
        checks_passed += 1
    
    # 5. Vérifier le backend server.py
    print(f"\n{Colors.YELLOW}⚙️ Backend - Code{Colors.RESET}")
    server_py_path = root / 'backend' / 'server.py'
    if server_py_path.exists():
        server_content = server_py_path.read_text()
        
        checks_total += 1
        if check("model_dump() utilisé (Pydantic v2)", 'model_dump()' in server_content):
            checks_passed += 1
        
        checks_total += 1
        if check("lifespan utilisé (moderne)", 'lifespan' in server_content):
            checks_passed += 1
        
        checks_total += 1
        if check("Gestion d'erreurs ajoutée", 'HTTPException' in server_content):
            checks_passed += 1
        
        checks_total += 1
        if check("CORS non permissif", 'allow_origins=["*"]' not in server_content):
            checks_passed += 1
    
    # 6. Vérifier requirements.txt
    print(f"\n{Colors.YELLOW}📦 Dépendances Python{Colors.RESET}")
    requirements_path = root / 'backend' / 'requirements.txt'
    if requirements_path.exists():
        requirements_content = requirements_path.read_text()
        # Chercher jq et pandas hors commentaires
        lines = [line for line in requirements_content.split('\n') if not line.strip().startswith('#')]
        content_no_comments = '\n'.join(lines)
        
        checks_total += 1
        if check("jq retiré de requirements.txt", 'jq' not in content_no_comments):
            checks_passed += 1
        
        checks_total += 1
        if check("pandas retiré (non utilisé)", 'pandas' not in content_no_comments):
            checks_passed += 1
    
    # 7. Vérifier les fichiers de documentation
    print(f"\n{Colors.YELLOW}📚 Documentation{Colors.RESET}")
    checks_total += 1
    if check("README.md existe", (root / 'README.md').exists()):
        checks_passed += 1
    
    checks_total += 1
    if check("SECURITY.md existe", (root / 'SECURITY.md').exists()):
        checks_passed += 1
    
    # Résumé
    print(f"\n{Colors.BLUE}{'='*50}{Colors.RESET}")
    percentage = (checks_passed / checks_total * 100) if checks_total > 0 else 0
    
    if percentage == 100:
        print(f"{Colors.GREEN}🎉 TOUTES LES VÉRIFICATIONS RÉUSSIES !{Colors.RESET}")
    elif percentage >= 80:
        print(f"{Colors.YELLOW}⚠️ Quelques vérifications ont échoué{Colors.RESET}")
    else:
        print(f"{Colors.RED}❌ Plusieurs vérifications ont échoué{Colors.RESET}")
    
    print(f"\nRésultat : {checks_passed}/{checks_total} ({percentage:.1f}%)\n")
    
    return 0 if percentage == 100 else 1

if __name__ == '__main__':
    sys.exit(main())
