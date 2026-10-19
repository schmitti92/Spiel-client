# SKYJO JavaScript source fragments

These seven `part-XX.jsfrag` files are ordered **source fragments**, not standalone browser scripts or independent ES modules. They must be concatenated exactly in filename order using `python3 Skyjo/modular/js/build.py` to regenerate `Skyjo/modular/js/legacy.js`.

Why: the existing SKYJO game code lives inside one shared IIFE with lexical dependencies. Splitting it into separate `<script>` tags would break shared `const`/`let` scope and could break online gameplay.

After changing any fragment, run:

```sh
python3 Skyjo/modular/js/build.py
python3 Skyjo/modular/js/build.py --check
python3 Skyjo/modular/check_extraction.py
```

Then test in a browser and with multiple players before merging to main. The production site still uses `main` and is unchanged.
