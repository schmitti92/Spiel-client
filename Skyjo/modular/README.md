# SKYJO modular migration (isolated development branch)

Production main remains unchanged. Backup: backup/skyjo-before-modular-20261016.

## Verified entry points
- index.html local link -> Skyjo/skyjo_action.html?mode=local
- Skyjo/skyjo_start.js builds relative skyjo_action.html URL for online play
- root skyjo_action.html redirects to Skyjo/skyjo_action.html

## Migration rules
1. Preserve the current game entrypoint and script execution order.
2. First extract CSS, then isolate JavaScript in order, then refactor into domain modules.
3. Preserve Firebase, profile scripts, URL parameters, and online room handling.
4. Keep existing game behavior and selectors identical during extraction.
5. Run static checks and multiplayer/browser regression tests before any main merge.
6. Never deploy or modify the production branch from this experiment.

## Proposed modules
- css/base.css, css/board.css, css/cards.css, css/responsive.css, css/animations.css
- js/bootstrap.js, js/state.js, js/cards.js, js/actions.js, js/online.js, js/ui.js

## Current stage
Backup and feature branch created; migration checklist committed. Source splitting and runtime verification are still pending.
