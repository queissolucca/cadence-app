/* Dados portados do protótipo, palavra por palavra. Ficam num arquivo só
   porque são conteúdo, não lógica — mexer aqui não deveria quebrar nada. */

const barsInner = n => [0,1,2,3].map(i => {
  const h = 4 + i*4.2;
  return `<rect x="${3.2+i*5.2}" y="${20-h}" width="3" height="${h}" rx="1"
    fill="currentColor" stroke="none" opacity="${i<n?1:.22}"/>`;
}).join('');

export const ICONS = {
  check:'<path d="m4.5 12.5 5 5 10-11"/>',
  plane:'<path d="M3 11.5 21 4l-4.5 16-4-6.5-6.5-2Z"/><path d="m8.5 15 8-11"/>',
  briefcase:'<rect x="2.5" y="7.5" width="19" height="12" rx="2"/><path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5"/><path d="M2.5 12.5h19"/>',
  chat:'<path d="M17 13.5A2.5 2.5 0 0 1 14.5 16H9l-3.5 2.5V16A2.5 2.5 0 0 1 3 13.5v-6A2.5 2.5 0 0 1 5.5 5h9A2.5 2.5 0 0 1 17 7.5Z"/><path d="M9.5 5V4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1"/>',
  cap:'<path d="M12 4 2 9l10 5 10-5-10-5Z"/><path d="M6 11.5V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5"/>',
  scales:'<path d="M12 5v15"/><path d="M6.5 20h11"/><path d="M4 8h16"/><path d="M4 8 1.5 14a3 3 0 0 0 5 0Z"/><path d="m20 8 2.5 6a3 3 0 0 1-5 0Z"/><circle cx="12" cy="4" r="1.4"/>',
  dots:'<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.7 8.7 0 0 1-3.8-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z"/><circle cx="8.5" cy="11.5" r=".9" fill="currentColor" stroke="none"/><circle cx="12" cy="11.5" r=".9" fill="currentColor" stroke="none"/><circle cx="15.5" cy="11.5" r=".9" fill="currentColor" stroke="none"/>',
  people:'<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16.5 5.3a3.2 3.2 0 0 1 0 5.4"/><path d="M18.2 14.2A6.5 6.5 0 0 1 21.5 20"/>',
  snow:'<path d="M12 2.5v19"/><path d="m3.8 7.2 16.4 9.6"/><path d="m20.2 7.2-16.4 9.6"/><path d="m9.5 4.5 2.5 2.5 2.5-2.5"/><path d="m9.5 19.5 2.5-2.5 2.5 2.5"/>',
  usercheck:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 12 -3.4"/><path d="m15.5 17 2 2 4-4"/>',
  film:'<rect x="2.5" y="5.5" width="14" height="13" rx="2"/><path d="m16.5 10 5-3v10l-5-3Z"/>',
  home:'<path d="m3 10.5 9-7 9 7"/><path d="M5.5 9.5V20h13V9.5"/>',
  cpu:'<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2.5V6M15 2.5V6M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5"/>',
  food:'<path d="M5 2.5v7a2.5 2.5 0 0 0 5 0v-7"/><path d="M7.5 9.5v12"/><path d="M17.5 2.5C15.8 4 15 6.5 15 9c0 1.7.9 2.5 2 2.5v10"/>',
  ball:'<circle cx="12" cy="12" r="9"/><path d="M12 3c2.6 2.6 2.6 15.4 0 18"/><path d="M3.2 9h17.6M3.2 15h17.6"/>',
  news:'<rect x="2.5" y="5" width="15" height="14" rx="1.5"/><path d="M17.5 8.5h2.5a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-3 0V5"/><path d="M6 9h8M6 12.5h8M6 16h5"/>',
  music:'<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2 6 6M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8"/>',
  bowl:'<path d="M3.5 11h17a8.5 8.5 0 0 1-17 0Z"/><path d="M2.5 20h19"/><path d="M12 3v3M9 4.5v1.5M15 4.5v1.5"/>',
  moon:'<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
  shuffle:'<path d="m16 3.5 4.5 4.5L16 12.5"/><path d="M3.5 8h17"/><path d="M8 11.5 3.5 16 8 20.5"/><path d="M20.5 16h-17"/>',
  volHigh:'<path d="M11 5 6.5 9H3v6h3.5L11 19V5Z"/><path d="M14.5 8.5a5 5 0 0 1 0 7"/><path d="M17.5 6a9 9 0 0 1 0 12"/>',
  volLow:'<path d="M11 5 6.5 9H3v6h3.5L11 19V5Z"/><path d="M14.5 8.5a5 5 0 0 1 0 7"/>',
  volOff:'<path d="M11 5 6.5 9H3v6h3.5L11 19V5Z"/><path d="m15.5 9.5 5 5M20.5 9.5l-5 5"/>',
  sprout:'<path d="M12 21v-8"/><path d="M12 13C12 9.2 9.2 6.8 5 6.8c0 3.8 2.6 6.2 7 6.2Z"/><path d="M12 13c0-3.2 2.3-5.3 5.4-5.3 0 3.2-2.2 5.3-5.4 5.3Z"/>',
  eye:'<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.8"/>',
  eyeOff:'<path d="M2 12s3.6-6.5 10-6.5c1.5 0 2.8.35 4 .9M22 12s-3.6 6.5-10 6.5c-1.5 0-2.8-.35-4-.9"/><path d="M3 3l18 18"/><path d="M9.7 9.8a3 3 0 0 0 4.2 4.2"/>',
  wave:'<path d="M3 12h1.5M7.5 7.5v9M12 4v16M16.5 7.5v9M21 11h-1.5"/>',
  zzz:'<path d="M3.5 7h7l-7 9h7"/><path d="M14 3.5h6.5l-6.5 7h6.5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6.5V12l3.5 2"/>',
  flame:'<path d="M12 22c4 0 7-2.7 7-6.4 0-4.4-4-6-5.1-10.6-3 2-4 4.4-4 6.9 0 0-1.4-1-1.9-2.9C6.5 10.5 5 13 5 15.6 5 19.3 8 22 12 22Z"/>',
  zap:'<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  leaf:'<path d="M4.5 20C4.5 11 9.5 5 20.5 4c1 11-5 16-13 16h-3Z"/><path d="M4.5 20 14.5 10"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
  bulb:'<path d="M9.5 18.5h5M10 21.5h4"/><path d="M12 2.5a6 6 0 0 1 3.5 10.9c-.6.5-1 1.2-1 2h-5c0-.8-.4-1.5-1-2A6 6 0 0 1 12 2.5Z"/>',
  spark:'<path d="M12 2.5 14 9l6.5 2-6.5 2-2 6.5-2-6.5L3.5 11 10 9l2-6.5Z"/>',
  mic:'<rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21.5"/>',
  stop:'<rect x="6.5" y="6.5" width="11" height="11" rx="2.5" fill="currentColor" stroke="none"/>',
  bars1:barsInner(1), bars2:barsInner(2), bars3:barsInner(3), bars4:barsInner(4),
  brain:'<path d="M9.5 3.5A3 3 0 0 0 6.6 7a2.8 2.8 0 0 0-1.3 5 3 3 0 0 0 1.9 4.7 2.8 2.8 0 0 0 5.3 1.3V5.9a2.4 2.4 0 0 0-3-2.4Z"/><path d="M14.5 3.5A3 3 0 0 1 17.4 7a2.8 2.8 0 0 1 1.3 5 3 3 0 0 1-1.9 4.7 2.8 2.8 0 0 1-5.3 1.3"/><path d="M12 9h2.4M12 13h2.8M9.6 11H7.2"/>',
  pencil:'<path d="M14.6 4.6l4.8 4.8"/><path d="M17 2.2a2 2 0 0 1 2.8 2.8L7.4 17.4 3 19l1.6-4.4L17 2.2Z"/>',
  trash:'<path d="M3.5 6.5h17"/><path d="M8 6.5V4.2A1.7 1.7 0 0 1 9.7 2.5h4.6A1.7 1.7 0 0 1 16 4.2v2.3"/><path d="M5.6 6.5 6.6 19a2.5 2.5 0 0 0 2.5 2.3h5.8A2.5 2.5 0 0 0 17.4 19l1-12.5"/><path d="M10 10.5v6.5M14 10.5v6.5"/>',
  shield:'<path d="M12 2.5 4 5.4v6c0 4.7 3.3 8.4 8 10.1 4.7-1.7 8-5.4 8-10.1v-6L12 2.5Z"/><path d="m8.7 11.8 2.4 2.4 4.2-4.6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  chev:'<path d="m9 5 7 7-7 7"/>',
};

export const LANGS = [
  ['\u{1F1FA}\u{1F1F8}','Inglês'],   ['\u{1F1E7}\u{1F1F7}','Português'], ['\u{1F1EA}\u{1F1F8}','Espanhol'],
  ['\u{1F1EB}\u{1F1F7}','Francês'],  ['\u{1F1E9}\u{1F1EA}','Alemão'],    ['\u{1F1EE}\u{1F1F9}','Italiano'],
  ['\u{1F1EF}\u{1F1F5}','Japonês'],  ['\u{1F1EC}\u{1F1E7}','Inglês (UK)'],['\u{1F1F0}\u{1F1F7}','Coreano'],
];

export const TEMAS = [
  {v:'Viagem',ic:'plane'},{v:'Trabalho',ic:'briefcase'},{v:'Filmes e séries',ic:'film'},
  {v:'Dia a dia',ic:'home'},{v:'Entrevista de emprego',ic:'usercheck'},{v:'Tecnologia',ic:'cpu'},
  {v:'Comida',ic:'food'},{v:'Esportes',ic:'ball'},{v:'Notícias',ic:'news'},{v:'Música',ic:'music'},
];

export const WM_COLS = 40, WM_ROWS = 18;
/* Uma coluna = 9deg de longitude (c0 = 175,5W), uma linha = 7,5deg de latitude
   (r0 = 71,25N). Em ASCII de propósito: a versão anterior era faixas [de,até]
   por linha e lia como um retângulo, porque não dava pra ver o contorno ao
   escrever. Aqui o desenho é o próprio dado. */
export const LAND = [
  '.#################..####################', // 71N  Alasca, Canadá, Groenlândia, Rússia
  '.################..#####################', // 64N
  '..#############....#####################', // 56N
  '...############....####################.', // 49N
  '....##########.....###################..', // 41N
  '.....#########.....##################...', // 34N  EUA sul, Mediterrâneo, China
  '......#######......#################....', // 26N  México, Saara, Índia
  '........#####......########.###.####....', // 19N
  '...........####....###########..####....', // 11N
  '...........######..#########...######...', //  4N  Amazônia, Golfo da Guiné, Indonésia
  '...........######...########...######...', //  4S
  '............#####...#######.....#####...', // 11S
  '............#####....######......#####..', // 19S  Brasil, África austral, Austrália
  '............####.....#####......######..', // 26S
  '............###.......###........#####..', // 34S
  '............##.......................##.', // 41S  Nova Zelândia
  '............##..........................', // 49S
  '............#...........................', // 56S  ponta da Patagônia
];

/* quem aparece no mapa — coluna/linha na grade acima. Inicial e cor porque
   círculo vazio não le como pessoa, e não há foto pra usar num arquivo único. */
export const WM_PEOPLE = [
  { c:14, r:12, f:'\u{1F1E7}\u{1F1F7}', n:'São Paulo',  i:'M', k:'#3E9B5F' },
  { c:9,  r:4,  f:'\u{1F1FA}\u{1F1F8}', n:'Chicago',    i:'J', k:'#2c7347' },
  { c:19, r:4,  f:'\u{1F1F5}\u{1F1F9}', n:'Lisboa',     i:'A', k:'#a5760a' },
  { c:35, r:5,  f:'\u{1F1EF}\u{1F1F5}', n:'Tóquio',     i:'K', k:'#5FBFB4' },
  { c:36, r:13, f:'\u{1F1E6}\u{1F1FA}', n:'Sydney',     i:'E', k:'#8E6DE8' },
];

/* os fios entre eles, na ordem em que acendem */
export const WM_LINKS = [[0,1],[0,2],[2,3],[3,4],[1,2]];
