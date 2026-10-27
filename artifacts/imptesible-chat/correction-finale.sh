#!/data/data/com.termux/files/usr/bin/bash

set -u

PROJECT="$HOME/Limprevisible1.9Chat/LImptebisible19Chat/artifacts/imptesible-chat"
ROOT="$HOME/Limprevisible1.9Chat/LImptebisible19Chat"
PORT_LOCAL="${API_PORT:-3001}"

cd "$PROJECT" || {
  echo "ERREUR: projet introuvable."
  exit 1
}

echo "============================================================"
echo "        IMPTEBISILE CHAT — PRÉPARATION FINALE"
echo "============================================================"
echo

# ------------------------------------------------------------
# 1. Vérification
# ------------------------------------------------------------

echo "[1/15] Vérification des fichiers..."

REQUIRED=(
  "package.json"
  "app.json"
  "app/_layout.tsx"
  "server/api.js"
)

for file in "${REQUIRED[@]}"; do
  if [ -f "$file" ]; then
    echo "OK  $file"
  else
    echo "ERREUR: fichier manquant -> $file"
    exit 1
  fi
done

# ------------------------------------------------------------
# 2. Sauvegarde
# ------------------------------------------------------------

echo
echo "[2/15] Sauvegarde de sécurité..."

BACKUP="sauvegarde-finale-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"

cp server/api.js "$BACKUP/api.js" 2>/dev/null || true
cp app/_layout.tsx "$BACKUP/_layout.tsx" 2>/dev/null || true
cp package.json "$BACKUP/package.json" 2>/dev/null || true
cp app.json "$BACKUP/app.json" 2>/dev/null || true
cp .gitignore "$BACKUP/.gitignore" 2>/dev/null || true

echo "Sauvegarde créée : $BACKUP"

# ------------------------------------------------------------
# 3. Correction PORT Render
# ------------------------------------------------------------

echo
echo "[3/15] Correction du port Render..."

python - <<'PY'
from pathlib import Path

p = Path("server/api.js")
s = p.read_text(encoding="utf-8")

old = "const PORT = Number(process.env.API_PORT || 3001);"
new = "const PORT = Number(process.env.PORT || process.env.API_PORT || 3001);"

if old in s:
    s = s.replace(old, new)
    p.write_text(s, encoding="utf-8")
    print("OK: server/api.js utilise maintenant PORT en priorité.")
elif new in s:
    print("OK: PORT Render est déjà correctement configuré.")
else:
    print("ATTENTION: ligne PORT non reconnue.")
PY

grep -nE 'const PORT|server.listen' server/api.js || true

# ------------------------------------------------------------
# 4. Correction du message health
# ------------------------------------------------------------

echo
echo "[4/15] Vérification du healthcheck..."

node --check server/api.js

if [ $? -eq 0 ]; then
  echo "OK: server/api.js syntaxiquement valide."
else
  echo "ERREUR: server/api.js invalide."
  exit 1
fi

# ------------------------------------------------------------
# 5. Configuration package.json
# ------------------------------------------------------------

echo
echo "[5/15] Configuration package.json..."

node - <<'NODE'
const fs = require("fs");

const file = "package.json";
const data = JSON.parse(fs.readFileSync(file, "utf8"));

data.scripts = data.scripts || {};

data.scripts.api = "node server/api.js";
data.scripts.start = "node server/api.js";
data.scripts.typecheck = data.scripts.typecheck || "tsc -p tsconfig.json --noEmit";

fs.writeFileSync(
  file,
  JSON.stringify(data, null, 2) + "\n"
);

console.log("OK: scripts api/start/typecheck vérifiés.");
NODE

# ------------------------------------------------------------
# 6. Correction URL API Expo
# ------------------------------------------------------------

echo
echo "[6/15] Correction de l'URL API de l'application..."

python - <<'PY'
from pathlib import Path

p = Path("app/_layout.tsx")
s = p.read_text(encoding="utf-8")

old = 'setBaseUrl("http://127.0.0.1:3001");'

new = '''setBaseUrl(
  process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:3001"
);'''

if old in s:
    s = s.replace(old, new)
    p.write_text(s, encoding="utf-8")
    print("OK: URL API rendue configurable.")
elif "process.env.EXPO_PUBLIC_API_URL" in s:
    print("OK: URL API déjà configurable.")
else:
    print("ATTENTION: setBaseUrl n'a pas été modifié automatiquement.")
PY

grep -n -A3 -B2 "setBaseUrl" app/_layout.tsx || true

# ------------------------------------------------------------
# 7. Création environnement Expo
# ------------------------------------------------------------

echo
echo "[7/15] Création de la configuration d'environnement..."

cat > .env.example <<'EOF'
# URL publique de l'API Render
# À remplacer après création du service Render
EXPO_PUBLIC_API_URL=https://VOTRE-SERVICE.onrender.com
EOF

echo "OK: .env.example créé."

# ------------------------------------------------------------
# 8. Render
# ------------------------------------------------------------

echo
echo "[8/15] Création de render.yaml..."

cat > render.yaml <<'EOF'
services:
  - type: web
    name: imptesible-chat-api
    runtime: node
    buildCommand: npm install
    startCommand: npm run start
    healthCheckPath: /api/health
EOF

echo "OK: render.yaml créé."

# ------------------------------------------------------------
# 9. Gitignore propre
# ------------------------------------------------------------

echo
echo "[9/15] Nettoyage du .gitignore..."

cat > .gitignore <<'EOF'
# Dependencies
node_modules/
.pnpm-store/

# Expo
.expo/
.expo-shared/
dist/
web-build/

# Android build
android/.gradle/
android/build/
android/app/build/

# APK / AAB
*.apk
*.aab

# Backups
*.backup
*.backup-*
sauvegarde-finalisation-*/
sauvegarde-fix-*/
sauvegarde-render-*/
sauvegarde-finale-*/

# Local test data
server/data/*.json

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# Environment
.env
.env.*
!.env.example

# Temporary reports
fix-report.txt
api-health-result.json
EOF

echo "OK: .gitignore corrigé."

# ------------------------------------------------------------
# 10. Suppression uniquement des anciens fichiers temporaires
# ------------------------------------------------------------

echo
echo "[10/15] Nettoyage des anciens fichiers temporaires..."

rm -f \
  fix-imptesible.sh \
  fix-complet.sh \
  prepare-render.sh \
  package.json.backup-api-render \
  fix-report.txt \
  api-health-result.json \
  2>/dev/null || true

rm -rf \
  sauvegarde-finalisation-* \
  sauvegarde-fix-* \
  sauvegarde-render-* \
  2>/dev/null || true

echo "OK: fichiers temporaires supprimés."

# ------------------------------------------------------------
# 11. Vérification API locale
# ------------------------------------------------------------

echo
echo "[11/15] Vérification de l'API locale..."

HEALTH="$(curl -s --max-time 3 "http://127.0.0.1:${PORT_LOCAL}/api/health" 2>/dev/null || true)"

if echo "$HEALTH" | grep -q '"ok":true'; then
  echo "OK: API locale opérationnelle."
  echo "$HEALTH"
else
  echo "ATTENTION: aucune réponse valide de l'API locale."
  echo "Cela peut simplement signifier que l'API a été arrêtée."
fi

# ------------------------------------------------------------
# 12. Vérification TypeScript
# ------------------------------------------------------------

echo
echo "[12/15] Vérification TypeScript..."

if [ -x "./node_modules/.bin/tsc" ]; then
  if ./node_modules/.bin/tsc -p tsconfig.json --noEmit; then
    echo "OK: TypeScript valide."
  else
    echo "ATTENTION: TypeScript contient encore des erreurs."
    echo "Aucune suppression automatique du code."
  fi
else
  echo "ATTENTION: TypeScript local non disponible."
fi

# ------------------------------------------------------------
# 13. Vérification workspace
# ------------------------------------------------------------

echo
echo "[13/15] Vérification du workspace..."

if [ -d "$ROOT/packages" ]; then
  echo "OK: dossier packages trouvé à la racine."
else
  echo "ATTENTION: dossier packages absent à la racine."
fi

if [ -f "$ROOT/pnpm-workspace.yaml" ]; then
  echo "OK: pnpm-workspace.yaml trouvé."
else
  echo "ATTENTION: pnpm-workspace.yaml absent."
fi

if grep -q '"@workspace/api-client-react": "workspace:\*"' package.json 2>/dev/null; then
  echo "INFO: le projet utilise @workspace/api-client-react en workspace."
  echo "Le dépôt complet doit conserver la structure du workspace."
fi

# ------------------------------------------------------------
# 14. Git
# ------------------------------------------------------------

echo
echo "[14/15] Préparation Git..."

git add .gitignore \
  app.json \
  app/_layout.tsx \
  app/\(tabs\)/index.tsx \
  app/chat/\[conversationId\].tsx \
  app/contacts.tsx \
  app/search.tsx \
  components/ChatUI.tsx \
  package.json \
  server/api.js \
  render.yaml \
  .env.example \
  2>/dev/null || true

git add packages \
  pnpm-lock.yaml \
  pnpm-workspace.yaml \
  android \
  eas.json \
  expo-env.d.ts \
  2>/dev/null || true

echo
echo "Branche:"
git branch --show-current 2>/dev/null || true

echo
echo "Remote actuel:"
git remote -v 2>/dev/null || true

echo
echo "Fichiers prêts:"
git status --short

# ------------------------------------------------------------
# 15. Résultat
# ------------------------------------------------------------

echo
echo "============================================================"
echo "                 PRÉPARATION TERMINÉE"
echo "============================================================"
echo
echo "API locale:"
echo "  http://127.0.0.1:${PORT_LOCAL}/api/health"
echo
echo "URL API dans l'application:"
grep -n -A3 "setBaseUrl" app/_layout.tsx 2>/dev/null || true
echo
echo "Render:"
echo "  render.yaml"
echo
echo "Environnement:"
echo "  .env.example"
echo
echo "Sauvegarde:"
echo "  $BACKUP"
echo
echo "============================================================"
echo "IMPORTANT"
echo "============================================================"
echo
echo "1. NE PAS relancer node server/api.js si le port 3001 est occupé."
echo
echo "2. NE PAS générer l'APK finale maintenant."
echo
echo "3. Il faut d'abord mettre le projet complet sur GitHub."
echo
echo "4. Ensuite créer le service Render."
echo
echo "5. Une fois l'URL Render obtenue, par exemple:"
echo "   https://imptesible-chat-api.onrender.com"
echo
echo "6. Cette URL sera placée dans:"
echo "   EXPO_PUBLIC_API_URL"
echo
echo "7. Ensuite seulement nous construirons l'APK finale."
echo
echo "============================================================"
