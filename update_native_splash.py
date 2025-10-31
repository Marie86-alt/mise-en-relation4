#!/usr/bin/env python3
"""
Script pour remplacer les icônes splash natives Android par le nouveau logo ACG
"""

import os
import shutil
from PIL import Image

def create_and_copy_splash_icons():
    """Créer et copier les icônes splash pour toutes les résolutions Android"""
    
    # Charger notre icône de base
    base_icon = Image.open('/app/assets/images/splash-icon.png')
    
    # Définir les résolutions pour chaque dossier drawable
    resolutions = {
        'drawable-mdpi': 48,      # ~48x48
        'drawable-hdpi': 72,      # ~72x72  
        'drawable-xhdpi': 96,     # ~96x96
        'drawable-xxhdpi': 144,   # ~144x144
        'drawable-xxxhdpi': 192,  # ~192x192
    }
    
    for folder, size in resolutions.items():
        # Redimensionner l'icône
        resized_icon = base_icon.resize((size, size), Image.Resampling.LANCZOS)
        
        # Chemin de destination
        dest_path = f'/app/android/app/src/main/res/{folder}/splashscreen_logo.png'
        
        # Créer le dossier s'il n'existe pas
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        
        # Sauvegarder l'icône
        resized_icon.save(dest_path, 'PNG')
        print(f"✅ Mis à jour: {dest_path} ({size}x{size})")

def update_launcher_icons():
    """Mettre à jour aussi les icônes de launcher pour la cohérence"""
    
    # Charger notre icône de base 
    base_icon = Image.open('/app/assets/images/icon.png')
    
    # Résolutions pour les icônes launcher
    launcher_resolutions = {
        'mipmap-mdpi': 48,
        'mipmap-hdpi': 72,
        'mipmap-xhdpi': 96, 
        'mipmap-xxhdpi': 144,
        'mipmap-xxxhdpi': 192
    }
    
    for folder, size in launcher_resolutions.items():
        # Redimensionner l'icône
        resized_icon = base_icon.resize((size, size), Image.Resampling.LANCZOS)
        
        # Sauvegarder en format WebP pour Android
        dest_path = f'/app/android/app/src/main/res/{folder}/ic_launcher_foreground.webp'
        
        # Créer le dossier s'il n'existe pas
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        
        # Sauvegarder en WebP
        resized_icon.save(dest_path, 'WEBP')
        print(f"✅ Mis à jour: {dest_path} ({size}x{size})")

if __name__ == "__main__":
    print("🔄 Mise à jour des icônes splash natives Android...")
    create_and_copy_splash_icons()
    
    print("\n🔄 Mise à jour des icônes launcher...")
    update_launcher_icons()
    
    print("\n✅ Tous les icônes natifs Android ont été mis à jour avec le logo ACG!")
    print("📱 Redémarrez l'application pour voir les changements.")