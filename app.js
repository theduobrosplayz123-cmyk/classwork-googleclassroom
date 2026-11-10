(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, props = {}, html = "") => Object.assign(document.createElement(tag), props, html ? { innerHTML: html } : {});
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const BROWSER_HOME = "https://bull.gcranjit.com.np/";
  const GAMES_HOME = "https://unpkg.com/unblocking@1.0.6/index.html?from=https%3A%2F%2Fstorage.googleapis.com%2Feducationate%2Findex.html&mid=u1";
  const SEARCH = (q) => "https://duckduckgo.com/?q=" + encodeURIComponent(q);

  /* ---------------- App registry ---------------- */
  const APPS = {
    browser: { name: "Cyber OS", glyph: "🌐", desc: "Web browser with DuckDuckGo search", core: true, w: 1000, h: 640, open: (b) => webView(b, BROWSER_HOME) },
    games:   { name: "Cyber Games", glyph: "🎮", desc: "Play games in a built-in browser", w: 1000, h: 660, open: (b) => webView(b, GAMES_HOME) },
    tube:    { name: "Syber-Tube", glyph: "🎵", desc: "Synthwave music player", w: 760, h: 520, open: tubeApp },
    weather: { name: "Weather", glyph: "⛅", desc: "Current weather + forecast", w: 560, h: 520, open: weatherApp },
    store:   { name: "Syber-Store", glyph: "🛍️", desc: "Install apps for free", core: true, w: 760, h: 540, open: storeApp },
  };

  /* ---------------- Install state (per visitor) ---------------- */
  const KEY = "cyberos.installed";
  const loadInstalled = () => { try { return new Set(JSON.parse(localStorage.getItem(KEY)) || ["weather"]); } catch { return new Set(["weather"]); } };
  let installed = loadInstalled();
  const isInstalled = (id) => APPS[id].core || installed.has(id);
  const saveInstalled = () => { try { localStorage.setItem(KEY, JSON.stringify([...installed])); } catch {} };
  const changeListeners = new Set();
  function setInstalled(id, on) {
    on ? installed.add(id) : installed.delete(id);
    saveInstalled();
    if (!on) closeWin(id);
    renderLaunchers();
    changeListeners.forEach((f) => f());
  }

  /* ---------------- Launchers ---------------- */
  function iconBtn(id) {
    const a = APPS[id];
    const b = el("button", { className: "icon", title: a.name }, `<div class="glyph">${a.glyph}</div>${esc(a.name)}`);
    b.addEventListener("click", () => { launch(id); hideStart(); });
    return b;
  }
  function renderLaunchers() {
    const ids = Object.keys(APPS).filter(isInstalled);
    $("#icons").replaceChildren(...ids.map(iconBtn));
    filterStart();
    $("#tb-apps").replaceChildren(...ids.map((id) => {
      const b = el("button", { className: "tb-app", title: APPS[id].name, textContent: APPS[id].glyph });
      b.dataset.app = id;
      b.addEventListener("click", () => taskbarClick(id));
      return b;
    }));
    syncTaskbar();
  }

  /* ---------------- Window manager ---------------- */
  const wins = new Map();
  let z = 10, cascade = 0;

  function launch(id) {
    if (!isInstalled(id)) { launch("store"); return; }
    const existing = wins.get(id);
    if (existing) { existing.classList.remove("min"); focusWin(id); return existing; }
    const a = APPS[id];
    const area = $("#desktop").getBoundingClientRect();
    const w = Math.min(a.w, area.width - 20), h = Math.min(a.h, area.height - 20);
    const off = (cascade++ % 6) * 28;
    const win = el("section", { className: "win" });
    win.style.cssText = `width:${w}px;height:${h}px;left:${Math.max(10, (area.width - w) / 2 - 80 + off)}px;top:${Math.max(10, (area.height - h) / 2 - 40 + off)}px`;
    win.innerHTML = `<div class="titlebar"><span>${a.glyph}</span><span class="t">${esc(a.name)}</span>
      <button class="mn" title="Minimize">—</button><button class="mx" title="Maximize">▢</button><button class="x" title="Close">✕</button></div><div class="body"></div>`;
    const tb = $(".titlebar", win);
    $(".mn", win).onclick = () => { win.classList.add("min"); syncTaskbar(); };
    $(".mx", win).onclick = () => win.classList.toggle("max");
    $(".x", win).onclick = () => closeWin(id);
    tb.addEventListener("dblclick", (e) => { if (!e.target.closest("button")) win.classList.toggle("max"); });
    win.addEventListener("pointerdown", () => focusWin(id), true);
    drag(win, tb);
    $("#windows").append(win);
    wins.set(id, win);
    win._cleanup = a.open($(".body", win), win) || null;
    focusWin(id);
    return win;
  }
  function closeWin(id) {
    const w = wins.get(id);
    if (!w) return;
    if (typeof w._cleanup === "function") w._cleanup();
    w.remove();
    wins.delete(id);
    syncTaskbar();
  }
  function focusWin(id) {
    wins.forEach((w) => w.classList.remove("active"));
    const w = wins.get(id);
    if (w) { w.style.zIndex = ++z; w.classList.add("active"); }
    syncTaskbar();
  }
  function taskbarClick(id) {
    const w = wins.get(id);
    if (!w) return launch(id);
    if (w.classList.contains("min")) { w.classList.remove("min"); focusWin(id); }
    else if (w.classList.contains("active")) { w.classList.add("min"); w.classList.remove("active"); syncTaskbar(); }
    else focusWin(id);
  }
  function syncTaskbar() {
    document.querySelectorAll(".tb-app").forEach((b) => {
      const w = wins.get(b.dataset.app);
      b.classList.toggle("open", !!w);
      b.classList.toggle("focused", !!w && w.classList.contains("active") && !w.classList.contains("min"));
    });
  }
  function drag(win, handle) {
    handle.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button") || win.classList.contains("max")) return;
      const sx = e.clientX - win.offsetLeft, sy = e.clientY - win.offsetTop;
      const area = $("#desktop");
      handle.setPointerCapture(e.pointerId);
      // iframes swallow pointer events mid-drag; disable them while dragging
      win.querySelectorAll("iframe").forEach((f) => (f.style.pointerEvents = "none"));
      const move = (ev) => {
        win.style.left = Math.min(Math.max(ev.clientX - sx, -win.offsetWidth + 80), area.clientWidth - 80) + "px";
        win.style.top = Math.min(Math.max(ev.clientY - sy, 0), area.clientHeight - 38) + "px";
      };
      const up = () => {
        handle.removeEventListener("pointermove", move);
        win.querySelectorAll("iframe").forEach((f) => (f.style.pointerEvents = ""));
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up, { once: true });
    });
  }

  /* ---------------- Browser / website bar ---------------- */
  function toUrl(input) {
    const v = input.trim();
    if (!v) return null;
    if (/^https?:\/\//i.test(v)) return v;
    if (/^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/.test(v) && !/\s/.test(v)) return "https://" + v;
    return SEARCH(v);
  }
  function webView(body, home) {
    body.innerHTML = `<div class="webbar">
        <button data-a="back" title="Back">←</button><button data-a="fwd" title="Forward">→</button>
        <button data-a="reload" title="Reload">↻</button><button data-a="home" title="Home">⌂</button>
        <form><span class="ddg" title="DuckDuckGo">D</span><input spellcheck="false" placeholder="Search DuckDuckGo or type a URL" /></form>
        <button data-a="ext" title="Open in new tab">↗</button>
      </div><div class="loadline"></div><iframe class="webview" referrerpolicy="no-referrer"
        allow="fullscreen; autoplay; gamepad; clipboard-read; clipboard-write" allowfullscreen></iframe>`;
    const frame = $("iframe", body), input = $("input", body), line = $(".loadline", body);
    const hist = []; let idx = -1;
    const show = (url) => {
      input.value = url;
      line.style.opacity = 1; line.style.width = "70%";
      frame.src = url;
    };
    const go = (url) => { hist.splice(idx + 1); hist.push(url); idx = hist.length - 1; show(url); };
    frame.addEventListener("load", () => { line.style.width = "100%"; setTimeout(() => { line.style.opacity = 0; line.style.width = "0"; }, 400); });
    $("form", body).addEventListener("submit", (e) => { e.preventDefault(); const u = toUrl(input.value); if (u) go(u); input.blur(); });
    input.addEventListener("focus", () => input.select());
    $(".webbar", body).addEventListener("click", (e) => {
      const a = e.target.closest("button")?.dataset.a;
      if (a === "back" && idx > 0) show(hist[--idx]);
      if (a === "fwd" && idx < hist.length - 1) show(hist[++idx]);
      if (a === "reload") show(hist[idx]);
      if (a === "home") go(home);
      if (a === "ext") window.open(hist[idx], "_blank", "noopener");
    });
    go(home);
    body._go = go;
  }

  /* ---------------- Syber-Store ---------------- */
  function storeApp(body) {
    body.innerHTML = `<div class="pad"><div class="store-hero"><h2>SYBER-STORE</h2><p>Every app is free. Hit Install and it lands on your desktop and taskbar.</p></div><div class="store-grid"></div></div>`;
    const grid = $(".store-grid", body);
    const render = () => grid.replaceChildren(...Object.entries(APPS).map(([id, a]) => {
      const c = el("div", { className: "card" }, `<div class="glyph">${a.glyph}</div><div class="info"><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></div>`);
      const actions = el("div", { style: "display:flex;flex-direction:column;gap:4px" });
      if (a.core) actions.append(el("small", { className: "muted", textContent: "Built-in" }));
      else if (isInstalled(id)) {
        const open = el("button", { className: "btn", textContent: "Open" }); open.onclick = () => launch(id);
        const rm = el("button", { className: "btn ghost", textContent: "Remove" }); rm.onclick = () => setInstalled(id, false);
        actions.append(open, rm);
      } else {
        const inst = el("button", { className: "btn", textContent: "Install" });
        inst.onclick = () => {
          inst.disabled = true; let p = 0;
          const t = setInterval(() => { p += 20; inst.textContent = p + "%"; if (p >= 100) { clearInterval(t); setInstalled(id, true); } }, 120);
        };
        actions.append(inst);
      }
      c.append(actions);
      return c;
    }));
    render();
    changeListeners.add(render);
    return () => changeListeners.delete(render);
  }

  /* ---------------- Weather (Open-Meteo, no key) ---------------- */
  const WX = { 0: ["Clear", "☀️"], 1: ["Mostly clear", "🌤️"], 2: ["Partly cloudy", "⛅"], 3: ["Overcast", "☁️"], 45: ["Fog", "🌫️"], 48: ["Fog", "🌫️"],
    51: ["Light drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Heavy drizzle", "🌧️"], 61: ["Light rain", "🌦️"], 63: ["Rain", "🌧️"], 65: ["Heavy rain", "🌧️"],
    66: ["Freezing rain", "🌧️"], 67: ["Freezing rain", "🌧️"], 71: ["Light snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy snow", "❄️"], 77: ["Snow grains", "🌨️"],
    80: ["Showers", "🌦️"], 81: ["Showers", "🌧️"], 82: ["Violent showers", "⛈️"], 85: ["Snow showers", "🌨️"], 86: ["Snow showers", "❄️"],
    95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm + hail", "⛈️"], 99: ["Thunderstorm + hail", "⛈️"] };
  const wx = (c) => WX[c] || ["Unknown", "🌡️"];
  async function getWeather(city) {
    const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(city)}`).then((r) => r.json());
    const p = g.results?.[0];
    if (!p) throw new Error(`Couldn't find "${city}".`);
    const f = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&timezone=auto&forecast_days=7` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min`).then((r) => r.json());
    return { place: [p.name, p.admin1, p.country].filter(Boolean).join(", "), ...f };
  }
  function updateChip(d) { $("#chip-temp").textContent = Math.round(d.current.temperature_2m) + "°"; $("#weather-chip").firstChild.textContent = wx(d.current.weather_code)[1] + " "; }
  function weatherApp(body) {
    body.innerHTML = `<div class="pad"><form class="wx-form"><input placeholder="Type a city…" /><button class="btn">Search</button></form><div class="wx-out muted">Enter a city to see the weather.</div></div>`;
    const out = $(".wx-out", body), input = $("input", body);
    const run = async (city) => {
      out.className = "wx-out muted"; out.textContent = "Loading…";
      try {
        const d = await getWeather(city);
        localStorage.setItem("cyberos.city", city); updateChip(d);
        const [cond, ico] = wx(d.current.weather_code);
        const days = d.daily.time.map((t, i) => {
          const [c, ic] = wx(d.daily.weather_code[i]);
          const name = i === 0 ? "Today" : new Date(t + "T12:00").toLocaleDateString(undefined, { weekday: "short" });
          return `<div class="wx-day" title="${c}"><div>${name}</div><div class="ico">${ic}</div><b>${Math.round(d.daily.temperature_2m_max[i])}°</b> <span class="muted">${Math.round(d.daily.temperature_2m_min[i])}°</span></div>`;
        }).join("");
        out.className = "wx-out";
        out.innerHTML = `<div class="wx-now"><div class="ico">${ico}</div><div><div class="big">${Math.round(d.current.temperature_2m)}°C</div><b>${cond}</b>
          <div class="wx-meta">${esc(d.place)}</div><div class="wx-meta">💧 Humidity ${d.current.relative_humidity_2m}% · 💨 Wind ${Math.round(d.current.wind_speed_10m)} km/h</div></div></div><div class="wx-days">${days}</div>`;
      } catch (e) { out.textContent = e.message || "Weather service unavailable."; }
    };
    $("form", body).addEventListener("submit", (e) => { e.preventDefault(); if (input.value.trim()) run(input.value.trim()); });
    const saved = localStorage.getItem("cyberos.city");
    if (saved) { input.value = saved; run(saved); }
  }

  /* ---------------- Syber-Tube (Web Audio synth player) ---------------- */
  const TRACKS = [
    { t: "Neon Skyline", a: "Syber Collective", bpm: 100, root: 57, prog: [0, -4, 3, -2], c: ["#00f0ff", "#ff2bd6"] },
    { t: "Midnight Grid", a: "Data Ghost", bpm: 84, root: 52, prog: [0, 3, 5, -2], c: ["#7b2bff", "#00f0ff"] },
    { t: "Chrome Hearts", a: "Synthetica", bpm: 118, root: 60, prog: [0, -3, -5, -7], c: ["#ff2bd6", "#ffb800"] },
    { t: "Lofi Mainframe", a: "Byte Bloom", bpm: 72, root: 55, prog: [0, 5, 3, 7], c: ["#00ff9d", "#0077ff"] },
    { t: "Overclock", a: "Volt Runner", bpm: 132, root: 50, prog: [0, 0, 3, -2], c: ["#ff4d4d", "#ff2bd6"] },
  ];
  const LEN = 64; // seconds per track
  const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  function tubeApp(body) {
    body.innerHTML = `<div class="tube"><div class="tube-list"></div><div class="player">
      <div class="now"><div class="art" style="width:46px;height:46px;border-radius:6px;flex:none"></div><div><b class="nt">Nothing playing</b><br><small class="muted na">Pick a track</small></div></div>
      <div class="ctrls"><div class="row"><button data-a="shuffle" title="Shuffle">🔀</button><button data-a="prev" title="Previous">⏮</button>
      <button data-a="play" class="play" title="Play">▶</button><button data-a="next" title="Next">⏭</button><button data-a="repeat" title="Repeat">🔁</button></div>
      <div class="prog"><span class="cur">0:00</span><input type="range" min="0" max="${LEN}" step="0.1" value="0" /><span>${fmt(LEN)}</span></div></div>
      <div class="vol"><button data-a="mute" style="border:0;background:none" title="Mute">🔊</button><input type="range" min="0" max="1" step="0.01" value="0.6" /></div></div></div>`;
    const list = $(".tube-list", body), seek = $(".prog input", body), vol = $(".vol input", body), playBtn = $("[data-a=play]", body);
    let ctx, master, cur = -1, playing = false, pos = 0, startAt = 0, timer, nextNote = 0, step = 0, shuffle = false, repeat = false, lastVol = 0.6;

    list.replaceChildren(...TRACKS.map((tr, i) => {
      const b = el("button", { className: "track" }, `<span class="n">${i + 1}</span><span class="art" style="background:linear-gradient(135deg,${tr.c[0]},${tr.c[1]})"></span><span><b>${tr.t}</b><br><small class="muted">${tr.a}</small></span><span style="margin-left:auto" class="muted">${fmt(LEN)}</span>`);
      b.onclick = () => select(i, true);
      return b;
    }));

    const note = (freq, t, dur, type, gain, dest = master) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
    };
    const kick = (t) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); g.gain.setValueAtTime(0.8, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); o.connect(g).connect(master); o.start(t); o.stop(t + 0.25); };
    const hat = (t) => { const n = ctx.createBufferSource(), b = ctx.createBuffer(1, 2205, 44100), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; n.buffer = b; const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7000; const g = ctx.createGain(); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05); n.connect(f).connect(g).connect(master); n.start(t); };

    function schedule() {
      const tr = TRACKS[cur], s16 = 60 / tr.bpm / 4;
      while (nextNote < ctx.currentTime + 0.15) {
        const bar = Math.floor(step / 16) % 4, s = step % 16, root = tr.root + tr.prog[bar];
        if (s % 4 === 0) kick(nextNote);
        if (s % 2 === 1) hat(nextNote);
        if (s % 2 === 0) note(mtof(root - 12), nextNote, s16 * 1.8, "sawtooth", 0.08);
        if (s === 0) [0, 4, 7, 11].forEach((iv) => note(mtof(root + iv), nextNote, s16 * 15, "triangle", 0.035));
        const arp = [0, 7, 12, 4, 7, 16, 12, 7][(step + bar) % 8];
        if (s % 2 === 0 || tr.bpm < 90) note(mtof(root + 12 + arp), nextNote, s16 * 0.9, "square", 0.02);
        nextNote += s16; step++;
      }
    }
    function tick() {
      if (!playing) return;
      pos = ctx.currentTime - startAt;
      if (pos >= LEN) { return repeat ? select(cur, true) : skip(1); }
      seek.value = pos; $(".cur", body).textContent = fmt(pos);
      schedule();
    }
    function start(from = 0) {
      ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      if (!master) { master = ctx.createGain(); master.gain.value = +vol.value; master.connect(ctx.destination); }
      ctx.resume();
      const tr = TRACKS[cur], s16 = 60 / tr.bpm / 4;
      step = Math.floor(from / s16); startAt = ctx.currentTime - from; nextNote = ctx.currentTime + 0.05;
      playing = true; playBtn.textContent = "⏸"; clearInterval(timer); timer = setInterval(tick, 50);
    }
    function pause() { playing = false; clearInterval(timer); playBtn.textContent = "▶"; }
    function select(i, autoplay) {
      cur = i; pos = 0; seek.value = 0;
      const tr = TRACKS[i];
      $(".nt", body).textContent = tr.t; $(".na", body).textContent = tr.a;
      $(".now .art", body).style.background = `linear-gradient(135deg,${tr.c[0]},${tr.c[1]})`;
      list.querySelectorAll(".track").forEach((b, j) => b.classList.toggle("on", j === i));
      autoplay ? start(0) : pause();
    }
    function skip(d) { const n = shuffle ? Math.floor(Math.random() * TRACKS.length) : (cur + d + TRACKS.length) % TRACKS.length; select(n, true); }
    $(".ctrls", body).addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const a = b.dataset.a;
      if (a === "play") { if (cur < 0) select(0, true); else playing ? pause() : start(pos); }
      if (a === "next") skip(1);
      if (a === "prev") (pos > 3 && cur >= 0) ? select(cur, true) : skip(-1);
      if (a === "shuffle") b.classList.toggle("on", (shuffle = !shuffle));
      if (a === "repeat") b.classList.toggle("on", (repeat = !repeat));
    });
    seek.addEventListener("input", () => { if (cur < 0) return; pos = +seek.value; if (playing) start(pos); else $(".cur", body).textContent = fmt(pos); });
    vol.addEventListener("input", () => { if (master) master.gain.value = +vol.value; $("[data-a=mute]", body).textContent = +vol.value ? "🔊" : "🔇"; });
    $("[data-a=mute]", body).onclick = () => { if (+vol.value) { lastVol = +vol.value; vol.value = 0; } else vol.value = lastVol || 0.6; vol.dispatchEvent(new Event("input")); };
    return () => { pause(); ctx && ctx.close(); };
  }

  /* ---------------- Start menu, search, clock ---------------- */
  const sm = $("#start-menu");
  const hideStart = () => (sm.hidden = true);
  function filterStart() {
    const q = $("#sm-search").value.trim().toLowerCase();
    $("#sm-apps").replaceChildren(...Object.keys(APPS).filter((id) => isInstalled(id) && APPS[id].name.toLowerCase().includes(q)).map(iconBtn));
  }
  $("#start-btn").onclick = (e) => { e.stopPropagation(); sm.hidden = !sm.hidden; if (!sm.hidden) { $("#sm-search").value = ""; filterStart(); $("#sm-search").focus(); } };
  document.addEventListener("pointerdown", (e) => { if (!sm.hidden && !sm.contains(e.target) && e.target !== $("#start-btn")) hideStart(); });
  $("#sm-search").addEventListener("input", filterStart);
  $("#sm-search").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const first = $("#sm-apps .icon");
    first ? first.click() : webSearch(e.target.value);
  });
  $("#sm-power").onclick = () => location.reload();
  function webSearch(q) {
    const url = toUrl(q); if (!url) return;
    const w = launch("browser");
    $(".body", w)._go(url);
    hideStart();
  }
  $("#tb-search").addEventListener("submit", (e) => { e.preventDefault(); const i = $("input", e.target); webSearch(i.value); i.value = ""; });
  $("#weather-chip").onclick = () => launch("weather");

  const clock = () => {
    const d = new Date();
    $("#clock-time").textContent = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    $("#clock-date").textContent = d.toLocaleDateString();
  };
  clock(); setInterval(clock, 10000);

  const savedCity = localStorage.getItem("cyberos.city");
  if (savedCity) getWeather(savedCity).then(updateChip).catch(() => {});

  renderLaunchers();

  /* ---------------- Lock + password screens ---------------- */
  const lock = $("#lock"), login = $("#login"), pw = $("#pw"), msg = $("#pw-msg");
  const lockClock = () => {
    const d = new Date();
    $("#lock-time").textContent = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M$/i, "");
    $("#lock-date").textContent = d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  };
  lockClock(); setInterval(lockClock, 1000);
  const unlock = () => {
    if (lock.classList.contains("up")) return;
    lock.classList.add("up"); login.hidden = false;
    setTimeout(() => pw.focus(), 50);
  };
  lock.addEventListener("click", unlock);
  lock.addEventListener("keydown", unlock);
  document.addEventListener("keydown", (e) => { if (!lock.classList.contains("up")) unlock(); });
  lock.focus();
  $("#login-back").onclick = () => { login.hidden = true; lock.classList.remove("up"); pw.value = ""; msg.textContent = ""; lock.focus(); };
  $("#login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (pw.value === "1234") {
      login.classList.add("done"); lock.style.display = "none";
      setTimeout(() => { login.hidden = true; launch("browser"); }, 500);
    } else {
      msg.textContent = "The password is incorrect. Try again.";
      pw.value = ""; pw.focus();
      $("#login-form").classList.remove("shake"); void pw.offsetWidth; $("#login-form").classList.add("shake");
    }
  });
})();
