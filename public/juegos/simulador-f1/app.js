(function () {
  'use strict';
  const F = window.F1;
  const $app = document.getElementById('app');
  const KEY = 'f1-sim-v1';
  const { STATS, STAT_NAMES, STAT_SHORT, STAT_HELP, COUNTRIES, CAT_NAMES } = F;
  let S = null;
  let form = { name: '', country: 'GBR', alloc: { def: 25, att: 25, tyre: 25, quali: 25 } };
  let draft = null; // reparto de puntos de experiencia

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fl = (c) => (COUNTRIES[c] ? COUNTRIES[c].f : '🏳️');
  const r0 = Math.round;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* */ } };
  const load = () => { try { const j = localStorage.getItem(KEY); return j ? JSON.parse(j) : null; } catch (e) { return null; } };
  const top = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const posTxt = (p) => (p ? 'P' + p : 'DNF');

  function allocHTML(vals, left, cap) {
    const c = COUNTRIES[S ? S.p.country : form.country];
    return STATS.map((k) => '<div class="alloc"><div><b>' + STAT_NAMES[k] + '</b><div class="note">' + STAT_HELP[k] + '</div>' +
      '<div class="track"><div class="fill" style="width:' + Math.min(100, vals[k]) + '%"></div></div>' +
      (c.bonus[k] ? '<div class="note">Bonus de ' + esc(c.n) + ': +' + c.bonus[k] + '</div>' : '') + '</div>' +
      '<div class="ctl"><button data-act="dec" data-k="' + k + '" aria-label="Quitar">−</button><b>' + vals[k] + '</b><button data-act="inc" data-k="' + k + '" aria-label="Añadir"' + (left <= 0 || vals[k] >= cap ? ' disabled' : '') + '>+</button></div></div>').join('');
  }
  const sum = (o) => STATS.reduce((a, k) => a + o[k], 0);

  /* ---------- creación ---------- */
  function renderCreate() {
    const saved = load();
    const left = 100 - sum(form.alloc);
    const c = COUNTRIES[form.country];
    const opts = Object.keys(COUNTRIES).sort((a, b) => COUNTRIES[a].n.localeCompare(COUNTRIES[b].n, 'es')).map((k) => '<option value="' + k + '"' + (k === form.country ? ' selected' : '') + '>' + COUNTRIES[k].f + ' ' + COUNTRIES[k].n + '</option>').join('');
    const aff = c.aff.map((id) => { const t = F.TEAMS.find((x) => x.id === id && x.cat === 'F1'); return t ? '<span class="pill p"><span class="dot" style="background:' + t.color + '"></span>' + esc(t.nick) + '</span>' : ''; }).join(' ');
    $app.innerHTML = (saved ? '<div class="card"><div class="row sp"><div><b>Tienes una carrera guardada</b><div class="note">' + esc(saved.p.name) + ' ' + fl(saved.p.country) + ' · ' + saved.p.age + ' años · ' + CAT_NAMES[saved.cat] + '</div></div><button class="btn" data-act="continue">Continuar</button></div></div>' : '') +
      '<div class="grid2"><div class="card"><h2>Tu piloto</h2><label class="f" for="name">Nombre</label><input id="name" type="text" maxlength="28" placeholder="Tu nombre" value="' + esc(form.name) + '">' +
      '<label class="f" for="country">Nacionalidad</label><select id="country">' + opts + '</select>' +
      '<p class="note" style="margin-top:10px">' + esc(c.rasgo) + '</p>' +
      '<div class="row" style="gap:6px"><span class="pill">Patrocinio: ' + '💰'.repeat(c.sponsor) + '</span>' + Object.keys(c.bonus).map((k) => '<span class="pill p">' + STAT_SHORT[k] + ' +' + c.bonus[k] + '</span>').join('') + '</div>' +
      '<h3>Equipos afines (más fáciles de fichar)</h3><div class="row" style="gap:6px">' + aff + '</div>' +
      '<h3>Referentes de tu país</h3>' + c.legends.slice(0, 4).map((l) => '<div class="note"><b>' + esc(l[0]) + '</b> — ' + esc(l[1]) + '</div>').join('') + '</div>' +
      '<div class="card"><h2>Reparte 100 puntos</h2><p class="note" style="margin-top:-6px">Te quedan <span class="left">' + left + '</span> puntos. Máximo 60 por categoría.</p><div id="alloc">' + allocHTML(form.alloc, left, 60) + '</div></div></div>' +
      '<button class="btn block" data-act="start"' + (left === 0 ? '' : ' disabled') + ' style="font-size:1.05rem">🏁 Empezar en F3 con 14 años</button>' +
      '<div class="card" style="margin-top:16px"><h2>Cómo funciona</h2><ul style="margin:0;padding-left:20px;color:var(--mut)">' +
      '<li>Cada ciclo dura <b>2 años</b> (2 temporadas) con el mismo equipo. De los 14 a los 40 años.</li>' +
      '<li>Subes de <b>F3 → F2 → F1</b> si consigues suficientes <b>trofeos</b> (victorias, podios, títulos y poles). Tu patrocinio nacional baja el listón.</li>' +
      '<li>Los mejores equipos exigen <b>reputación</b>; tu nacionalidad te abre las puertas de algunos equipos.</li>' +
      '<li>Cada ciclo ganas puntos de experiencia para reforzar defensa, ataque, neumáticos o clasificación. Pasados los 36 empiezas a perder facultades.</li></ul></div>';
  }

  /* ---------- cabecera ---------- */
  function header() {
    const p = S.p;
    return '<div class="card"><div class="row sp"><div><b style="font-size:1.1rem">' + fl(p.country) + ' ' + esc(p.name) + '</b><div class="note">' + p.age + ' años · ' + CAT_NAMES[S.cat] + (S.team ? ' · <span class="dot" style="background:' + S.team.color + '"></span>' + esc(S.team.nick) : '') + '</div></div><button class="btn sec" data-act="menu" style="padding:8px 12px">Menú</button></div>' +
      '<div class="stats" style="margin-top:12px">' + STATS.map((k) => '<div class="st"><span>' + STAT_SHORT[k] + '</span><b>' + p.stats[k] + '</b></div>').join('') + '</div>' +
      '<div style="margin-top:10px" class="note">Reputación <b>' + r0(S.rep) + '</b>/100 · Trofeos: 🏆 ' + (S.career.titles.F3 + S.career.titles.F2 + S.career.titles.F1) + ' · 🥇 ' + S.career.wins + ' · 🏅 ' + S.career.podiums + '</div></div>';
  }

  /* ---------- reparto de experiencia ---------- */
  function renderAlloc() {
    if (!draft) draft = { vals: Object.assign({}, S.p.stats), left: S.pending };
    $app.innerHTML = header() + '<div class="card"><h2>Experiencia acumulada</h2>' +
      '<p class="note" style="margin-top:-6px">Ahora tienes <b>' + S.p.age + ' años</b>. Reparte <span class="left">' + draft.left + '</span> puntos nuevos (máx. 90 por categoría).</p>' +
      (S.hist.length && S.hist[S.hist.length - 1].decline ? '<div class="warnbox" style="margin-bottom:10px">Con la edad has perdido ' + S.hist[S.hist.length - 1].decline + ' puntos de facultades.</div>' : '') +
      '<div id="alloc">' + allocHTML(draft.vals, draft.left, 90) + '</div></div>' +
      '<button class="btn block" data-act="confirmalloc"' + (draft.left === 0 ? '' : ' disabled') + '>Confirmar y elegir equipo</button>';
  }

  /* ---------- equipos ---------- */
  function renderTeam() {
    const offers = F.offers(S);
    const nextTxt = S.cat === 'F1' ? 'Objetivo: títulos mundiales.' : 'Para subir a ' + CAT_NAMES[F.CATS[F.CATS.indexOf(S.cat) + 1]] + ' necesitas ' + Math.max(8, F.NEED[S.cat] - COUNTRIES[S.p.country].sponsor * 2) + ' puntos de trofeo (victoria = 1,5; podio = 1; pole = 0,5; título = 8) o ser campeón.';
    $app.innerHTML = header() + '<div class="card"><h2>Elige equipo · ' + CAT_NAMES[S.cat] + '</h2><p class="note" style="margin-top:-6px">Años ' + S.p.age + '-' + (S.p.age + 1) + '. ' + nextTxt + '</p>' +
      offers.map((o, i) => {
        const t = o.team;
        const bs = F.STATS.map((k) => t.bias[k] ? '<span class="pill ' + (t.bias[k] > 0 ? 'p' : 'n') + '">' + STAT_SHORT[k] + ' ' + (t.bias[k] > 0 ? '+' : '') + t.bias[k] + '</span>' : '').join('');
        return '<button class="team' + (o.locked ? ' locked' : '') + '" data-act="team" data-i="' + i + '"' + (o.locked ? ' disabled' : '') + '>' +
          '<span class="stripe" style="background:' + t.color + '"></span><span class="tn">' + esc(t.nick) + (o.aff ? ' ⭐' : '') + '</span>' +
          '<span class="lock">' + (o.locked ? '🔒 Reputación ' + o.need + '<br><span class="note">(tienes ' + r0(S.rep) + ')</span>' : '<span class="badge" style="background:' + t.color + ';color:' + t.text + '">Coche ' + t.car + '</span>') + '</span>' +
          '<span class="meta">' + esc(t.desc) + (o.aff ? ' · Afín a tu nacionalidad' : '') + '</span><span class="bs">' + bs + '</span></button>';
      }).join('') + '<p class="hint">⭐ equipo afín a tu país (exige menos reputación). Los coches varían un poco cada temporada.</p></div>';
  }

  /* ---------- ciclo de dos temporadas ---------- */
  function miniSeason(s, label) {
    const t = F.teamById(s.team);
    return '<div class="card compact" style="margin:0"><div class="row sp"><b>' + label + '</b><span class="badge" style="background:' + t.color + ';color:' + t.text + '">' + esc(t.nick) + '</span></div>' +
      (s.champion ? '<div class="champ" style="margin:8px 0;padding:8px"><b>🏆 ¡CAMPEÓN DE ' + CAT_NAMES[s.cat].toUpperCase() + '!</b></div>' : '') +
      '<div class="stats" style="margin:8px 0"><div class="st"><span>Puesto</span><b>P' + s.pos + '</b></div><div class="st"><span>Puntos</span><b>' + s.pts + '</b></div><div class="st"><span>Victorias</span><b>' + s.wins + '</b></div><div class="st"><span>Podios · Poles</span><b>' + s.podiums + ' · ' + s.poles + '</b></div></div>' +
      '<div class="strip">' + s.races.map((r) => '<span class="rc ' + (r.dnf ? 'dnf' : r.pos === 1 ? 'w' : r.pos <= 3 ? 'p' : r.pos <= 10 ? 'pt' : '') + '" title="' + esc(r.gp) + ' · parrilla P' + r.grid + '">' + (r.pos ? r.pos : '✕') + '</span>').join('') + '</div>' +
      '<table style="margin-top:8px"><tbody>' + s.table.slice(0, 3).map((x, i) => '<tr class="' + (x.you ? 'you' : '') + '"><td>' + (i + 1) + '</td><td>' + fl(x.country) + ' ' + esc(x.name) + '</td><td><span class="dot" style="background:' + x.color + '"></span>' + esc(x.team) + '</td><td>' + x.pts + '</td></tr>').join('') + '</tbody></table>' +
      '<p class="note" style="margin:6px 0 0">Compañero: ' + esc(s.mate.name) + ' (' + s.mate.pts + ' pts) · Abandonos: ' + s.dnfs + (s.pos > 3 ? ' · Tú: P' + s.pos + ' de ' + s.total : '') + '</p></div>';
  }
  function renderBlockEnd() {
    const h = S.hist[S.hist.length - 1];
    const two = S.seasons.slice(-2);
    const stars = '🏆'.repeat(h.titles) + '🥇'.repeat(Math.min(10, h.wins)) + '🏅'.repeat(Math.min(10, Math.max(0, h.podiums - h.wins)));
    $app.innerHTML = '<div class="card compact"><div class="row sp"><h2 style="margin:0">' + CAT_NAMES[h.cat] + ' · años ' + h.age + '-' + (h.age + 1) + '</h2>' +
      '<div class="row"><span class="badge">Trofeos: ' + h.score + (h.need ? ' / ' + h.need : '') + '</span><span class="trophies">' + (stars || '—') + '</span></div></div></div>' +
      '<div class="grid2" style="margin-bottom:10px">' + miniSeason(two[0], 'Año ' + h.age) + miniSeason(two[1], 'Año ' + (h.age + 1)) + '</div>' +
      '<div class="' + (h.promoted ? 'okbox' : 'warnbox') + '" style="margin-bottom:10px">' + (h.promoted ? '⬆️ ' : '') + esc(h.note) + (h.gain ? ' Ganas ' + h.gain + ' puntos de experiencia.' : '') + '</div>' +
      '<button class="btn block" data-act="after">' + (S.nextPhase === 'final' ? 'Colgar el casco' : 'Continuar (' + S.p.age + ' años)') + '</button>';
  }

  /* ---------- final ---------- */
  function summary() {
    const c = S.career, cmp = F.compare(S);
    return '🏁 ' + S.p.name + ' (' + COUNTRIES[S.p.country].n + ') · ' + c.f1Titles + ' títulos de F1 · ' + c.f1Wins + ' victorias · ' + c.f1Podiums + ' podios · Mi carrera se parece a la de ' + cmp.n + '. ¿Lo superas?';
  }
  function renderFinal() {
    const c = S.career, cmp = F.compare(S);
    const verdict = c.f1Titles >= 7 ? 'El mejor de todos los tiempos.' : c.f1Titles >= 3 ? 'Una leyenda inmortal de la F1.' : c.f1Titles >= 1 ? 'Campeón del mundo: tu nombre está en la historia.' : c.f1Wins > 0 ? 'Ganador de Grandes Premios.' : c.f1Races > 0 ? 'Llegaste a la F1: solo 20 pilotos lo consiguen.' : 'Te quedaste a las puertas de la F1.';
    $app.innerHTML = '<div class="champ"><div class="note" style="color:#2b1d00">CARRERA TERMINADA</div><div class="big">' + fl(S.p.country) + ' ' + esc(S.p.name) + '</div><div>' + verdict + '</div></div>' +
      '<div class="card" style="margin-top:16px"><div class="stats"><div class="st"><span>Títulos F1</span><b>' + c.f1Titles + '</b></div><div class="st"><span>Victorias F1</span><b>' + c.f1Wins + '</b></div><div class="st"><span>Podios F1</span><b>' + c.f1Podiums + '</b></div><div class="st"><span>Mejor puesto F1</span><b>' + (c.bestF1 ? 'P' + c.bestF1 : '—') + '</b></div></div>' +
      '<p class="note" style="margin-top:12px">Títulos: F3 ' + c.titles.F3 + ' · F2 ' + c.titles.F2 + ' · F1 ' + c.titles.F1 + ' · Total de victorias ' + c.wins + ' · Podios ' + c.podiums + ' · Poles ' + c.poles + ' · Carreras ' + c.races + '</p></div>' +
      '<div class="card"><h2>Tu carrera se parece a…</h2><p style="font-size:1.1rem"><b>' + esc(cmp.n) + '</b> <span class="note">(' + esc(cmp.why) + ')</span></p></div>' +
      '<div class="card"><h2>Tu trayectoria</h2><div style="overflow-x:auto"><table><thead><tr><th>Edad</th><th>Cat.</th><th>Equipo</th><th>Puestos</th><th>V</th><th>Podios</th></tr></thead><tbody>' +
      S.hist.map((h) => { const t = F.teamById(h.team); return '<tr><td>' + h.age + '</td><td>' + h.cat + '</td><td><span class="dot" style="background:' + t.color + '"></span>' + esc(t.nick) + '</td><td>' + h.pos.map((p) => 'P' + p).join(' ') + '</td><td>' + h.wins + '</td><td>' + h.podiums + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
      '<div class="row"><button class="btn" data-act="copy">📋 Copiar resumen</button><button class="btn sec" data-act="newgame">Nueva carrera</button></div><p class="note" id="copied"></p>';
  }

  let menuOpen = false;
  function render() {
    if (!S) return renderCreate();
    if (menuOpen) { $app.innerHTML = '<div class="card"><h2>Menú</h2><div class="row"><button class="btn" data-act="back">Volver</button><button class="btn sec" data-act="retire">Retirarme ahora</button><button class="btn sec" data-act="newgame">Empezar de nuevo</button></div></div>'; return; }
    switch (S.phase) {
      case 'alloc': return renderAlloc();
      case 'team': return renderTeam();
      case 'results': S.phase = 'team'; return renderTeam();
      case 'block_end': return renderBlockEnd();
      case 'final': return renderFinal();
      default: return renderTeam();
    }
  }

  $app.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const a = b.dataset.act, k = b.dataset.k;
    if (a === 'inc' || a === 'dec') {
      const cap = S ? 90 : 60, d = S ? draft : null;
      const vals = d ? d.vals : form.alloc, base = S ? S.p.stats : null;
      if (a === 'inc') { if ((d ? d.left : 100 - sum(vals)) > 0 && vals[k] < cap) { vals[k]++; if (d) d.left--; } }
      else if (vals[k] > (base ? base[k] : 0)) { vals[k]--; if (d) d.left++; }
      S ? renderAlloc() : renderCreate();
    } else if (a === 'start') {
      form.name = document.getElementById('name').value;
      S = F.newGame(form); draft = null; save(); render(); top();
    } else if (a === 'continue') { S = load(); S.team = S.team || null; render(); top(); }
    else if (a === 'confirmalloc') { STATS.forEach((x) => { S.p.stats[x] = draft.vals[x]; }); S.pending = 0; draft = null; S.phase = 'team'; save(); render(); top(); }
    else if (a === 'team') {
      const o = F.offers(S)[Number(b.dataset.i)];
      S.team = o.team; F.simSeason(S); F.simSeason(S); F.finishBlock(S); S.nextPhase = S.phase; S.phase = 'block_end'; save(); render(); top();
    }
    else if (a === 'after') { S.phase = S.nextPhase; S.nextPhase = null; draft = null; save(); render(); top(); }
    else if (a === 'menu') { menuOpen = true; render(); }
    else if (a === 'back') { menuOpen = false; render(); }
    else if (a === 'retire') { menuOpen = false; S.phase = 'final'; save(); render(); top(); }
    else if (a === 'newgame') { if (confirm('¿Empezar una carrera nueva? Perderás la actual.')) { try { localStorage.removeItem(KEY); } catch (er) { /* */ } S = null; menuOpen = false; draft = null; render(); top(); } }
    else if (a === 'copy') {
      const t = summary(), done = () => { const el = document.getElementById('copied'); if (el) el.textContent = 'Resumen copiado ✔'; };
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, () => window.prompt('Copia tu resumen:', t)); else window.prompt('Copia tu resumen:', t);
    }
  });
  $app.addEventListener('change', (e) => { if (e.target.id === 'country') { form.country = e.target.value; renderCreate(); } });
  $app.addEventListener('input', (e) => { if (e.target.id === 'name') form.name = e.target.value; });
  render();
})();
