import { PlatformObject } from './object.js';

export class Rule {
  attach(platform) {
    this.platform = platform;
  }
  detach() {
    this.platform = null;
  }
}

export class RuleSet extends PlatformObject {
  constructor(rules) {
    super({ id: 'rules', order: -100 });
    this.rules = rules;
    this.assetKeys = [...new Set(rules.flatMap((rule) => rule.assetKeys ?? []))];
  }
  attach(platform) {
    super.attach(platform);
    this.rules.forEach((rule) => rule.attach(platform));
  }
  detach() {
    this.rules.forEach((rule) => rule.detach());
    super.detach();
  }
  dispatch(hook, ...args) {
    for (const rule of this.rules) if (rule[hook]?.(...args) === true) return true;
    return false;
  }
  beforeStep(dt) {
    this.dispatch('beforeStep', dt);
  }
  beforePhysics(dt) {
    this.dispatch('beforePhysics', dt);
  }
  afterPhysics(dt) {
    this.dispatch('afterPhysics', dt);
  }
  afterStep(dt) {
    this.dispatch('afterStep', dt);
  }
  command(command) {
    return this.dispatch('onCommand', command);
  }
  event(event) {
    return this.dispatch('onEvent', event);
  }
  contact(contact) {
    return this.dispatch('onContact', contact);
  }
}
