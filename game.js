/* Snakes & Ladders — vanilla JS implementation
 * Board: 10x10 grid, squares 1..100 in boustrophedon (snake) order.
 * Features: 2-4 players, optional CPU, animated token movement,
 * snakes & ladders, exact-finish rule, game log, win detection.
 */

(() => {
  "use strict";

  // ---- Configuration -----------------------------------------------------
  const SIZE = 10;            // 10x10 board
  const CELL = 60;            // pixel size of each cell (canvas is 600x600)
  const FINAL = SIZE * SIZE;  // 100

  // Snakes: head (top) -> tail (bottom). Landing on a head slides you down.
  const SNAKES = {
    16: 6,
    47: 26,
    49: 11,
    56: 53,
    62: 19,
    64: 60,
    87: 24,
    93: 73,
    95: 75,
    98: 78,
  };

  // Ladders: bottom -> top. Landing on a bottom climbs you up.
  const LADDERS = {
    1: 38,
    4: 14,
    9: 31,
    21: 42,
    28: 84,
    36: 44,
    51: 67,
    71: 91,
    80: 100,
  };

  const PLAYER_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308"];
  const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

  // ---- DOM ---------------------------------------------------------------
  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const setupEl = document.getElementById("setup");
  const gameEl = document.getElementById("game");
  const playerCountEl = document.getElementById("playerCount");
  const nameInputsEl = document.getElementById("nameInputs");
  const autoCpuEl = document.getElementById("autoCpu");
  const startBtn = document.getElementById("startBtn");
  const playerListEl = document.getElementById("playerList");
  const diceEl = document.getElementById("dice");
  const rollBtn = document.getElementById("rollBtn");
  const statusEl = document.getElementById("status");
  const logEl = document.getElementById("log");
  const restartBtn = document.getElementById("restartBtn");
  const overlayEl = document.getElementById("overlay");
  const winTextEl = document.getElementById("winText");
  const playAgainBtn = document.getElementById("playAgainBtn");

  // ---- State -------------------------------------------------------------
  let players = [];
  let current = 0;
  let busy = false;      // true while an animation/turn is resolving
  let gameOver = false;

  // ---- Board geometry ----------------------------------------------------
  // Convert a square number (1..100) to canvas pixel coordinates (center).
  function squareToXY(square) {
    const idx = square - 1;
    const row = Math.floor(idx / SIZE);          // 0 = bottom row
    let col = idx % SIZE;
    if (row % 2 === 1) col = SIZE - 1 - col;      // reverse on odd rows
    const x = col * CELL + CELL / 2;
    const y = (SIZE - 1 - row) * CELL + CELL / 2; // invert so row 0 is bottom
    return { x, y };
  }

  // ---- Rendering ---------------------------------------------------------
  function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Cells
    for (let s = 1; s <= FINAL; s++) {
      const { x, y } = squareToXY(s);
      const left = x - CELL / 2;
      const top = y - CELL / 2;

      const light = (Math.floor((s - 1) / SIZE) + (s - 1)) % 2 === 0;
      ctx.fillStyle = light ? "#f8fafc" : "#e2e8f0";
      ctx.fillRect(left, top, CELL, CELL);

      ctx.strokeStyle = "#cbd5e1";
      ctx.strokeRect(left, top, CELL, CELL);

      ctx.fillStyle = "#475569";
      ctx.font = "12px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(String(s), left + 4, top + 4);
    }

    drawLadders();
    drawSnakes();
    drawTokens();
  }

  function drawLadders() {
    ctx.lineCap = "round";
    for (const [from, to] of Object.entries(LADDERS)) {
      const a = squareToXY(Number(from));
      const b = squareToXY(Number(to));
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const perp = angle + Math.PI / 2;
      const w = 8; // half rail spacing
      const ox = Math.cos(perp) * w;
      const oy = Math.sin(perp) * w;

      ctx.strokeStyle = "#a16207";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(a.x + ox, a.y + oy);
      ctx.lineTo(b.x + ox, b.y + oy);
      ctx.moveTo(a.x - ox, a.y - oy);
      ctx.lineTo(b.x - ox, b.y - oy);
      ctx.stroke();

      // rungs
      ctx.lineWidth = 3;
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const rungs = Math.max(2, Math.floor(dist / 22));
      for (let i = 1; i < rungs; i++) {
        const t = i / rungs;
        const cx = a.x + (b.x - a.x) * t;
        const cy = a.y + (b.y - a.y) * t;
        ctx.beginPath();
        ctx.moveTo(cx + ox, cy + oy);
        ctx.lineTo(cx - ox, cy - oy);
        ctx.stroke();
      }
    }
  }

  function drawSnakes() {
    ctx.lineCap = "round";
    for (const [head, tail] of Object.entries(SNAKES)) {
      const a = squareToXY(Number(head)); // head (top)
      const b = squareToXY(Number(tail)); // tail (bottom)

      // wavy body
      ctx.strokeStyle = "#16a34a";
      ctx.lineWidth = 9;
      ctx.beginPath();
      const segments = 18;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len; // normal
      const ny = dx / len;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const wave = Math.sin(t * Math.PI * 3) * 10;
        const px = a.x + dx * t + nx * wave;
        const py = a.y + dy * t + ny * wave;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // head
      ctx.fillStyle = "#15803d";
      ctx.beginPath();
      ctx.arc(a.x, a.y, 8, 0, Math.PI * 2);
      ctx.fill();
      // eyes
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(a.x - 3, a.y - 2, 2, 0, Math.PI * 2);
      ctx.arc(a.x + 3, a.y - 2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(a.x - 3, a.y - 2, 1, 0, Math.PI * 2);
      ctx.arc(a.x + 3, a.y - 2, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawTokens() {
    // Group players by square so tokens on the same square don't overlap.
    const bySquare = {};
    players.forEach((p, i) => {
      (bySquare[p.pos] = bySquare[p.pos] || []).push(i);
    });

    players.forEach((p, i) => {
      const base = p.pos < 1 ? null : squareToXY(p.pos);
      const start = { x: CELL / 2, y: canvas.height + CELL }; // off-board start
      const center = base || start;

      const group = bySquare[p.pos] || [i];
      const order = group.indexOf(i);
      const n = group.length;
      // spread tokens around the cell center
      const spread = n > 1 ? 12 : 0;
      const ang = (order / n) * Math.PI * 2;
      const px = center.x + Math.cos(ang) * spread;
      const py = center.y + Math.sin(ang) * spread;

      if (p.pos < 1) return; // not on board yet

      ctx.beginPath();
      ctx.arc(px, py, 11, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = i === current && !gameOver ? "#fff" : "rgba(255,255,255,.65)";
      ctx.stroke();
    });
  }

  // ---- Animation ---------------------------------------------------------
  // Animate a token stepping square-by-square from `start` to `end`.
  function animateMove(player, start, end) {
    return new Promise((resolve) => {
      const step = end >= start ? 1 : -1;
      let pos = start;

      function next() {
        if (pos === end) {
          resolve();
          return;
        }
        pos += step;
        player.pos = pos;
        drawBoard();
        setTimeout(next, 140);
      }
      next();
    });
  }

  // Smooth slide for snakes/ladders (jump directly with a short delay).
  function animateJump(player, end) {
    return new Promise((resolve) => {
      setTimeout(() => {
        player.pos = end;
        drawBoard();
        resolve();
      }, 350);
    });
  }

  // ---- Game flow ---------------------------------------------------------
  function rollDie() {
    return Math.floor(Math.random() * 6) + 1;
  }

  function log(message, kind) {
    const li = document.createElement("li");
    li.textContent = message;
    if (kind) li.className = kind;
    logEl.prepend(li);
  }

  function updatePlayerList() {
    playerListEl.innerHTML = "";
    players.forEach((p, i) => {
      const li = document.createElement("li");
      if (i === current && !gameOver) li.classList.add("active");

      const dot = document.createElement("span");
      dot.className = "token-dot";
      dot.style.background = p.color;

      const name = document.createElement("span");
      name.className = "player-name";
      name.textContent = p.name + (p.isCpu ? " 🤖" : "");

      const pos = document.createElement("span");
      pos.className = "player-pos";
      pos.textContent = p.pos < 1 ? "Start" : `Sq ${p.pos}`;

      li.append(dot, name, pos);
      playerListEl.appendChild(li);
    });
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  async function takeTurn() {
    if (busy || gameOver) return;
    busy = true;
    rollBtn.disabled = true;

    const player = players[current];

    // Dice roll animation
    diceEl.classList.add("rolling");
    const roll = rollDie();
    let flips = 0;
    const flipTimer = setInterval(() => {
      diceEl.textContent = DICE_FACES[Math.floor(Math.random() * 6)];
      if (++flips > 6) clearInterval(flipTimer);
    }, 70);

    await wait(520);
    clearInterval(flipTimer);
    diceEl.textContent = DICE_FACES[roll - 1];
    diceEl.classList.remove("rolling");

    log(`${player.name} rolled a ${roll}.`);
    setStatus(`${player.name} rolled ${roll}.`);

    const startPos = Math.max(player.pos, 0);
    let target = startPos + roll;

    // Exact-finish rule: must land exactly on 100, otherwise no move (bounce).
    if (target > FINAL) {
      const overshoot = target - FINAL;
      target = FINAL - overshoot; // bounce back
      log(`${player.name} overshoots 100 and bounces back to ${target}.`);
      setStatus(`${player.name} needs an exact roll — bounces back!`);
    }

    await animateMove(player, startPos, target);

    // Win check (after reaching, before snake/ladder which can't be on 100 here)
    if (player.pos === FINAL) {
      finishGame(player);
      return;
    }

    // Snakes & ladders
    if (LADDERS[player.pos]) {
      const to = LADDERS[player.pos];
      log(`🪜 ${player.name} climbs a ladder from ${player.pos} to ${to}!`, "good");
      setStatus(`${player.name} climbs a ladder!`);
      await animateJump(player, to);
    } else if (SNAKES[player.pos]) {
      const to = SNAKES[player.pos];
      log(`🐍 ${player.name} is bitten! Slides from ${player.pos} down to ${to}.`, "bad");
      setStatus(`${player.name} hit a snake!`);
      await animateJump(player, to);
    }

    if (player.pos === FINAL) {
      finishGame(player);
      return;
    }

    // Roll of 6 grants another turn; otherwise pass to next player.
    const extraTurn = roll === 6;
    if (extraTurn) {
      log(`${player.name} rolled a 6 — gets another turn!`);
    } else {
      current = (current + 1) % players.length;
    }

    updatePlayerList();
    busy = false;

    const next = players[current];
    if (gameOver) return;

    if (next.isCpu) {
      setStatus(`${next.name} (CPU) is thinking…`);
      rollBtn.disabled = true;
      await wait(800);
      takeTurn();
    } else {
      setStatus(`${next.name}, it's your turn. Roll the dice!`);
      rollBtn.disabled = false;
    }
  }

  function finishGame(winner) {
    gameOver = true;
    busy = false;
    rollBtn.disabled = true;
    log(`🏆 ${winner.name} reached 100 and wins the game!`, "good");
    setStatus(`${winner.name} wins! 🎉`);
    updatePlayerList();
    drawBoard();
    winTextEl.textContent = `🎉 ${winner.name} Wins! 🎉`;
    overlayEl.classList.remove("hidden");
  }

  function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // ---- Setup -------------------------------------------------------------
  function renderNameInputs() {
    const count = Number(playerCountEl.value);
    nameInputsEl.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const row = document.createElement("div");
      row.className = "name-row";
      const label = document.createElement("label");
      label.className = "field";
      label.textContent = `Player ${i + 1} name`;
      const input = document.createElement("input");
      input.type = "text";
      input.value = `Player ${i + 1}`;
      input.maxLength = 16;
      input.dataset.index = String(i);
      label.appendChild(input);
      row.appendChild(label);
      nameInputsEl.appendChild(row);
    }
  }

  function startGame() {
    const count = Number(playerCountEl.value);
    const inputs = nameInputsEl.querySelectorAll("input[type='text']");
    const cpuOn = autoCpuEl.checked;

    players = [];
    inputs.forEach((input, i) => {
      const isCpu = cpuOn && i === count - 1;
      const name = (input.value.trim() || `Player ${i + 1}`);
      players.push({
        name: isCpu ? `${name}` : name,
        color: PLAYER_COLORS[i],
        pos: 0,           // 0 = off-board / start
        isCpu,
      });
    });

    current = 0;
    busy = false;
    gameOver = false;
    logEl.innerHTML = "";
    overlayEl.classList.add("hidden");

    setupEl.classList.add("hidden");
    gameEl.classList.remove("hidden");

    updatePlayerList();
    drawBoard();
    log("Game started! Good luck. 🎲");

    if (players[current].isCpu) {
      setStatus(`${players[current].name} (CPU) is thinking…`);
      rollBtn.disabled = true;
      wait(800).then(takeTurn);
    } else {
      setStatus(`${players[current].name}, press “Roll Dice” to begin.`);
      rollBtn.disabled = false;
    }
  }

  function backToSetup() {
    gameOver = true;
    overlayEl.classList.add("hidden");
    gameEl.classList.add("hidden");
    setupEl.classList.remove("hidden");
  }

  // ---- Events ------------------------------------------------------------
  playerCountEl.addEventListener("change", renderNameInputs);
  startBtn.addEventListener("click", startGame);
  rollBtn.addEventListener("click", takeTurn);
  restartBtn.addEventListener("click", backToSetup);
  playAgainBtn.addEventListener("click", backToSetup);

  // ---- Init --------------------------------------------------------------
  renderNameInputs();
  drawBoard();
})();
