(() => {
  "use strict";

  const PHASES = [
    { id: "metro", name: "Estação", src: "assets/fases/metro.jpg", target: { x: 47.8, y: 44.0, w: 3.2, h: 9.2 } },
    { id: "fabrica", name: "Fábrica de Bolos", src: "assets/fases/fabrica-bolos.jpg", target: { x: 49.8, y: 22.5, w: 2.8, h: 8.2 } },
    { id: "multidao", name: "Multidão", src: "assets/fases/multidao.jpg", target: { x: 62.5, y: 44.0, w: 3.8, h: 10.0 } },
    { id: "loja", name: "Loja", src: "assets/fases/loja.jpg", target: { x: 40.8, y: 20.5, w: 3.4, h: 10.5 } },
    { id: "parque", name: "Parque", src: "assets/fases/parque.jpg", target: { x: 60.5, y: 57.0, w: 3.0, h: 8.8 } },
    { id: "praia", name: "Praia", src: "assets/fases/praia.jpg", target: { x: 62.2, y: 39.0, w: 3.3, h: 10.0 } },
    { id: "centro-olimpico", name: "Centro Olímpico", src: "assets/fases/centro-olimpico.jpg", target: { x: 50.0, y: 50.0, w: 3.0, h: 9.0 } },
    { id: "teatro", name: "Estúdio de Cinema", src: "assets/fases/teatro.webp", target: { x: 50.0, y: 50.0, w: 3.0, h: 9.0 } },
    { id: "esqui", name: "Estação de Esqui", src: "assets/fases/esqui.webp", target: { x: 50.0, y: 50.0, w: 3.0, h: 9.0 } },
    { id: "troia", name: "Troia", src: "assets/fases/troia.webp", target: { x: 50.0, y: 50.0, w: 3.0, h: 9.0 } },
    { id: "pirata", name: "Piratas", src: "assets/fases/pirata.webp", target: { x: 50.0, y: 50.0, w: 3.0, h: 9.0 } },
    { id: "frutas", name: "Mundo das Frutas", src: "assets/fases/frutas.webp", target: { x: 50.0, y: 50.0, w: 3.0, h: 9.0 } },
    { id: "pascoa", name: "Páscoa", src: "assets/fases/pascoa.png", target: { x: 50.0, y: 50.0, w: 3.0, h: 9.0 } }
  ];

  const STORAGE_RANKING = "ondeEstaWallyRankingV1";
  const STORAGE_POINTS = "ondeEstaWallyHitboxesV1";
  const STORAGE_SOUND = "ondeEstaWallySoundV1";

  const el = (id) => document.getElementById(id);
  const screens = {
    menu: el("menuScreen"),
    game: el("gameScreen"),
    result: el("resultScreen")
  };

  const state = {
    player: "",
    count: 3,
    phases: [],
    index: 0,
    startedAt: 0,
    pausedAt: 0,
    pausedTotal: 0,
    running: false,
    raf: 0,
    lastElapsed: 0,
    sound: localStorage.getItem(STORAGE_SOUND) !== "off"
  };

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  function shuffle(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function formatTime(ms) {
    ms = Math.max(0, Math.floor(ms));
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    return `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}.${String(millis).padStart(3,"0")}`;
  }

  function getRanking() {
    try { return JSON.parse(localStorage.getItem(STORAGE_RANKING) || "[]"); }
    catch { return []; }
  }

  function saveRanking(records) {
    localStorage.setItem(STORAGE_RANKING, JSON.stringify(records.slice(0, 100)));
  }

  function rankingFor(count) {
    return getRanking()
      .filter(r => Number(r.count) === Number(count))
      .sort((a,b) => a.time - b.time || a.date - b.date);
  }

  function renderRanking(count) {
    const list = el("rankingList");
    const rows = rankingFor(count).slice(0, 8);
    list.innerHTML = "";
    el("rankingMode").textContent = `${count} fases`;
    el("rankingEmpty").hidden = rows.length > 0;
    rows.forEach(row => {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.className = "ranking-name";
      name.textContent = row.name;
      const time = document.createElement("span");
      time.className = "ranking-time";
      time.textContent = formatTime(row.time);
      li.append(name, time);
      list.appendChild(li);
    });
  }

  function currentTarget(phase) {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_POINTS) || "{}");
      return saved[phase.id] || phase.target;
    } catch {
      return phase.target;
    }
  }

  function applyTarget(phase) {
    const target = currentTarget(phase);
    const hitbox = el("targetHitbox");
    hitbox.style.left = `${target.x - target.w / 2}%`;
    hitbox.style.top = `${target.y - target.h / 2}%`;
    hitbox.style.width = `${target.w}%`;
    hitbox.style.height = `${target.h}%`;
  }

  function elapsedNow() {
    if (!state.startedAt) return 0;
    const end = state.running ? performance.now() : state.pausedAt;
    return Math.max(0, end - state.startedAt - state.pausedTotal);
  }

  function tick() {
    state.lastElapsed = elapsedNow();
    el("timer").textContent = formatTime(state.lastElapsed);
    if (state.running) state.raf = requestAnimationFrame(tick);
  }

  function pauseTimer() {
    if (!state.running) return;
    state.pausedAt = performance.now();
    state.running = false;
    cancelAnimationFrame(state.raf);
    state.lastElapsed = elapsedNow();
    el("timer").textContent = formatTime(state.lastElapsed);
  }

  function resumeTimer() {
    if (state.running) return;
    if (state.pausedAt) state.pausedTotal += performance.now() - state.pausedAt;
    state.pausedAt = 0;
    state.running = true;
    tick();
  }

  function beginTimer() {
    cancelAnimationFrame(state.raf);
    state.startedAt = performance.now();
    state.pausedAt = 0;
    state.pausedTotal = 0;
    state.lastElapsed = 0;
    state.running = true;
    tick();
  }

  function loadPhase(index) {
    state.index = index;
    const phase = state.phases[index];
    el("phaseLabel").textContent = `${index + 1}/${state.count}`;
    el("sceneImage").src = phase.src;
    el("sceneImage").alt = `Fase ${index + 1}: ${phase.name}`;
    applyTarget(phase);
  }

  function startGame() {
    state.player = el("playerName").value.trim().slice(0, 18) || "Jogador";
    state.count = Number(document.querySelector('input[name="phaseCount"]:checked')?.value || 3);
    state.phases = shuffle(PHASES).slice(0, state.count);
    state.index = 0;
    showScreen("game");
    loadPhase(0);
    beginTimer();
    audio.start();
  }

  async function foundTarget() {
    if (!state.running) return;
    pauseTimer();
    audio.found();
    el("foundTime").textContent = formatTime(state.lastElapsed);
    el("foundOverlay").classList.add("show");

    await new Promise(resolve => setTimeout(resolve, 900));
    el("foundOverlay").classList.remove("show");

    if (state.index + 1 < state.count) {
      loadPhase(state.index + 1);
      resumeTimer();
    } else {
      finishGame();
    }
  }

  function finishGame() {
    const total = state.lastElapsed;
    const records = getRanking();
    records.push({ name: state.player, count: state.count, time: total, date: Date.now() });
    saveRanking(records);
    const rank = rankingFor(state.count);
    const position = rank.findIndex(r => r.name === state.player && Math.abs(r.time - total) < 1) + 1;

    el("resultPlayer").textContent = `${state.player}, você encontrou o personagem em todas as fases.`;
    el("resultTime").textContent = formatTime(total);
    el("resultPosition").textContent = `#${position || rank.length}`;
    el("resultMode").textContent = `Ranking de ${state.count} fases`;
    showScreen("result");
    audio.win();
  }

  function leaveGame() {
    pauseTimer();
    showScreen("menu");
    renderRanking(Number(document.querySelector('input[name="phaseCount"]:checked')?.value || 3));
  }

  function setSound(next) {
    state.sound = next;
    localStorage.setItem(STORAGE_SOUND, next ? "on" : "off");
    el("soundMenuBtn").textContent = next ? "🔊 Música ligada" : "🔇 Música desligada";
    el("soundMenuBtn").setAttribute("aria-pressed", String(next));
    el("soundGameBtn").textContent = next ? "🔊" : "🔇";
    if (!next) audio.silence();
    else if (screens.game.classList.contains("active")) audio.start();
  }

  const audio = (() => {
    let ctx = null;
    let master = null;
    let timer = null;
    let step = 0;
    const notes = [261.63, 329.63, 392.00, 329.63, 293.66, 349.23, 440.00, 349.23];

    function ensure() {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = 0.055;
        master.connect(ctx.destination);
      }
      if (ctx.state === "suspended") ctx.resume();
    }

    function tone(freq, duration=.16, volume=.13, type="triangle", when=0) {
      if (!state.sound) return;
      ensure();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + when;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + .02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + duration + .04);
    }

    function loopNote() {
      if (!state.sound) return;
      const root = notes[step % notes.length];
      tone(root, .22, .12, "triangle");
      if (step % 2 === 0) tone(root / 2, .34, .055, "sine");
      step++;
    }

    function start() {
      if (!state.sound) return;
      ensure();
      if (timer) return;
      loopNote();
      timer = setInterval(loopNote, 430);
    }

    function silence() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    function found() {
      if (!state.sound) return;
      ensure();
      tone(523.25, .13, .2, "square", 0);
      tone(659.25, .16, .18, "square", .12);
      tone(783.99, .26, .17, "triangle", .24);
    }

    function win() {
      if (!state.sound) return;
      ensure();
      [523.25, 659.25, 783.99, 1046.5].forEach((n,i) => tone(n, .5, .16, "triangle", i*.12));
    }

    return { start, silence, found, win };
  })();

  el("startForm").addEventListener("submit", (e) => {
    e.preventDefault();
    startGame();
  });
  el("targetHitbox").addEventListener("click", foundTarget);
  el("exitBtn").addEventListener("click", leaveGame);
  el("playAgainBtn").addEventListener("click", startGame);
  el("backMenuBtn").addEventListener("click", leaveGame);
  el("soundMenuBtn").addEventListener("click", () => setSound(!state.sound));
  el("soundGameBtn").addEventListener("click", () => setSound(!state.sound));

  document.querySelectorAll('input[name="phaseCount"]').forEach(input => {
    input.addEventListener("change", () => renderRanking(Number(input.value)));
  });

  el("settingsBtn").addEventListener("click", () => el("settingsDialog").showModal());
  el("clearRankingBtn").addEventListener("click", () => {
    if (confirm("Limpar todo o ranking salvo neste navegador?")) {
      localStorage.removeItem(STORAGE_RANKING);
      renderRanking(Number(document.querySelector('input[name="phaseCount"]:checked')?.value || 3));
      el("settingsDialog").close();
    }
  });

  // Bloqueios visuais: sem arrastar imagem, sem seleção e sem menu de contexto durante o jogo.
  el("sceneImage").addEventListener("dragstart", e => e.preventDefault());
  screens.game.addEventListener("contextmenu", e => e.preventDefault());
  screens.game.addEventListener("selectstart", e => e.preventDefault());

  setSound(state.sound);
  renderRanking(3);
})();
