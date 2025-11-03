# 🔐 Guide de Sécurité

## ⚠️ IMPORTANT - Clés API et Secrets

### ❌ NE JAMAIS faire :

1. **Committer des clés API** dans le code source
2. **Exposer des clés en production** dans les fichiers de configuration
3. **Utiliser les clés de production** en développement
4. **Partager des secrets** via des canaux non sécurisés
5. **Hardcoder des URLs** de services (utiliser des variables d'environnement)

### ✅ Bonnes pratiques :

1. **Toujours utiliser des fichiers `.env`**
   ```bash
   # .env (JAMAIS committé)
   STRIPE_SECRET_KEY=sk_live_xxx
   ```

2. **Créer des fichiers `.env.example`**
   ```bash
   # .env.example (committé)
   STRIPE_SECRET_KEY=sk_test_VOTRE_CLE_ICI
   ```

3. **Ajouter `.env` au `.gitignore`**
   ```gitignore
   # .gitignore
   .env
   .env.local
   .env.*.local
   ```

4. **Utiliser des clés différentes par environnement**
   - Développement : clés de test
   - Staging : clés de test dédiées
   - Production : clés live

5. **Configurer CORS correctement**
   ```python
   # ❌ Mauvais
   allow_origins=["*"]
   
   # ✅ Bon
   allow_origins=["https://votre-domaine.com"]
   ```

## 🔑 Gestion des clés API

### Stripe

- **Clés publiques** : Commencent par `pk_`
  - Peuvent être exposées côté client
  - Utilisez `pk_test_` en développement
  - Utilisez `pk_live_` en production

- **Clés secrètes** : Commencent par `sk_`
  - ⚠️ NE JAMAIS exposer côté client
  - Toujours stocker dans `.env` côté serveur
  - Ne JAMAIS committer dans Git

### Firebase

- **Configuration client** : Peut être exposée
- **Service Account Key** : ⚠️ STRICTEMENT CONFIDENTIEL
  - Stocker dans un fichier séparé
  - Ajouter au `.gitignore`
  - Utiliser des variables d'environnement en production

## 🛡️ Checklist de sécurité avant commit

- [ ] Aucune clé API hardcodée dans le code
- [ ] Tous les secrets sont dans `.env`
- [ ] `.env` est dans `.gitignore`
- [ ] `.env.example` existe avec des valeurs factices
- [ ] CORS configuré avec des origines spécifiques
- [ ] Validation des entrées utilisateur
- [ ] Gestion d'erreurs sans révéler d'informations sensibles

## 🚨 En cas de fuite de clé

1. **Révoquer immédiatement** la clé compromise
2. **Générer une nouvelle clé**
3. **Mettre à jour** tous les environnements
4. **Auditer** l'utilisation de l'ancienne clé
5. **Supprimer** la clé de l'historique Git si nécessaire

## 📞 Contact Sécurité

Pour signaler une vulnérabilité, contactez : [votre-email-securite]
