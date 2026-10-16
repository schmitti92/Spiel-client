# SKYJO modular smoke tests

Run with Node.js (no npm dependencies):

```sh
node Skyjo/modular/js/test-modules.cjs
```

The test executes the three small modules in an isolated VM, checks scoring, room-code normalization/generation, card/action object structure, script ordering, legacy delegation, and exact reconstruction from seven source fragments.

These are **unit/static tests**, not browser or multiplayer tests. Before merging to production, manually test online room creation, joining, reconnecting, turn progression, action cards, Joker rules, and final scoring on at least two devices.
