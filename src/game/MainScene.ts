import { Container, Sprite, Text, TextStyle, Graphics, Texture, Assets } from 'pixi.js';
import { Engine, GameScene } from '../engine/Engine';
import { World } from '../engine/World';
import { CombatSystem } from './CombatSystem';
import { GameData, LevelConfig } from './GameData';
import { getAudioSystem, AudioSystem } from '../audio/AudioSystem';
import { LevelSelectScene } from './LevelSelectScene';
import { ResultScene, GameResult } from './ResultScene';
import { MoveCard, TechniqueCard } from '../types/game';
import { EnemyState } from './EnemyAI';

export class MainScene implements GameScene {
  public world: World;
  private engine: Engine;
  private audio: AudioSystem;

  private combatSystem: CombatSystem;
  private levelConfig?: LevelConfig;

  // Containers
  private container: Container;
  private gameLayer: Container;
  private uiLayer: Container;
  private handContainer: Container;
  private techniqueContainer: Container;

  // Sprites
  private background!: Sprite;
  private playerSprite!: Sprite;
  private enemySprites: Sprite[] = [];

  // Text
  private logText!: Text;
  private playerStatsText!: Text;
  private enemyStatsTexts: Text[] = [];
  private turnText!: Text;
  private powerJingdaoText!: Text;

  // Interactive
  private selectedCardIndices: Set<number> = new Set();
  private playButton!: Container;

  private draggingCard: { index: number, startX: number, startY: number, pointerId: number } | null = null;

  constructor(engine: Engine, levelConfig?: LevelConfig) {
    this.engine = engine;
    this.levelConfig = levelConfig;
    this.world = new World();
    this.audio = getAudioSystem();

    this.container = new Container();
    this.gameLayer = new Container();
    this.uiLayer = new Container();
    this.handContainer = new Container();
    this.techniqueContainer = new Container();

    this.container.addChild(this.gameLayer);
    this.container.addChild(this.uiLayer);
    this.uiLayer.addChild(this.handContainer);
    this.uiLayer.addChild(this.techniqueContainer);

    this.engine.app.stage.addChild(this.container);

    const gameData = GameData.getInstance();
    this.combatSystem = new CombatSystem(gameData.currentDeck, gameData.currentTechniques);

    if (this.levelConfig) {
        this.combatSystem.loadLevel(this.levelConfig);
    }
  }

  async init() {
    // Load assets
    try {
        const bgTexture = await Assets.load('images/background.png');
        this.background = Sprite.from(bgTexture);

        const playerTexture = await Assets.load('images/player.png');
        this.playerSprite = Sprite.from(playerTexture);

        this.enemySprites = [];
        for (let enemy of this.combatSystem.enemies) {
            let enemyTex;
            try {
                enemyTex = await Assets.load(enemy.spritePath);
            } catch (e) {
                console.warn(`Failed to load ${enemy.spritePath}, using fallback`);
                enemyTex = Texture.WHITE;
            }
            const sprite = Sprite.from(enemyTex);
            if (enemyTex === Texture.WHITE) {
                sprite.tint = 0xFF0000;
                sprite.width = 100;
                sprite.height = 100;
            }
            this.enemySprites.push(sprite);
            this.gameLayer.addChild(sprite); // Make sure it's always added to the layer
        }

        this.setupScene();
        this.startGame();
    } catch (e) {
        console.error("Failed to load assets", e);
        // Fallback
        this.background = new Sprite(Texture.WHITE);
        this.background.tint = 0x000000;

        this.playerSprite = new Sprite(Texture.WHITE);
        this.playerSprite.tint = 0x00FF00;

        this.enemySprites = [];
        for (let enemy of this.combatSystem.enemies) {
            const sprite = new Sprite(Texture.WHITE);
            sprite.tint = 0xFF0000;
            sprite.width = 100;
            sprite.height = 100;
            this.enemySprites.push(sprite);
            this.gameLayer.addChild(sprite);
        }

        this.setupScene();
        this.startGame();
    }
  }

  setupScene() {
    const { width, height } = this.engine.app.renderer;

    // Background
    this.background.width = width;
    this.background.height = height;
    this.gameLayer.addChild(this.background);

    // Characters
    this.playerSprite.anchor.set(0.5, 1);
    this.playerSprite.x = width * 0.25;
    this.playerSprite.y = height * 0.75;
    this.playerSprite.scale.set(4);
    this.gameLayer.addChild(this.playerSprite);

    const enemyCount = this.enemySprites.length;
    const startX = width * 0.6;
    const endX = width * 0.9;
    const spacingX = enemyCount > 1 ? (endX - startX) / (enemyCount - 1) : 0;

    this.enemySprites.forEach((sprite, index) => {
        sprite.anchor.set(0.5, 1);
        sprite.x = enemyCount === 1 ? width * 0.75 : startX + index * spacingX;
        sprite.y = height * 0.75;
        // Make enemies slightly smaller if there are many
        sprite.scale.set(enemyCount > 1 ? 3 : 4);

        // Ensure enemy sprites are visible and added correctly
        if (sprite.texture === Texture.WHITE || sprite.texture === Texture.EMPTY || !sprite.texture) {
            sprite.texture = Texture.WHITE;
            sprite.tint = 0xFF0000;
            sprite.width = 100 * (enemyCount > 1 ? 3 : 4);
            sprite.height = 100 * (enemyCount > 1 ? 3 : 4);
        }
        sprite.visible = true; // explicitly force visibility

        this.gameLayer.addChild(sprite);
    });

    this.setupUI(width, height);
  }

  setupUI(width: number, height: number) {
    const style = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 24,
      fill: 'white',
      stroke: { color: '#000000', width: 4 },
      dropShadow: {
        color: '#000000',
        blur: 4,
        angle: Math.PI / 6,
        distance: 6,
      },
    });

    // Stats
    this.playerStatsText = new Text({ text: '玩家 HP: 100', style });
    this.playerStatsText.x = 20;
    this.playerStatsText.y = 20;
    this.uiLayer.addChild(this.playerStatsText);

    const enemyStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 18,
      fill: 'white',
      stroke: { color: '#000000', width: 3 },
      align: 'center'
    });

    this.enemyStatsTexts = [];
    const enemyCount = this.combatSystem.enemies.length;
    const startX = width * 0.6;
    const endX = width * 0.9;
    const spacingX = enemyCount > 1 ? (endX - startX) / (enemyCount - 1) : 0;

    this.combatSystem.enemies.forEach((enemy, index) => {
        const text = new Text({ text: `${enemy.name}\nHP: 100`, style: enemyStyle });
        text.anchor.set(0.5, 1);
        text.x = enemyCount === 1 ? width * 0.75 : startX + index * spacingX;
        text.y = height * 0.75 - 120; // Default position relative to expected sprite position

        const sprite = this.enemySprites[index];
        if (sprite) {
            text.x = sprite.x;
            text.y = sprite.y - (sprite.height || 100 * (enemyCount > 1 ? 3 : 4)) - 10;
        }
        this.enemyStatsTexts.push(text);
        this.uiLayer.addChild(text);
    });

    // Turn Info
    this.turnText = new Text({ text: '回合: 1', style });
    this.turnText.anchor.set(0.5, 0);
    this.turnText.x = width / 2;
    this.turnText.y = 20;
    this.uiLayer.addChild(this.turnText);

    // Power X Jingdao display
    this.powerJingdaoText = new Text({
        text: '【力量: 0  X  劲道: 0】',
        style: { fill: '#ffaa00', fontSize: 36, fontWeight: 'bold', stroke: {color: '#000000', width: 4} }
    });
    this.powerJingdaoText.anchor.set(0.5);
    this.powerJingdaoText.x = width / 2;
    this.powerJingdaoText.y = height / 2 - 50;
    this.uiLayer.addChild(this.powerJingdaoText);

    // Log
    const logStyle = new TextStyle({
        fontFamily: 'Arial',
        fontSize: 18,
        fill: 'white',
        stroke: { color: '#000000', width: 3 },
        wordWrap: true,
        wordWrapWidth: 400
    });
    this.logText = new Text({ text: '战斗记录...', style: logStyle });
    this.logText.x = 20;
    this.logText.y = 100;
    this.uiLayer.addChild(this.logText);

    // Hand Container
    this.handContainer.y = height - 200;
    this.handContainer.x = width / 2;

    // Technique Container
    this.techniqueContainer.x = 20;
    this.techniqueContainer.y = 150;

    // Buttons
    this.createButtons(width, height);
    this.createExitButton(width);

    // Explicitly update UI texts to show initial stats properly
    this.updateUI();
  }

  renderTechniques() {
    this.techniqueContainer.removeChildren();
    const techniques = this.combatSystem.equippedTechniques;
    const size = 60;
    const spacing = 70;

    techniques.forEach((tech, index) => {
      const container = new Container();

      const bg = new Graphics();
      bg.roundRect(0, 0, size, size, 8);
      bg.fill(0xFFD700); // Gold for techniques
      bg.stroke({ width: 2, color: 0x000000 });
      container.addChild(bg);

      // Icon
      const iconText = new Text({ text: tech.icon, style: { fontFamily: 'Arial', fontSize: 32 } });
      iconText.anchor.set(0.5);
      iconText.x = size / 2;
      iconText.y = size / 2;
      container.addChild(iconText);

      // Tooltip (hidden by default)
      const tooltip = new Container();

      const tipText = new Text({
        text: `${tech.name}\n${tech.description}`,
        style: { fontFamily: 'Arial', fontSize: 14, fill: 'white', wordWrap: true, wordWrapWidth: 280 }
      });
      tipText.x = 10;
      tipText.y = 10;

      const tipBg = new Graphics();
      const bgHeight = Math.max(80, tipText.height + 20);

      tipBg.roundRect(0, 0, 300, bgHeight, 5);
      tipBg.fill({ color: 0x000000, alpha: 0.8 });

      tooltip.addChild(tipBg);
      tooltip.addChild(tipText);

      tooltip.x = size + 10;
      tooltip.y = 0;
      tooltip.visible = false;
      container.addChild(tooltip);

      // Interaction
      container.eventMode = 'static';
      container.cursor = 'help';
      container.on('pointerenter', () => { tooltip.visible = true; });
      container.on('pointerleave', () => { tooltip.visible = false; });

      container.y = index * spacing;
      this.techniqueContainer.addChild(container);
    });
  }

  createExitButton(width: number) {
      const btn = new Container();
      const w = 80;
      const h = 40;

      const bg = new Graphics();
      bg.roundRect(0, 0, w, h, 8);
      bg.fill(0xFF4444);
      bg.stroke({ width: 2, color: 0xFFFFFF });
      btn.addChild(bg);

      const text = new Text({ text: '退出', style: { fontFamily: 'Arial', fontSize: 18, fill: 'white' } });
      text.anchor.set(0.5);
      text.x = w / 2;
      text.y = h / 2;
      btn.addChild(text);

      btn.x = width - w - 20;
      btn.y = 20;

      btn.eventMode = 'static';
      btn.cursor = 'pointer';
      btn.on('pointerdown', () => this.exitLevel());

      this.uiLayer.addChild(btn);
  }

  exitLevel() {
      this.audio.play('click');
      this.engine.setScene(new LevelSelectScene(this.engine));
  }

  sleep(ms: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, ms));
  }

  spawnFloatingText(x: number, y: number, text: string, color: string = '#ffffff') {
      const ft = new Text({ text, style: { fill: color, fontSize: 24, fontWeight: 'bold', stroke: {color: '#000000', width: 4} } });
      ft.anchor.set(0.5);
      ft.x = x;
      ft.y = y;
      this.uiLayer.addChild(ft);

      let elapsed = 0;
      const duration = 1.0;
      const speed = 60;

      const tickerFn = (ticker: any) => {
          const dt = ticker.deltaMS / 1000;
          elapsed += dt;
          ft.y -= speed * dt;
          ft.alpha = 1 - (elapsed / duration);
          if (elapsed >= duration) {
              this.engine.app.ticker.remove(tickerFn);
              ft.destroy();
          }
      };
      this.engine.app.ticker.add(tickerFn);
  }

  animateProjectile(startX: number, startY: number, endX: number, endY: number, color: number = 0xffaa00): Promise<void> {
      return new Promise(resolve => {
          const proj = new Graphics();
          proj.circle(0, 0, 15);
          proj.fill(color);
          proj.x = startX;
          proj.y = startY;
          this.uiLayer.addChild(proj);

          let elapsed = 0;
          const duration = 0.4;
          const tickerFn = (ticker: any) => {
              const dt = ticker.deltaMS / 1000;
              elapsed += dt;
              const t = Math.min(1, elapsed / duration);
              // easeOutQuad
              const easeT = t * (2 - t);
              proj.x = startX + (endX - startX) * easeT;
              proj.y = startY + (endY - startY) * easeT;

              if (elapsed >= duration) {
                  this.engine.app.ticker.remove(tickerFn);
                  proj.destroy();
                  resolve();
              }
          };
          this.engine.app.ticker.add(tickerFn);
      });
  }

  createButtons(width: number, height: number) {
    // Play Button
    this.playButton = new Container();
    const bg = new Graphics();
    bg.roundRect(0, 0, 150, 50, 10);
    bg.fill(0x00FF00);
    this.playButton.addChild(bg);

    const text = new Text({ text: '结束回合', style: { fontFamily: 'Arial', fontSize: 24, fill: 'black' } });
    text.anchor.set(0.5);
    text.x = 75;
    text.y = 25;
    this.playButton.addChild(text);

    this.playButton.x = width - 170;
    this.playButton.y = height - 70;

    this.playButton.eventMode = 'static';
    this.playButton.cursor = 'pointer';
    this.playButton.on('pointerdown', () => this.onPlayCards());

    this.uiLayer.addChild(this.playButton);
  }

  startGame() {
    this.audio.init().then(() => {
        this.audio.playBGM();
    });
    this.combatSystem.startTurn();
    this.renderHand();
    this.renderTechniques();
    this.updateUI();
  }

  renderHand() {
    this.handContainer.removeChildren();
    const hand = this.combatSystem.hand;
    const spacing = 110;
    const totalWidth = hand.length * spacing;

    hand.forEach((card, index) => {
      const cardContainer = new Container();

      // Card BG
      const bg = new Graphics();
      const isSelected = this.selectedCardIndices.has(index);
      bg.roundRect(0, 0, 100, 140, 8);

      // Determine color based on weapon
      let color = 0xEEEEEE;
      if (card.weapon === 'Fist') color = 0xFFA07A;
      if (card.weapon === 'Blade') color = 0x87CEFA;
      if (card.weapon === 'Spear') color = 0x98FB98;
      if (card.weapon === 'Sword') color = 0xDDA0DD;
      if (card.weapon === 'Staff') color = 0xF0E68C;

      bg.fill(isSelected ? 0xFFFF00 : color);
      bg.stroke({ width: 2, color: 0x000000 });

      cardContainer.addChild(bg);

      // Icon & Name
      const iconText = new Text({ text: card.icon, style: { fontSize: 32 } });
      iconText.anchor.set(0.5);
      iconText.x = 50;
      iconText.y = 40;
      cardContainer.addChild(iconText);

      const nameText = new Text({ text: card.name, style: { fontFamily: 'Arial', fontSize: 14, fill: 'black', wordWrap: true, wordWrapWidth: 90, align: 'center' } });
      nameText.anchor.set(0.5, 0);
      nameText.x = 50;
      nameText.y = 70;
      cardContainer.addChild(nameText);

      // Power/Def/Jingdao Info
      let stats = '';
      if (card.power) stats += `威:+${card.power}`;
      if (card.def) stats += (stats ? '\n' : '') + `防:+${card.def}`;
      if (card.jingdao) stats += (stats ? '\n' : '') + `劲:+${card.jingdao}`;

      const infoText = new Text({ text: stats, style: { fontFamily: 'Arial', fontSize: 12, fill: '#333', align: 'center' } });
      infoText.anchor.set(0.5, 0);
      infoText.x = 50;
      infoText.y = 100;
      cardContainer.addChild(infoText);

      // Positioning
      cardContainer.x = index * spacing - totalWidth / 2;
      cardContainer.y = isSelected ? -20 : 0;

      // Interaction
      cardContainer.eventMode = 'static';
      cardContainer.cursor = 'pointer';

      let dragging = false;
      let dragStartX = 0;
      let dragStartY = 0;
      let cardStartX = 0;

      cardContainer.on('pointerdown', (e) => {
          if (this.combatSystem.currentPhase !== 'Action' && this.combatSystem.currentPhase !== 'Discard') return;
          dragging = true;
          dragStartX = e.global.x;
          dragStartY = e.global.y;
          cardStartX = cardContainer.x;
          cardContainer.alpha = 0.8;
          this.handContainer.setChildIndex(cardContainer, this.handContainer.children.length - 1);
      });

      cardContainer.on('pointerup', (e) => {
          if (!dragging) return;
          dragging = false;
          cardContainer.alpha = 1;

          const dx = e.global.x - dragStartX;
          const dy = e.global.y - dragStartY;

          if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
              // It's a click
              this.onCardClick(index);
          } else {
              // It's a drag
              let newIndex = Math.round((cardContainer.x + totalWidth / 2) / spacing);
              newIndex = Math.max(0, Math.min(hand.length - 1, newIndex));

              if (newIndex !== index) {
                  const card = hand.splice(index, 1)[0];
                  hand.splice(newIndex, 0, card);
                  this.selectedCardIndices.clear(); // Clear selection on reorder to avoid confusion
              }
              this.renderHand();
              this.updatePlayButton();
          }
      });

      cardContainer.on('pointerupoutside', () => {
          if (!dragging) return;
          dragging = false;
          cardContainer.alpha = 1;
          this.renderHand(); // Reset position
      });

      cardContainer.on('pointermove', (e) => {
          if (dragging) {
              const dx = e.global.x - dragStartX;
              cardContainer.x = cardStartX + dx;
          }
      });

      this.handContainer.addChild(cardContainer);
    });
  }

  onCardClick(index: number) {
    this.audio.ensureResumed();
    this.audio.play('click');
    if (this.combatSystem.currentPhase === 'Action') {
        if (this.selectedCardIndices.has(index)) {
          this.selectedCardIndices.delete(index);
        } else {
          if (this.selectedCardIndices.size < 5) {
            this.selectedCardIndices.add(index);
          }
        }
    } else if (this.combatSystem.currentPhase === 'Discard') {
        const requiredCount = this.combatSystem.hand.length - 7;
        if (this.selectedCardIndices.has(index)) {
          this.selectedCardIndices.delete(index);
        } else {
          if (this.selectedCardIndices.size < requiredCount) {
            this.selectedCardIndices.add(index);
          }
        }
    }
    this.renderHand();
    this.updatePlayButton();
  }

  updatePlayButton() {
    const text = (this.playButton.children[1] as Text);
    const count = this.selectedCardIndices.size;

    if (this.combatSystem.currentPhase === 'Action') {
        text.text = count === 0 ? '结束回合' : `出招 (${count}/5)`;
        this.playButton.alpha = 1;
        this.playButton.eventMode = 'static';
    } else if (this.combatSystem.currentPhase === 'Discard') {
        const requiredCount = this.combatSystem.hand.length - 7;
        text.text = `丢弃 (${count}/${requiredCount})`;
        if (count === requiredCount) {
            this.playButton.alpha = 1;
            this.playButton.eventMode = 'static';
        } else {
            this.playButton.alpha = 0.5;
            this.playButton.eventMode = 'none';
        }
    } else {
        text.text = '结算中...';
        this.playButton.alpha = 0.5;
        this.playButton.eventMode = 'none';
    }
  }

  updatePowerJingdaoText() {
      const p = this.combatSystem.playerStats;
      this.powerJingdaoText.text = `【力量: ${p.attack}  X  劲道: ${p.jingdao}】`;
  }

  async onPlayCards() {
    this.audio.ensureResumed();

    if (this.combatSystem.currentPhase === 'Action') {
        if (this.selectedCardIndices.size > 5) return;

        this.audio.play('move');

        const indices = Array.from(this.selectedCardIndices);

        // Hide button during animation
        this.playButton.visible = false;

        const hooks = {
            onCardPlay: async (card: MoveCard, index: number) => {
                // Find card container (it will be index in the hand Container)
                // But handContainer might have changed if we cleared selection.
                // For simplicity, just spawn text at center
                const w = this.engine.app.renderer.width;
                const h = this.engine.app.renderer.height;

                let text = `${card.name}: `;
                if (card.power) text += `力量+${card.power} `;
                if (card.jingdao) text += `劲道+${card.jingdao} `;
                if (card.def) text += `防御+${card.def} `;

                this.spawnFloatingText(w / 2, h / 2, text, '#00ff00');
                this.updatePowerJingdaoText();
                this.updateUI(); // update HP/def
                await this.sleep(600);
            },
            onTechTrigger: async (tech: any, result: any, diffs: any) => {
                const techIndex = this.combatSystem.equippedTechniques.findIndex(t => t.id === tech.id);
                if (techIndex >= 0) {
                    const techContainer = this.techniqueContainer.children[techIndex] as Container;
                    techContainer.scale.set(1.5);

                    let text = `${tech.name} 触发!`;
                    if (diffs.atkDiff) text += ` 力量+${diffs.atkDiff}`;
                    if (diffs.jingDiff) text += ` 劲道+${diffs.jingDiff}`;
                    if (diffs.defDiff) text += ` 防御+${diffs.defDiff}`;
                    if (diffs.dmgDiff > 0) text += ` 伤害+${diffs.dmgDiff}`;

                    const pos = techContainer.getGlobalPosition();
                    this.spawnFloatingText(pos.x + 50, pos.y, text, '#ffff00');

                    this.updatePowerJingdaoText();
                    this.updateUI();
                    await this.sleep(800);
                    techContainer.scale.set(1.0);
                }
            },
            onPlayerAttack: async (enemy: EnemyState, damage: number, actualDamage: number) => {
                if (damage > 0) {
                    const w = this.engine.app.renderer.width;
                    const h = this.engine.app.renderer.height;
                    const enemyIndex = this.combatSystem.enemies.indexOf(enemy);
                    const sprite = this.enemySprites[enemyIndex];
                    const targetX = sprite ? sprite.x : w - 250;
                    const targetY = sprite ? sprite.y - sprite.height / 2 : 40;

                    await this.animateProjectile(w / 2, h / 2 - 50, targetX, targetY, 0xffaa00);
                    this.spawnFloatingText(targetX, targetY, `-${actualDamage}`, '#ff0000');
                }
                this.updateUI();
                await this.sleep(600);
            },
            onEnemyAttack: async (enemy: EnemyState, damage: number, actualDamage: number) => {
                if (damage > 0) {
                    const w = this.engine.app.renderer.width;
                    const enemyIndex = this.combatSystem.enemies.indexOf(enemy);
                    const sprite = this.enemySprites[enemyIndex];
                    const startX = sprite ? sprite.x : w - 250;
                    const startY = sprite ? sprite.y - sprite.height / 2 : 40;

                    await this.animateProjectile(startX, startY, this.playerSprite.x, this.playerSprite.y - this.playerSprite.height / 2, 0xff0000);
                    this.spawnFloatingText(this.playerSprite.x, this.playerSprite.y - this.playerSprite.height / 2, `-${actualDamage}`, '#ff0000');
                }
                this.updateUI();
                await this.sleep(600);
            }
        };

        this.selectedCardIndices.clear();
        this.renderHand(); // Render empty selection

        await this.combatSystem.playTurn(indices, undefined, hooks);

        this.playButton.visible = true;
        this.updateUI();
        this.checkPhaseTransition();
    } else if (this.combatSystem.currentPhase === 'Discard') {
        const requiredCount = this.combatSystem.hand.length - 7;
        if (this.selectedCardIndices.size !== requiredCount) return;

        this.audio.play('move');
        const indices = Array.from(this.selectedCardIndices);
        this.combatSystem.discardCards(indices);
        this.selectedCardIndices.clear();

        this.updateUI();
        this.checkPhaseTransition();
    }
  }

  checkPhaseTransition() {
      if (this.combatSystem.currentPhase === 'GameOver') {
          setTimeout(() => {
              const isWin = this.combatSystem.enemies.every(e => e.stats.hp <= 0);
              const resultData: GameResult = {
                  isWin: isWin,
                  maxDamage: this.combatSystem.maxDamage,
                  maxDamageCombo: this.combatSystem.maxDamageCombo,
                  equippedTechniques: this.combatSystem.equippedTechniques
              };
              this.engine.setScene(new ResultScene(this.engine, resultData));
          }, 1500);
          return;
      }

      if (this.combatSystem.currentPhase === 'End') {
          setTimeout(() => {
              this.combatSystem.startTurn();
              this.renderHand();
              this.updateUI();
          }, 1500);
      } else if (this.combatSystem.currentPhase === 'Discard') {
          // Stay on current scene, re-render hand for discard selection
          this.renderHand();
          this.updateUI();
      } else {
          this.renderHand();
      }
  }

  updateUI() {
    const p = this.combatSystem.playerStats;
    this.playerStatsText.text = `玩家 HP: ${p.hp}/${p.maxHp}\n防: ${p.defense}`;

    this.combatSystem.enemies.forEach((e, index) => {
        const text = this.enemyStatsTexts[index];
        if (text) {
            text.text = `${e.name}\nHP: ${e.stats.hp}/${e.stats.maxHp}\n防: ${e.stats.defense} 力量: ${e.stats.attack} 劲: ${e.stats.jingdao}`;
            if (e.stats.hp <= 0) {
                text.alpha = 0.5;
                if (this.enemySprites[index]) this.enemySprites[index].alpha = 0.5;
            }
        }
    });

    this.turnText.text = `回合: ${this.combatSystem.turnCount}`;

    this.updatePowerJingdaoText();

    const recentLogs = this.combatSystem.log.slice(-6);
    this.logText.text = recentLogs.join('\n');

    this.updatePlayButton();
  }

  update(deltaTime: number): void {
    // Animation updates if needed
  }

  onResize(width: number, height: number): void {
      if (this.background) {
          this.background.width = width;
          this.background.height = height;
      }
      if (this.uiLayer && this.turnText && this.playButton) {
        // Reposition UI
        this.turnText.x = width / 2;
        this.handContainer.x = width / 2;
        this.handContainer.y = height - 200;
        this.techniqueContainer.x = 20;
        this.techniqueContainer.y = 150;
        this.playButton.x = width - 170;
        this.playButton.y = height - 70;

        // Reposition Sprites
        if (this.playerSprite) {
             this.playerSprite.x = width * 0.25;
             this.playerSprite.y = height * 0.75;
        }

        const enemyCount = this.enemySprites.length;
        const startX = width * 0.6;
        const endX = width * 0.9;
        const spacingX = enemyCount > 1 ? (endX - startX) / (enemyCount - 1) : 0;

        this.enemySprites.forEach((sprite, index) => {
            if (sprite) {
                sprite.x = enemyCount === 1 ? width * 0.75 : startX + index * spacingX;
                sprite.y = height * 0.75;

                // Keep scaling logic here for resize event
                sprite.scale.set(enemyCount > 1 ? 3 : 4);
                if (sprite.texture === Texture.WHITE || sprite.texture === Texture.EMPTY) {
                    sprite.width = 100 * (enemyCount > 1 ? 3 : 4);
                    sprite.height = 100 * (enemyCount > 1 ? 3 : 4);
                }

                if (this.enemyStatsTexts[index]) {
                    this.enemyStatsTexts[index].x = sprite.x;
                    this.enemyStatsTexts[index].y = sprite.y - (sprite.height || 100 * (enemyCount > 1 ? 3 : 4)) - 10;
                }
            }
        });
      }
  }

  destroy(): void {
    this.engine.app.stage.removeChild(this.container);
    this.container.destroy({ children: true });
  }
}
