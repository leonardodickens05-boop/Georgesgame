# 🐍 Snakes & Ladders 🪜

A fully functional, dependency-free Snakes & Ladders game that runs entirely in
the browser. Built with plain HTML, CSS, and JavaScript (HTML5 Canvas).

## Play

Just open `index.html` in any modern browser — no build step, no server, no
installs required.

Or serve it locally:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Features

- **2–4 players** with custom names.
- **Optional CPU opponent** — let the last player be the computer 🤖.
- **Animated dice roll** and **step-by-step token movement**.
- **10 snakes** and **9 ladders** drawn on a classic 10×10 board.
- **Roll a 6 → take another turn.**
- **Exact-finish rule:** you must land exactly on 100; overshooting bounces you
  back.
- **Live game log**, turn indicator, and a winner celebration screen.
- Fully **responsive** layout for desktop and mobile.

## How to play

1. Choose the number of players and enter names.
2. Optionally tick "Last player is the CPU".
3. Press **Start Game**.
4. Take turns rolling the dice. Climb ladders, avoid snakes, and be the first to
   reach square 100 exactly!

## Project structure

| File         | Purpose                                            |
|--------------|----------------------------------------------------|
| `index.html` | Page structure and UI elements                     |
| `style.css`  | Styling, layout, and animations                    |
| `game.js`    | Board rendering, game state, rules, and turn logic |

## Game rules implemented

- Players start off-board and enter on their first roll.
- Landing on a ladder's base climbs to its top.
- Landing on a snake's head slides down to its tail.
- Rolling a 6 grants an extra turn.
- Reaching square 100 requires an exact roll; otherwise the token bounces back.
- First player to land exactly on 100 wins.
