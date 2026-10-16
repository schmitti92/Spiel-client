# SKYJO modular migration — development only

**Production main is unchanged.** Immutable starting snapshot: `backup/skyjo-before-modular-20261016`.

## Implemented
- Extracted the single inline stylesheet into `css/legacy.css`.
- Extracted the large inline game script into `js/legacy.js`.
- Replaced embedded blocks in `../skyjo_action.html` with linked assets, preserving their relative execution position.
- Rebased CSS references from `../Assets/` to `../../../Assets/`.

## Verified statically
- New HTML references both extracted files.
- Existing profile/Firebase script tags remain in their original order.
- Existing local/online entry points still target `Skyjo/skyjo_action.html`.
- Production `main` was not changed.

## Known issues and required follow-up
- Four optional theme images under `Assets/skyjo-themes/` are referenced by CSS but not present on main. Check whether fallback behavior is acceptable.
- Browser gameplay, online rooms, multiple players, and special actions have NOT been regression-tested.
- The large legacy CSS and JS are now separated, but not yet decomposed into small functional modules.
- Do not merge this branch into main until browser and multiplayer tests pass.

## Testing
Run `python3 Skyjo/modular/check_extraction.py` from the repository root. Follow with browser and multiplayer regression tests.
