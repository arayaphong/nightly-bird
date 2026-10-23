import { Platform } from '../core/platform.js';
import { RuleSet } from '../core/rule.js';
import { AssetStore } from '../platform/asset-store.js';
import { GameViewport } from '../platform/game-viewport.js';
import { ScoreStore } from '../platform/score-store.js';
import { Renderer } from '../platform/renderer.js';
import { InputRouter } from '../input/input-router.js';
import { HIDTap, HIDKeyboard } from '../input/devices.js';
import { Redbird } from '../objects/redbird.js';
import { Shark } from '../objects/shark.js';
import { Hawk } from '../objects/hawk.js';
import { NightSky, WaterSurface } from '../objects/scenery.js';
import { WindField } from '../objects/wind-field.js';
import { ParticleEmitter } from '../effects/particle-emitter.js';
import { GameSession } from './session.js';
import { createGameView } from './view.js';
import { RunRule } from '../rules/run-rule.js';
import { CombatRule } from '../rules/combat-rule.js';
import { WaterRule } from '../rules/water-rule.js';
import { PickupRule } from '../rules/pickup-rule.js';
import { WeaponRule } from '../rules/weapon-rule.js';
import { ProgressionRule } from '../rules/progression-rule.js';
import { SpawnRule } from '../rules/spawn-rule.js';
import { ShopRule } from '../rules/shop-rule.js';
import { HUD } from '../ui/hud.js';
import { MessageBox } from '../ui/message-box.js';
import { ShopPanel } from '../ui/shop-panel.js';
import { MAX_FRAME_DELTA } from '../config/game.js';
import { AudioSystem } from '../platform/audio-system.js';

/** Composition root. Import in tests without creating a DOM or starting a loop. */
export function createGame({
  canvas = null,
  document = null,
  host = null,
  width = 480,
  height = 800,
  pixelRatio = 1,
  assets = new AssetStore(),
  scoreStore = new ScoreStore(),
  audio = host
    ? new AudioSystem({
        host,
        sounds: { crunch: new URL('../../assets/audio/crunch.wav', import.meta.url) },
        events: { 'firefly-eaten': 'crunch' },
      })
    : null,
  random,
  cosmeticRandom,
} = {}) {
  const platform = new Platform({ assets, random, cosmeticRandom, maxDelta: MAX_FRAME_DELTA });
  if (canvas)
    platform.renderer = new Renderer({
      canvas,
      viewFor: (owner) => createGameView(platform, owner),
    });
  const effects = new ParticleEmitter();
  Object.defineProperty(effects, 'view', { get: () => createGameView(platform) });
  platform.addAll([
    new GameViewport({ canvas, host, width, height, pixelRatio }),
    new InputRouter(),
    new GameSession({ scoreStore }),
    new Redbird(),
    new Shark(),
    new Hawk(),
    new NightSky(),
    new WaterSurface(),
    new WindField(),
    effects,
    ...(audio ? [audio] : []),
    new RuleSet([
      new RunRule(),
      new WaterRule(),
      new CombatRule(),
      new PickupRule(),
      new WeaponRule(),
      new ProgressionRule(),
      new SpawnRule(),
      new ShopRule(),
    ]),
  ]);
  if (document) {
    const hud = new HUD({ document });
    Object.defineProperty(hud, 'view', { get: () => createGameView(platform) });
    platform.addAll([hud, new MessageBox({ document }), new ShopPanel({ document })]);
  }
  if (host)
    platform.addAll([
      new HIDTap({ target: host, host, document }),
      new HIDKeyboard({ target: host, document }),
    ]);
  return platform;
}
