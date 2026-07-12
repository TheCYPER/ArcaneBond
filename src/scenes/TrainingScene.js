import { ARENA, PALETTE, SLOT_CONTROLS } from "../constants.js";
import { WIZARDS } from "../content/wizards.js";
import { audio } from "../systems/audio.js";
import { cardinalDirection } from "../systems/direction.js";
import { createRunSeed, SeededRng } from "../systems/rng.js";
import { saveStore } from "../systems/save-store.js";
import {
  createTrainingStats,
  pickTrainingSpawn,
  pickTrainingVelocity,
  recordTrainingAttempt,
  trainingMode,
  trainingProjectileFromOverlap
} from "../systems/training-rules.js";
import { UI } from "../systems/ui.js";

function normalize(x, y) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class TrainingScene extends Phaser.Scene {
  constructor() {
    super("TrainingScene");
  }

  init(data = {}) {
    this.trainingMode = trainingMode(data.mode);
    this.seed = data.seed || createRunSeed();
    this.rng = new SeededRng(this.seed);
  }

  create() {
    this.team = { support: WIZARDS.star, damage: WIZARDS.ember };
    this.stats = createTrainingStats();
    this.returning = false;
    this.targetActive = false;
    this.nextTargetTurn = 0;

    this.physics.world.setBounds(ARENA.left, ARENA.top, ARENA.right - ARENA.left, ARENA.bottom - ARENA.top);
    this.createArena();
    this.players = this.physics.add.group({ allowGravity: false });
    this.projectiles = this.physics.add.group({ allowGravity: false });
    this.targetBar = this.add.graphics().setDepth(14);
    this.playerModels = [
      this.createPlayer("support", this.team.support, 112, 143),
      this.createPlayer("damage", this.team.damage, 208, 143)
    ];
    this.keys = {
      support: this.input.keyboard.addKeys(SLOT_CONTROLS.support),
      damage: this.input.keyboard.addKeys(SLOT_CONTROLS.damage),
      exit: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    };

    this.createTarget();
    this.physics.add.overlap(this.projectiles, this.target, (first, second) => {
      this.projectileHitsTarget(trainingProjectileFromOverlap(first, second));
    });

    UI.showTrainingHud(this.team, this.trainingMode);
    UI.updateTraining(this.stats);
    this.exitHandler = () => this.leaveTraining();
    UI.refs.trainingExit.onclick = this.exitHandler;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (UI.refs.trainingExit.onclick === this.exitHandler) UI.refs.trainingExit.onclick = null;
      UI.hideTrainingFeedback();
    });
    audio.music(this, "battle");
  }

  createArena() {
    this.cameras.main.setBackgroundColor(PALETTE.ink);
    for (let y = ARENA.top; y < ARENA.bottom; y += 16) {
      for (let x = ARENA.left; x < ARENA.right; x += 16) {
        const frame = (Math.floor(x / 16) + Math.floor(y / 16) + this.rng.integer(0, 2)) % 4;
        this.add.image(x + 8, y + 8, "library-tiles", frame).setDepth(-20).setAlpha(0.96);
      }
    }

    const room = this.add.graphics().setDepth(-5);
    room.fillStyle(0x09070e, 1);
    room.fillRect(0, 0, 320, 28);
    room.lineStyle(2, 0x65516e, 1);
    room.strokeRect(ARENA.left, ARENA.top, ARENA.right - ARENA.left, ARENA.bottom - ARENA.top);
    room.lineStyle(1, 0x493b58, 0.56);
    room.lineBetween(60, 31, 60, 169);
    room.lineBetween(160, 31, 160, 169);
    room.lineBetween(260, 31, 260, 169);
    for (const x of [60, 160, 260]) {
      room.lineStyle(1, 0xffd34e, 0.42);
      room.strokeCircle(x, 82, 13);
      room.strokeCircle(x, 82, 5);
    }
    room.fillStyle(0x25163a, 1);
    room.fillRect(18, 7, 54, 13);
    room.fillRect(248, 7, 54, 13);
    room.fillStyle(PALETTE.star, 0.7);
    room.fillRect(24, 11, 42, 2);
    room.fillStyle(PALETTE.ember, 0.7);
    room.fillRect(254, 11, 42, 2);
  }

  createPlayer(slot, wizard, x, y) {
    const sprite = this.physics.add.sprite(x, y, wizard.texture, 0).setDepth(10).setCollideWorldBounds(true);
    sprite.body.setCircle(6, 2, 3);
    this.players.add(sprite);
    const model = {
      slot,
      wizard,
      sprite,
      facing: { x: 0, y: -1 },
      direction: "up",
      castDirection: "up",
      castTimer: 0,
      shotCooldown: 0
    };
    this.playPlayerAnimation(model, "idle");
    return model;
  }

  playPlayerAnimation(model, action, restart = false, direction = model.direction) {
    const key = `${model.wizard.texture}-${action}-${direction}`;
    if (restart || model.sprite.anims.currentAnim?.key !== key) model.sprite.play(key, !restart);
  }

  createTarget() {
    const texture = this.trainingMode.targetTexture;
    this.target = this.physics.add.sprite(160, 76, texture, 0).setDepth(11);
    this.target.body.setCircle(8, 4, 4);
    this.target.setImmovable(true);
    this.target.play(`${texture}-idle`);
    this.targetActive = true;

    if (this.trainingMode.id === "moving") {
      this.target.setCollideWorldBounds(true).setBounce(1, 1);
      this.setRandomTargetVelocity();
    }
  }

  update(_time, deltaMs) {
    if (this.returning) return;
    const dt = Math.min(0.033, deltaMs / 1000);
    if (Phaser.Input.Keyboard.JustDown(this.keys.exit)) {
      this.leaveTraining();
      return;
    }
    this.updatePlayers(dt);
    this.updateProjectiles(dt);
    this.updateTarget(dt);
    this.drawTargetHealth();
  }

  updatePlayers(dt) {
    for (const model of this.playerModels) {
      const map = this.keys[model.slot];
      model.shotCooldown = Math.max(0, model.shotCooldown - dt);
      model.castTimer = Math.max(0, model.castTimer - dt);
      model.sprite.setVelocity(0, 0);

      let x = 0;
      let y = 0;
      if (map.left.isDown) x -= 1;
      if (map.right.isDown) x += 1;
      if (map.up.isDown) y -= 1;
      if (map.down.isDown) y += 1;
      const moving = Boolean(x || y);
      if (moving) {
        const direction = normalize(x, y);
        model.sprite.setVelocity(direction.x * model.wizard.speed, direction.y * model.wizard.speed);
        model.facing = direction;
        model.direction = cardinalDirection(direction, model.direction);
      }

      if (model.castTimer > 0) this.playPlayerAnimation(model, "cast", false, model.castDirection);
      else if (moving) this.playPlayerAnimation(model, "walk");
      else this.playPlayerAnimation(model, "idle");

      model.sprite.x = clamp(model.sprite.x, ARENA.left + 7, ARENA.right - 7);
      model.sprite.y = clamp(model.sprite.y, ARENA.top + 9, ARENA.bottom - 7);
      if (Phaser.Input.Keyboard.JustDown(map.shot)) this.fire(model);
    }
  }

  fire(model) {
    if (model.shotCooldown > 0) return;
    const ability = model.wizard.abilities.shot;
    model.shotCooldown = ability.cooldown;
    model.castDirection = model.direction;
    model.castTimer = 0.2;
    this.playPlayerAnimation(model, "cast", true, model.castDirection);
    audio.sfx(this, `${model.wizard.id}-cast`, 0.24);

    const direction = model.facing;
    const projectile = this.physics.add.sprite(
      model.sprite.x + direction.x * 10,
      model.sprite.y + direction.y * 10,
      ability.effect,
      0
    ).setDepth(9);
    projectile.play(`${ability.effect}-pulse`);
    projectile.body.setCircle(3, 3, 3);
    projectile.setData("shot", { life: 1.55, resolved: false, owner: model.slot });
    this.projectiles.add(projectile);
    projectile.setVelocity(direction.x * 160, direction.y * 160);
  }

  updateProjectiles(dt) {
    for (const projectile of [...this.projectiles.getChildren()]) {
      if (!projectile.active) continue;
      const shot = projectile.getData("shot");
      shot.life -= dt;
      const outside = projectile.x < ARENA.left - 8 || projectile.x > ARENA.right + 8 || projectile.y < ARENA.top - 8 || projectile.y > ARENA.bottom + 8;
      if (shot.life <= 0 || outside) this.resolveProjectile(projectile, false);
    }
  }

  projectileHitsTarget(projectile) {
    if (!this.targetActive || !projectile?.active) return;
    this.resolveProjectile(projectile, true);
    this.handleTargetHit();
  }

  resolveProjectile(projectile, hit) {
    const shot = projectile.getData("shot");
    if (!shot || shot.resolved) return;
    shot.resolved = true;
    projectile.destroy();
    this.registerAttempt(hit);
  }

  registerAttempt(hit) {
    const result = recordTrainingAttempt(this.stats, hit);
    this.stats = result.stats;
    UI.updateTraining(this.stats);
    if (!hit) return;

    audio.sfx(this, "hit", 0.28);
    if (!result.milestone) return;
    audio.sfx(this, "training-cheer", 0.52);
    UI.showTrainingCheer(this.stats.streak);
    if (saveStore.data.settings.screenshake) this.cameras.main.shake(100, 0.004);
    if (saveStore.data.settings.flashes) this.cameras.main.flash(70, 255, 222, 96, false);
  }

  handleTargetHit() {
    this.createHitBurst(this.target.x, this.target.y);
    if (this.trainingMode.id === "spawn") {
      this.targetActive = false;
      this.target.disableBody(true, true);
      this.targetBar.clear();
      this.time.delayedCall(135, () => {
        if (this.sys.isActive()) this.respawnTarget();
      });
      return;
    }

    this.target.setTintFill(0xffffff);
    this.setRandomTargetVelocity();
    this.time.delayedCall(75, () => {
      if (this.target?.active) this.target.clearTint();
    });
  }

  respawnTarget() {
    const point = pickTrainingSpawn(this.rng, ARENA, this.playerModels.map((model) => model.sprite), {
      padding: 17,
      minDistance: 42
    });
    this.target.enableBody(true, point.x, point.y, true, true);
    this.target.play(`${this.trainingMode.targetTexture}-idle`, true);
    this.targetActive = true;
  }

  createHitBurst(x, y) {
    const burst = this.add.sprite(x, y, "burst", 0).setDepth(16).setScale(0.75);
    burst.play("burst-pulse");
    this.time.delayedCall(180, () => burst.destroy());
  }

  updateTarget(dt) {
    if (this.trainingMode.id !== "moving" || !this.targetActive) return;
    this.nextTargetTurn -= dt;
    if (this.nextTargetTurn <= 0) this.setRandomTargetVelocity();
    this.target.x = clamp(this.target.x, ARENA.left + 12, ARENA.right - 12);
    this.target.y = clamp(this.target.y, ARENA.top + 12, ARENA.bottom - 12);
  }

  setRandomTargetVelocity() {
    const velocity = pickTrainingVelocity(this.rng);
    this.target.setVelocity(velocity.x, velocity.y);
    this.nextTargetTurn = 0.72 + this.rng.next() * 0.86;
  }

  drawTargetHealth() {
    this.targetBar.clear();
    if (this.trainingMode.id !== "spawn" || !this.targetActive) return;
    const x = Math.round(this.target.x) - 9;
    const y = Math.round(this.target.y) - 16;
    this.targetBar.fillStyle(0x09070e, 0.92);
    this.targetBar.fillRect(x, y, 18, 3);
    this.targetBar.fillStyle(0xf2e6c9, 1);
    this.targetBar.fillRect(x + 1, y + 1, 16, 1);
  }

  leaveTraining() {
    if (this.returning) return;
    this.returning = true;
    audio.sfx(this, "ui-select");
    this.scene.start("MenuScene");
  }

  qaHitTarget() {
    if (!this.targetActive) return false;
    this.registerAttempt(true);
    this.handleTargetHit();
    return true;
  }

  qaMiss() {
    this.registerAttempt(false);
  }

  qaSnapshot() {
    return {
      mode: this.trainingMode.id,
      ...this.stats,
      target: {
        active: this.targetActive,
        x: Math.round(this.target.x),
        y: Math.round(this.target.y),
        velocityX: Math.round(this.target.body?.velocity.x || 0),
        velocityY: Math.round(this.target.body?.velocity.y || 0)
      }
    };
  }
}
