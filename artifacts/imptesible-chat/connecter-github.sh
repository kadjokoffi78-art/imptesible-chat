#!/data/data/com.termux/files/usr/bin/bash

set -e

PROJECT="$HOME/Limprevisible1.9Chat/LImptebisible19Chat/artifacts/imptesible-chat"

echo "============================================================"
echo "       IMPTEBISILE CHAT — CONNEXION GITHUB"
echo "============================================================"
echo

cd "$PROJECT" || exit 1

GITHUB_USER="kadjokoffi78-art"
REPO_NAME="imptesible-chat"

echo "[1/6] Configuration Git..."
git config --global user.name "$GITHUB_USER"

read -r -p "Entre ton e-mail GitHub : " GITHUB_EMAIL

if [ -z "$GITHUB_EMAIL" ]; then
    echo "ERREUR : e-mail vide."
    exit 1
fi

git config --global user.email "$GITHUB_EMAIL"

echo
echo "Nom Git :"
git config --global user.name

echo "E-mail Git :"
git config --global user.email

echo
echo "[2/6] Vérification du projet..."
for file in package.json app.json app/_layout.tsx server/api.js render.yaml pnpm-workspace.yaml; do
    if [ -f "$file" ]; then
        echo "OK  $file"
    else
        echo "ERREUR : fichier manquant -> $file"
        exit 1
    fi
done

echo
echo "[3/6] Configuration du dépôt GitHub..."

git remote remove gitsafe-backup 2>/dev/null || true
git remote remove origin 2>/dev/null || true

git remote add origin "https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

echo "Remote configuré :"
git remote -v

echo
echo "[4/6] Préparation des fichiers..."
git add .

echo "Fichiers préparés :"
git status --short

echo
echo "[5/6] Création du commit..."

if git diff --cached --quiet; then
    echo "Aucun changement à committer."
else
    git commit -m "Préparation initiale Imptébisible Chat"
fi

echo
echo "[6/6] Vérification finale..."

echo "Branche :"
git branch --show-current

echo
echo "Remote :"
git remote -v

echo
echo "============================================================"
echo "                 GITHUB PRÊT"
echo "============================================================"
echo
echo "Le projet est maintenant relié à :"
echo "https://github.com/${GITHUB_USER}/${REPO_NAME}"
echo
echo "IMPORTANT :"
echo "Le prochain push peut demander une authentification GitHub."
echo "N'utilise PAS ton mot de passe GitHub comme mot de passe Git."
echo "Si GitHub demande une authentification, utilise la méthode"
echo "proposée par GitHub (ou un Personal Access Token)."
echo
echo "Pour envoyer le projet :"
echo
echo "    git push -u origin main"
echo
echo "============================================================"
