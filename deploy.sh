#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "Building production bundle..."
npm run build

echo "Stashing any uncommitted changes..."
git stash --include-untracked --quiet || true

echo "Staging build assets..."
git add -f dist

echo "Creating temporary deployment commit..."
git commit -m "Temp deploy commit"

echo "Pushing build assets to gh-pages branch..."
git push origin "$(git subtree split --prefix dist HEAD)":refs/heads/gh-pages --force

echo "Reverting temporary commit..."
git reset --hard HEAD~1

echo "Restoring stashed changes..."
git stash pop --quiet 2>/dev/null || true

echo "Deployment completed successfully!"
