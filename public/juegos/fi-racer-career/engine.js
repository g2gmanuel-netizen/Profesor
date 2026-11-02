/* Simulador de carrera de F1 (F3 → F2 → F1) — motor del juego (sin DOM).
   Los equipos usan los colores reales pero con un apodo que suena igual y se escribe distinto. */
(function (root) {
  'use strict';

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const randn = (R) => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const pick = (a, R) => a[Math.floor(R() * a.length)];

  const STATS = ['def', 'att', 'tyre', 'quali'];
  const STAT_NAMES = { def: 'Mejor defensa', att: 'Mejor ataque', tyre: 'Dosificación de neumáticos', quali: 'Clasificación (a una vuelta)' };
  const STAT_SHORT = { def: 'Defensa', att: 'Ataque', tyre: 'Neumáticos', quali: 'Clasificación' };
  const STAT_HELP = {
    def: 'Mantienes la posición cuando te atacan y conservas mejor la parrilla.',
    att: 'Adelantas más y remontas desde atrás, sobre todo en circuitos rápidos.',
    tyre: 'Cuidas las gomas: brillas en carreras de mucho desgaste.',
    quali: 'Vuelta lanzada: sales más arriba en parrilla y pillas poles.',
  };
  const CATS = ['F3', 'F2', 'F1'];
  const CAT_NAMES = { F3: 'Fórmula 3', F2: 'Fórmula 2', F1: 'Fórmula 1' };
  const CAT_AI = { F3: 55, F2: 63, F1: 73 };
  const CAT_CARS = { F3: 54, F2: 63, F1: 77 };
  const CAT_RACES = { F3: 10, F2: 14, F1: 24 };
  const CAT_DNF = { F3: 0.06, F2: 0.05, F1: 0.04 };
  const MIN_AGE = { F3: 14, F2: 16, F1: 18 };
  const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

  /* ------------------------------------------------------------------ */
  /* Países: patrocinio, bonus y escuderías afines                       */
  /* ------------------------------------------------------------------ */
  const CT = (n, f, sponsor, bonus, aff, rasgo, legends) => ({ n, f, sponsor, bonus, aff, rasgo, legends });
  const COUNTRIES = {
    GBR: CT('Reino Unido', '🇬🇧', 2, { tyre: 3 }, ['mclaren', 'williams', 'aston'], 'Cuna del motorsport: mucha cantera y tres escuderías históricas en casa. Buen manejo de gomas con lluvia y mixto.', [['Lewis Hamilton', '7 títulos mundiales'], ['Jackie Stewart', '3 títulos mundiales'], ['Jim Clark', '2 títulos mundiales'], ['Damon Hill', 'Campeón en 1996'], ['Jenson Button', 'Campeón en 2009'], ['Nigel Mansell', 'Campeón en 1992'], ['James Hunt', 'Campeón en 1976']]),
    ESP: CT('España', '🇪🇸', 3, { att: 3 }, ['alpine', 'campos', 'aston'], 'Mucho patrocinio y afición: cuesta menos subir de categoría. Pilotos agresivos al ataque.', [['Fernando Alonso', '2 títulos mundiales (2005, 2006)'], ['Carlos Sainz', 'Ganador de Grandes Premios'], ['Pedro de la Rosa', 'Piloto de F1 durante años']]),
    ITA: CT('Italia', '🇮🇹', 2, { quali: 3 }, ['ferrari', 'prema', 'mclaren'], 'Pasión por la Scuderia y por la vuelta rápida. Escuela de karting de primer nivel.', [['Alberto Ascari', '2 títulos mundiales'], ['Giuseppe Farina', 'Primer campeón del Mundial'], ['Michele Alboreto', 'Subcampeón en 1985'], ['Riccardo Patrese', '256 Grandes Premios'], ['Giancarlo Fisichella', '3 victorias en F1']]),
    GER: CT('Alemania', '🇩🇪', 2, { def: 3 }, ['mercedes', 'audi'], 'Disciplina y regularidad alemanas: defiendes la posición como nadie.', [['Michael Schumacher', '7 títulos mundiales'], ['Sebastian Vettel', '4 títulos mundiales'], ['Nico Rosberg', 'Campeón en 2016'], ['Nick Heidfeld', 'Podios en F1']]),
    NED: CT('Países Bajos', '🇳🇱', 2, { att: 3 }, ['redbull', 'vanamersfoort'], 'Ola naranja: afición enorme y estilo ofensivo.', [['Max Verstappen', '4 títulos mundiales (2021-2024)'], ['Jos Verstappen', 'Podios y 107 Grandes Premios'], ['Giedo van der Garde', 'Piloto de F1']]),
    FRA: CT('Francia', '🇫🇷', 2, { quali: 2, def: 1 }, ['alpine', 'art', 'dams'], 'Escuela francesa (ART, DAMS): finura al volante.', [['Alain Prost', '4 títulos mundiales'], ['Pierre Gasly', 'Ganador en Monza 2020'], ['Esteban Ocon', 'Ganador en Hungría 2021'], ['Jean Alesi', 'Piloto de leyenda']]),
    FIN: CT('Finlandia', '🇫🇮', 1, { tyre: 3, def: 1 }, ['audi', 'mclaren'], 'Cabeza fría: gestión de gomas y sangre helada.', [['Kimi Räikkönen', 'Campeón en 2007'], ['Mika Häkkinen', '2 títulos mundiales'], ['Keke Rosberg', 'Campeón en 1982'], ['Valtteri Bottas', 'Ganador de 10 Grandes Premios']]),
    BRA: CT('Brasil', '🇧🇷', 2, { att: 2, quali: 2 }, ['haas', 'williams', 'audi'], 'Sangre brasileña: ataque y vuelta rápida inspirados en Senna.', [['Ayrton Senna', '3 títulos mundiales'], ['Nelson Piquet', '3 títulos mundiales'], ['Emerson Fittipaldi', '2 títulos mundiales'], ['Felipe Massa', 'Subcampeón en 2008']]),
    AUS: CT('Australia', '🇦🇺', 1, { att: 2, tyre: 1 }, ['mclaren', 'racingbulls'], 'Garra australiana: adelantamientos valientes.', [['Jack Brabham', '3 títulos mundiales'], ['Alan Jones', 'Campeón en 1980'], ['Daniel Ricciardo', '8 victorias en F1'], ['Mark Webber', '9 victorias en F1'], ['Oscar Piastri', 'Ganador de Grandes Premios']]),
    MEX: CT('México', '🇲🇽', 3, { att: 2, def: 1 }, ['redbull', 'haas'], 'Patrocinio potente y público entregado.', [['Sergio Pérez', 'Ganador de 6 Grandes Premios'], ['Pedro Rodríguez', 'Ganador en F1 y Le Mans'], ['Esteban Gutiérrez', 'Piloto de F1']]),
    JPN: CT('Japón', '🇯🇵', 2, { tyre: 2, quali: 2 }, ['racingbulls', 'haas'], 'Precisión y método: vuelta limpia y buen cuidado de gomas.', [['Kamui Kobayashi', 'Podio en Japón 2012'], ['Yuki Tsunoda', 'Piloto de F1'], ['Takuma Sato', 'Podio en F1 y 2 Indy 500'], ['Aguri Suzuki', 'Primer podio japonés']]),
    MON: CT('Mónaco', '🇲🇨', 3, { quali: 3 }, ['ferrari', 'prema'], 'Cuna de millonarios del motor: gran respaldo y mucha vuelta rápida.', [['Charles Leclerc', 'Ganador de Grandes Premios'], ['Louis Chiron', 'Pionero del automovilismo']]),
    USA: CT('Estados Unidos', '🇺🇸', 3, { def: 2, tyre: 1 }, ['haas', 'cadillac'], 'Dinero y mercado enorme: dos equipos en casa.', [['Mario Andretti', 'Campeón en 1978'], ['Phil Hill', 'Campeón en 1961'], ['Logan Sargeant', 'Piloto de F1']]),
    CAN: CT('Canadá', '🇨🇦', 2, { att: 2, def: 1 }, ['aston', 'cadillac'], 'Con las Villeneuve de referencia y mucho dinero en el deporte.', [['Jacques Villeneuve', 'Campeón en 1997'], ['Gilles Villeneuve', 'Leyenda de Ferrari'], ['Lance Stroll', 'Podios en F1']]),
    ARG: CT('Argentina', '🇦🇷', 1, { att: 2, def: 2 }, ['alpine', 'williams'], 'Fangio como bandera: coraje y defensa a ultranza.', [['Juan Manuel Fangio', '5 títulos mundiales'], ['José Froilán González', 'Primera victoria de Ferrari'], ['Carlos Reutemann', 'Subcampeón en 1981']]),
    AUT: CT('Austria', '🇦🇹', 2, { tyre: 2, def: 2 }, ['redbull', 'racingbulls'], 'Tradición Red Bull y de campeones: Rindt, Lauda...', [['Niki Lauda', '3 títulos mundiales'], ['Jochen Rindt', 'Campeón póstumo en 1970'], ['Gerhard Berger', '10 victorias en F1']]),
    POL: CT('Polonia', '🇵🇱', 1, { quali: 3 }, ['alpine', 'williams'], 'Talento con mucho esfuerzo; Kubica como referente.', [['Robert Kubica', 'Ganador en Canadá 2008']]),
    THA: CT('Tailandia', '🇹🇭', 2, { att: 1, tyre: 2 }, ['williams', 'racingbulls'], 'Apoyo real de patrocinadores y gran afición.', [['Alexander Albon', 'Podios en F1'], ['Prince Bira', 'Pionero de la F1']]),
  };

  /* ------------------------------------------------------------------ */
  /* Equipos reales con apodo "fonético" (misma voz, otra grafía)        */
  /* ------------------------------------------------------------------ */
  let _n = 0;
  const TEAM = (id, cat, real, nick, color, text, car, min, b, extra) => ({
    id, cat, real, nick, color, text, car, min,
    bias: { def: b[0], att: b[1], tyre: b[2], quali: b[3] }, desc: extra || '',
  });
  const TEAMS = [
    // F1
    TEAM('ferrari', 'F1', 'Ferrari', 'Ferrary', '#DC0000', '#fff', 87, 78, [0, 2, -2, 4], 'El caballo rampante: pasión y vuelta rápida.'),
    TEAM('mercedes', 'F1', 'Mercedes', 'Mersedes', '#27F4D2', '#06322c', 86, 78, [2, 0, 3, 0], 'Plata y turquesa: fiabilidad y cuidado de gomas.'),
    TEAM('mclaren', 'F1', 'McLaren', 'MacLarén', '#FF8000', '#2a1400', 90, 80, [0, 1, 3, 1], 'Papaya: coche completo y muy cuidadoso con los neumáticos.'),
    TEAM('redbull', 'F1', 'Red Bull', 'Rred Bul', '#3671C6', '#fff', 86, 80, [-1, 4, 0, 1], 'Azul noche: coche agresivo para atacar.'),
    TEAM('aston', 'F1', 'Aston Martin', 'Astón Marteen', '#229971', '#fff', 72, 52, [2, 0, 1, 0], 'Verde británico: defiende bien en carrera.'),
    TEAM('alpine', 'F1', 'Alpine', 'Alpain', '#0093CC', '#fff', 66, 45, [0, 1, 0, 0], 'Azul francés: proyecto en reconstrucción.'),
    TEAM('williams', 'F1', 'Williams', 'Wiliams', '#64C4FF', '#06263d', 74, 55, [2, -1, 0, 0], 'Equipo histórico en alza.'),
    TEAM('haas', 'F1', 'Haas', 'Jaas', '#B6BABD', '#1d1f21', 66, 38, [0, -1, -2, 3], 'Blanco y rojo: rápido a una vuelta, sufre con las gomas.'),
    TEAM('racingbulls', 'F1', 'Racing Bulls', 'Rasing Bulz', '#6692FF', '#fff', 71, 50, [-1, 2, 0, 1], 'La cantera de Red Bull: joven y atacante.'),
    TEAM('audi', 'F1', 'Audi', 'Áudy', '#C8102E', '#fff', 66, 42, [1, 0, 1, 0], 'Proyecto alemán de futuro.'),
    TEAM('cadillac', 'F1', 'Cadillac', 'Cadilak', '#2B2B2B', '#D4AF37', 60, 32, [1, 0, 0, 0], 'El recién llegado: negro y oro.'),
    // F2
    TEAM('f2prema', 'F2', 'Prema', 'Premma', '#E10600', '#fff', 68, 45, [0, 2, 0, 3], 'Rojo: la gran favorita.'),
    TEAM('f2art', 'F2', 'ART Grand Prix', 'Art Gran Prí', '#171717', '#e10600', 67, 42, [1, 0, 2, 1], 'Negro y rojo: método francés.'),
    TEAM('f2hitech', 'F2', 'Hitech', 'Jaitek', '#00A3E0', '#fff', 65, 36, [0, 2, 0, 0], 'Azul eléctrico: ataca sin miedo.'),
    TEAM('f2invicta', 'F2', 'Invicta', 'Imbikta', '#7B2D8E', '#fff', 63, 30, [1, 0, 1, 0], 'Morado y ambición.'),
    TEAM('f2mp', 'F2', 'MP Motorsport', 'Em-Pe Motorspor', '#FF6A00', '#241000', 64, 32, [0, 0, 3, -1], 'Naranja: cuida las gomas.'),
    TEAM('f2dams', 'F2', 'DAMS', 'Damz', '#1E4BA8', '#fff', 62, 30, [2, 0, 0, 0], 'Azul francés.'),
    TEAM('f2trident', 'F2', 'Trident', 'Traident', '#00A651', '#fff', 61, 25, [0, 1, 0, 1], 'Verde: sorprende cada año.'),
    TEAM('f2campos', 'F2', 'Campos', 'Kampos', '#F5A300', '#2a1c00', 60, 22, [1, 1, 0, 0], 'Amarillo: equipo español de cantera.'),
    TEAM('f2rodin', 'F2', 'Rodin', 'Rodín', '#C8102E', '#fff', 59, 20, [0, 0, 1, 1], 'Rojo oscuro: crecimiento rápido.'),
    TEAM('f2vanamersfoort', 'F2', 'Van Amersfoort', 'Fan Amersfurt', '#F28C00', '#241200', 58, 18, [0, 2, 0, 0], 'Naranja holandés.'),
    // F3
    TEAM('prema', 'F3', 'Prema', 'Premma', '#E10600', '#fff', 58, 36, [0, 2, 0, 3], 'Rojo: la gran favorita.'),
    TEAM('trident', 'F3', 'Trident', 'Traident', '#00A651', '#fff', 57, 32, [0, 1, 0, 1], 'Verde.'),
    TEAM('hitech', 'F3', 'Hitech', 'Jaitek', '#00A3E0', '#fff', 56, 30, [0, 2, 0, 0], 'Azul eléctrico.'),
    TEAM('art', 'F3', 'ART Grand Prix', 'Art Gran Prí', '#171717', '#e10600', 56, 28, [1, 0, 2, 1], 'Negro y rojo.'),
    TEAM('mp', 'F3', 'MP Motorsport', 'Em-Pe Motorspor', '#FF6A00', '#241000', 55, 24, [0, 0, 3, -1], 'Naranja.'),
    TEAM('campos', 'F3', 'Campos', 'Kampos', '#F5A300', '#2a1c00', 53, 18, [1, 1, 0, 0], 'Amarillo español.'),
    TEAM('rodin', 'F3', 'Rodin', 'Rodín', '#C8102E', '#fff', 52, 14, [0, 0, 1, 1], 'Rojo oscuro.'),
    TEAM('vanamersfoort', 'F3', 'Van Amersfoort', 'Fan Amersfurt', '#F28C00', '#241200', 51, 10, [0, 2, 0, 0], 'Naranja holandés.'),
    TEAM('dams', 'F3', 'DAMS', 'Damz', '#1E4BA8', '#fff', 50, 8, [2, 0, 0, 0], 'Azul francés.'),
    TEAM('jenzer', 'F3', 'Jenzer', 'Yenzer', '#E30613', '#fff', 49, 5, [0, 0, 1, 0], 'Equipo suizo de entrada.'),
  ];
  const teamById = (id) => TEAMS.find((t) => t.id === id);
  // Las afinidades de país usan ids "genéricos": se aplican a la versión de cada categoría.
  const affMatch = (country, team) => {
    const base = team.id.replace(/^f2/, '');
    return COUNTRIES[country].aff.indexOf(base) >= 0;
  };

  /* ------------------------------------------------------------------ */
  /* Calendario de Grandes Premios                                       */
  /* ------------------------------------------------------------------ */
  const CIRC = {
    urbano: { n: 'Urbano', q: 1.4, ov: 0.55, tyre: 0.6 },
    rapido: { n: 'Rápido', q: 0.8, ov: 1.3, tyre: 0.8 },
    tecnico: { n: 'Técnico', q: 1.0, ov: 0.9, tyre: 1.0 },
    desgaste: { n: 'Alto desgaste', q: 0.8, ov: 1.0, tyre: 1.7 },
  };
  const GPS = [
    ['Australia', 'tecnico'], ['China', 'desgaste'], ['Japón', 'tecnico'], ['Baréin', 'desgaste'], ['Arabia Saudí', 'urbano'], ['Miami', 'urbano'],
    ['Emilia-Romaña', 'tecnico'], ['Mónaco', 'urbano'], ['España', 'tecnico'], ['Canadá', 'urbano'], ['Austria', 'rapido'], ['Gran Bretaña', 'rapido'],
    ['Bélgica', 'rapido'], ['Hungría', 'tecnico'], ['Países Bajos', 'tecnico'], ['Italia (Monza)', 'rapido'], ['Azerbaiyán', 'urbano'], ['Singapur', 'urbano'],
    ['Estados Unidos', 'tecnico'], ['México', 'rapido'], ['Brasil', 'tecnico'], ['Las Vegas', 'rapido'], ['Catar', 'desgaste'], ['Abu Dabi', 'tecnico'],
  ];
  function calendar(cat, R) {
    const n = CAT_RACES[cat];
    if (n >= GPS.length) return GPS.slice();
    const idx = GPS.map((_, i) => i).sort(() => R() - 0.5).slice(0, n).sort((a, b) => a - b);
    return idx.map((i) => GPS[i]);
  }

  /* ------------------------------------------------------------------ */
  /* Nombres de pilotos rivales                                          */
  /* ------------------------------------------------------------------ */
  const FIRST = ['Luca', 'Mateo', 'Jonas', 'Théo', 'Ryan', 'Nikita', 'Rafael', 'Tomás', 'Kenji', 'Oliver', 'Enzo', 'Dario', 'Felix', 'Hugo', 'Marcus', 'Andrés', 'Pietro', 'Jack', 'Lorenzo', 'Bruno'];
  const LAST = ['Bellamy', 'Ferraro', 'Kessler', 'Montoya', 'Hartmann', 'Sokolov', 'Delcourt', 'Whitfield', 'Okabe', 'Lindqvist', 'Marchetti', 'Vasseur', 'Caruso', 'Beltrán', 'Holloway', 'Reiter', 'Haugen', 'Prescott', 'Salvatierra', 'Zelenka', 'Moretti', 'Barrett', 'Cárdenas', 'Vogel'];
  const CODES = Object.keys(COUNTRIES);
  const aiName = (R) => pick(FIRST, R) + ' ' + pick(LAST, R);

  /* ------------------------------------------------------------------ */
  /* Creación y estado                                                   */
  /* ------------------------------------------------------------------ */
  const effStat = (S, k) => clamp(45 + 0.45 * S.p.stats[k] + (COUNTRIES[S.p.country].bonus[k] || 0), 20, 100);

  function newGame(form) {
    const c = COUNTRIES[form.country];
    const stats = {};
    STATS.forEach((k) => { stats[k] = form.alloc[k]; });
    const S = {
      v: 1,
      p: { name: (form.name || 'Tu piloto').trim().slice(0, 28) || 'Tu piloto', country: form.country, age: 14, stats },
      rep: 15 + c.sponsor * 5 + Math.round(STATS.reduce((a, k) => a + stats[k], 0) / 20),
      cat: 'F3', team: null, block: 0, pending: 0, stuck: 0,
      hist: [], seasons: [],
      career: { titles: { F3: 0, F2: 0, F1: 0 }, wins: 0, podiums: 0, poles: 0, races: 0, f1Wins: 0, f1Podiums: 0, f1Titles: 0, f1Races: 0, f1Poles: 0, bestF1: 0, points: 0, dnfs: 0 },
      phase: 'team',
    };
    return S;
  }

  function offers(S) {
    const c = COUNTRIES[S.p.country];
    return TEAMS.filter((t) => t.cat === S.cat).map((t) => {
      const aff = affMatch(S.p.country, t);
      const need = Math.max(0, t.min - (aff ? 12 : 0) - c.sponsor * 2);
      return { team: t, aff, need, locked: S.rep < need };
    }).sort((a, b) => b.team.car - a.team.car).map((o, i, arr) => {
      if (i === arr.length - 1) { o.need = 0; o.locked = false; } // siempre hay un asiento disponible
      return o;
    });
  }

  /* ------------------------------------------------------------------ */
  /* Simulación de una temporada                                         */
  /* ------------------------------------------------------------------ */
  const xpCap = (age) => Math.round(20 + 12 * clamp((age - 14) / 26, 0, 1));
  function simSeason(S, R) {
    R = R || Math.random;
    const cat = S.cat, yourTeam = S.team;
    const cal = calendar(cat, R);
    const teams = TEAMS.filter((t) => t.cat === cat);
    const meanCar = teams.reduce((a, t) => a + t.car, 0) / teams.length;
    const carNow = {};
    teams.forEach((t) => { carNow[t.id] = t.car + randn(R) * 2.8; });
    const entries = [];
    teams.forEach((t) => {
      const skill = () => clamp(CAT_AI[cat] + (carNow[t.id] - meanCar) * 0.3 + randn(R) * 5.5, 35, 96);
      const ids = t.id === yourTeam.id ? [0] : [0, 1];
      ids.forEach((k) => entries.push({ id: t.id + k, team: t, name: aiName(R), country: pick(CODES, R), you: false, skill: skill(), pts: 0, wins: 0, podiums: 0, poles: 0, dnf: 0 }));
    });
    // compañero de equipo y tú
    entries.push({ id: 'mate', team: yourTeam, name: aiName(R), country: pick(CODES, R), you: false, skill: clamp(CAT_AI[cat] + (carNow[yourTeam.id] - meanCar) * 0.3 + randn(R) * 5.5, 35, 96), pts: 0, wins: 0, podiums: 0, poles: 0, dnf: 0 });
    const me = { id: 'you', team: yourTeam, name: S.p.name, country: S.p.country, you: true, pts: 0, wins: 0, podiums: 0, poles: 0, dnf: 0 };
    entries.push(me);
    const N = entries.length;
    const races = [];
    cal.forEach(([gp, type]) => {
      const ct = CIRC[type];
      const rs = entries.map((e) => {
        const b = e.team.bias;
        const car = carNow[e.team.id];
        let def, att, tyre, quali;
        if (e.you) { def = effStat(S, 'def'); att = effStat(S, 'att'); tyre = effStat(S, 'tyre'); quali = effStat(S, 'quali'); }
        else { def = e.skill + randn(R) * 3; att = e.skill + randn(R) * 3; tyre = e.skill + randn(R) * 3; quali = e.skill + randn(R) * 3; }
        return { e, car, def: def + b.def, att: att + b.att, tyre: tyre + b.tyre, quali: quali + b.quali };
      });
      rs.forEach((r) => { r.Q = 0.5 * r.car + 0.5 * r.quali + randn(R) * 3.2; });
      const gridOrder = rs.slice().sort((a, b) => b.Q - a.Q);
      gridOrder.forEach((r, i) => { r.grid = i + 1; });
      rs.forEach((r) => {
        const wa = 0.45 * ct.ov, wt = 0.40 * ct.tyre, wd = 0.15;
        const dr = (r.att * wa + r.tyre * wt + r.def * wd) / (wa + wt + wd);
        const P = 0.52 * r.car + 0.48 * dr + randn(R) * 4;
        const adv = (N - r.grid) * 0.42 * ct.q * (0.75 + 0.5 * r.def / 100);
        r.F = P + adv;
        r.dnf = R() < CAT_DNF[cat] + (r.e.you ? Math.max(0, 55 - r.tyre) * 0.0006 : 0);
      });
      const finish = rs.filter((r) => !r.dnf).sort((a, b) => b.F - a.F);
      finish.forEach((r, i) => { r.pos = i + 1; r.pts = POINTS[i] || 0; });
      rs.filter((r) => r.dnf).forEach((r) => { r.pos = 0; r.pts = 0; r.e.dnf++; });
      gridOrder[0].e.poles++;
      rs.forEach((r) => { r.e.pts += r.pts; if (r.pos === 1) r.e.wins++; if (r.pos >= 1 && r.pos <= 3) r.e.podiums++; });
      const my = rs.find((r) => r.e.you);
      races.push({ gp, type, grid: my.grid, pos: my.pos, dnf: my.dnf, pts: my.pts, winner: finish[0].e.you ? 'Tú' : finish[0].e.name, winTeam: finish[0].e.team.nick });
    });
    const table = entries.slice().sort((a, b) => b.pts - a.pts || b.wins - a.wins || b.podiums - a.podiums);
    const pos = table.indexOf(me) + 1;
    const res = {
      cat, team: yourTeam.id, age: S.p.age, year: S.seasons.length + 1,
      races, pos, pts: me.pts, wins: me.wins, podiums: me.podiums, poles: me.poles, dnfs: me.dnf, champion: pos === 1, n: cal.length,
      table: table.slice(0, 10).map((e) => ({ name: e.name, country: e.country, team: e.team.nick, color: e.team.color, pts: e.pts, you: e.you })),
      mate: { name: entries.find((e) => e.id === 'mate').name, pts: entries.find((e) => e.id === 'mate').pts },
      yourPts: me.pts, total: N,
    };
    // puntos de experiencia: según la temporada, con tope que sube con la edad (20 → 32)
    const ageNow = S.p.age + (S.seasons.length % 2);
    res.age = ageNow;
    res.xpMax = xpCap(ageNow);
    const pf = pos === 1 ? 1 : pos === 2 ? 0.85 : pos === 3 ? 0.75 : pos <= 5 ? 0.6 : pos <= 10 ? 0.45 : 0.25;
    res.xp = Math.max(1, Math.round(res.xpMax * Math.min(1, pf + Math.min(0.1, me.wins * 0.02))));
    // reputación
    const rg = pos === 1 ? 16 : pos === 2 ? 11 : pos === 3 ? 8 : pos <= 5 ? 5 : pos <= 10 ? 2 : -1.5;
    res.repGain = rg + Math.min(3, me.wins * 0.4);
    S.rep = clamp(S.rep + res.repGain, 0, 100);
    S.seasons.push(res);
    const c = S.career;
    c.wins += me.wins; c.podiums += me.podiums; c.poles += me.poles; c.races += cal.length; c.points += me.pts; c.dnfs += me.dnf;
    if (res.champion) c.titles[cat]++;
    if (cat === 'F1') {
      c.f1Wins += me.wins; c.f1Podiums += me.podiums; c.f1Poles += me.poles; c.f1Races += cal.length;
      c.f1Titles = c.titles.F1;
      if (!c.bestF1 || pos < c.bestF1) c.bestF1 = pos;
    }
    return res;
  }

  /* ------------------------------------------------------------------ */
  /* Fin de bloque (2 años): trofeos, ascenso y envejecimiento           */
  /* ------------------------------------------------------------------ */
  function trophyScore(seasons) {
    return seasons.reduce((a, s) => a + s.wins * 1.5 + s.podiums + (s.champion ? 8 : 0) + s.poles * 0.5, 0);
  }
  const NEED = { F3: 12, F2: 15 };
  function finishBlock(S) {
    const last2 = S.seasons.slice(-2);
    const cat = S.cat;
    const score = trophyScore(last2);
    const titles = last2.filter((s) => s.champion).length;
    const podiums = last2.reduce((a, s) => a + s.podiums, 0);
    const wins = last2.reduce((a, s) => a + s.wins, 0);
    const sponsor = COUNTRIES[S.p.country].sponsor;
    const info = { cat, age: S.p.age, team: S.team.id, score: Math.round(score * 10) / 10, titles, podiums, wins, promoted: false, need: null, note: '', pos: last2.map((s) => s.pos) };
    if (cat !== 'F1') {
      const need = Math.max(8, NEED[cat] - sponsor * 2);
      info.need = need;
      const nextAge = S.p.age + 2;
      const nextCat = CATS[CATS.indexOf(cat) + 1];
      if (nextAge >= MIN_AGE[nextCat] && (titles > 0 || score >= need)) {
        info.promoted = true;
        info.note = titles > 0 ? '¡Campeón! Subes de categoría.' : 'Suficientes trofeos: ' + CAT_NAMES[nextCat] + ' te abre la puerta.';
        S.cat = nextCat; S.stuck = 0;
        S.rep = clamp(S.rep * 0.85, 0, 100);
      } else {
        S.stuck++;
        info.note = 'Te faltan trofeos (' + info.score + ' de ' + need + ') para subir. Te quedas otro ciclo en ' + CAT_NAMES[cat] + '.';
      }
    } else {
      info.note = titles > 0 ? 'Campeón del mundo. A por más.' : podiums > 0 ? 'Cada podio cuenta para tu leyenda.' : 'Toca seguir peleando por un asiento mejor.';
    }
    S.hist.push(info);
    // envejecimiento y puntos de experiencia
    S.p.age += 2;
    let gain = last2.reduce((a, s) => a + s.xp, 0);
    if (S.p.age >= 36) {
      const loss = S.p.age >= 38 ? 6 : 3;
      let left = loss;
      while (left-- > 0) { const k = STATS.slice().sort((a, b) => S.p.stats[b] - S.p.stats[a])[0]; S.p.stats[k] = Math.max(5, S.p.stats[k] - 1); }
      info.decline = loss;
    }
    S.pending = gain;
    info.gain = gain;
    S.team = null;
    S.phase = S.p.age > 40 ? 'final' : 'team';
    return info;
  }

  /* ------------------------------------------------------------------ */
  /* Comparación con leyendas                                            */
  /* ------------------------------------------------------------------ */
  const CHAMPS = [
    ['Michael Schumacher', 7, 'GER'], ['Lewis Hamilton', 7, 'GBR'], ['Juan Manuel Fangio', 5, 'ARG'], ['Alain Prost', 4, 'FRA'], ['Sebastian Vettel', 4, 'GER'],
    ['Max Verstappen', 4, 'NED'], ['Ayrton Senna', 3, 'BRA'], ['Nelson Piquet', 3, 'BRA'], ['Jackie Stewart', 3, 'GBR'], ['Niki Lauda', 3, 'AUT'], ['Jack Brabham', 3, 'AUS'],
    ['Fernando Alonso', 2, 'ESP'], ['Mika Häkkinen', 2, 'FIN'], ['Jim Clark', 2, 'GBR'], ['Alberto Ascari', 2, 'ITA'], ['Emerson Fittipaldi', 2, 'BRA'],
    ['Kimi Räikkönen', 1, 'FIN'], ['Jenson Button', 1, 'GBR'], ['Nico Rosberg', 1, 'GER'], ['Damon Hill', 1, 'GBR'], ['Nigel Mansell', 1, 'GBR'], ['James Hunt', 1, 'GBR'], ['Jacques Villeneuve', 1, 'CAN'], ['Mario Andretti', 1, 'USA'], ['Alan Jones', 1, 'AUS'],
  ];
  function compare(S) {
    const t = S.career.f1Titles;
    if (t > 0) {
      const m = CHAMPS.slice().sort((a, b) => Math.abs(a[1] - t) - Math.abs(b[1] - t) || (a[2] === S.p.country ? -1 : 1) - (b[2] === S.p.country ? -1 : 1))[0];
      return { n: m[0], why: m[1] + ' título' + (m[1] > 1 ? 's' : '') };
    }
    const lg = COUNTRIES[S.p.country].legends;
    const wins = S.career.f1Wins;
    if (wins > 0) return { n: lg[Math.min(lg.length - 1, Math.max(0, 3 - Math.min(3, wins)))][0], why: 'ganador de Grandes Premios' };
    return { n: lg[lg.length - 1][0], why: 'piloto de tu país' };
  }

  const API = { STATS, STAT_NAMES, STAT_SHORT, STAT_HELP, CATS, CAT_NAMES, CAT_RACES, MIN_AGE, COUNTRIES, TEAMS, teamById, offers, newGame, simSeason, finishBlock, effStat, xpCap, trophyScore, compare, NEED, CIRC, affMatch };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.F1 = API;
})(typeof window !== 'undefined' ? window : globalThis);
