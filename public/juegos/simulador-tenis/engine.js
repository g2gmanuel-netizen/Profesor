/* Simulador de carrera de tenis — motor del juego (sin DOM).
   Solo cuentan para el ranking los 4 Grand Slams y los 9 Masters 1000. */
(function (root) {
  'use strict';

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const randn = (R) => {
    let u = 0, v = 0;
    while (!u) u = R();
    while (!v) v = R();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const pick = (arr, R) => arr[Math.floor(R() * arr.length)];

  const STATS = ['saque', 'derecha', 'reves', 'volea', 'mov', 'aguante', 'mental'];
  const STAT_NAMES = {
    saque: 'Saque', derecha: 'Derecha', reves: 'Revés', volea: 'Red / volea',
    mov: 'Movilidad', aguante: 'Aguante', mental: 'Mentalidad',
  };
  const BUILD_NAMES = { '-1': 'Esbelto', '0': 'Equilibrado', '1': 'Fuerte' };

  /* ------------------------------------------------------------------ */
  /* Países: afinidad con superficies y rasgos de la escuela nacional    */
  /* ------------------------------------------------------------------ */
  const C = (n, f, clay, hard, grass, bonus, rasgo) => ({ n, f, surf: { clay, hard, grass }, bonus, rasgo });
  const COUNTRIES = {
    ESP: C('España', '🇪🇸', 5, 0, -3, { aguante: 3, derecha: 1 }, 'Cantera de tierra batida: te mueves como en casa sobre arcilla y aguantas intercambios eternos.'),
    ARG: C('Argentina', '🇦🇷', 5, -1, -3, { mental: 3, derecha: 1 }, 'Garra argentina: pelea cada punto y sufre mejor que nadie sobre arcilla.'),
    FRA: C('Francia', '🇫🇷', 2, 1, 0, { volea: 3, reves: 1 }, 'Talento y variedad: golpes creativos, buena mano en la red y espectáculo.'),
    ITA: C('Italia', '🇮🇹', 3, 1, 0, { derecha: 2, mental: 1 }, 'Escuela italiana: gran fondo de pista, pasión y mucha tierra batida.'),
    GER: C('Alemania', '🇩🇪', 0, 2, 3, { saque: 3, mental: 1 }, 'Potencia y disciplina: saque letal y pista rápida o cubierta.'),
    GBR: C('Reino Unido', '🇬🇧', -2, 1, 5, { volea: 3, saque: 1 }, 'Cuna de la hierba: Wimbledon se vive aquí desde pequeño.'),
    USA: C('Estados Unidos', '🇺🇸', -2, 4, 2, { saque: 4 }, 'Pista dura y saque: la escuela del servicio y la devolución agresiva.'),
    SUI: C('Suiza', '🇨🇭', 1, 2, 3, { derecha: 2, volea: 2, mental: 1 }, 'Técnica impecable: tenis limpio, elegante y muy completo.'),
    SRB: C('Serbia', '🇷🇸', 1, 3, 0, { mental: 3, mov: 2 }, 'Hambre competitiva: flexibilidad, defensa y una mente de acero.'),
    RUS: C('Rusia', '🇷🇺', 0, 3, 0, { reves: 3, derecha: 1 }, 'Golpes planos y pegada desde el fondo, sobre todo en pista dura.'),
    AUS: C('Australia', '🇦🇺', -1, 3, 2, { mental: 2, volea: 1, saque: 1 }, 'Espíritu luchador y sol todo el año: pista dura y juego de ataque.'),
    SWE: C('Suecia', '🇸🇪', 2, 1, 1, { mental: 4 }, 'Sangre fría sueca: aguantas la presión como nadie.'),
    CRO: C('Croacia', '🇭🇷', 0, 2, 2, { saque: 4 }, 'Saques enormes y mucho corazón en pista rápida y hierba.'),
    CZE: C('Chequia', '🇨🇿', 0, 3, 1, { saque: 2, derecha: 2 }, 'Pegada plana y saque contundente, con tradición en pistas rápidas.'),
    CAN: C('Canadá', '🇨🇦', -2, 3, 1, { saque: 3, mov: 1 }, 'Pista cubierta y dura: saque y tenis de ataque.'),
    CHI: C('Chile', '🇨🇱', 3, 0, -2, { derecha: 3 }, 'Derechas liftadas y tierra batida; talento zurdo y diestro.'),
    BRA: C('Brasil', '🇧🇷', 5, -1, -2, { mov: 2, derecha: 1 }, 'Arcilla y ritmo brasileño: movilidad y golpes con efecto.'),
    JPN: C('Japón', '🇯🇵', 0, 3, -1, { mov: 4, reves: 1 }, 'Velocidad, anticipación y una devolución casi perfecta.'),
    NOR: C('Noruega', '🇳🇴', 3, 0, -1, { mental: 3, derecha: 1 }, 'Orden y trabajo: fuertes en tierra batida y muy estables.'),
    GRE: C('Grecia', '🇬🇷', 1, 2, 0, { volea: 3, reves: 1 }, 'Tenis creativo con revés a una mano y mucho ataque.'),
    BUL: C('Bulgaria', '🇧🇬', 0, 2, 2, { reves: 2, volea: 1 }, 'Estilo elegante y completo, a imagen de sus campeones.'),
    AUT: C('Austria', '🇦🇹', 4, 0, -1, { aguante: 2, derecha: 2 }, 'Fondo, derechas pesadas y mucha resistencia en tierra batida.'),
    POL: C('Polonia', '🇵🇱', 0, 3, 0, { saque: 3, derecha: 1 }, 'Tenis de potencia y buen servicio en pista dura.'),
    DEN: C('Dinamarca', '🇩🇰', 1, 2, 0, { derecha: 2, mental: 2 }, 'Juventud, intrepidez y mucha pegada desde el fondo.'),
    NED: C('Países Bajos', '🇳🇱', 0, 2, 3, { saque: 3, volea: 2 }, 'Saque y volea holandés: ideal para la hierba.'),
    ECU: C('Ecuador', '🇪🇨', 4, 0, -2, { aguante: 2, mental: 2 }, 'Altura y pulmones: resistencia en la tierra batida sudamericana.'),
  };

  /* ------------------------------------------------------------------ */
  /* Leyendas: gente que ha triunfado en cada país                       */
  /* [nombre, país, altura, físico(-1 esbelto/0/1 fuerte), mano, logro, punto fuerte] */
  /* ------------------------------------------------------------------ */
  const L = (n, c, h, b, hand, logro, fort) => ({ n, c, h, b, hand, logro, fort });
  const LEGENDS = [
    L('Rafael Nadal', 'ESP', 185, 1, 'Z', '22 Grand Slams, 14 Roland Garros', 'aguante'),
    L('Carlos Alcaraz', 'ESP', 183, 0, 'D', 'Campeón de Grand Slam y nº1 mundial', 'mov'),
    L('Juan Carlos Ferrero', 'ESP', 183, -1, 'D', 'Roland Garros 2003 y nº1 mundial', 'mov'),
    L('Carlos Moyà', 'ESP', 190, 0, 'D', 'Roland Garros 1998 y nº1 mundial', 'derecha'),
    L('David Ferrer', 'ESP', 175, 0, 'D', 'Nº3 mundial y finalista de Roland Garros 2013', 'aguante'),
    L('Sergi Bruguera', 'ESP', 182, 0, 'D', 'Roland Garros 1993 y 1994', 'derecha'),
    L('Albert Costa', 'ESP', 180, 0, 'D', 'Roland Garros 2002', 'aguante'),
    L('Fernando Verdasco', 'ESP', 193, 0, 'Z', 'Semifinalista del Open de Australia 2009', 'derecha'),
    L('Roberto Bautista', 'ESP', 183, 0, 'D', 'Semifinalista de Wimbledon 2019', 'mental'),

    L('Guillermo Vilas', 'ARG', 180, 1, 'Z', 'Roland Garros y US Open 1977', 'derecha'),
    L('Gastón Gaudio', 'ARG', 180, -1, 'D', 'Roland Garros 2004', 'reves'),
    L('Juan Martín del Potro', 'ARG', 198, 0, 'D', 'US Open 2009 y nº3 mundial', 'derecha'),
    L('David Nalbandian', 'ARG', 180, 0, 'D', 'Finalista de Wimbledon 2002 y Masters Cup 2005', 'reves'),
    L('Guillermo Coria', 'ARG', 175, -1, 'D', 'Finalista de Roland Garros 2004', 'mov'),
    L('Diego Schwartzman', 'ARG', 170, -1, 'D', 'Semifinalista de Roland Garros 2020, top 8', 'mov'),

    L('Yannick Noah', 'FRA', 193, 0, 'D', 'Roland Garros 1983', 'volea'),
    L('Gaël Monfils', 'FRA', 193, -1, 'D', 'Nº6 mundial y espectáculo puro', 'mov'),
    L('Jo-Wilfried Tsonga', 'FRA', 188, 1, 'D', 'Finalista del Open de Australia 2008', 'saque'),
    L('Henri Leconte', 'FRA', 180, 0, 'Z', 'Finalista de Roland Garros 1988', 'volea'),
    L('Richard Gasquet', 'FRA', 185, -1, 'D', 'Semifinalista de Wimbledon y revés a una mano', 'reves'),
    L('Gilles Simon', 'FRA', 183, -1, 'D', 'Nº6 mundial, defensa y cabeza', 'mov'),
    L('Cédric Pioline', 'FRA', 185, 0, 'D', 'Finalista del US Open 1993 y de Wimbledon 1997', 'volea'),

    L('Jannik Sinner', 'ITA', 191, -1, 'D', 'Campeón de Grand Slam y nº1 mundial', 'derecha'),
    L('Adriano Panatta', 'ITA', 183, 0, 'D', 'Roland Garros 1976', 'volea'),
    L('Matteo Berrettini', 'ITA', 196, 1, 'D', 'Finalista de Wimbledon 2021', 'saque'),
    L('Fabio Fognini', 'ITA', 178, 0, 'D', 'Masters 1000 de Monte-Carlo 2019', 'mental'),
    L('Lorenzo Musetti', 'ITA', 185, -1, 'D', 'Semifinalista de Wimbledon 2024', 'reves'),

    L('Boris Becker', 'GER', 190, 1, 'D', '6 Grand Slams; Wimbledon con 17 años', 'saque'),
    L('Michael Stich', 'GER', 193, 0, 'D', 'Wimbledon 1991', 'saque'),
    L('Alexander Zverev', 'GER', 198, 0, 'D', 'Oro olímpico 2021 y finalista del US Open 2020', 'saque'),
    L('Tommy Haas', 'GER', 188, 0, 'D', 'Nº2 mundial y revés a una mano', 'reves'),
    L('Rainer Schüttler', 'GER', 183, 0, 'D', 'Finalista del Open de Australia 2003', 'aguante'),

    L('Andy Murray', 'GBR', 190, 0, 'D', '3 Grand Slams, 2 oros olímpicos y nº1', 'mov'),
    L('Tim Henman', 'GBR', 185, -1, 'D', '4 semifinales en Wimbledon', 'volea'),
    L('Fred Perry', 'GBR', 180, 0, 'D', '8 Grand Slams en los años 30', 'derecha'),
    L('Greg Rusedski', 'GBR', 196, 1, 'Z', 'Finalista del US Open 1997', 'saque'),
    L('Cameron Norrie', 'GBR', 188, -1, 'Z', 'Masters 1000 de Indian Wells 2021', 'aguante'),
    L('Jack Draper', 'GBR', 193, 0, 'Z', 'Masters 1000 de Indian Wells 2025', 'saque'),

    L('Pete Sampras', 'USA', 185, -1, 'D', '14 Grand Slams y 286 semanas de nº1', 'saque'),
    L('Andre Agassi', 'USA', 180, 0, 'D', '8 Grand Slams y Golden Slam', 'reves'),
    L('Jimmy Connors', 'USA', 178, 1, 'Z', '8 Grand Slams y 109 títulos', 'mental'),
    L('John McEnroe', 'USA', 180, 0, 'Z', '7 Grand Slams y volea de genio', 'volea'),
    L('Andy Roddick', 'USA', 188, 1, 'D', 'US Open 2003 y saques de 249 km/h', 'saque'),
    L('John Isner', 'USA', 208, 1, 'D', 'Masters 1000 de Miami 2018 y rey de los aces', 'saque'),
    L('Jim Courier', 'USA', 185, 1, 'D', '4 Grand Slams y nº1', 'aguante'),
    L('Michael Chang', 'USA', 175, -1, 'D', 'Roland Garros 1989 con 17 años', 'mov'),
    L('Taylor Fritz', 'USA', 196, 0, 'D', 'Indian Wells 2022 y finalista del US Open 2024', 'saque'),

    L('Roger Federer', 'SUI', 185, 0, 'D', '20 Grand Slams y 310 semanas de nº1', 'derecha'),
    L('Stan Wawrinka', 'SUI', 183, 1, 'D', '3 Grand Slams con un revés a una mano mítico', 'reves'),
    L('Marc Rosset', 'SUI', 198, 0, 'D', 'Oro olímpico en Barcelona 1992', 'saque'),

    L('Novak Djokovic', 'SRB', 188, 0, 'D', '24 Grand Slams y récord de semanas de nº1', 'mental'),

    L('Marat Safin', 'RUS', 193, 1, 'D', '2 Grand Slams y nº1', 'reves'),
    L('Yevgeny Kafelnikov', 'RUS', 190, 0, 'D', '2 Grand Slams y nº1', 'mental'),
    L('Daniil Medvedev', 'RUS', 198, -1, 'D', 'US Open 2021 y nº1', 'mental'),
    L('Andrey Rublev', 'RUS', 188, 0, 'D', 'Masters 1000 de Madrid 2024 y top 5', 'derecha'),
    L('Karen Khachanov', 'RUS', 198, 1, 'D', 'Masters 1000 de París 2018', 'saque'),

    L('Rod Laver', 'AUS', 173, 0, 'Z', '11 Grand Slams y dos Grand Slam de calendario', 'volea'),
    L('Lleyton Hewitt', 'AUS', 180, 0, 'D', '2 Grand Slams y nº1', 'mental'),
    L('Pat Rafter', 'AUS', 185, 0, 'D', 'US Open 1997 y 1998 y nº1', 'volea'),
    L('Nick Kyrgios', 'AUS', 193, 0, 'D', 'Finalista de Wimbledon 2022', 'saque'),
    L('Alex de Miñaur', 'AUS', 183, -1, 'D', 'Top 6 mundial gracias a su velocidad', 'mov'),
    L('Mark Philippoussis', 'AUS', 196, 1, 'D', 'Finalista de Wimbledon 2003 y US Open 1998', 'saque'),
    L('Ken Rosewall', 'AUS', 170, -1, 'Z', '8 Grand Slams con un revés cortado de leyenda', 'reves'),

    L('Björn Borg', 'SWE', 180, 0, 'D', '11 Grand Slams, 5 Wimbledon seguidos', 'mental'),
    L('Stefan Edberg', 'SWE', 187, -1, 'D', '6 Grand Slams y nº1', 'volea'),
    L('Mats Wilander', 'SWE', 183, 0, 'D', '7 Grand Slams y nº1', 'mental'),
    L('Robin Söderling', 'SWE', 193, 1, 'D', 'Finalista de Roland Garros 2009 y 2010', 'derecha'),

    L('Goran Ivanišević', 'CRO', 193, 1, 'Z', 'Wimbledon 2001 como invitado', 'saque'),
    L('Marin Čilić', 'CRO', 198, 0, 'D', 'US Open 2014', 'saque'),
    L('Ivan Ljubičić', 'CRO', 193, 0, 'D', 'Masters 1000 de Indian Wells 2010', 'saque'),
    L('Ivo Karlović', 'CRO', 211, 1, 'D', 'El saque más alto del circuito: 211 cm', 'saque'),

    L('Ivan Lendl', 'CZE', 187, 1, 'D', '8 Grand Slams y nº1', 'derecha'),
    L('Tomáš Berdych', 'CZE', 196, 1, 'D', 'Finalista de Wimbledon 2010', 'saque'),
    L('Jakub Menšík', 'CZE', 193, -1, 'D', 'Masters 1000 de Miami 2025 con 19 años', 'saque'),

    L('Milos Raonic', 'CAN', 196, 1, 'D', 'Finalista de Wimbledon 2016', 'saque'),
    L('Denis Shapovalov', 'CAN', 185, -1, 'Z', 'Semifinalista de Wimbledon 2021', 'reves'),
    L('Félix Auger-Aliassime', 'CAN', 193, -1, 'D', 'Top 6 mundial', 'saque'),

    L('Marcelo Ríos', 'CHI', 175, -1, 'Z', 'Nº1 mundial en 1998', 'derecha'),
    L('Fernando González', 'CHI', 183, 1, 'D', 'Finalista del Open de Australia 2007', 'derecha'),
    L('Nicolás Massú', 'CHI', 183, 0, 'D', 'Doble oro olímpico en Atenas 2004', 'mental'),
    L('Nicolás Jarry', 'CHI', 198, 0, 'D', 'Finalista del Masters 1000 de Roma 2024', 'saque'),

    L('Gustavo Kuerten', 'BRA', 190, -1, 'D', '3 Roland Garros y nº1', 'reves'),
    L('Kei Nishikori', 'JPN', 178, -1, 'D', 'Finalista del US Open 2014', 'mov'),
    L('Casper Ruud', 'NOR', 183, 0, 'D', '3 finales de Grand Slam', 'derecha'),
    L('Stefanos Tsitsipas', 'GRE', 193, -1, 'D', 'Finalista de Roland Garros 2021', 'reves'),
    L('Grigor Dimitrov', 'BUL', 191, -1, 'D', 'ATP Finals 2017', 'reves'),

    L('Dominic Thiem', 'AUT', 185, 1, 'D', 'US Open 2020', 'reves'),
    L('Thomas Muster', 'AUT', 180, 1, 'Z', 'Roland Garros 1995 y nº1', 'aguante'),

    L('Hubert Hurkacz', 'POL', 196, 0, 'D', 'Masters 1000 de Miami 2021 y Shanghái 2023', 'saque'),
    L('Holger Rune', 'DEN', 188, 0, 'D', 'Masters 1000 de París 2022', 'derecha'),
    L('Richard Krajicek', 'NED', 196, 1, 'D', 'Wimbledon 1996', 'saque'),
    L('Andrés Gómez', 'ECU', 193, 0, 'Z', 'Roland Garros 1990', 'derecha'),
  ];

  /* ------------------------------------------------------------------ */
  /* Calendario: solo Grand Slams y Masters 1000                         */
  /* ------------------------------------------------------------------ */
  const EVENTS = [
    { id: 'ao', n: 'Open de Australia', city: 'Melbourne', type: 'GS', surf: 'hard', host: 'AUS', wk: 2 },
    { id: 'iw', n: 'Masters de Indian Wells', city: 'California', type: 'M', surf: 'hard', host: 'USA', wk: 10 },
    { id: 'mi', n: 'Masters de Miami', city: 'Florida', type: 'M', surf: 'hard', host: 'USA', wk: 12 },
    { id: 'mc', n: 'Masters de Montecarlo', city: 'Mónaco', type: 'M', surf: 'clay', host: null, wk: 15 },
    { id: 'ma', n: 'Masters de Madrid', city: 'Madrid', type: 'M', surf: 'clay', host: 'ESP', wk: 18 },
    { id: 'ro', n: 'Masters de Roma', city: 'Roma', type: 'M', surf: 'clay', host: 'ITA', wk: 19 },
    { id: 'rg', n: 'Roland Garros', city: 'París', type: 'GS', surf: 'clay', host: 'FRA', wk: 22 },
    { id: 'wi', n: 'Wimbledon', city: 'Londres', type: 'GS', surf: 'grass', host: 'GBR', wk: 27 },
    { id: 'ca', n: 'Masters de Canadá', city: 'Toronto / Montreal', type: 'M', surf: 'hard', host: 'CAN', wk: 32 },
    { id: 'ci', n: 'Masters de Cincinnati', city: 'Ohio', type: 'M', surf: 'hard', host: 'USA', wk: 33 },
    { id: 'us', n: 'US Open', city: 'Nueva York', type: 'GS', surf: 'hard', host: 'USA', wk: 36 },
    { id: 'sh', n: 'Masters de Shanghái', city: 'Shanghái', type: 'M', surf: 'hard', host: null, wk: 41 },
    { id: 'pa', n: 'Masters de París', city: 'París-Bercy', type: 'M', surf: 'hard', indoor: true, host: 'FRA', wk: 45 },
  ];
  const SURF_NAMES = { clay: 'Tierra batida', hard: 'Pista dura', grass: 'Hierba' };

  const GS_PTS = [10, 45, 90, 180, 360, 720, 1200], GS_WIN = 2000;
  const M_PTS = [10, 30, 90, 180, 360, 600], M_WIN = 1000;
  const GS_ROUNDS = ['1ª ronda', '2ª ronda', '3ª ronda', 'Octavos', 'Cuartos', 'Semifinal', 'Final'];
  const M_ROUNDS = ['1ª ronda', '2ª ronda', 'Octavos', 'Cuartos', 'Semifinal', 'Final'];
  const GS_RES = ['1ª ronda', '2ª ronda', '3ª ronda', 'Octavos de final', 'Cuartos de final', 'Semifinales', 'Finalista'];
  const M_RES = ['1ª ronda', '2ª ronda', 'Octavos de final', 'Cuartos de final', 'Semifinales', 'Finalista'];
  const GS_BASE = [48, 54, 60, 67, 73, 79, 85];
  const M_BASE = [52, 58, 65, 72, 78, 84];
  const Q_BASE = [40, 45, 50];

  const RANK_ANCHORS = [[0, 900], [10, 500], [30, 300], [60, 200], [120, 130], [250, 75], [500, 45], [900, 25], [1500, 15], [2500, 8], [4000, 4], [6000, 2], [9000, 1]];
  function rankFromPoints(pts) {
    if (pts >= 9000) return 1;
    for (let i = 1; i < RANK_ANCHORS.length; i++) {
      const [p1, r1] = RANK_ANCHORS[i];
      if (pts <= p1) {
        const [p0, r0] = RANK_ANCHORS[i - 1];
        const t = (pts - p0) / (p1 - p0);
        return Math.max(1, Math.round(r0 * Math.pow(r1 / r0, t)));
      }
    }
    return 1;
  }
  const oppRank = (rating) => clamp(Math.round(1.5 * Math.exp((90 - rating) * 0.115)), 1, 600);

  /* ------------------------------------------------------------------ */
  /* Nombres de rivales                                                  */
  /* ------------------------------------------------------------------ */
  const NAMES = {
    es: [['Álvaro', 'Sergio', 'Matías', 'Joaquín', 'Lucas', 'Iván', 'Emilio', 'Tomás', 'Ramiro', 'Gonzalo', 'Bruno', 'Héctor'], ['Salvatierra', 'Montoya', 'Pereyra', 'Cárdenas', 'Villanueva', 'Echeverría', 'Quintero', 'Arrieta', 'Beltrán', 'Lozano', 'Maldonado', 'Cisneros']],
    fr: [['Théo', 'Baptiste', 'Maxime', 'Lucien', 'Hugo', 'Mathis', 'Quentin', 'Julien'], ['Delcourt', 'Marchetti', 'Bellamy', 'Fontaine', 'Rousseau', 'Lemaire', 'Vasseur', 'Chevalier']],
    it: [['Matteo', 'Luca', 'Davide', 'Fabrizio', 'Emanuele', 'Stefano', 'Nicolò', 'Gianluca'], ['Bellucci', 'Ferraro', 'Caruso', 'Moretti', 'Pellegrini', 'Santoro', 'Giordano', 'Rinaldi']],
    de: [['Jonas', 'Lukas', 'Felix', 'Maximilian', 'Tobias', 'Jannis', 'Florian', 'Kilian'], ['Brandt', 'Kessler', 'Hartmann', 'Lindner', 'Vogel', 'Reiter', 'Steiner', 'Hofmann']],
    en: [['Jack', 'Ryan', 'Connor', 'Ethan', 'Mason', 'Tyler', 'Owen', 'Declan'], ['Whitfield', 'Hargrove', 'Callahan', 'Sutton', 'Prescott', 'Langley', 'Barrett', 'Holloway']],
    sl: [['Dmitri', 'Nikola', 'Marek', 'Luka', 'Ivan', 'Tomas', 'Viktor', 'Petar'], ['Vukovic', 'Kovac', 'Horvat', 'Petrovic', 'Sokolov', 'Zelenka', 'Marinov', 'Orlov']],
    no: [['Anders', 'Erik', 'Mikael', 'Lars', 'Jens', 'Sven', 'Rasmus', 'Joost'], ['Lindqvist', 'Haugen', 'Bakker', 'Solberg', 'Nilsson', 'Jansen', 'Vestergaard', 'Holm']],
    gr: [['Nikos', 'Giorgos', 'Kostas', 'Thanos'], ['Papadakis', 'Stavrou', 'Karras', 'Mavros']],
    jp: [['Haruto', 'Kenji', 'Daichi', 'Ren'], ['Tanabe', 'Hayashi', 'Morita', 'Okabe']],
  };
  const NAME_GROUP = {
    ESP: 'es', ARG: 'es', CHI: 'es', BRA: 'es', ECU: 'es', FRA: 'fr', ITA: 'it', GER: 'de', AUT: 'de', SUI: 'de',
    GBR: 'en', USA: 'en', AUS: 'en', CAN: 'en', SRB: 'sl', RUS: 'sl', CRO: 'sl', CZE: 'sl', POL: 'sl', BUL: 'sl',
    SWE: 'no', NOR: 'no', DEN: 'no', NED: 'no', GRE: 'gr', JPN: 'jp',
  };
  function makeName(code, R) {
    const g = NAMES[NAME_GROUP[code] || 'en'];
    return pick(g[0], R) + ' ' + pick(g[1], R);
  }
  const COUNTRY_CODES = Object.keys(COUNTRIES);

  /* ------------------------------------------------------------------ */
  /* Creación del jugador                                                */
  /* ------------------------------------------------------------------ */
  function heightWord(h) {
    if (h < 172) return 'Muy bajito';
    if (h < 180) return 'Bajo';
    if (h < 187) return 'Estatura media';
    if (h < 195) return 'Alto';
    if (h < 202) return 'Muy alto';
    return 'Gigante';
  }

  const W_GENERIC = { saque: 0.2, derecha: 0.2, reves: 0.15, volea: 0.06, mov: 0.15, aguante: 0.08, mental: 0.16 };
  function weights(surf) {
    const w = Object.assign({}, W_GENERIC);
    if (surf === 'clay') { w.saque = 0.15; w.mov = 0.18; w.aguante = 0.11; }
    if (surf === 'grass') { w.saque = 0.26; w.volea = 0.1; w.mov = 0.12; w.aguante = 0.06; w.derecha = 0.19; w.reves = 0.13; w.mental = 0.14; }
    const sum = Object.values(w).reduce((a, b) => a + b, 0);
    for (const k in w) w[k] /= sum;
    return w;
  }

  function simScore(f, l) {
    let s = 100;
    s -= Math.abs(f.height - l.h) * 1.3;
    s -= Math.abs(f.build - l.b) * 12;
    s -= (f.hand === l.hand ? 0 : 18);
    s -= (f.country === l.c ? 0 : 40);
    return clamp(Math.round(s), 0, 100);
  }
  function legendMatches(f, n) {
    return LEGENDS.map((l) => Object.assign({ sim: simScore(f, l) }, l))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, n || 3);
  }

  function baseStats(f) {
    const hn = clamp((f.height - 185) / 20, -1.25, 1.1);
    const b = f.build, left = f.hand === 'Z', one = f.backhand === 1;
    const s = {
      saque: 44 + 14 * hn + 5 * b + (left ? 2 : 0),
      derecha: 44 + 4 * b - 3 * hn,
      reves: (one ? 42 - b : 46 + 3 * b) - 3 * hn,
      volea: 40 + 3 * hn - 2 * b + (one ? 5 : 0),
      mov: 48 - 11 * hn - 6 * b,
      aguante: 44 + 6 * b - 2 * hn,
      mental: 46,
    };
    // Equilibrio: toda combinación física arranca con el mismo nivel global (cambia la forma, no el total).
    const w = W_GENERIC;
    const r0 = STATS.reduce((a, k) => a + w[k] * s[k], 0);
    const shift = 46 - r0;
    STATS.forEach((k) => { s[k] = clamp(s[k] + shift, 18, 90); });
    const cb = (COUNTRIES[f.country] || {}).bonus || {};
    for (const k in cb) s[k] += cb[k];
    const insp = legendMatches(f, 1)[0];
    if (insp && insp.sim >= 80) s[insp.fort] += 3;
    STATS.forEach((k) => { s[k] = Math.round(clamp(s[k], 15, 95) * 10) / 10; });
    return { stats: s, insp: insp && insp.sim >= 80 ? insp : null };
  }

  function affinity(p, surf) {
    const hn = clamp((p.height - 185) / 20, -1.25, 1.1);
    const left = p.hand === 'Z', one = p.backhand === 1;
    let a = (COUNTRIES[p.country].surf[surf] || 0);
    if (surf === 'clay') a += -hn * 2.5 + (left ? 2 : 0) + (one ? -2 : 0);
    if (surf === 'grass') a += hn * 2.5 + (p.build < 0 ? 1 : 0) + (one ? 2 : 0) + (left ? 1.5 : 0);
    if (surf === 'hard') a += hn * 1;
    return a;
  }

  function rating(p, ev, energy, form) {
    const w = weights(ev.surf);
    let r = STATS.reduce((a, k) => a + w[k] * p.stats[k], 0);
    r += affinity(p, ev.surf);
    if (ev.indoor) r += (p.stats.saque - 50) * 0.04;
    r -= Math.max(0, 65 - energy) * 0.25;
    r -= p.injPen || 0;
    r += form || 0;
    return r;
  }
  function neutralRating(p) {
    return rating(p, { surf: 'hard' }, 100, 0);
  }

  function newGame(form, R) {
    R = R || Math.random;
    const bs = baseStats(form);
    const talent = 0.85 + R() * 0.32;
    const rivalCountry = pick(COUNTRY_CODES.filter((c) => c !== form.country), R);
    const p = {
      name: (form.name || 'Tu tenista').trim().slice(0, 28) || 'Tu tenista',
      country: form.country, height: form.height, build: form.build, hand: form.hand, backhand: form.backhand,
      age: 17, stats: bs.stats, start: Object.assign({}, bs.stats), talent, insp: bs.insp ? { n: bs.insp.n, fort: bs.insp.fort } : null, injPen: 0,
    };
    const S = {
      v: 1, difficulty: form.difficulty || 0, p,
      slots: {}, // id -> { temporada: puntos }
      rival: { name: makeName(rivalCountry, R), country: rivalCountry, off: -1 + R() * 7, rating: 55, w: 0, l: 0 },
      career: { slams: 0, masters: 0, titles: 0, w: 0, l: 0, bestRank: 999, bestPts: 0, weeks1: 0, finals: 0, slamFinals: 0, played: 0, bestSeasonW: 0 },
      hist: [], log: [], phase: 'plan', lastRandom: null,
    };
    // Puntos de partida repartidos (temporada 0): rank ~270
    const ids = EVENTS.map((e) => e.id);
    let rest = 40;
    while (rest > 0) {
      const id = pick(ids, R);
      const pts = Math.min(rest, 10);
      S.slots[id] = S.slots[id] || {};
      S.slots[id][0] = (S.slots[id][0] || 0) + pts;
      rest -= pts;
    }
    newSeason(S, R, true);
    return S;
  }

  /* ------------------------------------------------------------------ */
  /* Temporada y ranking                                                 */
  /* ------------------------------------------------------------------ */
  function newSeason(S, R, first) {
    R = R || Math.random;
    const n = first ? 1 : S.season.n + 1;
    if (!first) S.p.age += 1;
    S.season = {
      n, energy: 100, idx: 0, w: 0, l: 0, titles: 0, slams: 0, results: [], plan: {}, focus: [], wcUsed: false,
      injOut: 0, best: '', rank0: currentRank(S, n, 0, 'pre'),
    };
    EVENTS.forEach((e) => { S.season.plan[e.id] = true; });
    S.rival.rating = clamp(neutralRating(S.p) + S.rival.off + randn(R) * 2.5, 38, 92);
    S.phase = first ? 'plan' : 'random';
  }

  function pointsAt(S, n, i, when) {
    let t = 0;
    EVENTS.forEach((e, j) => {
      const sl = S.slots[e.id] || {};
      const cur = j < i || (when === 'post' && j === i);
      t += (cur ? sl[n] : sl[n - 1]) || 0;
    });
    return t;
  }
  function currentRank(S, n, i, when) { return rankFromPoints(pointsAt(S, n, i, when)); }
  function defendPoints(S, i) { return (S.slots[EVENTS[i].id] || {})[S.season.n - 1] || 0; }

  function entryFor(S, ev, rank) {
    const slam = ev.type === 'GS';
    if (rank <= (slam ? 104 : 60)) return { mode: 'MAIN', label: 'Cuadro principal', seed: rank <= 32 };
    if (ev.host === S.p.country && rank <= (slam ? 500 : 400)) return { mode: 'MAIN', label: 'Invitación (wild card) del torneo de tu país', wc: true };
    if (rank <= (slam ? 350 : 200)) return { mode: 'Q', label: 'Fase previa (clasificación)' };
    if (!S.season.wcUsed && rank <= 500) return { mode: 'MAIN', label: 'Invitación de tu federación (1 por temporada)', wcFed: true };
    return { mode: 'NO', label: 'Sin acceso por ranking' };
  }

  function recover(S, i) {
    // al avanzar de torneo recuperas según las semanas que pasan
    const prev = i === 0 ? null : EVENTS[i - 1];
    const weeks = prev ? EVENTS[i].wk - prev.wk : 0;
    const rate = 1.8 + S.p.stats.aguante / 50;
    S.season.energy = clamp(S.season.energy + weeks * rate, 0, 100);
  }

  /* ------------------------------------------------------------------ */
  /* Partidos                                                            */
  /* ------------------------------------------------------------------ */
  function setProb(p, need) {
    const f = need === 2 ? (q) => q * q * (3 - 2 * q) : (q) => q * q * q * (10 - 15 * q + 6 * q * q);
    let lo = 0, hi = 1;
    for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (f(m) < p) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }

  function simMatch(rp, ro, bo5, R) {
    const p = 1 / (1 + Math.exp(-(rp - ro) / 9));
    const need = bo5 ? 3 : 2;
    const q = setProb(p, need);
    let a = 0, b = 0;
    const sets = [];
    while (a < need && b < need) {
      const win = R() < q;
      const s = win ? q : 1 - q;
      let x = Math.round(4.0 - 6 * (s - 0.5) + randn(R) * 1.3);
      x = clamp(x, 0, 6);
      let wg = 6, lg = x, tb = null;
      if (x === 5) { wg = 7; lg = 5; } else if (x === 6) { wg = 7; lg = 6; tb = Math.floor(R() * 6) + 1; }
      sets.push(win ? { p: wg, o: lg, tb } : { p: lg, o: wg, tb });
      if (win) a++; else b++;
    }
    return { won: a > b, sets, p };
  }
  function scoreText(sets) {
    return sets.map((s) => s.p + '-' + s.o + (s.tb != null ? '(' + s.tb + ')' : '')).join(' ');
  }

  function makeOpp(rating, R, isRival, S) {
    if (isRival) return { name: S.rival.name, country: S.rival.country, rating: S.rival.rating, rank: oppRank(S.rival.rating), rival: true };
    const code = pick(COUNTRY_CODES, R);
    return { name: makeName(code, R), country: code, rating, rank: oppRank(rating) };
  }

  /* ------------------------------------------------------------------ */
  /* Jugar un torneo                                                     */
  /* ------------------------------------------------------------------ */
  function playEvent(S, i, R) {
    R = R || Math.random;
    const ev = EVENTS[i], p = S.p, se = S.season, n = se.n, slam = ev.type === 'GS';
    const preRank = currentRank(S, n, i, 'pre');
    const entry = entryFor(S, ev, preRank);
    const diff = S.difficulty * 3;
    const form = (R() - 0.5) * 6;
    const rep = { i, ev, entry, preRank, form: Math.round(form * 10) / 10, qual: [], rows: [], pts: 0, champion: false, result: '', injured: false, energyStart: se.energy, defended: defendPoints(S, i) };
    if (entry.wcFed) se.wcUsed = true;
    const rounds = slam ? GS_ROUNDS : M_ROUNDS;
    const base = slam ? GS_BASE : M_BASE;
    const pts = slam ? GS_PTS : M_PTS;
    const res = slam ? GS_RES : M_RES;
    const seedSoft = preRank <= 8 ? 4 : preRank <= 32 ? 2 : 0;

    const injChance = () => 0.006 + Math.max(0, 35 - se.energy) * 0.0025 + Math.max(0, p.age - 30) * 0.0015 + (p.height > 195 ? 0.002 : 0) + (p.build < 0 ? 0.002 : 0);

    function oneMatch(label, oppRating, bo5, isRival, bucket, cost) {
      const opp = makeOpp(oppRating, R, isRival, S);
      const rp = rating(p, ev, se.energy, form);
      const m = simMatch(rp, opp.rating, bo5, R);
      const nSets = m.sets.length;
      const c = cost * (0.7 + 0.3 * nSets / (bo5 ? 4 : 2.5)) * (1.45 - p.stats.aguante / 110);
      const eBefore = se.energy;
      se.energy = clamp(se.energy - c, 0, 100);
      let retired = false;
      if (R() < injChance()) retired = true;
      const row = { round: label, opp, score: scoreText(m.sets), won: m.won && !retired, retired, prob: Math.round(m.p * 100), eBefore: Math.round(eBefore), eAfter: Math.round(se.energy), rp: Math.round(rp), bo5 };
      if (isRival) { if (row.won) S.rival.w++; else S.rival.l++; }
      bucket.push(row);
      if (!retired && m.won) se.energy = clamp(se.energy + 1.5, 0, 100);
      return row;
    }

    let alive = true, lostIdx = -1;
    // Fase previa
    if (entry.mode === 'Q') {
      const nq = slam ? 3 : 2;
      for (let q = 0; q < nq && alive; q++) {
        const r = Q_BASE[slam ? q : q + 1] + diff * 0.5 + randn(R) * 3.5;
        const row = oneMatch('Fase previa ' + (q + 1), clamp(r, 28, 90), false, false, rep.qual, slam ? 5 : 4);
        if (!row.won) { alive = false; rep.result = 'Eliminado en la fase previa'; if (row.retired) rep.injured = true; }
      }
    }
    if (alive) {
      const startIdx = (!slam && entry.mode === 'MAIN' && entry.seed) ? 1 : 0;
      const nR = rounds.length;
      let rivalMet = false;
      for (let r = startIdx; r < nR && alive; r++) {
        const late = r >= nR - 3;
        const useRival = late && !rivalMet && R() < 0.4;
        if (useRival) rivalMet = true;
        const soft = r <= 2 ? seedSoft : 0;
        const opR = clamp(base[r] + diff - soft + randn(R) * 4.2, 30, 96);
        const row = oneMatch(rounds[r], opR, slam, useRival, rep.rows, slam ? 9 : 6);
        if (row.won) { se.w++; S.career.w++; } else { se.l++; S.career.l++; alive = false; lostIdx = r; if (row.retired) rep.injured = true; }
      }
      if (alive) {
        rep.champion = true;
        rep.pts = slam ? GS_WIN : M_WIN;
        rep.result = 'CAMPEÓN';
      } else {
        rep.pts = pts[lostIdx];
        rep.result = res[lostIdx];
      }
      S.career.played++;
    } else {
      rep.pts = 0;
    }
    // Registro de puntos y estadísticas
    S.slots[ev.id] = S.slots[ev.id] || {};
    S.slots[ev.id][n] = rep.pts;
    delete S.slots[ev.id][n - 2];
    if (rep.champion) {
      se.titles++; S.career.titles++;
      if (slam) { se.slams++; S.career.slams++; } else S.career.masters++;
    }
    if (!alive && lostIdx === rounds.length - 1) { S.career.finals++; if (slam) S.career.slamFinals++; }
    rep.postRank = currentRank(S, n, i, 'post');
    rep.postPts = pointsAt(S, n, i, 'post');
    if (rep.postRank < S.career.bestRank) S.career.bestRank = rep.postRank;
    if (rep.postPts > S.career.bestPts) S.career.bestPts = rep.postPts;
    if (rep.postRank === 1) S.career.weeks1++;
    rep.energyEnd = Math.round(se.energy);
    if (rep.injured) {
      se.injOut = 1 + Math.floor(R() * 3);
      const k = pick(['mov', 'aguante', 'saque'], R);
      p.stats[k] = Math.max(15, Math.round((p.stats[k] - 1.5) * 10) / 10);
      p.injPen = Math.min(4, (p.injPen || 0) + 2);
      rep.injury = { out: se.injOut, stat: k };
    }
    se.results.push({ i, status: 'played', res: rep.result, pts: rep.pts, champion: rep.champion, rank: rep.postRank, injured: rep.injured, mode: entry.mode });
    advance(S, i);
    return rep;
  }

  function advance(S, i) {
    S.season.idx = i + 1;
    if (S.season.idx < EVENTS.length) recover(S, S.season.idx);
  }

  function skipEvent(S, i, reason) {
    const ev = EVENTS[i], n = S.season.n;
    S.slots[ev.id] = S.slots[ev.id] || {};
    S.slots[ev.id][n] = 0; // los puntos del año pasado caducan igualmente
    delete S.slots[ev.id][n - 2];
    const rank = currentRank(S, n, i, 'post');
    S.season.results.push({ i, status: reason || 'skipped', res: '', pts: 0, rank });
    if (reason === 'injured' && S.season.injOut > 0) S.season.injOut--;
    advance(S, i);
  }

  /* ------------------------------------------------------------------ */
  /* Fin de temporada: progresión por edad y entrenamiento               */
  /* ------------------------------------------------------------------ */
  function ageGrowth(a) {
    if (a <= 18) return 6;
    if (a <= 20) return 5;
    if (a <= 22) return 3.6;
    if (a <= 24) return 2.4;
    if (a <= 26) return 1.2;
    if (a <= 29) return 0.2;
    if (a <= 31) return -0.8;
    if (a <= 33) return -1.8;
    if (a <= 35) return -2.8;
    return -3.8;
  }
  const GROW = 0.5;

  function closeSeason(S, R) {
    R = R || Math.random;
    const p = S.p, se = S.season;
    const before = Object.assign({}, p.stats);
    const g = ageGrowth(p.age);
    const [main, sec] = se.focus;
    STATS.forEach((k) => {
      let d = g;
      if (k === 'mov' && p.age >= 27) d -= 0.9;
      if (k === 'aguante' && p.age >= 28) d -= 0.8;
      if (k === 'mental' && p.age >= 22 && p.age <= 33) d += 1.0;
      if (k === 'volea' && p.age >= 24 && p.age <= 32) d += 0.6;
      d = d > 0 ? d * p.talent * GROW : d * (2 - p.talent) * 0.9;
      const ageF = p.age >= 31 ? 0.5 : 1;
      if (k === main) d += 3.2 * ageF * (0.8 + 0.2 * p.talent);
      if (k === sec) d += 1.6 * ageF * (0.8 + 0.2 * p.talent);
      d += randn(R) * 0.7;
      p.stats[k] = Math.round(clamp(p.stats[k] + d, 15, 99) * 10) / 10;
    });
    p.injPen = (p.injPen || 0) * 0.4;
    const rank = currentRank(S, se.n, EVENTS.length - 1, 'post');
    const summary = {
      n: se.n, age: p.age, rank, rank0: se.rank0, pts: pointsAt(S, se.n, EVENTS.length - 1, 'post'),
      w: se.w, l: se.l, titles: se.titles, slams: se.slams, played: se.results.filter((r) => r.status === 'played').length,
      growth: STATS.map((k) => ({ k, from: before[k], to: p.stats[k] })),
    };
    if (se.w > S.career.bestSeasonW) S.career.bestSeasonW = se.w;
    S.hist.push(summary);
    S.phase = 'season_end';
    return summary;
  }

  /* ------------------------------------------------------------------ */
  /* Sucesos aleatorios de pretemporada                                  */
  /* ------------------------------------------------------------------ */
  const addStat = (p, k, d) => { p.stats[k] = Math.round(clamp(p.stats[k] + d, 15, 99) * 10) / 10; };
  const RANDOM_EVENTS = [
    {
      id: 'coach', title: 'Un excampeón quiere entrenarte',
      text: 'Una leyenda retirada de tu país se ofrece a ser tu entrenador. Su método es exigente y tiene opiniones muy claras.',
      choices: [
        { label: 'Aceptar su oferta', run: (S, R) => { const k = pick(['saque', 'derecha', 'reves'], R); addStat(S.p, k, 3); addStat(S.p, 'mental', -1); return 'Mejora tu ' + STAT_NAMES[k].toLowerCase() + ' (+3), pero la presión te cuesta algo de mentalidad (−1).'; } },
        { label: 'Seguir con tu equipo de siempre', run: (S) => { addStat(S.p, 'mental', 1.5); return 'La confianza de tu equipo te da tranquilidad: Mentalidad +1,5.'; } },
      ],
    },
    {
      id: 'racket', title: 'Raqueta nueva',
      text: 'Tu patrocinador te propone cambiar de raqueta. Puede darte un extra de pegada... o desajustar tus sensaciones.',
      choices: [
        { label: 'Probarla', run: (S, R) => { if (R() < 0.6) { addStat(S.p, 'derecha', 3); addStat(S.p, 'saque', 1.5); return '¡Sale bien! Derecha +3 y Saque +1,5.'; } addStat(S.p, 'derecha', -2); addStat(S.p, 'reves', -1); return 'No terminas de adaptarte: Derecha −2 y Revés −1.'; } },
        { label: 'Quedarte con la de siempre', run: () => 'Sin cambios. La seguridad también cuenta.' },
      ],
    },
    {
      id: 'nutri', title: 'Preparación física',
      text: 'Un nutricionista y un preparador te plantean un plan especial para la temporada.',
      choices: [
        { label: 'Plan de resistencia (más aguante)', run: (S) => { addStat(S.p, 'aguante', 3); return 'Aguante +3: llegarás más fresco a las últimas rondas.'; } },
        { label: 'Plan de explosividad (más movilidad)', run: (S) => { addStat(S.p, 'mov', 3); addStat(S.p, 'aguante', -0.5); return 'Movilidad +3, aunque pierdes un poco de fondo (−0,5 aguante).'; } },
      ],
    },
    {
      id: 'davis', title: 'Convocatoria con tu selección',
      text: 'Tu país te llama para la Copa Davis. Es un honor, pero consume energía al comienzo de la temporada.',
      choices: [
        { label: 'Ir con la selección', run: (S) => { addStat(S.p, 'mental', 2.5); S.season.energy = 85; return 'Orgullo y experiencia: Mentalidad +2,5. Empiezas la temporada con la energía algo mermada (85).'; } },
        { label: 'Descansar y declinar', run: (S) => { addStat(S.p, 'mental', -0.5); return 'Llegas fresco. Críticas en prensa: Mentalidad −0,5.'; } },
      ],
    },
    {
      id: 'sponsor', title: 'Oferta de patrocinio',
      text: 'Una marca importante te ofrece un gran contrato, pero con exhibiciones y actos publicitarios.',
      choices: [
        { label: 'Firmar el contrato', run: (S) => { S.season.energy = 78; addStat(S.p, 'mental', 1); return 'Estabilidad económica: Mentalidad +1, pero empiezas con la energía en 78.'; } },
        { label: 'Rechazarlo y centrarte en el tenis', run: (S) => { addStat(S.p, 'derecha', 1); addStat(S.p, 'reves', 1); return 'Más horas en pista: Derecha +1 y Revés +1.'; } },
      ],
    },
    {
      id: 'muscle', title: 'Molestia muscular en pretemporada',
      text: 'Notas una molestia. El fisio te da dos opciones.',
      choices: [
        { label: 'Parar dos semanas', run: (S) => { S.p.injPen = 0; addStat(S.p, 'aguante', 1); return 'Recuperación completa: sin secuelas y Aguante +1.'; } },
        { label: 'Seguir entrenando con cuidado', run: (S, R) => { if (R() < 0.5) { addStat(S.p, 'saque', 1.5); return 'Todo bien y entrenas más: Saque +1,5.'; } S.p.injPen = Math.min(4, (S.p.injPen || 0) + 2); return 'La molestia se agrava: rendimiento −2 al inicio de la temporada.'; } },
      ],
    },
    {
      id: 'rival', title: 'Un nuevo rival te desafía',
      text: 'En una entrevista tu mayor rival ha dicho que no tienes madera de campeón.',
      choices: [
        { label: 'Responder en la pista', run: (S) => { addStat(S.p, 'mental', 2); return 'Fuego en la mirada: Mentalidad +2.'; } },
        { label: 'Ignorarlo', run: (S) => { addStat(S.p, 'mental', 1); return 'Mantienes la calma: Mentalidad +1.'; } },
      ],
    },
    {
      id: 'academy', title: 'Estancia en una academia',
      text: 'Te invitan a entrenar un mes en una academia de élite.',
      choices: [
        { label: 'Aprovechar para mejorar el juego de red', run: (S) => { addStat(S.p, 'volea', 3); return 'Volea +3.'; } },
        { label: 'Aprovechar para sacar y devolver', run: (S) => { addStat(S.p, 'saque', 2); addStat(S.p, 'reves', 1); return 'Saque +2 y Revés +1.'; } },
      ],
    },
  ];
  function drawRandomEvent(S, R) {
    R = R || Math.random;
    const pool = RANDOM_EVENTS.filter((e) => e.id !== S.lastRandom);
    const e = pick(pool, R);
    S.lastRandom = e.id;
    return e;
  }

  /* ------------------------------------------------------------------ */
  /* Comparación final con leyendas                                      */
  /* ------------------------------------------------------------------ */
  const GOATS = [
    ['Novak Djokovic', 24, 'D'], ['Rafael Nadal', 22, 'Z'], ['Roger Federer', 20, 'D'], ['Pete Sampras', 14, 'D'],
    ['Rod Laver', 11, 'Z'], ['Björn Borg', 11, 'D'], ['Andre Agassi', 8, 'D'], ['Ivan Lendl', 8, 'D'], ['Jimmy Connors', 8, 'Z'],
    ['John McEnroe', 7, 'Z'], ['Mats Wilander', 7, 'D'], ['Boris Becker', 6, 'D'], ['Stefan Edberg', 6, 'D'],
    ['Guillermo Vilas', 4, 'Z'], ['Jim Courier', 4, 'D'], ['Andy Murray', 3, 'D'], ['Stan Wawrinka', 3, 'D'], ['Gustavo Kuerten', 3, 'D'],
    ['Lleyton Hewitt', 2, 'D'], ['Marat Safin', 2, 'D'], ['Yevgeny Kafelnikov', 2, 'D'], ['Pat Rafter', 2, 'D'],
    ['Juan Carlos Ferrero', 1, 'D'], ['Carlos Moyà', 1, 'D'], ['Goran Ivanišević', 1, 'Z'], ['Marin Čilić', 1, 'D'], ['Daniil Medvedev', 1, 'D'],
    ['Dominic Thiem', 1, 'D'], ['Juan Martín del Potro', 1, 'D'], ['Gastón Gaudio', 1, 'D'],
  ];
  function compareLegend(S) {
    const c = S.career;
    const score = c.slams * 100 + c.masters * 18 + c.slamFinals * 20 + c.finals * 5;
    const best = c.bestRank;
    let target;
    if (c.slams > 0) {
      let m = GOATS.slice().sort((a, b) => Math.abs(a[1] - c.slams) - Math.abs(b[1] - c.slams) || (a[2] === S.p.hand ? -1 : 1) - (b[2] === S.p.hand ? -1 : 1));
      target = { n: m[0][0], why: 'por Grand Slams (' + m[0][1] + ')' };
    } else {
      const pool = LEGENDS.filter((l) => !GOATS.some((g) => g[0] === l.n));
      target = { n: pick(pool, () => 0.5).n, why: 'por trayectoria' };
    }
    return { score, target };
  }

  const API = {
    STATS, STAT_NAMES, BUILD_NAMES, COUNTRIES, LEGENDS, EVENTS, SURF_NAMES, GS_ROUNDS, M_ROUNDS,
    heightWord, legendMatches, baseStats, rating, neutralRating, affinity,
    newGame, newSeason, currentRank, pointsAt, defendPoints, entryFor, playEvent, skipEvent, closeSeason,
    drawRandomEvent, RANDOM_EVENTS, rankFromPoints, oppRank, weights, compareLegend, simMatch, makeName, recover, COUNTRY_CODES,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Tenis = API;
})(typeof window !== 'undefined' ? window : globalThis);
