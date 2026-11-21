# The Quiet Stacks

A top-down stealth game set in a library after closing time. You are a
reader's apprentice who has stayed too late: slip past the night
wardens, collect the wax seals if you dare, and reach the exit door
unseen — across three floors, with three lives.

- **Guards with vision cones** — cones are clipped by shelves, so cover
  is real: break line of sight and you break the chase.
- **Cover to hide behind** — bookshelves block sight and movement;
  fern planters hide you even inside a cone.
- **An exit to reach unseen** — finish a floor without being spotted
  for the ghost bonus.
- **Distraction** — toss a pebble (click or Space) and wardens in
  earshot walk over to listen.
- **Tiptoe** — hold Shift to move slower and be spotted far more slowly.

## Play

Open `game/index.html` in desktop Chrome (or `node serve.ts` and visit
http://127.0.0.1:8080). WASD / arrows to move, Shift to tiptoe, click
or Space to toss a pebble, P to pause, R to restart the floor, M to
mute. Sound is synthesized in the browser; no audio files, no network
requests, nothing leaves the machine.

## Layout

- `game/` — the playable game as static files
- `game/src/` — one file per job: `config`, `levels`, `vision`,
  `guard`, `player`, `audio`, `render`, `game`, `main`, `shots`
- `screenshots/` — four real renders of the game's own code
- `main.ts` — the hand-in program; copies `game/` and `screenshots/`
  to `/output` and writes `dossier.json` with the kit's `buildDossier`
- `serve.ts` — a tiny static server for play-testing

## License

MIT — see `LICENSE`.
