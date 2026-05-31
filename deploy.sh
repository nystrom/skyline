#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "Building production bundle..."
npm run build

echo "Staging build assets..."
git add -f dist

echo "Creating temporary deployment commit..."
git commit -m "Temp deploy commit"

echo "Pushing build assets to gh-pages branch..."
git push origin $(git subtree split --prefix dist main):refs/heads/gh-pages --force

echo "Reverting temporary commit to restore clean workspace..."
git reset --hard HEAD~1

echo "Deployment completed successfully!"
