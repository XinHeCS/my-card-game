import { Container, Text, TextStyle, Graphics, Sprite, Assets } from 'pixi.js';
import { Engine, GameScene } from '../engine/Engine';
import { World } from '../engine/World';
import { GameData } from './GameData';
import { MainScene } from './MainScene';
import { TitleScene } from './TitleScene';
import { getAudioSystem } from '../audio/AudioSystem';

export class LevelSelectScene implements GameScene {
  public world: World;
  private engine: Engine;
  private container: Container;
  private background!: Sprite;

  constructor(engine: Engine) {
    this.engine = engine;
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
        this.background.tint = 0x444444;
        this.container.addChild(this.background);
    } catch (e) { console.error(e); }

    this.createUI();
  }

  createUI() {
    const width = this.engine.app.renderer.width;

    const titleText = new Text({
        text: '选择对手',
        style: { fontFamily: 'Arial', fontSize: 48, fill: 'white', stroke: { width: 4 } }
    });
    titleText.anchor.set(0.5);
    titleText.x = width / 2;
    titleText.y = 80;
    this.container.addChild(titleText);

    const levels = GameData.getInstance().enemies;
    const cardWidth = 250;
    const spacing = 300;
    const totalW = levels.length * spacing;
    const startX = (width - totalW) / 2 + cardWidth / 2;

    levels.forEach((level, index) => {
        const card = new Container();
        const bg = new Graphics();

        let color = 0xCCCCCC;
        if (level.difficulty === '简单') color = 0x90EE90;
        if (level.difficulty === '普通') color = 0xFFA500;
        if (level.difficulty === '困难') color = 0xFF4500;

        bg.roundRect(-cardWidth/2, -150, cardWidth, 300, 10);
        bg.fill(color);
        bg.stroke({ width: 3, color: 'black' });
        card.addChild(bg);

        const nameText = new Text({ text: level.name, style: { fontSize: 28, fontWeight: 'bold' } });
        nameText.anchor.set(0.5);
        nameText.y = -100;
        card.addChild(nameText);

        const diffText = new Text({ text: `难度: ${level.difficulty}`, style: { fontSize: 20 } });
        diffText.anchor.set(0.5);
        diffText.y = -60;
        card.addChild(diffText);

        const statText = new Text({
            text: `HP: ${level.stats.hp}\n攻击: ${level.stats.attack}\n防御: ${level.stats.defense}`,
            style: { fontSize: 18, align: 'center' }
        });
        statText.anchor.set(0.5);
        statText.y = 20;
        card.addChild(statText);

        const btnText = new Text({ text: '[ 挑战 ]', style: { fontSize: 24, fill: 'blue' } });
        btnText.anchor.set(0.5);
        btnText.y = 100;
        card.addChild(btnText);

        card.x = startX + index * spacing;
        card.y = this.engine.app.renderer.height / 2;

        card.eventMode = 'static';
        card.cursor = 'pointer';
        card.on('pointerenter', () => { card.scale.set(1.05); });
        card.on('pointerleave', () => { card.scale.set(1); });
        card.on('pointerdown', () => {
            getAudioSystem().play('click');
            // Pass enemy config to MainScene (we need to update MainScene to accept it)
            this.engine.setScene(new MainScene(this.engine, level));
        });

        this.container.addChild(card);
    });

    // Back Button
    const backBtn = new Text({ text: '< 返回主菜单', style: { fill: 'white', fontSize: 24 } });
    backBtn.x = 20;
    backBtn.y = 20;
    backBtn.eventMode = 'static';
    backBtn.cursor = 'pointer';
    backBtn.on('pointerdown', () => {
        getAudioSystem().play('click');
        this.engine.setScene(new TitleScene(this.engine));
    });
    this.container.addChild(backBtn);
  }

  update(dt: number) {}
  onResize(w: number, h: number) {
      this.container.removeChildren();
      if (this.background) {
          this.background.width = w;
          this.background.height = h;
          this.container.addChild(this.background);
      }
      this.createUI();
  }
  destroy() { this.container.destroy({ children: true }); }
}
