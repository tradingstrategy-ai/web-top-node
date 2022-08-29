#!/bin/bash
#
# Release script
#
set -e

npx prettier -w src/*.ts test/*.ts
# Generate lib
npm run build
# See files get packed correctly
npm pack
# Upload to NPM
npm publish --tag next