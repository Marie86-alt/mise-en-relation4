#!/bin/bash
# Script pour démarrer le tunnel Expo avec toutes les optimisations nécessaires

echo "🚀 Démarrage du tunnel Expo..."
echo ""

# Tuer les processus Expo/ngrok existants
pkill -9 -f "expo start" 2>/dev/null
pkill -9 -f "ngrok" 2>/dev/null
sleep 2

# Démarrer Expo avec tunnel en mode CI (pas de file watchers)
cd /app
CI=true WATCHMAN_DISABLE_CI=1 npx expo start --tunnel --no-dev > /tmp/expo_tunnel.log 2>&1 &

echo "⏳ Attente de la connexion du tunnel (20 secondes)..."
sleep 20

# Vérifier que le tunnel est prêt
if grep -q "Tunnel ready" /tmp/expo_tunnel.log; then
    echo "✅ Tunnel connecté avec succès!"
    echo ""
    
    # Récupérer l'URL du tunnel via l'API ngrok
    TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ -n "$TUNNEL_URL" ]; then
        echo "📱 URL du tunnel Expo:"
        echo "   $TUNNEL_URL"
        echo ""
        echo "🎯 Pour tester l'application:"
        echo "   1. Installez 'Expo Go' sur votre téléphone (iOS/Android)"
        echo "   2. Ouvrez Expo Go et scannez ce QR code:"
        echo "      $TUNNEL_URL"
        echo "   3. Ou entrez manuellement: exp://5vz9hx4-anonymous-8081.exp.direct"
        echo ""
        echo "📊 Interface web ngrok: http://localhost:4040"
        echo "📝 Logs Expo: tail -f /tmp/expo_tunnel.log"
    else
        echo "⚠️  Impossible de récupérer l'URL du tunnel"
        echo "Vérifiez les logs: cat /tmp/expo_tunnel.log"
    fi
else
    echo "❌ Erreur lors du démarrage du tunnel"
    echo "Vérifiez les logs: cat /tmp/expo_tunnel.log"
    exit 1
fi

echo ""
echo "💡 Le tunnel restera actif en arrière-plan."
echo "   Pour l'arrêter: pkill -9 -f 'expo start'"
