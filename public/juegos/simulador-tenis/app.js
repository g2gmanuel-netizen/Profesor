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
      '<label class="f">Físico</label>' + segBtns('build', [[-1, 'Esbelto'], [0, 'Equilibrado'], [1, 'Fuerte']], form.build) +
      '<div class="note">Fuerte = más pegada y aguante. Esbelto = más agilidad y tacto.</div>' +
      '<label class="f">Mano buena</label>' + segBtns('hand', [['D', 'Diestro'], ['Z', 'Zurdo']], form.hand) +
      '<label class="f">Revés</label>' + segBtns('backhand', [[0, 'A dos manos'], [1, 'A una mano']], form.backhand) +
      '<label class="f">Dificultad del circuito</label>' + segBtns('difficulty', [[-1, 'Fácil'], [0, 'Normal'], [1, 'Difícil'], [2, 'Leyenda']], form.difficulty) +
      '</div><div class="card" id="preview">' + previewHTML() + '</div></div>' +
      '<button class="btn block" data-act="start" style="font-size:1.05rem">🎾 Empezar mi carrera (17 años)</button>' +
      '<div class="card" style="margin-top:16px"><h2>Cómo funciona</h2><ul style="margin:0;padding-left:20px;color:var(--mut)">' +
      '<li>Cada temporada tiene <b>4 Grand Slams</b> y <b>9 Masters 1000</b>. Solo ellos dan puntos ATP.</li>' +
      '<li>Tú eliges cuáles juegas. Cada partido gasta <b>energía</b>: con poco aguante rindes menos y te lesionas más.</li>' +
      '<li>El ranking suma los puntos de los últimos 12 meses: los de cada torneo caducan cuando vuelve a jugarse.</li>' +
      '<li>Con ranking bajo accedes por clasificación o invitaciones; en tu país juegas con ventaja de invitación.</li>' +
      '<li>Entrenas dos atributos por temporada. Tu físico y tu país marcan en qué superficie brillas.</li></ul></div>';
    document.getElementById('hval').textContent = form.height + ' cm · ' + T.heightWord(form.height);
  }

  /* ---------- pantalla: suceso aleatorio ---------- */
  function renderRandom() {
    if (!V || !V.ev) { V = { ev: T.drawRandomEvent(S), out: null }; save(); }
    const e = V.ev;
    $app.innerHTML = headerStats() + '<div class="card"><h2>🗞️ ' + esc(e.title) + '</h2><p>' + esc(e.text) + '</p>' +
      (V.out ? '<div class="warnbox" style="margin:12px 0">' + esc(V.out) + '</div><button class="btn dark" data-act="toplan">Preparar la temporada</button>'
        : '<div class="row">' + e.choices.map((c, i) => '<button class="btn sec" data-act="rchoice" data-i="' + i + '">' + esc(c.label) + '</button>').join('') + '</div>') + '</div>';
  }

  /* ---------- cabecera de stats ---------- */
  function headerStats() {
    const p = S.p, se = S.season;
    const rank = T.currentRank(S, se.n, Math.min(se.idx, EVENTS.length - 1), se.idx >= EVENTS.length ? 'post' : 'pre');
    const pts = T.pointsAt(S, se.n, Math.min(se.idx, EVENTS.length - 1), se.idx >= EVENTS.length ? 'post' : 'pre');
    const delta = se.rank0 - rank;
    return '<div class="card"><div class="row sp"><div><b style="font-size:1.1rem">' + flag(p.country) + ' ' + esc(p.name) + '</b><div class="note">' + p.age + ' años · ' + p.height + ' cm · ' + handName(p.hand).toLowerCase() + ' · ' + buildName(p.build).toLowerCase() + ' · temporada ' + se.n + '</div></div>' +
      '<div class="row"><button class="btn sec" data-act="menu" style="padding:8px 12px">Menú</button></div></div>' +
      '<div class="stats" style="margin-top:12px">' +
      '<div class="st"><span>Ranking ATP</span><b>#' + rank + '</b> <small class="' + (delta > 0 ? 'up' : delta < 0 ? 'down' : '') + '">' + (delta > 0 ? '▲' + delta : delta < 0 ? '▼' + (-delta) : '=') + '</small></div>' +
      '<div class="st"><span>Puntos</span><b>' + pts + '</b></div>' +
      '<div class="st"><span>Victorias temp.</span><b>' + se.w + '-' + se.l + '</b></div>' +
      '<div class="st"><span>Títulos temp.</span><b>' + se.titles + '</b> <small>' + (se.slams ? se.slams + ' Slam' : '') + '</small></div></div>' +
      '<div style="margin-top:12px">' + energyBar(se.energy, 'Aguante') + '</div></div>';
  }

  /* ---------- pantalla: plan de temporada ---------- */
  function expectedLoad() {
    const p = S.p, se = S.season;
    let load = 0, n = 0;
    EVENTS.forEach((ev, i) => {
      if (!se.plan[ev.id]) return;
      const en = T.entryFor(S, ev, T.currentRank(S, se.n, i, 'pre'));
      if (en.mode === 'NO') return;
      const r = T.rating(p, ev, 100, 0);
      const base = ev.type === 'GS' ? [48, 54, 60, 67, 73, 79, 85] : [52, 58, 65, 72, 78, 84];
      let rounds = 0;
      for (let k = 0; k < base.length; k++) { if (r + 3 > base[k] + S.difficulty * 3) rounds++; else break; }
      rounds = Math.max(1, rounds + (r + 3 > base[rounds] ? 0 : 1));
      load += rounds * (ev.type === 'GS' ? 9 : 6) * 0.9 * (1.45 - p.stats.aguante / 110) + (en.mode === 'Q' ? 8 : 0);
      n++;
    });
    const cap = 60 + 43 * (1.8 + p.stats.aguante / 50);
    return { load, cap, n };
  }
  function planEventRow(ev, i) {
    const se = S.season;
    const rank = T.currentRank(S, se.n, i, 'pre');
    const en = T.entryFor(S, ev, rank);
    const rat = T.rating(S.p, ev, 100, 0);
    const def = T.defendPoints(S, i);
    const on = !!se.plan[ev.id];
    return '<label class="ev" style="cursor:pointer"><span class="ic ' + (ev.type === 'GS' ? 'gs' : 'm') + '">' + (ev.type === 'GS' ? 'GS' : '1000') + '</span>' +
      '<span><span class="nm">' + esc(ev.n) + '</span><br><span class="sub">' + surfTag(ev) + ' ' + flag(ev.host || '') + ' ' + esc(ev.city) + '</span></span>' +
      '<span class="rt"><span class="chk"><input type="checkbox" data-act="plan" data-id="' + ev.id + '"' + (on ? ' checked' : '') + (en.mode === 'NO' ? ' disabled' : '') + '> Jugar</span></span>' +
      '<span class="sub" style="grid-column:1 / -1">Tu nivel aquí: <b>' + r0(rat) + '</b> · Acceso: <b>' + esc(en.label) + '</b>' + (def ? ' · a defender: <b>' + def + '</b> pts' : '') + '</span></label>';
  }
  function renderPlan() {
    const se = S.season, p = S.p;
    const ld = expectedLoad();
    const ratio = ld.load / ld.cap;
    const lvl = ratio < 0.75 ? ['Ligera', ''] : ratio < 1.05 ? ['Exigente pero asumible', 'warn'] : ['Excesiva: acabarás fundido', 'bad'];
    const focusBtns = (slot) => '<div class="seg">' + STATS.map((k) => '<button type="button" data-act="focus" data-slot="' + slot + '" data-k="' + k + '" class="' + (se.focus[slot] === k ? 'on' : '') + '">' + STAT_NAMES[k] + '</button>').join('') + '</div>';
    const slams = EVENTS.map((ev, i) => [ev, i]).filter(([ev]) => ev.type === 'GS');
    const mas = EVENTS.map((ev, i) => [ev, i]).filter(([ev]) => ev.type === 'M');
    const canStart = se.focus[0] && se.focus[1] && se.focus[0] !== se.focus[1];
    $app.innerHTML = headerStats() +
      '<div class="grid2"><div class="card"><h2>Tus atributos</h2>' + bars(p.stats, 100) + (p.injPen > 0.5 ? '<p class="warnbox" style="margin-top:12px">Arrastras molestias físicas: rindes ' + fmt1(p.injPen) + ' puntos menos.</p>' : '') + '</div>' +
      '<div class="card"><h2>Entrenamiento</h2>' +
      '<label class="f">Foco principal (+ grande)</label>' + focusBtns(0) +
      '<label class="f">Foco secundario</label>' + focusBtns(1) +
      '<p class="hint">Entrenar el aguante te da más margen para jugar muchos torneos. Pasados los 30, entrenar rinde la mitad.</p></div></div>' +
      '<div class="card"><h2>Calendario de la temporada</h2>' +
      '<div class="meter"><div class="fill ' + lvl[1] + '" style="width:' + Math.min(100, ratio * 100) + '%"></div></div>' +
      '<p class="note" style="margin:6px 0 14px">Carga prevista según tu nivel y tu aguante: <b>' + lvl[0] + '</b> (' + ld.n + ' torneos). Jugar rondas profundas en Slams (5 sets) cansa mucho más que un Masters.</p>' +
      '<h3 style="margin-top:0">Grand Slams</h3><div>' + slams.map(([ev, i]) => planEventRow(ev, i)).join('') + '</div>' +
      '<h3>Masters 1000</h3><div>' + mas.map(([ev, i]) => planEventRow(ev, i)).join('') + '</div>' +
      '<p class="hint">Puedes cambiar de idea torneo a torneo durante la temporada.</p></div>' +
      '<button class="btn block" data-act="startseason"' + (canStart ? '' : ' disabled') + ' style="font-size:1.05rem">' + (canStart ? '▶ Empezar la temporada' : 'Elige dos focos de entrenamiento distintos') + '</button>';
  }

  /* ---------- pantalla: temporada (hub) ---------- */
  function evRow(ev, i) {
    const se = S.season;
    const r = se.results.find((x) => x.i === i);
    const ic = '<span class="ic ' + (ev.type === 'GS' ? 'gs' : 'm') + '">' + (ev.type === 'GS' ? 'GS' : '1000') + '</span>';
    let right = '', cls = '';
    if (r) {
      cls = 'done';
      if (r.status === 'played') right = '<b>' + (r.champion ? '🏆 CAMPEÓN' : esc(r.res || 'Fase previa')) + '</b>' + r.pts + ' pts';
      else if (r.status === 'injured') right = '<b>🩹 Lesionado</b>';
      else right = '<b>No jugado</b>';
    } else if (i === se.idx) {
      cls = 'next'; right = '<b>Siguiente</b>';
    } else {
      right = '<span class="chk"><input type="checkbox" data-act="plan" data-id="' + ev.id + '"' + (se.plan[ev.id] ? ' checked' : '') + '> Jugar</span>';
    }
    const def = T.defendPoints(S, i);
    return '<div class="ev ' + cls + '">' + ic + '<span><span class="nm">' + esc(ev.n) + '</span><br><span class="sub">' + surfTag(ev) + ' ' + esc(ev.city) + (!r && def ? ' · defiendes ' + def + ' pts' : '') + '</span></span><span class="rt">' + right + '</span></div>';
  }
  function renderHub() {
    const se = S.season;
    if (se.idx >= EVENTS.length) { endSeason(); return; }
    const i = se.idx, ev = EVENTS[i];
    const rank = T.currentRank(S, se.n, i, 'pre');
    const en = T.entryFor(S, ev, rank);
    const rat = T.rating(S.p, ev, se.energy, 0);
    const def = T.defendPoints(S, i);
    let card;
    if (se.injOut > 0) {
      card = '<div class="warnbox"><b>🩹 Estás lesionado.</b> Te pierdes este torneo (' + se.injOut + ' pendientes de baja).</div><div style="margin-top:12px"><button class="btn dark" data-act="skipinj">Continuar</button></div>';
    } else {
      const planned = se.plan[ev.id];
      card = '<div class="row sp"><div><span class="tag ' + (ev.type === 'GS' ? 'gs' : 'm') + '">' + (ev.type === 'GS' ? 'GRAND SLAM' : 'MASTERS 1000') + '</span> ' + surfTag(ev) +
        '<div class="big">' + esc(ev.n) + '</div><div class="note">' + esc(ev.city) + ' · ' + (ev.type === 'GS' ? 'partidos a 5 sets' : 'partidos a 3 sets') + '</div></div></div>' +
        '<div class="stats" style="margin:12px 0"><div class="st"><span>Acceso</span><small><b>' + esc(en.label) + '</b></small></div><div class="st"><span>Tu nivel aquí</span><b>' + r0(rat) + '</b></div><div class="st"><span>Puntos a defender</span><b>' + def + '</b></div><div class="st"><span>Campeón da</span><b>' + (ev.type === 'GS' ? 2000 : 1000) + '</b></div></div>' +
        (se.energy < 45 ? '<div class="warnbox" style="margin-bottom:12px">⚠️ Vas justo de energía (' + r0(se.energy) + '). Rendirás menos y el riesgo de lesión sube. Descansar te permite recuperar semanas.</div>' : '') +
        (en.mode === 'NO' ? '<div class="warnbox" style="margin-bottom:12px">Tu ranking (#' + rank + ') no te da acceso a este torneo.</div><button class="btn dark" data-act="skip">Siguiente</button>'
          : '<div class="row"><button class="btn" data-act="play">🎾 Jugar torneo</button><button class="btn sec" data-act="skip">Descansar</button></div>' + (planned ? '' : '<p class="hint">No lo tenías en tu plan.</p>'));
    }
    const rest = EVENTS.slice(i).filter((e) => se.plan[e.id]).length;
    $app.innerHTML = headerStats() +
      '<div class="card">' + card + '</div>' +
      '<div class="card"><div class="row sp"><h2 style="margin:0">Calendario</h2>' + (rest > 1 && se.injOut === 0 ? '<button class="btn sec" data-act="auto" style="padding:8px 12px">Simular el resto según mi plan</button>' : '') + '</div><div style="margin-top:12px">' + EVENTS.map(evRow2).join('') + '</div></div>';
    function evRow2(e, k) { return evRow(e, k); }
  }

  /* ---------- pantalla: torneo ---------- */
  function matchHTML(m, bucketLabel) {
    const o = m.opp;
    return '<div class="match ' + (m.won ? 'w' : 'l') + '"><div class="hd"><span>' + esc(m.round) + (m.bo5 ? ' · 5 sets' : '') + '</span><span>Prob. de ganar: ' + m.prob + '%</span></div>' +
      '<div class="vs">' + flag(o.country) + ' ' + esc(o.name) + ' <span class="note">(#' + o.rank + ')</span>' + (o.rival ? '<span class="rival">⚔ RIVAL · ' + S.rival.w + '-' + S.rival.l + '</span>' : '') + '</div>' +
      '<div class="row sp"><span class="sc">' + (m.retired ? 'Retirada por lesión 🩹' : (m.won ? '✅ ' : '❌ ') + esc(m.score)) + '</span><span class="note">Energía ' + m.eBefore + ' → ' + m.eAfter + '</span></div></div>';
  }
  function renderTournament() {
    const rep = V.rep, ev = rep.ev;
    const all = rep.qual.map((m) => ({ m, q: true })).concat(rep.rows.map((m) => ({ m })));
    const done = V.shown >= all.length;
    let html = '<div class="card"><span class="tag ' + (ev.type === 'GS' ? 'gs' : 'm') + '">' + (ev.type === 'GS' ? 'GRAND SLAM' : 'MASTERS 1000') + '</span> ' + surfTag(ev) +
      '<div class="big">' + esc(ev.n) + '</div><div class="note">' + esc(rep.entry.label) + ' · ranking previo #' + rep.preRank + '</div></div>';
    html += '<div>' + all.slice(0, V.shown).map((x) => matchHTML(x.m)).join('') + '</div>';
    if (!done) {
      html += '<div class="row"><button class="btn" data-act="next">Siguiente partido</button><button class="btn sec" data-act="showall">Ver todo</button></div>';
    } else {
      const gained = rep.pts - rep.defended;
      if (rep.champion) html += '<div class="champ"><div class="big">🏆 ¡CAMPEÓN en ' + esc(ev.n) + '!</div><div>+' + rep.pts + ' puntos</div></div>';
      else html += '<div class="card"><div class="big">' + (rep.result === 'Eliminado en la fase previa' ? 'Eliminado en la previa' : esc(rep.result)) + '</div></div>';
      html += '<div class="card"><div class="gain"><span>Puntos conseguidos</span><b class="num">' + rep.pts + '</b><span></span><span></span>' +
        '<span>Puntos que defendías (caducan)</span><b class="num">−' + rep.defended + '</b><span></span><span></span>' +
        '<span>Balance</span><b class="num ' + (gained >= 0 ? 'up' : 'down') + '">' + (gained >= 0 ? '+' : '') + gained + '</b><span></span><span></span>' +
        '<span>Ranking</span><b class="num">#' + rep.preRank + ' → #' + rep.postRank + '</b><span></span><span></span>' +
        '<span>Total de puntos</span><b class="num">' + rep.postPts + '</b><span></span><span></span></div>' +
        (rep.injury ? '<p class="warnbox" style="margin-top:12px">🩹 Lesión: te pierdes los próximos ' + rep.injury.out + ' torneos y pierdes algo de ' + STAT_NAMES[rep.injury.stat].toLowerCase() + '.</p>' : '') +
        '<p class="note" style="margin-bottom:0">Energía al terminar: ' + rep.energyEnd + '/100</p></div>' +
        '<button class="btn dark" data-act="hub">Continuar</button>';
    }
    $app.innerHTML = html;
  }

  /* ---------- pantalla: fin de temporada ---------- */
  function endSeason() {
    if (S.phase !== 'season_end') { V = { sum: T.closeSeason(S) }; save(); }
    render();
  }
  function renderSeasonEnd() {
    const sum = S.hist[S.hist.length - 1];
    const retireForced = S.p.age + 1 > 38;
    const canRetire = sum.n >= 3;
    $app.innerHTML = '<div class="card"><h2>Fin de la temporada ' + sum.n + ' · ' + sum.age + ' años</h2>' +
      '<div class="stats"><div class="st"><span>Ranking final</span><b>#' + sum.rank + '</b> <small>(empezó #' + sum.rank0 + ')</small></div><div class="st"><span>Puntos</span><b>' + sum.pts + '</b></div><div class="st"><span>Victorias-Derrotas</span><b>' + sum.w + '-' + sum.l + '</b></div><div class="st"><span>Títulos</span><b>' + sum.titles + '</b> <small>' + (sum.slams ? sum.slams + ' Grand Slam' : '') + '</small></div></div></div>' +
      '<div class="card"><h2>Evolución física y técnica</h2><div class="bars">' + sum.growth.map((g) => {
        const d = Math.round((g.to - g.from) * 10) / 10;
        return '<div class="bar" style="grid-template-columns:96px 1fr 70px"><span>' + STAT_NAMES[g.k] + '</span><div class="track"><div class="fill" style="width:' + g.to + '%"></div></div><span class="num">' + r0(g.to) + ' <small class="' + (d >= 0 ? 'up' : 'down') + '">' + (d >= 0 ? '+' : '') + fmt1(d) + '</small></span></div>';
      }).join('') + '</div></div>' +
      '<div class="row">' + (retireForced ? '' : '<button class="btn" data-act="nextseason">Siguiente temporada (' + (S.p.age + 1) + ' años)</button>') +
      (canRetire || retireForced ? '<button class="btn ' + (retireForced ? '' : 'sec') + '" data-act="retire">' + (retireForced ? 'Es hora de colgar la raqueta' : 'Retirarme ahora') + '</button>' : '') + '</div>';
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
      case 'hub': if (V && V.rep) renderTournament(); else renderHub(); break;
      case 'season_end': renderSeasonEnd(); break;
      case 'final': renderFinal(); break;
      default: renderPlan();
    }
  }

  function doPlay() {
    const i = S.season.idx;
    const rep = T.playEvent(S, i);
    save();
    V = { rep, shown: 1 };
    render(); top();
  }
  function autoPlan() {
    const se = S.season;
    while (se.idx < EVENTS.length) {
      const i = se.idx, ev = EVENTS[i];
      if (se.injOut > 0) { T.skipEvent(S, i, 'injured'); continue; }
      const en = T.entryFor(S, ev, T.currentRank(S, se.n, i, 'pre'));
      if (se.plan[ev.id] && en.mode !== 'NO' && se.energy >= 20) T.playEvent(S, i);
      else T.skipEvent(S, i, 'skipped');
    }
    save();
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
      S = T.newGame(form); V = null; save(); render(); top();
    } else if (a === 'continue') {
      S = load(); V = null; if (S && S.phase === 'random') V = null; render(); top();
    } else if (a === 'focus') {
      const slot = Number(b.dataset.slot), k = b.dataset.k, f = S.season.focus;
      f[slot] = k; if (slot === 0 && f[1] === k) f[1] = undefined; if (slot === 1 && f[0] === k) f[0] = undefined;
      save(); renderPlan();
    } else if (a === 'startseason') {
      S.phase = 'hub'; V = null; save(); render(); top();
    } else if (a === 'rchoice') {
      const c = V.ev.choices[Number(b.dataset.i)];
      V.out = c.run(S, Math.random); save(); render();
    } else if (a === 'toplan') {
      S.phase = 'plan'; V = null; save(); render(); top();
    } else if (a === 'play') { doPlay(); }
    else if (a === 'skip') { T.skipEvent(S, S.season.idx, 'skipped'); save(); render(); }
    else if (a === 'skipinj') { T.skipEvent(S, S.season.idx, 'injured'); save(); render(); }
    else if (a === 'auto') { autoPlan(); V = null; render(); top(); }
    else if (a === 'next') { V.shown++; renderTournament(); }
    else if (a === 'showall') { V.shown = 99; renderTournament(); }
    else if (a === 'hub') { V = null; render(); top(); }
    else if (a === 'nextseason') { T.newSeason(S, null, false); V = null; save(); render(); top(); }
    else if (a === 'retire') { V = null; S.phase = 'final'; if (S.season.results.length && S.phase !== 'season_end' && !S.hist.some((h) => h.n === S.season.n)) { try { T.closeSeason(S); } catch (err) { /* ignore */ } S.phase = 'final'; } save(); render(); top(); }
    else if (a === 'newgame') { if (confirm('¿Empezar una carrera nueva? Perderás la actual.')) { clearSave(); S = null; V = null; render(); top(); } }
    else if (a === 'menu') { V = Object.assign({}, V || {}, { menu: true }); render(); }
    else if (a === 'back') { if (V) V.menu = false; render(); }
    else if (a === 'copy') {
      const t = summaryText();
      const done = () => { const el = document.getElementById('copied'); if (el) el.textContent = 'Resumen copiado ✔'; };
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, () => window.prompt('Copia tu resumen:', t)); else window.prompt('Copia tu resumen:', t);
    }
  });
  $app.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'country') { form.country = t.value; document.getElementById('preview').innerHTML = previewHTML(); }
    else if (t.dataset && t.dataset.act === 'plan') { S.season.plan[t.dataset.id] = t.checked; save(); if (S.phase === 'plan') renderPlan(); }
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
