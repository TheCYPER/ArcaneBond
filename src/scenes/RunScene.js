import { ARENA, MAX_PAIR_DISTANCE, PALETTE, SLOT_CONTROLS } from "../constants.js";
import { BOSSES } from "../content/bosses.js";
import { ENEMIES } from "../content/enemies.js";
import { BOSS_AFFIXES, COSMETICS, describeUnlocks, DIFFICULTIES, SPELL_VARIANTS } from "../content/progression.js";
import { WIZARDS } from "../content/wizards.js";
import { audio } from "../systems/audio.js";
import {
  advanceCurseStatus,
  advanceReviveProgress,
  calculateBossDamage,
  calculateEnemyDamage,
  calculatePlayerDamage,
  shouldEnterBossPhaseTwo
} from "../systems/combat-rules.js";
import { applyWinUnlocks, RunSession } from "../systems/session.js";
import { saveStore } from "../systems/save-store.js";
import { UI } from "../systems/ui.js";

const ABILITY_KEYS = ["shot", "skill1", "skill2", "ult"];
const EFFECT_COLORS = {
  star: PALETTE.star,
  ember: PALETTE.ember,
  verdant: PALETTE.verdant,
  thunder: PALETTE.thunder
};

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalize(x, y) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pointLineDistance(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy || 1;
  const amount = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared, 0, 1);
  const x = a.x + amount * dx;
  const y = a.y + amount * dy;
  return Math.hypot(point.x - x, point.y - y);
}

export class RunScene extends Phaser.Scene {
  constructor(sceneKey = "RunScene") {
    super(sceneKey);
    this.sceneKey = sceneKey;
  }

  init(data = {}) {
    this.supportId = data.supportId || "star";
    this.damageId = data.damageId || "ember";
    this.tutorialMode = Boolean(data.tutorialMode || this.sceneKey === "TutorialScene");
    this.session = data.session || new RunSession({
      supportId: this.supportId,
      damageId: this.damageId,
      seed: data.seed,
      save: saveStore.data,
      variantId: data.variantId,
      bossAffixId: data.bossAffixId,
      difficultyId: data.difficultyId,
      cosmeticId: data.cosmeticId
    });
  }

  create() {
    this.team = {
      support: WIZARDS[this.supportId],
      damage: WIZARDS[this.damageId]
    };
    this.variant = SPELL_VARIANTS[this.session.variantId] || SPELL_VARIANTS.classic;
    this.bossAffix = BOSS_AFFIXES[this.session.bossAffixId] || BOSS_AFFIXES.none;
    this.difficulty = DIFFICULTIES[this.session.difficultyId] || DIFFICULTIES.keeper;
    this.cosmetic = COSMETICS[this.session.cosmeticId] || COSMETICS.classic;
    this.mode = this.tutorialMode ? "tutorial" : "starting";
    this.objective = this.tutorialMode ? "双生试炼" : "裂隙正在改写房间";
    this.roomState = "";
    this.zones = [];
    this.pendingAdvance = false;
    this.lastCaster = null;
    this.alternatingCasts = 0;
    this.roomSecondWakeUsed = false;
    this.nextEncounterDanger = false;
    this.tutorial = { step: 1, supportShot: false, damageShot: false, bond: false, revived: false };

    this.physics.world.setBounds(ARENA.left, ARENA.top, ARENA.right - ARENA.left, ARENA.bottom - ARENA.top);
    this.createArena();
    this.players = this.physics.add.group({ allowGravity: false });
    this.enemies = this.physics.add.group({ allowGravity: false });
    this.projectiles = this.physics.add.group({ allowGravity: false });
    this.enemyProjectiles = this.physics.add.group({ allowGravity: false });
    this.bosses = this.physics.add.group({ allowGravity: false });
    this.bondGraphics = this.add.graphics().setDepth(4);
    this.effectGraphics = this.add.graphics().setDepth(15);
    this.playerModels = [
      this.createPlayer("support", this.team.support, 104, 137),
      this.createPlayer("damage", this.team.damage, 216, 137)
    ];
    this.keys = {
      support: this.input.keyboard.addKeys(SLOT_CONTROLS.support),
      damage: this.input.keyboard.addKeys(SLOT_CONTROLS.damage)
    };

    this.physics.add.overlap(this.projectiles, this.enemies, (projectile, enemy) => this.projectileHitsEnemy(projectile, enemy));
    this.physics.add.overlap(this.projectiles, this.bosses, (projectile, boss) => this.projectileHitsBoss(projectile, boss));
    this.physics.add.overlap(this.enemyProjectiles, this.players, (projectile, player) => this.enemyProjectileHitsPlayer(projectile, player));

    UI.showHud(this.team, this.session.seed);
    UI.setBoss(null);
    document.getElementById("tutorialSkipButton").onclick = () => this.finishTutorial(true);
    audio.music(this, "battle");

    if (this.tutorialMode) this.startTutorial();
    else {
      UI.say("旧图书馆", "书页已经选好了第一条路。别让魔力丝线断开。", 3.6);
      this.time.delayedCall(700, () => this.startEncounter());
    }
  }

  createArena() {
    this.cameras.main.setBackgroundColor(PALETTE.ink);
    for (let y = ARENA.top; y < ARENA.bottom; y += 16) {
      for (let x = ARENA.left; x < ARENA.right; x += 16) {
        const frame = (Math.floor(x / 16) + Math.floor(y / 16) + this.session.rng.integer(0, 2)) % 4;
        this.add.image(x + 8, y + 8, "library-tiles", frame).setDepth(-20).setAlpha(0.98);
      }
    }
    const border = this.add.graphics().setDepth(-5);
    border.lineStyle(2, 0x65516e, 1);
    border.strokeRect(ARENA.left, ARENA.top, ARENA.right - ARENA.left, ARENA.bottom - ARENA.top);
    border.fillStyle(0x09070e, 1);
    border.fillRect(0, 0, 320, 28);
    for (let x = 18; x < 310; x += 42) {
      border.fillStyle(0x2b1c38, 1);
      border.fillRect(x, 7, 26, 14);
      border.fillStyle(0x6a3f75, 0.7);
      border.fillRect(x + 4, 9, 2, 10);
      border.fillRect(x + 10, 8, 2, 11);
      border.fillRect(x + 18, 10, 2, 9);
    }
  }

  createPlayer(slot, wizard, x, y) {
    const sprite = this.physics.add.sprite(x, y, wizard.texture, 0).setDepth(10);
    sprite.body.setCircle(6, 2, 7);
    sprite.setTint(this.cosmetic.tint);
    sprite.play(`${wizard.texture}-idle`);
    this.players.add(sprite);
    const model = {
      slot,
      wizard,
      sprite,
      x,
      y,
      hp: wizard.hp,
      maxHp: wizard.hp,
      facing: slot === "support" ? { x: 1, y: 0 } : { x: -1, y: 0 },
      cooldowns: { shot: 0, skill1: 0, skill2: 0, ult: 0 },
      downed: false,
      downedTimer: 0,
      reviveProgress: 0,
      invuln: 0,
      cursed: 0,
      curseTick: 0,
      hitFlash: 0
    };
    sprite.setData("model", model);
    return model;
  }

  update(_time, deltaMs) {
    const dt = Math.min(0.033, deltaMs / 1000);
    if (["ended", "starting"].includes(this.mode)) {
      this.updateHud();
      return;
    }

    this.updatePlayers(dt, this.mode !== "reward");
    this.enforcePairDistance();
    this.updateCooldownsAndStatuses(dt);
    this.updateRescue(dt);

    if (this.mode === "tutorial") {
      this.updateProjectiles(dt);
      this.updateZones(dt);
      this.updateTether(dt);
      this.updateTutorial();
    } else if (this.mode !== "reward") {
      this.updateProjectiles(dt);
      this.updateZones(dt);
      this.updateEnemies(dt);
      this.updateBoss(dt);
      this.updateTether(dt);
      this.checkRoomState();
    }
    this.updateHud();
  }

  updatePlayers(dt, allowAbilities) {
    for (const model of this.playerModels) {
      const map = this.keys[model.slot];
      model.sprite.setVelocity(0, 0);
      if (model.downed) {
        model.sprite.play(`${model.wizard.texture}-down`, true);
        continue;
      }
      let x = 0;
      let y = 0;
      if (map.left.isDown) x -= 1;
      if (map.right.isDown) x += 1;
      if (map.up.isDown) y -= 1;
      if (map.down.isDown) y += 1;
      if (x || y) {
        const direction = normalize(x, y);
        const slow = model.cursed > 0 ? 0.67 : 1;
        model.sprite.setVelocity(direction.x * model.wizard.speed * slow, direction.y * model.wizard.speed * slow);
        model.facing = direction;
        model.sprite.setFlipX(direction.x < 0);
        model.sprite.play(`${model.wizard.texture}-walk`, true);
      } else if (!model.sprite.anims.isPlaying || model.sprite.anims.currentAnim?.key.endsWith("walk")) {
        model.sprite.play(`${model.wizard.texture}-idle`, true);
      }
      model.x = model.sprite.x = clamp(model.sprite.x, ARENA.left + 7, ARENA.right - 7);
      model.y = model.sprite.y = clamp(model.sprite.y, ARENA.top + 9, ARENA.bottom - 7);
      if (!allowAbilities) continue;
      if (Phaser.Input.Keyboard.JustDown(map.shot)) this.cast(model, "shot");
      if (Phaser.Input.Keyboard.JustDown(map.skill1)) this.cast(model, "skill1");
      if (Phaser.Input.Keyboard.JustDown(map.skill2)) this.cast(model, "skill2");
      if (Phaser.Input.Keyboard.JustDown(map.ult)) this.cast(model, "ult");
    }
  }

  enforcePairDistance() {
    const [support, damage] = this.playerModels;
    const gap = distance(support.sprite, damage.sprite);
    if (gap <= MAX_PAIR_DISTANCE || gap === 0) return;
    const direction = normalize(damage.sprite.x - support.sprite.x, damage.sprite.y - support.sprite.y);
    const excess = (gap - MAX_PAIR_DISTANCE) / 2;
    if (!support.downed) {
      support.sprite.x += direction.x * excess;
      support.sprite.y += direction.y * excess;
    }
    if (!damage.downed) {
      damage.sprite.x -= direction.x * excess;
      damage.sprite.y -= direction.y * excess;
    }
  }

  updateCooldownsAndStatuses(dt) {
    for (const model of this.playerModels) {
      for (const key of ABILITY_KEYS) model.cooldowns[key] = Math.max(0, model.cooldowns[key] - dt);
      model.invuln = Math.max(0, model.invuln - dt);
      if (model.downed) model.downedTimer = Math.max(0, model.downedTimer - dt);
      if (model.cursed > 0 && !model.downed) {
        const curse = advanceCurseStatus(model.cursed, model.curseTick, dt);
        model.cursed = curse.remaining;
        model.curseTick = curse.tickTimer;
        if (curse.triggered) this.damagePlayer(model, 2.2, { curse: true });
      }
    }
  }

  cast(model, abilityKey) {
    if (model.downed || model.cooldowns[abilityKey] > 0) return;
    const ability = model.wizard.abilities[abilityKey];
    model.cooldowns[abilityKey] = ability.cooldown * (abilityKey === "shot" ? this.variant.shotCooldown : 1);
    model.sprite.play(`${model.wizard.texture}-cast`, true);
    if (abilityKey === "ult") this.afterimage(model.sprite, this.cosmetic.tint);
    audio.sfx(this, `${model.wizard.id}-cast`, 0.28);
    this.recordCast(model, abilityKey);

    if (ability.kind === "projectile") this.castProjectile(model, ability);
    if (ability.kind === "controlZone") this.castControlZone(model, ability);
    if (ability.kind === "shieldZone") this.castSupportZone(model, ability, "shield");
    if (ability.kind === "healingZone") this.castSupportZone(model, ability, "healing");
    if (ability.kind === "delayedBurst") this.castDelayedBurst(model, ability);
    if (ability.kind === "dispelCone") this.castDispel(model, ability);
    if (ability.kind === "supportUltimate") this.castSupportUltimate(model, ability);
    if (ability.kind === "damageUltimate") this.castDamageUltimate(model, ability);
  }

  recordCast(model, abilityKey) {
    if (abilityKey === "shot") {
      if (model.slot === "support") this.tutorial.supportShot = true;
      else this.tutorial.damageShot = true;
    }
    if (this.lastCaster && this.lastCaster !== model.slot) {
      this.alternatingCasts += 1;
      if (this.session.hasBlessing("alternating")) {
        const partner = this.playerModels.find((item) => item.slot !== model.slot);
        const longest = ABILITY_KEYS.sort((a, b) => partner.cooldowns[b] - partner.cooldowns[a])[0];
        partner.cooldowns[longest] = Math.max(0, partner.cooldowns[longest] - 0.65);
      }
      if (this.session.hasBlessing("echo-cast") && this.alternatingCasts > 0 && this.alternatingCasts % 5 === 0) {
        this.time.delayedCall(120, () => this.castProjectile(model, model.wizard.abilities.shot, true));
      }
    }
    this.lastCaster = model.slot;
  }

  castProjectile(model, ability, echo = false) {
    const inSupportZone = this.isInFriendlyZone(model.sprite.x, model.sprite.y);
    const directions = [model.facing];
    const spread =
      (model.wizard.id === "thunder" && inSupportZone && this.session.hasBlessing("prism-storm")) ||
      (model.wizard.id === "ember" && this.isInZone("healing", model.sprite.x, model.sprite.y) && this.session.hasBlessing("hearth-grove"));
    if (spread) {
      directions.push(this.rotateDirection(model.facing, 0.22), this.rotateDirection(model.facing, -0.22));
    }
    for (const direction of directions) {
      const sprite = this.physics.add.sprite(
        model.sprite.x + direction.x * 10,
        model.sprite.y + direction.y * 10,
        ability.effect,
        0
      ).setDepth(8);
      sprite.play(`${ability.effect}-pulse`);
      sprite.body.setCircle(3, 3, 3);
      const furnace = model.wizard.id === "ember" && inSupportZone && this.session.hasBlessing("shield-furnace");
      sprite.setData("model", {
        owner: model.slot,
        wizardId: model.wizard.id,
        damage: ability.damage * this.variant.projectileDamage * (echo ? 0.55 : furnace ? 1.24 : spread ? 0.82 : 1),
        applies: ability.applies,
        triggers: ability.triggers || [],
        chains: ability.chains || 0,
        life: 1.35,
        direction,
        furnace,
        pierce: (this.session.hasBlessing("shared-ward") && inSupportZone) || furnace ? 2 : 0
      });
      this.projectiles.add(sprite);
      sprite.setVelocity(direction.x * 150 * this.variant.projectileSpeed, direction.y * 150 * this.variant.projectileSpeed);
    }
  }

  castControlZone(model, ability) {
    const x = clamp(model.sprite.x + model.facing.x * 32, ARENA.left + ability.radius, ARENA.right - ability.radius);
    const y = clamp(model.sprite.y + model.facing.y * 32, ARENA.top + ability.radius, ARENA.bottom - ability.radius);
    this.createZone("control", x, y, ability.radius, ability.duration, { owner: model.slot, wizardId: model.wizard.id });
    UI.say(model.wizard.name, model.wizard.id === "star" ? "星环展开，准备把它们聚在一起。" : "根须抓住它们了，趁现在。", 2.4);
  }

  castSupportZone(model, ability, kind) {
    this.createZone(kind, model.sprite.x, model.sprite.y, ability.radius, ability.duration, {
      owner: model.slot,
      wizardId: model.wizard.id,
      follow: model
    });
  }

  castDelayedBurst(model, ability) {
    const x = clamp(model.sprite.x + model.facing.x * 34, ARENA.left + ability.radius, ARENA.right - ability.radius);
    const y = clamp(model.sprite.y + model.facing.y * 34, ARENA.top + ability.radius, ARENA.bottom - ability.radius);
    const zone = this.createZone("delayedBurst", x, y, ability.radius, ability.delay + 0.3, {
      owner: model.slot,
      wizardId: model.wizard.id,
      damage: ability.damage,
      delay: ability.delay,
      triggered: false
    });
    if (this.session.hasBlessing("pillar-pull") && model.wizard.id === "ember") {
      for (const enemy of this.enemies.getChildren()) {
        const target = enemy.getData("model");
        if (target?.starMark > 0 && distance(enemy, zone.shape) < 60) {
          this.tweens.add({ targets: enemy, x, y, duration: 360, ease: "Quad.easeOut" });
        }
      }
    }
  }

  castDispel(model, ability) {
    const end = {
      x: model.sprite.x + model.facing.x * ability.range,
      y: model.sprite.y + model.facing.y * ability.range
    };
    this.flashLine(model.sprite, end, EFFECT_COLORS[model.wizard.id], 5);
    for (const enemy of this.enemies.getChildren()) {
      if (!enemy.active || pointLineDistance(enemy, model.sprite, end) > 11) continue;
      const target = enemy.getData("model");
      if (target.shield) {
        target.shield = false;
        audio.sfx(this, "shield-break");
      }
      this.hitEnemy(enemy, ability.damage, { dispel: true, area: true, owner: model.slot });
    }
    if (this.bossModel && pointLineDistance(this.bossModel.sprite, model.sprite, end) <= 18) {
      if (this.bossModel.shield > 0) audio.sfx(this, "shield-break");
      this.hitBoss(ability.damage, { dispel: true, area: true });
    }
    for (const player of this.playerModels) {
      if (player.cursed > 0 && pointLineDistance(player.sprite, model.sprite, end) <= 10) {
        player.cursed = 0;
        this.burst(player.sprite.x, player.sprite.y, EFFECT_COLORS[model.wizard.id]);
      }
    }
  }

  castSupportUltimate(model, ability) {
    this.createZone("ultimate", 160, 101, 142, ability.duration, { owner: model.slot, wizardId: model.wizard.id });
    for (const enemy of this.enemies.getChildren()) enemy.getData("model").ultimateSlow = ability.duration;
    if (this.bossModel?.phase === 2) {
      this.bossModel.resonanceOpen = ability.duration;
      UI.say(model.wizard.name, "共鸣窗口已经打开，输出位现在释放终极技能！", 4);
    } else {
      UI.say(model.wizard.name, model.wizard.id === "star" ? "星穹封锁！" : "世界根须，握住整座房间！", 3);
    }
    if (model.wizard.id === "star" && this.damageId === "thunder" && this.session.hasBlessing("star-conductor")) {
      const marked = this.enemies.getChildren().filter((enemy) => enemy.active && enemy.getData("model")?.starMark > 0);
      for (const enemy of marked) this.hitEnemy(enemy, 18, { area: true, bond: true });
    }
    this.shake(0.009, 220);
    audio.sfx(this, "bond", 0.42);
  }

  castDamageUltimate(model, ability) {
    const end = {
      x: model.sprite.x + model.facing.x * 165,
      y: model.sprite.y + model.facing.y * 165
    };
    this.flashLine(model.sprite, end, EFFECT_COLORS[model.wizard.id], 10, 240);
    for (const enemy of this.enemies.getChildren()) {
      if (enemy.active && pointLineDistance(enemy, model.sprite, end) <= 12) {
        this.hitEnemy(enemy, ability.damage, { area: true, owner: model.slot });
      }
    }
    if (this.bossModel && pointLineDistance(this.bossModel.sprite, model.sprite, end) <= 22) {
      const combo = this.bossModel.phase === 2 && this.bossModel.resonanceOpen > 0;
      this.hitBoss(combo ? ability.damage * 2.2 : ability.damage, { damageUltimate: true, combo });
      if (combo) {
        this.session.stats.bonds += 1;
        this.bossModel.riftEnergy = Math.max(0, this.bossModel.riftEnergy - 34);
        this.bossModel.resonanceOpen = 0;
        audio.sfx(this, "bond", 0.5);
        this.hitStop(72);
        this.shake(0.016, 420);
      }
    }
  }

  createZone(kind, x, y, radius, duration, options = {}) {
    const colors = {
      control: options.wizardId === "verdant" ? PALETTE.verdant : PALETTE.star,
      shield: PALETTE.star,
      healing: PALETTE.verdant,
      delayedBurst: options.wizardId === "thunder" ? PALETTE.thunder : PALETTE.ember,
      ultimate: options.wizardId === "verdant" ? PALETTE.verdant : PALETTE.star,
      wildfire: PALETTE.ember,
      stormgarden: PALETTE.thunder,
      danger: PALETTE.danger
    };
    const shape = this.add.circle(x, y, radius, colors[kind] || PALETTE.curse, kind === "danger" ? 0.12 : 0.09)
      .setStrokeStyle(kind === "ultimate" ? 2 : 1, colors[kind] || PALETTE.curse, 0.88)
      .setDepth(kind === "danger" ? 6 : 2);
    const zone = { kind, x, y, radius, duration, age: 0, tick: 0, shape, ...options };
    this.zones.push(zone);
    return zone;
  }

  updateZones(dt) {
    for (const zone of this.zones) {
      zone.age += dt;
      zone.duration -= dt;
      zone.tick -= dt;
      if (zone.follow && !zone.follow.downed) {
        zone.x = zone.follow.sprite.x;
        zone.y = zone.follow.sprite.y;
        zone.shape.setPosition(zone.x, zone.y);
      }
      if (zone.kind === "healing" && zone.tick <= 0) {
        zone.tick = 0.65;
        for (const player of this.playerModels) {
          if (!player.downed && distance(player.sprite, zone.shape) <= zone.radius) this.healPlayer(player, 2.4);
        }
      }
      zone.specialTick = (zone.specialTick || 0) - dt;
      if (zone.kind === "control" && zone.specialTick <= 0) {
        if (zone.wizardId === "star" && this.damageId === "thunder" && this.session.hasBlessing("orbit-spark")) {
          zone.specialTick = 0.75;
          for (const enemy of this.enemies.getChildren()) {
            const gap = Math.hypot(enemy.x - zone.x, enemy.y - zone.y);
            if (enemy.active && gap > zone.radius * 0.55 && gap < zone.radius + 8) this.hitEnemy(enemy, 7, { area: true, bond: true });
          }
        }
        if (zone.wizardId === "verdant" && this.damageId === "thunder" && this.session.hasBlessing("charged-roots")) {
          zone.specialTick = 0.9;
          for (const enemy of this.enemies.getChildren()) {
            if (enemy.active && Math.hypot(enemy.x - zone.x, enemy.y - zone.y) <= zone.radius + 8) this.hitEnemy(enemy, 6, { area: true, bond: true });
          }
        }
      }
      if (zone.kind === "delayedBurst" && !zone.triggered && zone.age >= zone.delay) {
        zone.triggered = true;
        zone.shape.setFillStyle(zone.wizardId === "thunder" ? PALETTE.thunder : PALETTE.ember, 0.42);
        this.burstArea(zone.x, zone.y, zone.radius, zone.damage, { area: true, owner: zone.owner, wizardId: zone.wizardId });
        if (this.session.hasBlessing("ring-resonance") && zone.wizardId === "ember" && this.isInZone("control", zone.x, zone.y)) {
          this.time.delayedCall(260, () => this.burstArea(zone.x, zone.y, zone.radius * 0.72, zone.damage * 0.55, { area: true, owner: zone.owner }));
        }
        if (this.session.hasBlessing("thunder-bloom") && zone.wizardId === "thunder") {
          for (const enemy of this.enemies.getChildren()) {
            const target = enemy.getData("model");
            if (target?.sprout > 0 && distance(enemy, zone.shape) <= zone.radius + 10) this.triggerBond(enemy, target);
          }
        }
        this.shake(0.006, 140);
      }
      if (["wildfire", "stormgarden"].includes(zone.kind)) {
        const nearest = this.nearestEnemy(zone.shape);
        if (nearest && zone.kind === "wildfire" && this.session.hasBlessing("wildfire")) {
          const direction = normalize(nearest.x - zone.x, nearest.y - zone.y);
          zone.x += direction.x * 12 * dt;
          zone.y += direction.y * 12 * dt;
          zone.shape.setPosition(zone.x, zone.y);
        }
        if (zone.tick <= 0) {
          zone.tick = 0.55;
          this.burstArea(zone.x, zone.y, zone.radius, zone.kind === "wildfire" ? 7 : 6, { area: true, owner: "bond" });
          if (zone.kind === "stormgarden") {
            for (const player of this.playerModels) this.healPlayer(player, 0.8);
          }
        }
      }
      if (zone.kind === "danger" && !zone.triggered && zone.age >= zone.delay) {
        zone.triggered = true;
        zone.shape.setFillStyle(PALETTE.danger, 0.45);
        for (const player of this.playerModels) {
          if (!player.downed && distance(player.sprite, zone.shape) <= zone.radius + 5) this.damagePlayer(player, zone.damage);
        }
      }
    }
    const expired = this.zones.filter((zone) => zone.duration <= 0);
    for (const zone of expired) {
      if (zone.kind === "wildfire" && this.session.hasBlessing("ash-bloom")) {
        this.createZone("healing", zone.x, zone.y, 16, 2.8, { owner: "support", wizardId: "verdant" });
      }
      zone.shape.destroy();
    }
    this.zones = this.zones.filter((zone) => zone.duration > 0);
  }

  isInZone(kind, x, y) {
    return this.zones.some((zone) => zone.kind === kind && Math.hypot(zone.x - x, zone.y - y) <= zone.radius);
  }

  isInFriendlyZone(x, y) {
    return this.zones.some((zone) => ["shield", "healing"].includes(zone.kind) && Math.hypot(zone.x - x, zone.y - y) <= zone.radius);
  }

  slowFactorAt(x, y, model) {
    if (model.ultimateSlow > 0) return 0.42;
    if (this.isInZone("control", x, y)) return 0.22;
    return 1;
  }

  updateProjectiles(dt) {
    for (const projectile of this.projectiles.getChildren()) {
      if (!projectile.active) continue;
      const model = projectile.getData("model");
      model.life -= dt;
      if (model.life <= 0 || projectile.x < ARENA.left || projectile.x > ARENA.right || projectile.y < ARENA.top || projectile.y > ARENA.bottom) projectile.destroy();
    }
    for (const projectile of this.enemyProjectiles.getChildren()) {
      if (!projectile.active) continue;
      const model = projectile.getData("model");
      model.life -= dt;
      if (model.life <= 0 || projectile.x < ARENA.left || projectile.x > ARENA.right || projectile.y < ARENA.top || projectile.y > ARENA.bottom) projectile.destroy();
    }
  }

  projectileHitsEnemy(projectile, enemy) {
    if (!projectile.active || !enemy.active) return;
    const shot = projectile.getData("model");
    const target = enemy.getData("model");
    if (!shot || !target || target.dead) return;
    if (target.frontalGuard && !shot.area) {
      const incoming = normalize(projectile.x - enemy.x, projectile.y - enemy.y);
      const facing = normalize(target.facing.x, target.facing.y);
      if (incoming.x * facing.x + incoming.y * facing.y > 0.2) {
        this.burst(projectile.x, projectile.y, PALETTE.star);
        projectile.destroy();
        return;
      }
    }
    this.hitEnemy(enemy, shot.damage, { owner: shot.owner, projectile: true, wizardId: shot.wizardId });
    if (shot.furnace) this.createZone("wildfire", enemy.x, enemy.y, 11, 1.7, { owner: shot.owner });
    if (shot.applies) this.applyEnemySetupStatus(enemy, shot.applies, 6.5);
    if (shot.triggers?.includes(this.session.recipe.setup) && target[this.session.recipe.setup] > 0) this.triggerBond(enemy, target);
    this.handleCrossfire(enemy, target, shot.owner);
    if (shot.chains > 0 && shot.wizardId === "thunder") this.chainDamage(enemy, shot.damage * 0.55, shot.chains);
    shot.pierce -= 1;
    if (shot.pierce < 0) projectile.destroy();
  }

  projectileHitsBoss(projectile) {
    if (!projectile.active || !this.bossModel) return;
    const shot = projectile.getData("model");
    this.hitBoss(shot.damage, { projectile: true, owner: shot.owner });
    if (shot.applies) this.applyBossSetupStatus(shot.applies, 5);
    if (shot.triggers?.includes(this.session.recipe.setup) && this.bossModel[this.session.recipe.setup] > 0) {
      this.bossModel[this.session.recipe.setup] = 0;
      this.refreshBossTint();
      this.hitBoss(24, { bond: true });
      this.session.stats.bonds += 1;
      audio.sfx(this, "bond");
    }
    shot.pierce -= 1;
    if (shot.pierce < 0) projectile.destroy();
  }

  handleCrossfire(enemy, target, owner) {
    const now = this.time.now;
    if (this.session.hasBlessing("crossfire") && target.lastHitOwner && target.lastHitOwner !== owner && now - target.lastHitAt < 1000) {
      const nearest = this.nearestEnemy(enemy, enemy);
      if (nearest) this.hitEnemy(nearest, 14, { bond: true, area: true });
      this.burst(enemy.x, enemy.y, PALETTE.thunder);
    }
    target.lastHitOwner = owner;
    target.lastHitAt = now;
  }

  triggerBond(enemy, target) {
    target[this.session.recipe.setup] = 0;
    this.updateEnemyPresentation(enemy, true);
    this.tutorial.bond = true;
    this.session.stats.bonds += 1;
    audio.sfx(this, "bond", 0.42);
    this.hitStop(52);
    for (const player of this.playerModels) this.afterimage(player.sprite, this.cosmetic.tint);
    this.shake(0.007, 150);
    const result = this.session.recipe.result;
    if (result === "explosion") {
      this.burstArea(enemy.x, enemy.y, 20, 28, { area: true, bond: true });
      if (this.session.hasBlessing("mark-spread")) {
        const nearby = this.nearestEnemies(enemy, 2, 58);
        for (const other of nearby) this.applyEnemySetupStatus(other, "starMark", 5);
      }
    }
    if (result === "chain") {
      const targets = this.nearestEnemies(enemy, 3, 70).sort((a, b) => {
        if (!this.session.hasBlessing("constellation-chain")) return 0;
        return (b.getData("model")?.starMark > 0 ? 1 : 0) - (a.getData("model")?.starMark > 0 ? 1 : 0);
      });
      this.hitEnemy(enemy, 20, { area: true, bond: true });
      for (const other of targets) this.hitEnemy(other, 17, { area: true, bond: true });
    }
    if (result === "wildfire") {
      this.createZone("wildfire", enemy.x, enemy.y, 19, 4.4, { owner: "bond" });
    }
    if (result === "stormgarden") {
      if (this.session.hasBlessing("storm-garden")) {
        this.createZone("stormgarden", enemy.x, enemy.y, 21, 4.5, { owner: "bond" });
      } else {
        this.burstArea(enemy.x, enemy.y, 20, 20, { area: true, bond: true });
        for (const player of this.playerModels) this.healPlayer(player, 1.2);
      }
    }
    this.burst(enemy.x, enemy.y, result === "wildfire" ? PALETTE.ember : result === "stormgarden" ? PALETTE.thunder : PALETTE.bone);
  }

  chainDamage(origin, damage, count) {
    const targets = this.nearestEnemies(origin, count, 62);
    for (const enemy of targets) this.hitEnemy(enemy, damage, { area: true });
    this.chainJumps = (this.chainJumps || 0) + targets.length;
    if (this.session.hasBlessing("rain-heal") && this.chainJumps >= 3) {
      this.chainJumps %= 3;
      for (const player of this.playerModels) this.healPlayer(player, 2.2);
    }
  }

  burstArea(x, y, radius, damage, source = {}) {
    const point = { x, y };
    for (const enemy of this.enemies.getChildren()) {
      if (enemy.active && distance(enemy, point) <= radius + 7) this.hitEnemy(enemy, damage, source);
    }
    if (this.bossModel && distance(this.bossModel.sprite, point) <= radius + 16) this.hitBoss(damage * 0.65, source);
    this.burst(x, y, source.wizardId ? EFFECT_COLORS[source.wizardId] : PALETTE.bone);
  }

  hitEnemy(sprite, amount, source = {}) {
    const model = sprite.getData("model");
    if (!model || model.dead) return;
    const damage = calculateEnemyDamage(amount, {
      shielded: model.shield,
      dispel: source.dispel,
      priestProtected: this.nearActivePriest(sprite)
    });
    model.hp -= damage;
    this.updateEnemyPresentation(sprite, true);
    if (saveStore.data.settings.flashes) {
      sprite.setTintFill(0xffffff);
      this.time.delayedCall(55, () => sprite.active && this.updateEnemyPresentation(sprite, true));
    }
    sprite.play(`${model.config.texture}-hurt`, true);
    audio.sfx(this, "hit", 0.16);
    if (model.hp <= 0) this.defeatEnemy(sprite, source);
  }

  defeatEnemy(sprite, source = {}) {
    const model = sprite.getData("model");
    if (model.dead) return;
    model.dead = true;
    this.updateEnemyPresentation(sprite, true);
    sprite.setVelocity(0, 0);
    sprite.play(`${model.config.texture}-down`, true);
    this.burst(sprite.x, sprite.y, PALETTE.curse);
    if (this.session.hasBlessing("ember-seeds") && source.owner === "damage") {
      this.createZone("control", sprite.x, sprite.y, 13, 2.8, { owner: "support", wizardId: "verdant" });
    }
    this.time.delayedCall(180, () => sprite.destroy());
  }

  nearActivePriest(sprite) {
    return this.enemies.getChildren().some((enemy) => {
      if (!enemy.active || enemy === sprite) return false;
      const model = enemy.getData("model");
      return model?.config.id === "priest" && !model.dead && distance(enemy, sprite) <= 45;
    });
  }

  applyEnemySetupStatus(sprite, status, duration) {
    const model = sprite?.getData("model");
    if (!model || model.dead || !["starMark", "sprout"].includes(status)) return;
    model[status] = Math.max(model[status] || 0, duration);
    this.updateEnemyPresentation(sprite, true);
  }

  applyBossSetupStatus(status, duration) {
    if (!this.bossModel || !["starMark", "sprout"].includes(status)) return;
    this.bossModel[status] = Math.max(this.bossModel[status] || 0, duration);
    this.refreshBossTint();
  }

  updateEnemyPresentation(sprite, force = false) {
    const model = sprite?.getData("model");
    if (!model?.healthBar || !model.statusGlyph) return;
    model.healthBar.setPosition(sprite.x, sprite.y);
    model.statusGlyph.setPosition(sprite.x, sprite.y);
    const ratio = Math.max(0, Math.min(1, model.hp / model.maxHp));
    const width = Math.ceil(ratio * 12);
    const status = model.starMark > 0 ? "starMark" : model.sprout > 0 ? "sprout" : "none";
    const signature = `${width}:${status}:${model.shield ? 1 : 0}:${model.dead ? 1 : 0}`;
    if (!force && signature === model.presentationSignature) return;
    model.presentationSignature = signature;
    model.healthBar.clear();
    model.statusGlyph.clear();
    if (model.dead) {
      model.healthBar.setVisible(false);
      model.statusGlyph.setVisible(false);
      return;
    }
    model.healthBar.setVisible(true);
    model.healthBar.fillStyle(PALETTE.ink, 0.96);
    model.healthBar.fillRect(-7, -14, 14, 3);
    model.healthBar.fillStyle(0x4a3d50, 1);
    model.healthBar.fillRect(-6, -13, 12, 1);
    const barColor = status === "starMark" ? PALETTE.star : status === "sprout" ? PALETTE.verdant : model.shield ? PALETTE.curse : PALETTE.danger;
    if (width > 0) {
      model.healthBar.fillStyle(barColor, 1);
      model.healthBar.fillRect(-6, -13, width, 1);
    }
    if (status === "starMark") {
      model.statusGlyph.setVisible(true);
      model.statusGlyph.fillStyle(PALETTE.star, 1);
      model.statusGlyph.fillRect(-2, -19, 5, 1);
      model.statusGlyph.fillRect(0, -21, 1, 5);
    } else if (status === "sprout") {
      model.statusGlyph.setVisible(true);
      model.statusGlyph.fillStyle(PALETTE.verdant, 1);
      model.statusGlyph.fillRect(0, -20, 1, 4);
      model.statusGlyph.fillRect(-2, -20, 2, 1);
      model.statusGlyph.fillRect(1, -19, 2, 1);
    } else {
      model.statusGlyph.setVisible(false);
    }
    sprite.clearTint();
    if (status === "starMark") sprite.setTint(PALETTE.star);
    if (status === "sprout") sprite.setTint(PALETTE.verdant);
  }

  refreshBossTint(force = false) {
    const boss = this.bossModel;
    if (!boss?.sprite?.active) return;
    const status = boss.starMark > 0 ? "starMark" : boss.sprout > 0 ? "sprout" : "none";
    if (!force && boss.presentationStatus === status) return;
    boss.presentationStatus = status;
    boss.sprite.clearTint();
    if (status === "starMark") boss.sprite.setTint(PALETTE.star);
    else if (status === "sprout") boss.sprite.setTint(PALETTE.verdant);
  }

  createEnemy(type, x, y, options = {}) {
    const config = ENEMIES[type];
    const sprite = this.physics.add.sprite(x, y, config.texture, 0).setDepth(9);
    sprite.body.setCircle(config.radius, 10 - config.radius, 10 - config.radius);
    sprite.play(`${config.texture}-idle`);
    const boost = (this.roomDanger ? 1.18 : 1) * (options.training ? 1 : this.difficulty.enemyHp);
    const model = {
      config,
      hp: config.hp * boost,
      maxHp: config.hp * boost,
      shield: Boolean(config.shielded),
      frontalGuard: Boolean(config.frontalGuard),
      attackTimer: this.session.rng.next() * 1.2,
      specialTimer: 1.5 + this.session.rng.next() * 2,
      starMark: 0,
      sprout: 0,
      ultimateSlow: 0,
      facing: { x: 0, y: 1 },
      dead: false,
      training: Boolean(options.training)
    };
    model.healthBar = this.add.graphics().setDepth(12);
    model.statusGlyph = this.add.graphics().setDepth(13);
    sprite.setData("model", model);
    this.enemies.add(sprite);
    sprite.once("destroy", () => {
      model.healthBar?.destroy();
      model.statusGlyph?.destroy();
    });
    this.updateEnemyPresentation(sprite, true);
    return sprite;
  }

  updateEnemies(dt) {
    for (const sprite of this.enemies.getChildren()) {
      if (!sprite.active) continue;
      const model = sprite.getData("model");
      if (!model || model.dead) continue;
      if (model.training) {
        this.updateEnemyPresentation(sprite);
        continue;
      }
      model.attackTimer -= dt;
      model.specialTimer -= dt;
      model.starMark = Math.max(0, model.starMark - dt);
      model.sprout = Math.max(0, model.sprout - dt);
      model.ultimateSlow = Math.max(0, model.ultimateSlow - dt);
      this.updateEnemyPresentation(sprite);
      const target = this.chooseEnemyTarget(model.config.ai, sprite);
      if (!target) continue;
      const dx = target.sprite.x - sprite.x;
      const dy = target.sprite.y - sprite.y;
      const gap = Math.hypot(dx, dy) || 1;
      const direction = normalize(dx, dy);
      model.facing = direction;
      sprite.setFlipX(direction.x < 0);
      const speed = model.config.speed * this.difficulty.enemySpeed * this.slowFactorAt(sprite.x, sprite.y, model);
      let desired = 0;
      if (["curser", "archer", "priest"].includes(model.config.ai)) {
        desired = gap > 74 ? 1 : gap < 48 ? -0.75 : 0;
      } else {
        desired = gap > 12 ? 1 : 0;
      }
      sprite.setVelocity(direction.x * speed * desired, direction.y * speed * desired);
      if (desired) sprite.play(`${model.config.texture}-walk`, true);
      else sprite.play(`${model.config.texture}-idle`, true);
      sprite.x = clamp(sprite.x, ARENA.left + 7, ARENA.right - 7);
      sprite.y = clamp(sprite.y, ARENA.top + 8, ARENA.bottom - 7);

      if (["chaser", "hunter", "mirror"].includes(model.config.ai) && gap <= 13 && model.attackTimer <= 0) {
        model.attackTimer = model.config.ai === "hunter" ? 0.72 : 1;
        this.damagePlayer(target, this.scaleEnemyDamage(model.config.damage));
      }
      if (model.config.ai === "curser" && gap < 92 && model.specialTimer <= 0) {
        model.specialTimer = 5.1;
        this.applyCurse(target);
      }
      if (model.config.ai === "archer" && gap < 116 && model.specialTimer <= 0) {
        model.specialTimer = 2.6;
        this.fireEnemyProjectile(sprite, target, this.scaleEnemyDamage(model.config.damage));
      }
      if (model.config.ai === "spore" && model.specialTimer <= 0) {
        model.specialTimer = 3.2;
        this.createZone("danger", target.sprite.x, target.sprite.y, 13, 1.15, { delay: 0.75, damage: this.scaleEnemyDamage(model.config.damage), triggered: false });
        audio.sfx(this, "boss-warning", 0.18);
      }
      if (model.config.ai === "priest" && model.specialTimer <= 0) {
        model.specialTimer = 2.8;
        this.burst(sprite.x, sprite.y, PALETTE.thunder);
      }
    }
  }

  chooseEnemyTarget(ai, origin) {
    const living = this.playerModels.filter((player) => !player.downed);
    if (!living.length) return null;
    if (ai === "hunter") return living.find((player) => player.slot === "damage") || living[0];
    return living.sort((a, b) => distance(a.sprite, origin) - distance(b.sprite, origin))[0];
  }

  fireEnemyProjectile(origin, target, damage) {
    const direction = normalize(target.sprite.x - origin.x, target.sprite.y - origin.y);
    const sprite = this.physics.add.sprite(origin.x, origin.y, "curse", 0).setDepth(8);
    sprite.play("curse-pulse");
    sprite.body.setCircle(3, 3, 3);
    sprite.setData("model", { damage, life: 2.2 });
    this.enemyProjectiles.add(sprite);
    sprite.setVelocity(direction.x * 78, direction.y * 78);
  }

  enemyProjectileHitsPlayer(projectile, playerSprite) {
    if (!projectile.active) return;
    const model = projectile.getData("model");
    this.damagePlayer(playerSprite.getData("model"), model.damage);
    projectile.destroy();
  }

  applyCurse(player) {
    if (player.downed || player.cursed > 0) return;
    player.cursed = 6;
    player.curseTick = 0.7;
    this.burst(player.sprite.x, player.sprite.y, PALETTE.curse);
    UI.say("噬魔幽魂", "诅咒缠住了魔力，输出位用破盾技能清除它。", 3.5);
  }

  updateRescue(dt) {
    for (const target of this.playerModels) {
      if (!target.downed) continue;
      const helper = this.playerModels.find((player) => player !== target);
      const interact = this.keys[helper.slot].interact.isDown;
      const eligible = !helper.downed && distance(helper.sprite, target.sprite) <= 19 && interact;
      target.reviveProgress = advanceReviveProgress(target.reviveProgress, dt, eligible);
      if (eligible) {
        this.objective = `唤醒同伴 ${Math.floor(target.reviveProgress * 100)}%`;
        if (target.reviveProgress >= 1) this.revivePlayer(target);
      }
      if (!this.tutorialMode && target.downedTimer <= 0) this.fail("同伴没能及时醒来", "靠近倒地同伴并按住 E 或 P 两秒。两个人都不能被裂隙留下。 ");
    }
    if (!this.tutorialMode && this.playerModels.every((player) => player.downed)) {
      if (this.session.hasBlessing("second-wake") && !this.roomSecondWakeUsed) {
        this.roomSecondWakeUsed = true;
        for (const player of this.playerModels) this.revivePlayer(player, 0.28);
      } else {
        this.fail("两名巫师都魔力耗尽了", "下一次先保护彼此，再追求伤害。魔力丝线断开时，没有人能独自封印裂隙。");
      }
    }
  }

  revivePlayer(player, ratio = 0.45) {
    player.downed = false;
    player.hp = Math.ceil(player.maxHp * ratio);
    player.downedTimer = 0;
    player.reviveProgress = 0;
    player.invuln = 1.5;
    player.sprite.play(`${player.wizard.texture}-idle`, true);
    this.session.stats.revives += 1;
    this.tutorial.revived = true;
    this.burst(player.sprite.x, player.sprite.y, PALETTE.verdant);
    audio.sfx(this, "revive", 0.42);
    if (this.session.hasBlessing("revive-glow")) {
      this.burstArea(player.sprite.x, player.sprite.y, 34, 28, { area: true, owner: "bond" });
      for (const model of this.playerModels) model.invuln = Math.max(model.invuln, 1.5);
    }
  }

  damagePlayer(player, amount, source = {}) {
    if (!player || player.downed || player.invuln > 0) return;
    const damage = calculatePlayerDamage(amount, {
      shieldZone: this.isInZone("shield", player.sprite.x, player.sprite.y),
      curse: source.curse,
      healingZone: this.isInZone("healing", player.sprite.x, player.sprite.y)
    });
    player.hp -= damage;
    player.invuln = 0.62;
    this.session.stats.damageTaken += damage;
    if (saveStore.data.settings.flashes) {
      player.sprite.setTintFill(0xffffff);
      this.time.delayedCall(60, () => player.sprite.active && player.sprite.setTint(this.cosmetic.tint));
    }
    audio.sfx(this, "hurt", 0.22);
    if (player.hp <= 0) {
      player.hp = 0;
      player.downed = true;
      player.downedTimer = 10;
      player.reviveProgress = 0;
      player.sprite.setVelocity(0, 0);
      player.sprite.play(`${player.wizard.texture}-down`, true);
      if (!this.tutorialMode) UI.say(player.wizard.name, `我撑不住了，用 ${player.slot === "support" ? "P" : "E"} 唤醒我！`, 4);
    }
  }

  healPlayer(player, amount) {
    if (!player.downed) player.hp = Math.min(player.maxHp, player.hp + amount);
  }

  scaleEnemyDamage(amount) {
    return amount * this.difficulty.enemyDamage * (this.roomDanger ? 1.12 : 1);
  }

  startEncounter() {
    const encounter = this.session.currentEncounter();
    if (!encounter) {
      this.spawnBoss();
      return;
    }
    this.mode = "combat";
    this.pendingAdvance = false;
    this.roomSecondWakeUsed = false;
    this.roomDanger = Boolean(this.nextEncounterDanger);
    this.roomState = `房间 ${this.session.roomIndex + 1} / 6`;
    this.objective = encounter.title;
    const spawnList = [];
    for (const [type, count] of Object.entries(encounter.spawns)) {
      for (let index = 0; index < count; index += 1) spawnList.push(type);
    }
    spawnList.forEach((type, index) => {
      const column = index % 6;
      const row = Math.floor(index / 6);
      const x = 48 + column * 45 + this.session.rng.integer(-7, 7);
      const y = 58 + row * 34 + this.session.rng.integer(-5, 8);
      this.createEnemy(type, clamp(x, 24, 296), clamp(y, 46, 112));
    });
    if (this.session.hasBlessing("rift-compass") && encounter.threat >= 12) {
      UI.say("裂隙罗盘", "高威胁房间位于前方，罗盘释放了一次治疗脉冲。", 3);
      for (const player of this.playerModels) this.healPlayer(player, player.maxHp * 0.12);
    }
    if (this.roomDanger) {
      this.objective += " · 不稳定";
      this.nextEncounterDanger = false;
    }
    if (this.session.roomIndex === 2) UI.say(this.team.damage.name, "裂隙开始混合不同怪物了，先找最麻烦的那个。", 3.6);
    if (this.session.roomIndex === 5) UI.say(this.team.support.name, "最后一页。再往后就是这次裂隙的主人。", 3.6);
  }

  checkRoomState() {
    if (this.mode !== "combat" || this.pendingAdvance || this.bossModel) return;
    const livingEnemies = this.enemies.getChildren().filter((enemy) => enemy.active && !enemy.getData("model")?.dead);
    if (livingEnemies.length) return;
    this.pendingAdvance = true;
    this.objective = "房间已经安静下来";
    this.time.delayedCall(650, () => this.completeEncounter());
  }

  completeEncounter() {
    if (this.mode === "ended") return;
    for (const player of this.playerModels) this.healPlayer(player, player.maxHp * 0.14);
    const completedIndex = this.session.roomIndex;
    if (completedIndex === 1 || completedIndex === 3) {
      this.launchReward("blessing");
      return;
    }
    if (completedIndex === 4 && !this.session.eventResolved) {
      this.session.eventResolved = true;
      this.launchReward("event");
      return;
    }
    this.advanceEncounter();
  }

  advanceEncounter() {
    this.session.nextEncounter();
    this.mode = "starting";
    this.pendingAdvance = true;
    this.time.delayedCall(450, () => this.startEncounter());
  }

  launchReward(kind) {
    this.mode = "reward";
    this.objective = kind === "event" ? "失落书页" : "选择双生祝福";
    const choices = kind === "blessing"
      ? this.session.drawBlessings(3)
      : [
          { id: "event-heal", name: "合上眼睛", description: "两人恢复全部魔力。" },
          { id: "event-risk", name: "撕下书页", description: "立刻获得随机祝福，下一房间更危险。" },
          { id: "event-reroll", name: "重写路线", description: "替换下一场遭遇，并恢复少量魔力。" }
        ];
    this.scene.launch("RewardScene", { runSceneKey: this.sceneKey, choices, kind });
  }

  applyReward(choice, kind) {
    if (kind === "blessing") {
      this.session.addBlessing(choice.id);
      UI.say("双生魔典", `${choice.name} 已写入这次冒险。`, 2.7);
    } else if (choice.id === "event-heal") {
      for (const player of this.playerModels) player.hp = player.maxHp;
    } else if (choice.id === "event-risk") {
      const bonus = this.session.drawBlessings(1)[0];
      if (bonus) this.session.addBlessing(bonus.id);
      this.nextEncounterDanger = true;
      UI.say("失落书页", bonus ? `你们得到了 ${bonus.name}，下一页也醒了。` : "下一页醒了。", 3);
    } else {
      const unused = this.session.rng.shuffle(this.session.encounters).find((item) => item.id !== this.session.currentEncounter()?.id);
      if (unused && this.session.roomIndex + 1 < this.session.encounters.length) this.session.encounters[this.session.roomIndex + 1] = unused;
      for (const player of this.playerModels) this.healPlayer(player, player.maxHp * 0.28);
    }
  }

  finishReward() {
    UI.hideReward();
    this.mode = "starting";
    this.advanceEncounter();
  }

  spawnBoss() {
    const config = BOSSES[this.session.bossId];
    this.mode = "boss";
    this.roomState = this.bossAffix.id === "none" ? "裂隙主宰" : `裂隙主宰 · ${this.bossAffix.name}`;
    this.objective = config.name;
    const sprite = this.physics.add.sprite(160, 57, config.texture, 0).setDepth(11);
    sprite.body.setCircle(13, 4, 5);
    sprite.play(`${config.texture}-idle`);
    this.bosses.add(sprite);
    const bossHp = config.hp * this.difficulty.bossHp;
    this.bossModel = {
      config,
      affix: this.bossAffix,
      sprite,
      hp: bossHp,
      maxHp: bossHp,
      phase: 1,
      attackTimer: 1.2,
      summonTimer: 4.5,
      shieldTimer: 7,
      shield: 0,
      resonanceOpen: 0,
      riftEnergy: 0,
      starMark: 0,
      sprout: 0,
      float: 0
    };
    sprite.setData("model", this.bossModel);
    UI.say(config.name, config.intro, 4.6);
    audio.sfx(this, "boss-warning", 0.34);
    this.cameras.main.fadeIn(550, 16, 13, 24);
  }

  updateBoss(dt) {
    const boss = this.bossModel;
    if (!boss || this.mode !== "boss") return;
    boss.attackTimer -= dt;
    boss.summonTimer -= dt;
    boss.shieldTimer -= dt;
    boss.resonanceOpen = Math.max(0, boss.resonanceOpen - dt);
    boss.starMark = Math.max(0, boss.starMark - dt);
    boss.sprout = Math.max(0, boss.sprout - dt);
    this.refreshBossTint();
    boss.float += dt;
    boss.sprite.y = 58 + Math.sin(boss.float * 2) * 3;

    if (shouldEnterBossPhaseTwo({ ...boss, phaseAt: boss.config.phaseAt })) {
      boss.phase = 2;
      boss.attackTimer = 0.65;
      boss.summonTimer = 1.4;
      this.shake(0.014, 500);
      this.hitStop(82);
      this.afterimage(boss.sprite, PALETTE.bone);
      this.cameras.main.flash(220, 242, 230, 201);
      UI.say(this.team.support.name, "它把弱点藏进裂隙了。我来开启共鸣，你准备终结。", 4.8);
    }
    if (boss.phase === 2) {
      boss.riftEnergy = Math.min(100, boss.riftEnergy + dt * 1.65 * this.difficulty.riftRate * this.bossAffix.riftRate);
      if (boss.riftEnergy >= 100) {
        this.fail("裂隙能量满了", "辅助位先释放终极技能开启共鸣，输出位再完成终结。 ");
        return;
      }
    }
    if (boss.config.id === "lich" && boss.shieldTimer <= 0) {
      boss.shield = 3;
      boss.shieldTimer = boss.phase === 1 ? 10 : 7.5;
      UI.say("裂隙大巫妖", "黑暗护盾会吞掉普通法术。", 2.6);
    }
    if (boss.attackTimer <= 0) {
      boss.attackTimer = boss.phase === 1 ? 2.25 : 1.6;
      this.executeBossPattern(boss);
    }
    if (boss.summonTimer <= 0) {
      boss.summonTimer = boss.phase === 1 ? 8.5 : 6.2;
      this.summonBossAdds(boss);
    }
  }

  executeBossPattern(boss, echo = false) {
    audio.sfx(this, "boss-warning", 0.2);
    const damageScale = this.difficulty.bossDamage * (echo ? 0.65 : 1);
    if (!echo && this.bossAffix.repeatPatterns) {
      this.time.delayedCall(760, () => {
        if (this.mode === "boss" && this.bossModel === boss) this.executeBossPattern(boss, true);
      });
    }
    if (boss.config.pattern === "roots") {
      const horizontal = this.session.rng.next() > 0.5;
      for (let index = 0; index < 6; index += 1) {
        const x = horizontal ? 48 + index * 45 : 80 + (index % 2) * 160;
        const y = horizontal ? 92 + (index % 2) * 36 : 48 + index * 22;
        this.createZone("danger", x, y, 12, 1.18, { delay: 0.76, damage: (boss.phase === 1 ? 12 : 16) * damageScale, triggered: false });
      }
      return;
    }
    if (boss.config.pattern === "mirror") {
      const target = this.session.rng.pick(this.playerModels.filter((player) => !player.downed));
      if (target) {
        const end = { x: target.sprite.x, y: target.sprite.y };
        this.flashLine(boss.sprite, end, PALETTE.danger, echo ? 2 : boss.phase === 1 ? 3 : 6, 620);
        this.time.delayedCall(620, () => {
          for (const player of this.playerModels) {
            if (pointLineDistance(player.sprite, boss.sprite, end) <= 9) this.damagePlayer(player, (boss.phase === 1 ? 13 : 18) * damageScale);
          }
        });
      }
      return;
    }
    for (const player of this.playerModels) {
      if (!player.downed) this.createZone("danger", player.sprite.x, player.sprite.y, boss.phase === 1 ? 16 : 20, 1.15, { delay: 0.78, damage: (boss.phase === 1 ? 13 : 17) * damageScale, triggered: false });
    }
  }

  summonBossAdds(boss) {
    const activeAdds = this.enemies.getChildren().filter((enemy) => enemy.active).length;
    if (activeAdds >= 7) return;
    const pools = {
      rift: boss.phase === 1 ? ["imp", "wolf"] : ["ghost", "archer", "imp"],
      roots: boss.phase === 1 ? ["spore", "imp"] : ["spore", "priest", "wolf"],
      mirror: boss.phase === 1 ? ["mirror", "imp"] : ["mirror", "archer", "ghost"]
    };
    const count = Math.min((boss.phase === 1 ? 2 : 3) + this.bossAffix.extraAdds, 7 - activeAdds);
    for (let index = 0; index < count; index += 1) {
      this.createEnemy(this.session.rng.pick(pools[boss.config.pattern]), 70 + index * 90, 74 + (index % 2) * 32);
    }
  }

  hitBoss(amount, source = {}) {
    const boss = this.bossModel;
    if (!boss || boss.hp <= 0) return;
    if (source.dispel && boss.shield > 0) {
      boss.shield = 0;
      this.burst(boss.sprite.x, boss.sprite.y, PALETTE.bone);
    }
    const damage = calculateBossDamage(amount, {
      shielded: boss.shield > 0,
      dispel: source.dispel,
      phase: boss.phase,
      resonanceOpen: boss.resonanceOpen > 0,
      combo: source.combo
    });
    boss.hp -= damage;
    if (saveStore.data.settings.flashes) {
      boss.sprite.setTintFill(0xffffff);
      this.time.delayedCall(65, () => boss.sprite.active && this.refreshBossTint(true));
    }
    if (boss.hp <= 0) this.defeatBoss();
  }

  defeatBoss() {
    const boss = this.bossModel;
    if (!boss || this.mode === "ended") return;
    this.mode = "ended";
    boss.hp = 0;
    boss.sprite.play(`${boss.config.texture}-down`, true);
    this.burst(boss.sprite.x, boss.sprite.y, PALETTE.bone, 18);
    this.shake(0.018, 650);
    this.hitStop(96);
    this.afterimage(boss.sprite, PALETTE.bone);
    this.cameras.main.flash(300, 242, 230, 201);
    const before = {
      unlockedWizards: [...saveStore.data.unlockedWizards],
      unlockedSpellVariants: [...saveStore.data.unlockedSpellVariants],
      unlockedBossAffixes: [...saveStore.data.unlockedBossAffixes],
      unlockedDifficulties: [...saveStore.data.unlockedDifficulties],
      unlockedCosmetics: [...saveStore.data.unlockedCosmetics]
    };
    applyWinUnlocks(saveStore, this.session);
    const gainedWizards = saveStore.data.unlockedWizards
      .filter((id) => !before.unlockedWizards.includes(id))
      .map((id) => WIZARDS[id].name);
    const gainedRules = describeUnlocks(before, saveStore.data);
    const unlockText = [...gainedWizards, ...gainedRules].length
      ? `新秘法：${[...gainedWizards, ...gainedRules].join(" · ")}`
      : "";
    this.time.delayedCall(900, () => {
      audio.stopMusic();
      this.scene.start("ResultScene", {
        win: true,
        title: "你们回来了",
        body: boss.config.defeat,
        session: this.session,
        unlockText
      });
    });
  }

  fail(title, body) {
    if (this.mode === "ended") return;
    this.mode = "ended";
    saveStore.commit({ lastSeed: this.session.seed });
    this.time.delayedCall(260, () => {
      audio.stopMusic();
      this.scene.start("ResultScene", { win: false, title, body, session: this.session, unlockText: "" });
    });
  }

  updateTether(dt) {
    this.bondGraphics.clear();
    const [support, damage] = this.playerModels;
    const color = this.session.recipe.id === "wildfire" ? PALETTE.ember : this.session.recipe.id === "stormgarden" ? PALETTE.thunder : PALETTE.star;
    this.bondGraphics.lineStyle(1, color, 0.52);
    this.bondGraphics.lineBetween(support.sprite.x, support.sprite.y, damage.sprite.x, damage.sprite.y);
    if (!this.session.hasBlessing("bond-thread")) return;
    this.tetherTick = (this.tetherTick || 0) - dt;
    if (this.tetherTick > 0) return;
    this.tetherTick = 0.45;
    for (const enemy of this.enemies.getChildren()) {
      if (enemy.active && pointLineDistance(enemy, support.sprite, damage.sprite) <= 4) this.hitEnemy(enemy, 5.5, { area: true, owner: "bond" });
    }
  }

  startTutorial() {
    this.mode = "tutorial";
    this.roomState = "双生试炼";
    this.objective = "走到各自的发光法阵";
    this.tutorialPads = [
      this.add.circle(88, 98, 15, PALETTE.star, 0.12).setStrokeStyle(1, PALETTE.star).setDepth(3),
      this.add.circle(232, 98, 15, PALETTE.ember, 0.12).setStrokeStyle(1, PALETTE.ember).setDepth(3)
    ];
    UI.showTutorial(1, "走到法阵", "玩家 A 使用 WASD，玩家 B 使用方向键。两人分别站上左右法阵。");
  }

  updateTutorial() {
    if (this.tutorial.step === 1) {
      const ready = distance(this.playerModels[0].sprite, this.tutorialPads[0]) <= 15 && distance(this.playerModels[1].sprite, this.tutorialPads[1]) <= 15;
      if (ready) {
        this.tutorial.step = 2;
        this.objective = "两人分别释放普通攻击";
        UI.showTutorial(2, "写下第一句魔法", `玩家 A 按 F 使用${this.team.support.abilities.shot.name}，玩家 B 按 J 使用${this.team.damage.abilities.shot.name}。`);
      }
      return;
    }
    if (this.tutorial.step === 2 && this.tutorial.supportShot && this.tutorial.damageShot) {
      this.tutorial.step = 3;
      this.objective = `触发${this.session.recipe.name}`;
      this.playerModels[0].sprite.setPosition(125, 116);
      this.playerModels[0].facing = { x: 1, y: -1 };
      this.playerModels[1].sprite.setPosition(195, 116);
      this.playerModels[1].facing = { x: -1, y: -1 };
      this.tutorialDummy = this.createEnemy("guard", 160, 82, { training: true });
      const model = this.tutorialDummy.getData("model");
      model.hp = model.maxHp = 999;
      model.shield = false;
      UI.showTutorial(3, this.session.recipe.name, `${this.team.support.name}先命中训练守卫，${this.team.damage.name}再命中同一个目标。`);
      return;
    }
    if (this.tutorial.step === 3 && this.tutorial.bond) {
      this.tutorial.step = 4;
      this.tutorialDummy?.destroy();
      this.playerModels[0].sprite.setPosition(145, 118);
      this.playerModels[1].sprite.setPosition(160, 118);
      this.damagePlayer(this.playerModels[1], 999);
      this.playerModels[1].downedTimer = 99;
      this.objective = "唤醒同伴";
      UI.showTutorial(4, "魔力耗尽不是结束", "玩家 A 靠近同伴并按住 E 两秒。游戏中玩家 B 也能按住 P 唤醒玩家 A。");
      return;
    }
    if (this.tutorial.step === 4 && this.tutorial.revived) this.finishTutorial(false);
  }

  finishTutorial(skipped) {
    if (!this.tutorialMode || this.mode === "ended") return;
    this.mode = "ended";
    UI.hideTutorial();
    saveStore.commit({ tutorialCompleted: true });
    if (!skipped) UI.say("双生魔典", "试炼完成。现在裂隙会真正反击。", 2.4);
    this.time.delayedCall(skipped ? 50 : 650, () => {
      this.scene.start("RunScene", {
        supportId: this.supportId,
        damageId: this.damageId,
        variantId: this.session.variantId,
        bossAffixId: this.session.bossAffixId,
        difficultyId: this.session.difficultyId,
        cosmeticId: this.session.cosmeticId
      });
    });
  }

  nearestEnemy(origin, exclude = null) {
    return this.enemies.getChildren()
      .filter((enemy) => enemy.active && enemy !== exclude && !enemy.getData("model")?.dead)
      .sort((a, b) => distance(a, origin) - distance(b, origin))[0] || null;
  }

  rotateDirection(direction, radians) {
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    return {
      x: direction.x * cosine - direction.y * sine,
      y: direction.x * sine + direction.y * cosine
    };
  }

  nearestEnemies(origin, count, maxDistance) {
    return this.enemies.getChildren()
      .filter((enemy) => enemy.active && enemy !== origin && !enemy.getData("model")?.dead && distance(enemy, origin) <= maxDistance)
      .sort((a, b) => distance(a, origin) - distance(b, origin))
      .slice(0, count);
  }

  burst(x, y, color = PALETTE.bone, count = 7) {
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + this.session.rng.next() * 0.4;
      const dot = this.add.rectangle(x, y, 2, 2, color).setDepth(20);
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * (8 + this.session.rng.next() * 14),
        y: y + Math.sin(angle) * (8 + this.session.rng.next() * 14),
        alpha: 0,
        duration: 260 + this.session.rng.integer(0, 180),
        onComplete: () => dot.destroy()
      });
    }
  }

  flashLine(start, end, color, width = 4, duration = 130) {
    const line = this.add.graphics().setDepth(18);
    line.lineStyle(width, color, 0.92);
    line.lineBetween(start.x, start.y, end.x, end.y);
    this.tweens.add({ targets: line, alpha: 0, duration, onComplete: () => line.destroy() });
  }

  afterimage(sprite, tint = PALETTE.bone) {
    if (!sprite?.active) return;
    const ghost = this.add.image(sprite.x, sprite.y, sprite.texture.key, sprite.frame.name)
      .setName("afterimage")
      .setDepth(sprite.depth - 1)
      .setFlipX(sprite.flipX)
      .setTint(tint)
      .setAlpha(0.46);
    this.tweens.add({
      targets: ghost,
      alpha: 0,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 240,
      ease: "Linear",
      onComplete: () => ghost.destroy()
    });
  }

  hitStop(duration = 52) {
    this.physics.world.pause();
    this.anims.pauseAll();
    window.clearTimeout(this.hitStopTimer);
    this.hitStopTimer = window.setTimeout(() => {
      if (!this.sys.isActive()) return;
      this.physics.world.resume();
      this.anims.resumeAll();
    }, duration);
  }

  shake(intensity, duration) {
    if (saveStore.data.settings.screenshake) this.cameras.main.shake(duration, intensity);
  }

  updateHud() {
    UI.updateRun({
      room: this.roomState || (this.tutorialMode ? "双生试炼" : "裂隙入口"),
      objective: this.objective,
      players: this.playerModels,
      cooldowns: this.playerModels.map((player) => player.cooldowns)
    });
    UI.setBoss(this.bossModel?.config || null, this.bossModel || {});
  }

  isInteractHeld(slot) {
    return this.keys[slot]?.interact?.isDown;
  }
}
