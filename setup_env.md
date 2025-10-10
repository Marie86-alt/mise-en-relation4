# Configuration Variables d'Environnement

## Pour Windows (Marie)

### Option 1: Créer le fichier .env dans backend/
```bash
cd backend
echo STRIPE_SECRET_KEY=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 > .env
echo MONGO_URL=mongodb://localhost:27017/mise-en-relation-prod >> .env
echo PORT=3000 >> .env
echo NODE_ENV=production >> .env
```

### Option 2: Variables d'environnement directes
```bash
set STRIPE_SECRET_KEY=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
cd backend
node server.js
```

### Option 3: PowerShell
```powershell
$env:STRIPE_SECRET_KEY="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"
cd backend
node server.js
```

## Important
- Ne jamais committer les clés secrètes dans Git
- Utiliser des variables d'environnement ou un .env local
- Le .env du backend doit contenir STRIPE_SECRET_KEY