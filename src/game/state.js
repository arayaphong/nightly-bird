export const viewport = {
  width: 0,
  height: 0,
  pixelRatio: 1,
  waterY: 0,
  dangerY: 0,
  highY: 0,
};
export const session = {
  time: 0,
  phase: 'ready',
  distance: 0,
  speed: 0,
  baseSpeed: 0,
  deadAt: 0,
  overShown: false,
  underwaterTime: 0,
  deathBy: '',
  best: 0,
  shopOpenedAt: 0,
};
export const controls = {
  holding: false,
};
export const enemies = {
  fish: null,
  hawk: null,
};
export const world = {
  stars: [],
  wind: {
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    ang: 0,
    lvl: 0,
    next: 0,
  },
  windParticles: [],
  stageShown: 0,
  clouds: [],
  cloudTimer: 2,
};
export const items = {
  magnetTime: 0,
  boostTime: 0,
  fireflies: [],
  fireflyTimer: 1.5,
  bullets: [],
  gifts: [],
  giftTimer: 6,
  suitGranted: false,
};
export const effects = {
  shake: 0,
  sparks: [],
  fishCorpse: null,
  labels: [],
  flash: 0,
  feathers: [],
  ripples: [],
  splashes: [],
  bubbles: [],
  jet: [],
};
export const bird = {
  x: 0,
  y: 0,
  vy: 0,
  r: 14,
  flap: 0,
  alive: true,
};
export const uiState = {
  agiBump: false,
  newBest: false,
};
