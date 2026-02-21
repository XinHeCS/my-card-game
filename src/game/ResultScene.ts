import { Container, Text, Graphics, Sprite, Assets } from 'pixi.js';
import { Engine, GameScene } from '../engine/Engine';
import { World } from '../engine/World';
import { TitleScene } from './TitleScene';
import { getAudioSystem } from '../audio/AudioSystem';
import { MoveCard, TechniqueCard } from '../types/game';

export interface GameResult {
  isWin: boolean;
  maxDamage: number;
  maxDamageCombo: MoveCard[];
  equippedTechniques: TechniqueCard[];
}

export class ResultScene implements GameScene {
  public world: World;
  private engine: Engine;
  private container: Container;
  private background!: Sprite;
  private result: GameResult;

  constructor(engine: Engine, result: GameResult) {
    this.engine = engine;
    this.result = result;
    this.world = new World();
    this.container = new Container();
    this.engine.app.stage.addChild(this.container);
  }

  async init() {
    try {
        const bgTexture = await Assets.load('images/background.png');
        this.background = Sprite.from(bgTexture);
        this.background.width = this.engine.app.renderer.width;
        this.background.height = this.engine.app.renderer.height;
        this.background.tint = this.result.isWin ? 0x224422 : 0x442222; // Greenish for win, Reddish for lose
        this.container.addChild(this.background);
    } catch (e) {}

    this.createUI();
  }

  createUI() {
    const w = this.engine.app.renderer.width;
    const h = this.engine.app.renderer.height;

    // Title
    const titleText = new Text({
        text: this.result.isWin ? '战 斗 胜 利 ！' : '战 斗 失 败 ...',
        style: { fill: this.result.isWin ? '#00ff00' : '#ff0000', fontSize: 64, fontWeight: 'bold' }
    });
    titleText.anchor.set(0.5);
    titleText.x = w / 2;
    titleText.y = 100;
    this.container.addChild(titleText);

    // Max Damage Info
    const statsContainer = new Container();

    const dmgTitle = new Text({ text: `单次最高伤害: ${this.result.maxDamage}`, style: { fill: '#ffff00', fontSize: 28 } });
    dmgTitle.x = 0;
    dmgTitle.y = 0;
    statsContainer.addChild(dmgTitle);

    const comboLabel = new Text({ text: '最高伤害组合:', style: { fill: 'white', fontSize: 24 } });
    comboLabel.x = 0;
    comboLabel.y = 50;
    statsContainer.addChild(comboLabel);

    // Render Combo Cards
    if (this.result.maxDamageCombo.length > 0) {
        this.result.maxDamageCombo.forEach((card, index) => {
            const cardText = new Text({
                text: `${card.icon} ${card.name}`,
                style: { fill: '#aaaaaa', fontSize: 20 }
            });
            cardText.x = 200 + index * 120; // Horizontal layout
            cardText.y = 50;
            statsContainer.addChild(cardText);
        });
    } else {
        const noneText = new Text({ text: '无', style: { fill: 'gray', fontSize: 20 } });
        noneText.x = 200;
        noneText.y = 50;
        statsContainer.addChild(noneText);
    }

    // Render Techniques
    const techLabel = new Text({ text: '装备功法:', style: { fill: 'white', fontSize: 24 } });
    techLabel.x = 0;
    techLabel.y = 120;
    statsContainer.addChild(techLabel);

    if (this.result.equippedTechniques.length > 0) {
        this.result.equippedTechniques.forEach((tech, index) => {
            const techText = new Text({
                text: `${tech.icon} ${tech.name}`,
                style: { fill: '#ffcc00', fontSize: 20 }
            });
            techText.x = 150 + index * 120;
            techText.y = 120;
            statsContainer.addChild(techText);
        });
    } else {
        const noneTechText = new Text({ text: '无', style: { fill: 'gray', fontSize: 20 } });
        noneTechText.x = 150;
        noneTechText.y = 120;
        statsContainer.addChild(noneTechText);
    }

    // Center stats
    statsContainer.x = w / 2 - statsContainer.width / 2;
    statsContainer.y = 200;
    this.container.addChild(statsContainer);

    // Return Button
    this.createButton(w / 2, h - 100, '返回主菜单', () => {
        getAudioSystem().play('click');
        this.engine.setScene(new TitleScene(this.engine));
    });
  }

  createButton(x: number, y: number, label: string, onClick: () => void) {
    const btn = new Container();
    const width = 250;
    const height = 70;

    const bg = new Graphics();
    bg.roundRect(-width/2, -height/2, width, height, 15);
    bg.fill({ color: 0x000000, alpha: 0.8 });
    bg.stroke({ width: 3, color: 0xffffff });
    btn.addChild(bg);

    const text = new Text({ text: label, style: { fontFamily: 'Arial', fontSize: 32, fill: 'white' } });
    text.anchor.set(0.5);
    btn.addChild(text);

    btn.x = x;
    btn.y = y;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    btn.on('pointerenter', () => {
        bg.fill({ color: 0x333333, alpha: 0.9 });
    });
    btn.on('pointerleave', () => {
        bg.fill({ color: 0x000000, alpha: 0.8 });
    });
    btn.on('pointerdown', onClick);

    this.container.addChild(btn);
  }

  update(dt: number) {}

  onResize(w: number, h: number) {
      if (this.background) {
          this.background.width = w;
          this.background.height = h;
      }
      this.container.removeChildren();
      if (this.background) this.container.addChild(this.background);
      this.createUI();
  }

  destroy() {
      this.container.destroy({ children: true });
  }
}
