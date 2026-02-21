import { Container, Sprite, Text, TextStyle, Graphics, Texture, Assets } from 'pixi.js';
import { Engine, GameScene } from '../engine/Engine';
import { World } from '../engine/World';
import { CombatSystem } from './CombatSystem';
import { GameData, EnemyConfig } from './GameData';
import { getAudioSystem, AudioSystem } from '../audio/AudioSystem';
import { LevelSelectScene } from './LevelSelectScene';

export class MainScene implements GameScene {
  public world: World;
  private engine: Engine;
  private audio: AudioSystem;

  private combatSystem: CombatSystem;
  private enemyConfig?: EnemyConfig;

  // Containers
  private container: Container;
  private gameLayer: Container;
  private uiLayer: Container;
  private handContainer: Container;
  private techniqueContainer: Container;

  // Sprites
  private background!: Sprite;
  private playerSprite!: Sprite;
  private enemySprite!: Sprite;

  // Text
  private logText!: Text;
  private playerStatsText!: Text;
  private enemyStatsText!: Text;
  private turnText!: Text;

  // Interactive
  private selectedCardIndices: Set<number> = new Set();
  private playButton!: Container;

  constructor(engine: Engine, enemyConfig?: EnemyConfig) {
    this.engine = engine;
    this.enemyConfig = enemyConfig;
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

    // Apply Enemy Config if provided
    if (this.enemyConfig) {
        this.combatSystem.enemyStats = { ...this.enemyConfig.stats };
    }
  }

  async init() {
    // Load assets
    try {
        const bgTexture = await Assets.load('images/background.png');
        this.background = Sprite.from(bgTexture);

        const playerTexture = await Assets.load('images/player.png');
        this.playerSprite = Sprite.from(playerTexture);

        const enemyTexture = await Assets.load('images/enemy.png');
        this.enemySprite = Sprite.from(enemyTexture);

        this.setupScene();
        this.startGame();
    } catch (e) {
        console.error("Failed to load assets", e);
        // Fallback
        this.background = Sprite.from('white');
        this.playerSprite = Sprite.from('green');
        this.enemySprite = Sprite.from('red');
        this.background.tint = 0x000000;

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

    this.enemySprite.anchor.set(0.5, 1);
    this.enemySprite.x = width * 0.75;
    this.enemySprite.y = height * 0.75;
    this.enemySprite.scale.set(4);
    this.gameLayer.addChild(this.enemySprite);

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

    this.enemyStatsText = new Text({ text: '敌人 HP: 100', style });
    this.enemyStatsText.x = width - 300;
    this.enemyStatsText.y = 20;
    this.uiLayer.addChild(this.enemyStatsText);

    // Turn Info
    this.turnText = new Text({ text: '回合: 1', style });
    this.turnText.anchor.set(0.5, 0);
    this.turnText.x = width / 2;
    this.turnText.y = 20;
    this.uiLayer.addChild(this.turnText);

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

      // Power/Def Info
      let stats = `威:${card.power}`;
      if (card.def) stats += `\n防:${card.def}`;

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
      cardContainer.on('pointerdown', () => this.onCardClick(index));

      this.handContainer.addChild(cardContainer);
    });
  }

  onCardClick(index: number) {
    this.audio.ensureResumed();
    this.audio.play('click');
    if (this.selectedCardIndices.has(index)) {
      this.selectedCardIndices.delete(index);
    } else {
      if (this.selectedCardIndices.size < 5) {
        this.selectedCardIndices.add(index);
      }
    }
    this.renderHand();
    this.updatePlayButton();
  }

  updatePlayButton() {
    const text = (this.playButton.children[1] as Text);
    const count = this.selectedCardIndices.size;
    text.text = count === 0 ? '结束回合' : `出招 (${count}/5)`;
    // Always allow play (either 0 cards to skip, or 1-5 to attack)
    this.playButton.alpha = 1;
  }

  onPlayCards() {
    this.audio.ensureResumed();
    // Allow 0-5 cards
    if (this.selectedCardIndices.size > 5) return;

    this.audio.play('move');

    const indices = Array.from(this.selectedCardIndices);
    this.combatSystem.playTurn(indices);
    this.selectedCardIndices.clear();

    this.updateUI();

    // Auto next turn logic for flow
    if (this.combatSystem.currentPhase === 'End') {
        setTimeout(() => {
            this.combatSystem.startTurn();
            this.renderHand();
            this.updateUI();
        }, 1500);
    } else {
        this.renderHand();
    }
  }

  updateUI() {
    const p = this.combatSystem.playerStats;
    const e = this.combatSystem.enemyStats;
    this.playerStatsText.text = `玩家 HP: ${p.hp}/${p.maxHp}\n攻击: ${p.attack} 防御: ${p.defense} 劲道: ${p.jingdao}`;
    this.enemyStatsText.text = `敌人 HP: ${e.hp}/${e.maxHp}\n攻击: ${e.attack} 防御: ${e.defense}`;
    this.turnText.text = `回合: ${this.combatSystem.turnCount}`;

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
      if (this.uiLayer) {
        // Reposition UI
        this.enemyStatsText.x = width - 300;
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
        if (this.enemySprite) {
             this.enemySprite.x = width * 0.75;
             this.enemySprite.y = height * 0.75;
        }
      }
  }

  destroy(): void {
    this.engine.app.stage.removeChild(this.container);
    this.container.destroy({ children: true });
  }
}
