# Solution pour résoudre l'erreur Git merge

## Problème
```
error: invalid path '?��@@��9@8'
Merge with strategy ort failed.
```

## Solutions à essayer (dans l'ordre)

### Solution 1 : Reset et re-pull
```bash
cd mise-en-relation2
git reset --hard HEAD~1
git clean -fd
git pull origin main
```

### Solution 2 : Si la solution 1 ne marche pas
```bash
cd mise-en-relation2
git fetch origin
git reset --hard origin/main
```

### Solution 3 : Clone fresh si nécessaire
```bash
cd ..
mv mise-en-relation2 mise-en-relation2-backup
git clone https://github.com/Marie86-alt/mise-en-relation2.git
cd mise-en-relation2
```

### Solution 4 : Nettoyer les fichiers corrompus (si le problème persiste)
```bash
cd mise-en-relation2
git ls-files | grep -P '[^\x00-\x7F]' | xargs git rm
git commit -m "Remove files with invalid characters"
git push origin main
```

## Explication
Le problème vient d'un fichier avec des caractères non-ASCII dans le nom qui n'est pas compatible avec Windows. Ce type de fichier peut être créé accidentellement lors du développement et cause des problèmes de merge.

## Vérification après correction
```bash
git status
git log --oneline -5
```

L'état devrait être propre sans fichiers non trackés avec des noms étranges.