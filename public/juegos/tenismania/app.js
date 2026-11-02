/* Simulador de carrera de tenis — interfaz */
(function () {
  'use strict';
  const T = window.Tenis;
  const $app = document.getElementById('app');
  const KEY = 'tenis-sim-v1';
  const { STATS, STAT_NAMES, COUNTRIES, EVENTS, SURF_NAMES } = T;

  let S = null;       // partida en curso
  let V = null;       // vista de torneo (no se guarda)
  let form = { name: '', country: 'ESP', height: 185, build: 0, hand: 'D', backhand: 0, difficulty: 0 };

  /* ---------- utilidades ---------- */
  const track = (n, p) => { try { if (window.sm) window.sm.track(n, Object.assign({ juego: 'tenismania' }, p || {})); } catch (e) { /* */ } };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const flag = (c) => (COUNTRIES[c] ? COUNTRIES[c].f : '🏳️');
  const cname = (c) => (COUNTRIES[c] ? COUNTRIES[c].n : c);
  const r0 = (x) => Math.round(x);
  const fmt1 = (x) => (Math.round(x * 10) / 10).toString().replace('.', ',');
  const handName = (h) => (h === 'Z' ? 'Zurdo' : 'Diestro');
  const buildName = (b) => T.BUILD_NAMES[String(b)];
  const surfTag = (e) => '<span class="tag ' + e.surf + '">' + (e.indoor ? 'Cubierta · ' : '') + SURF_NAMES[e.surf] + '</span>';
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* sin almacenamiento */ } }
  function load() { try { const j = localStorage.getItem(KEY); return j ? JSON.parse(j) : null; } catch (e) { return null; } }
  function clearSave() { try { localStorage.removeItem(KEY); } catch (e) { /* nada */ } }
  function top() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

  function bars(stats, max) {
    return '<div class="bars">' + STATS.map((k) => {
      const v = stats[k];
      return '<div class="bar"><span>' + STAT_NAMES[k] + '</span><div class="track"><div class="fill" style="width:' + Math.min(100, v / (max || 100) * 100) + '%"></div></div><span class="num">' + r0(v) + '</span></div>';
    }).join('') + '</div>';
  }
  function energyBar(e, label) {
    const cls = e < 35 ? 'bad' : e < 60 ? 'warn' : '';
    return '<div class="bar" style="grid-template-columns:76px 1fr 38px"><span>' + (label || 'Energía') + '</span><div class="track"><div class="fill ' + cls + '" style="width:' + Math.max(0, Math.min(100, e)) + '%"></div></div><span class="num">' + r0(e) + '</span></div>';
  }

  /* ---------- pantalla: creación ---------- */
  function tempPlayer() {
    const bs = T.baseStats(form);
    return Object.assign({}, form, { stats: bs.stats, injPen: 0 });
  }
  function surfaceRatings(p) {
    return ['clay', 'hard', 'grass'].map((s) => {
      const r = T.rating(p, { surf: s }, 100, 0);
      return '<div class="bar"><span><span class="tag ' + s + '">' + SURF_NAMES[s] + '</span></span><div class="track"><div class="fill hi" style="width:' + Math.min(100, r) + '%"></div></div><span class="num">' + r0(r) + '</span></div>';
    }).join('');
  }
  function previewHTML() {
    const bs = T.baseStats(form);
    const p = tempPlayer();
    const c = COUNTRIES[form.country];
    const lm = T.legendMatches(form, 3);
    return '' +
      '<h2>' + flag(form.country) + ' Tu punto de partida</h2>' +
      '<p class="hint" style="margin-top:-6px">' + esc(c.rasgo) + '</p>' +
      '<h3>Atributos a los 17 años</h3>' + bars(bs.stats, 100) +
      '<h3>Rendimiento por superficie</h3><div class="bars">' + surfaceRatings(p) + '</div>' +
      '<h3>Se parecen a ti</h3>' +
      lm.map((l) => '<div class="leg"><b>' + flag(l.c) + ' ' + esc(l.n) + '</b><span class="sim">' + l.sim + '%</span>' +
        '<small>' + l.h + ' cm · ' + (l.hand === 'Z' ? 'zurdo' : 'diestro') + ' · ' + buildName(l.b).toLowerCase() + ' — ' + esc(l.logro) + '</small><small></small></div>').join('') +
      (bs.insp ? '<p class="hint">✨ Te pareces tanto a <b>' + esc(bs.insp.n) + '</b> que heredas su punto fuerte: <b>' + STAT_NAMES[bs.insp.fort] + ' +3</b>.</p>' : '<p class="hint">Si te acercas al perfil de una leyenda de tu país (≥ 80 %), heredas su punto fuerte.</p>');
  }
  function segBtns(name, opts, cur) {
    return '<div class="seg">' + opts.map((o) => '<button type="button" data-act="set" data-k="' + name + '" data-v="' + o[0] + '" class="' + (String(cur) === String(o[0]) ? 'on' : '') + '">' + o[1] + '</button>').join('') + '</div>';
  }
  function renderCreate() {
    const saved = load();
    const opts = Object.keys(COUNTRIES).sort((a, b) => COUNTRIES[a].n.localeCompare(COUNTRIES[b].n, 'es')).map((k) => '<option value="' + k + '"' + (k === form.country ? ' selected' : '') + '>' + COUNTRIES[k].f + ' ' + COUNTRIES[k].n + '</option>').join('');
    $app.innerHTML =
      (saved ? '<div class="card"><div class="row sp"><div><b>Tienes una carrera guardada</b><div class="note">' + esc(saved.p.name) + ' · ' + flag(saved.p.country) + ' · ' + saved.p.age + ' años · temporada ' + saved.season.n + '</div></div><div class="row"><button class="btn dark" data-act="continue">Continuar</button></div></div></div>' : '') +
      '<div class="grid2"><div class="card">' +
      '<h2>Crea a tu tenista</h2>' +
      '<label class="f" for="name">Nombre</label><input id="name" type="text" maxlength="28" placeholder="Tu nombre" value="' + esc(form.name) + '">' +
      '<label class="f" for="country">País</label><select id="country">' + opts + '</select>' +
      '<label class="f">Estatura: <span id="hval"></span></label><input id="height" type="range" min="165" max="210" step="1" value="' + form.height + '">' +
      '<div class="note">Más alto = más saque y alcance, pero menos movilidad. Más bajo = más velocidad y suelo.</div>' +
      '<label class="f">Físico</label>' + segBtns('build', [[-1, '🪶 Esbelto'], [0, '⚖️ Equilibrado'], [1, '💪 Fuerte']], form.build) +
      '<div class="note">Fuerte = más pegada y aguante. Esbelto = más agilidad y tacto.</div>' +
      '<label class="f">Mano buena</label>' + segBtns('hand', [['D', '🫱 Diestro'], ['Z', '🫲 Zurdo']], form.hand) +
      '<label class="f">Revés</label>' + segBtns('backhand', [[0, '🙌 A dos manos'], [1, '☝️ A una mano']], form.backhand) +
      '<label class="f">Dificultad del circuito</label>' + segBtns('difficulty', [[-1, '🌱 Fácil'], [0, '🎾 Normal'], [1, '🔥 Difícil'], [2, '👑 Leyenda']], form.difficulty) +
      '</div><div class="card" id="preview">' + previewHTML() + '</div></div>' +
      '<button class="btn block" data-act="start" style="font-size:1.05rem">🎾 Empezar mi carrera (17 años)</button>' +
      '<p class="note" style="text-align:center;margin-top:12px">¿Aguantarás 20 años en el circuito? <a href="guia.html" style="color:var(--acc)">Guía y trucos</a></p>';
    document.getElementById('hval').textContent = form.height + ' cm · ' + T.heightWord(form.height);
  }

  /* ---------- pantalla: suceso aleatorio ---------- */
  function renderRandom() {
    if (!V || !V.ev) { V = { ev: T.drawRandomEvent(S), out: null }; save(); }
    const e = V.ev;
    $app.innerHTML = headerStats() + '<div class="card"><h2>🗞️ ' + esc(e.title) + '</h2><p>' + esc(e.text) + '</p>' +
      '<div class="choices">' + e.choices.map((c, i) => '<button class="choice" data-act="rchoice" data-i="' + i + '"><span class="ic2">' + c.icon + '</span><b>' + esc(c.label) + '</b></button>').join('') + '</div></div>';
  }

  /* ---------- cabecera compacta ---------- */
  function headerStats() {
    const p = S.p, se = S.season;
    const rank = T.currentRank(S, se.n, 0, 'pre');
    const pts = T.pointsAt(S, se.n, 0, 'pre');
    const delta = se.rank0 - rank;
    return '<div class="card compact"><div class="row sp"><div><b>' + flag(p.country) + ' ' + esc(p.name) + '</b> <span class="note">' + p.age + ' años · ' + p.height + ' cm · ' + handName(p.hand).toLowerCase() + ' · ' + buildName(p.build).toLowerCase() + ' · temporada ' + se.n + '</span></div>' +
      '<div class="row"><span class="badge">Ranking #' + rank + '</span><span class="badge">' + pts + ' pts</span><button class="btn sec" data-act="menu" style="padding:6px 10px;font-size:.85rem">Menú</button></div></div></div>';
  }

  /* ---------- pantalla: elegir foco (1 clic = 2 temporadas) ---------- */
  const ICON = { saque: '🚀', derecha: '💥', reves: '🎯', volea: '🕸️', mov: '👟', aguante: '🫁', mental: '🧠' };
  const HELP = { saque: 'Aces y puntos gratis', derecha: 'Pegada desde el fondo', reves: 'Solidez al otro lado', volea: 'Juego en la red', mov: 'Llegas a todas', aguante: 'Más torneos sin fundirte', mental: 'Ganas los puntos clave' };
  function renderPlan() {
    const p = S.p;
    const banner = S.msg ? '<div class="warnbox" style="margin-bottom:10px">' + esc(S.msg) + '</div>' : '';
    S.msg = null;
    $app.innerHTML = headerStats() + banner +
      '<div class="card compact"><h2>¿En qué trabajas estos 2 años?</h2><div class="choices four">' + STATS.map((k) =>
        '<button class="choice" data-act="focus" data-k="' + k + '"><span class="ic2">' + ICON[k] + '</span><b>' + STAT_NAMES[k] + '</b><small>' + HELP[k] + '</small><span class="val">' + r0(p.stats[k]) + '</span></button>').join('') + '</div>' +
      '<p class="hint">Se juegan 2 temporadas completas (4 Grand Slams + 9 Masters 1000 cada una). Además del foco que elijas, trabajarás tu punto más débil.' +
      (p.injPen > 0.5 ? ' Arrastras molestias: rindes ' + fmt1(p.injPen) + ' puntos menos.' : '') + '</p></div>';
  }

  /* ---------- simulación de la temporada completa ---------- */
  function autoSeason() {
    const se = S.season;
    while (se.idx < EVENTS.length) {
      const i = se.idx, ev = EVENTS[i];
      if (se.injOut > 0) { T.skipEvent(S, i, 'injured'); continue; }
      const en = T.entryFor(S, ev, T.currentRank(S, se.n, i, 'pre'));
      if (en.mode !== 'NO') T.playEvent(S, i); else T.skipEvent(S, i, 'noaccess');
    }
    T.closeSeason(S);
    save();
  }

  function autoCycle(main) {
    const weakest = STATS.filter((k) => k !== main).sort((x, y) => S.p.stats[x] - S.p.stats[y])[0];
    S.season.focus = [main, weakest];
    autoSeason();
    T.newSeason(S, null, false);
    S.season.focus = [main, weakest];
    autoSeason();
  }

  /* ---------- pantalla: resultado de la temporada ---------- */
  const SHORT = { ao: 'AO', iw: 'IW', mi: 'MIA', mc: 'MC', ma: 'MAD', ro: 'ROM', rg: 'RG', wi: 'WIM', ca: 'CAN', ci: 'CIN', us: 'USO', sh: 'SHA', pa: 'PAR' };
  const RSHORT = { '1ª ronda': 'R1', '2ª ronda': 'R2', '3ª ronda': 'R3', 'Octavos': 'R16', 'Cuartos': 'QF', 'Semifinales': 'SF', 'Finalista': 'F' };
  function chip(ev, i, results) {
    const r = results.find((x) => x.i === i);
    let t = '—', cls = 'off';
    if (r && r.status === 'played') {
      const rs = (r.res || 'Previa').replace(' de final', '').replace('Eliminado en la fase previa', 'Previa');
      t = r.champion ? '🏆' : (RSHORT[rs] || rs); cls = r.champion ? 'win' : r.pts >= 360 ? 'good' : '';
    } else if (r && r.status === 'injured') t = '🩹';
    else if (r && r.status === 'noaccess') t = '✕';
    return '<div class="chip2 ' + cls + (ev.type === 'GS' ? ' gsb' : '') + '" title="' + esc(ev.n) + (r && r.pts ? ' · ' + r.pts + ' pts' : '') + '"><b>' + SHORT[ev.id] + '</b><span>' + t + '</span></div>';
  }
  function renderSeasonEnd() {
    const hs = S.hist.slice(-2);
    const first = hs[0], last = hs[hs.length - 1];
    const retireForced = S.p.age + 1 > 36;
    const canRetire = last.n >= 4;
    const line = (h) => '<div class="card compact" style="margin:0"><div class="row sp"><b>Temporada ' + h.n + ' · ' + h.age + ' años</b><div class="row"><span class="badge">#' + h.rank + '</span><span class="badge">' + h.pts + ' pts</span><span class="badge">' + h.w + '-' + h.l + '</span><span class="badge">🏆 ' + h.titles + (h.slams ? ' · ' + h.slams + ' GS' : '') + '</span></div></div>' +
      '<div class="evgrid" style="margin-top:8px">' + EVENTS.map((ev, i) => chip(ev, i, h.results)).join('') + '</div></div>';
    $app.innerHTML = '<div class="grid2" style="margin-bottom:10px">' + hs.map(line).join('') + '</div>' +
      '<div class="card compact"><div class="growgrid">' + STATS.map((k) => {
        const from = first.growth.find((g) => g.k === k).from, to = last.growth.find((g) => g.k === k).to;
        const d = Math.round((to - from) * 10) / 10;
        return '<div class="bar" style="grid-template-columns:96px 1fr 62px"><span>' + ICON[k] + ' ' + STAT_NAMES[k] + '</span><div class="track"><div class="fill" style="width:' + to + '%"></div></div><span class="num">' + r0(to) + ' <small class="' + (d >= 0 ? 'up' : 'down') + '">' + (d >= 0 ? '+' : '') + fmt1(d) + '</small></span></div>';
      }).join('') + '</div></div>' +
      '<div class="row">' + (retireForced ? '' : '<button class="btn" data-act="nextseason">▶️ Seguir (' + (S.p.age + 1) + ' años)</button>') +
      (canRetire || retireForced ? '<button class="btn ' + (retireForced ? '' : 'sec') + '" data-act="retire">🏁 ' + (retireForced ? 'Colgar la raqueta' : 'Retirarme') + '</button>' : '') + '</div>';
  }

  /* ---------- pantalla: final ---------- */
  function rankChart() {
    const h = S.hist;
    if (h.length < 2) return '';
    const W = 560, H = 160, pad = 28;
    const ys = h.map((s) => Math.log10(s.rank));
    const maxY = Math.max(2.5, ...ys);
    const x = (i) => pad + (W - pad * 2) * (i / (h.length - 1));
    const y = (v) => 14 + (H - 34) * (v / maxY);
    const pts = h.map((s, i) => x(i) + ',' + y(Math.log10(s.rank)));
    const grid = [1, 10, 100].filter((g) => Math.log10(g) <= maxY).map((g) => '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + y(Math.log10(g)) + '" y2="' + y(Math.log10(g)) + '" stroke="currentColor" opacity=".12"/><text x="2" y="' + (y(Math.log10(g)) + 4) + '">#' + g + '</text>').join('');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Evolución del ranking al final de cada temporada" style="color:var(--ink)">' + grid +
      '<polyline fill="none" stroke="var(--court2)" stroke-width="3" points="' + pts.join(' ') + '"/>' +
      h.map((s, i) => '<circle cx="' + x(i) + '" cy="' + y(Math.log10(s.rank)) + '" r="4" fill="var(--ball)" stroke="var(--court)" stroke-width="2"/>').join('') +
      '<text x="' + pad + '" y="' + (H - 4) + '">' + h[0].age + ' años</text><text x="' + (W - pad - 40) + '" y="' + (H - 4) + '">' + h[h.length - 1].age + ' años</text></svg>';
  }
  function summaryText() {
    const c = S.career, p = S.p, cmp = T.compareLegend(S);
    return '🎾 ' + p.name + ' (' + cname(p.country) + ', ' + p.height + ' cm, ' + handName(p.hand).toLowerCase() + ') · Mejor ranking: #' + c.bestRank + ' · ' + c.slams + ' Grand Slams · ' + c.masters + ' Masters 1000 · ' + c.w + '-' + c.l + ' en cuadros principales. Mi carrera se parece a la de ' + cmp.target.n + '. ¿Lo superas?';
  }
  function renderFinal() {
    const c = S.career, p = S.p, cmp = T.compareLegend(S);
    if (!S.tracked) { S.tracked = true; save(); track('fin_carrera', { mejor_rank: c.bestRank, slams: c.slams }); }
    const pct = c.w + c.l ? Math.round(c.w / (c.w + c.l) * 100) : 0;
    const badges = [];
    if (c.bestRank === 1) badges.push('👑 Fue nº1 del mundo');
    else if (c.bestRank <= 5) badges.push('⭐ Top 5');
    else if (c.bestRank <= 10) badges.push('🔟 Top 10');
    else if (c.bestRank <= 50) badges.push('📈 Top 50');
    if (c.slams >= 1) badges.push('🏆 ' + c.slams + ' Grand Slam' + (c.slams > 1 ? 's' : ''));
    if (c.slams >= 4) badges.push('🏛️ Leyenda de los Slams');
    if (c.masters >= 1) badges.push('🥇 ' + c.masters + ' Masters 1000');
    if (c.slamFinals >= 1 && c.slams === 0) badges.push('🥈 Finalista de Slam');
    if (S.hist.some((h) => h.w >= 50)) badges.push('💪 Temporada de 50+ victorias');
    if (c.weeks1 >= 10) badges.push('📆 ' + c.weeks1 + ' torneos como nº1');
    if (S.hist.some((h) => h.rank0 > 150 && h.rank <= 30)) badges.push('🚀 Ascenso meteórico');
    const verdict = c.slams >= 8 ? 'Una de las mayores leyendas de la historia.' : c.slams >= 3 ? 'Un campeón de época.' : c.slams >= 1 ? 'Entras en la historia: eres campeón de Grand Slam.' : c.bestRank <= 10 ? 'Una gran carrera, a un paso de la gloria.' : c.bestRank <= 50 ? 'Una carrera profesional sólida y digna.' : 'Una carrera humilde, pero lo intentaste.';
    $app.innerHTML = '<div class="champ"><div class="note" style="color:#2b1d00">CARRERA TERMINADA</div><div class="big">' + flag(p.country) + ' ' + esc(p.name) + '</div><div>' + esc(verdict) + '</div></div>' +
      '<div class="card" style="margin-top:16px"><div class="stats"><div class="st"><span>Mejor ranking</span><b>#' + c.bestRank + '</b></div><div class="st"><span>Grand Slams</span><b>' + c.slams + '</b></div><div class="st"><span>Masters 1000</span><b>' + c.masters + '</b></div><div class="st"><span>Victorias</span><b>' + c.w + '-' + c.l + '</b> <small>' + pct + '%</small></div></div>' +
      '<div style="margin-top:14px">' + badges.map((b) => '<span class="badge">' + b + '</span>').join('') + '</div></div>' +
      '<div class="card"><h2>Tu carrera se parece a…</h2><p style="font-size:1.1rem"><b>' + esc(cmp.target.n) + '</b> <span class="note">(' + esc(cmp.target.why) + ')</span></p>' +
      (S.p.insp ? '<p class="note">Empezaste inspirado en ' + esc(S.p.insp.n) + '.</p>' : '') +
      '<p class="note">Talento natural oculto: <b>' + r0((S.p.talent - 0.85) / 0.32 * 100) + '/100</b>. Finales jugadas: ' + c.finals + (S.rival ? ' · Rival histórico: ' + flag(S.rival.country) + ' ' + esc(S.rival.name) + ' (' + S.rival.w + '-' + S.rival.l + ' en tus enfrentamientos)' : '') + '</p></div>' +
      (S.hist.length > 1 ? '<div class="card"><h2>Evolución del ranking</h2>' + rankChart() + '</div>' : '') +
      '<div class="card"><h2>Temporada a temporada</h2><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.88rem;font-variant-numeric:tabular-nums"><thead><tr style="text-align:left;color:var(--mut)"><th>Edad</th><th>Rank</th><th>Pts</th><th>V-D</th><th>Títulos</th></tr></thead><tbody>' +
      S.hist.map((h) => '<tr style="border-top:1px solid var(--line)"><td>' + h.age + '</td><td>#' + h.rank + '</td><td>' + h.pts + '</td><td>' + h.w + '-' + h.l + '</td><td>' + h.titles + (h.slams ? ' (' + h.slams + ' GS)' : '') + '</td></tr>').join('') + '</tbody></table></div></div>' +
      '<div class="row"><button class="btn" data-act="copy">📋 Copiar resumen</button><button class="btn dark" data-act="newgame">Nueva carrera</button></div><p class="note" id="copied"></p>';
  }

  /* ---------- menú ---------- */
  function renderMenu() {
    $app.innerHTML = '<div class="card"><h2>Menú</h2><div class="row"><button class="btn dark" data-act="back">Volver</button><button class="btn sec" data-act="retire">Retirarme ahora</button><button class="btn sec" data-act="newgame">Abandonar y empezar de nuevo</button></div></div>';
  }

  /* ---------- enrutado ---------- */
  function render() {
    if (!S) { renderCreate(); return; }
    if (V && V.menu) { renderMenu(); return; }
    switch (S.phase) {
      case 'random': renderRandom(); break;
      case 'plan': renderPlan(); break;
      case 'hub': autoSeason(); renderSeasonEnd(); break;
      case 'season_end': renderSeasonEnd(); break;
      case 'final': renderFinal(); break;
      default: renderPlan();
    }
  }

  /* ---------- eventos ---------- */
  $app.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.tagName === 'INPUT') return;
    const a = b.dataset.act;
    if (a === 'set') {
      const k = b.dataset.k; let v = b.dataset.v;
      if (k !== 'hand') v = Number(v);
      form[k] = v; renderCreate();
    } else if (a === 'start') {
      form.name = (document.getElementById('name').value || '').trim();
      S = T.newGame(form); V = null; save(); render(); top(); track('inicio_partida', { pais: form.country });
    } else if (a === 'continue') {
      S = load(); V = null; if (S && S.phase === 'random') V = null; render(); top();
    } else if (a === 'focus') {
      V = null; autoCycle(b.dataset.k); save(); render(); top(); track('fin_ciclo', { ciclo: S.hist.length / 2, rank: S.hist[S.hist.length - 1].rank });
    } else if (a === 'rchoice') {
      const c = V.ev.choices[Number(b.dataset.i)];
      S.msg = c.run(S, Math.random); S.phase = 'plan'; V = null; save(); render(); top();
    }
    else if (a === 'nextseason') { T.newSeason(S, null, false); if (Math.random() < 0.5) S.phase = 'plan'; V = null; save(); render(); top(); }
    else if (a === 'retire') { V = null; S.phase = 'final'; if (S.season.results.length && S.phase !== 'season_end' && !S.hist.some((h) => h.n === S.season.n)) { try { T.closeSeason(S); } catch (err) { /* ignore */ } S.phase = 'final'; } save(); render(); top(); }
    else if (a === 'newgame') { if (confirm('¿Empezar una carrera nueva? Perderás la actual.')) { clearSave(); S = null; V = null; render(); top(); } }
    else if (a === 'menu') { V = Object.assign({}, V || {}, { menu: true }); render(); }
    else if (a === 'back') { if (V) V.menu = false; render(); }
    else if (a === 'copy') {
      track('copiar_resumen'); const t = summaryText();
      const done = () => { const el = document.getElementById('copied'); if (el) el.textContent = 'Resumen copiado ✔'; };
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, () => window.prompt('Copia tu resumen:', t)); else window.prompt('Copia tu resumen:', t);
    }
  });
  $app.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'country') { form.country = t.value; document.getElementById('preview').innerHTML = previewHTML(); }
  });
  $app.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'name') form.name = t.value;
    else if (t.id === 'height') {
      form.height = Number(t.value);
      document.getElementById('hval').textContent = form.height + ' cm · ' + T.heightWord(form.height);
      document.getElementById('preview').innerHTML = previewHTML();
    }
  });

  /* ---------- inicio ---------- */
  render();
})();
