#!/usr/bin/env python3
"""
Script pour créer l'icône ACG personnalisé pour l'application
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_acg_icon():
    # Dimensions pour l'icône (512x512 pour la haute résolution)
    size = 512
    
    # Créer une nouvelle image avec un fond transparent
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Couleur ACG (bleu)
    acg_blue = '#247ba0'
    
    # Dessiner le cercle de fond
    circle_margin = 50
    draw.ellipse(
        [circle_margin, circle_margin, size - circle_margin, size - circle_margin],
        fill=acg_blue,
        outline=acg_blue
    )
    
    # Ajouter une ombre subtile
    shadow_offset = 8
    shadow_color = (0, 0, 0, 40)
    draw.ellipse(
        [circle_margin + shadow_offset, circle_margin + shadow_offset, 
         size - circle_margin + shadow_offset, size - circle_margin + shadow_offset],
        fill=shadow_color
    )
    
    # Redessiner le cercle principal par-dessus l'ombre
    draw.ellipse(
        [circle_margin, circle_margin, size - circle_margin, size - circle_margin],
        fill=acg_blue,
        outline=acg_blue
    )
    
    # Essayer différentes tailles de police pour "ACG"
    font_sizes = [180, 160, 140, 120, 100]
    font = None
    
    for font_size in font_sizes:
        try:
            # Essayer différents chemins de police
            font_paths = [
                '/System/Library/Fonts/Arial.ttf',  # macOS
                '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',  # Linux
                'C:\\Windows\\Fonts\\arial.ttf',  # Windows
                '/usr/share/fonts/TTF/arial.ttf',  # Arch Linux
            ]
            
            for font_path in font_paths:
                if os.path.exists(font_path):
                    font = ImageFont.truetype(font_path, font_size)
                    break
            
            if font:
                break
        except:
            continue
    
    # Si aucune police TrueType n'est trouvée, utiliser la police par défaut
    if not font:
        font = ImageFont.load_default()
    
    # Texte ACG
    text = "ACG"
    
    # Calculer la position du texte pour le centrer
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - 10  # Légèrement vers le haut
    
    # Dessiner le texte en blanc
    draw.text((x, y), text, fill='white', font=font)
    
    return img

def create_different_sizes():
    """Créer différentes tailles d'icônes pour les besoins de l'app"""
    base_icon = create_acg_icon()
    
    sizes = {
        'icon.png': 512,
        'adaptive-icon.png': 512,
        'splash-icon.png': 200,
        'favicon.png': 32
    }
    
    for filename, size in sizes.items():
        resized_icon = base_icon.resize((size, size), Image.Resampling.LANCZOS)
        output_path = f'/app/assets/images/{filename}'
        resized_icon.save(output_path, 'PNG')
        print(f"Créé: {output_path} ({size}x{size})")

if __name__ == "__main__":
    print("Création des icônes ACG...")
    create_different_sizes()
    print("✅ Icônes ACG créés avec succès!")