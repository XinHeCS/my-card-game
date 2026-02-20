import { Container, Text, TextStyle, Graphics, Sprite, Assets } from 'pixi.js';
import { Engine, GameScene } from '../engine/Engine';
import { World } from '../engine/World';
import { LevelSelectScene } from './LevelSelectScene';
import { EditorScene } from './EditorScene';
import { getAudioSystem } from '../audio/AudioSystem';

export class TitleScene implements GameScene {
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
        this.background.tint = 0x888888; // Darken bg for title
        this.container.addChild(this.background);
    } catch (e) {
        console.error("Failed to load title bg", e);
    }

    this.createUI();

    // Play BGM
    const audio = getAudioSystem();
    audio.init().then(() => audio.playBGM());
  }

  createUI() {
    const width = this.engine.app.renderer.width;
    const height = this.engine.app.renderer.height;

    // Title
    const titleStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 64,
      fill: '#00ff00', // Simplified for type safety
      stroke: { color: '#000000', width: 6 },
      dropShadow: {
        color: '#000000',
        blur: 10,
        angle: Math.PI / 6,
        distance: 10,
      },
      fontWeight: 'bold'
    });

    const titleText = new Text({ text: '赛博武林', style: titleStyle });
    titleText.anchor.set(0.5);
    titleText.x = width / 2;
    titleText.y = height * 0.3;
    this.container.addChild(titleText);

    // Buttons
    this.createButton(width / 2, height * 0.6, '开始战斗', () => {
        this.engine.setScene(new LevelSelectScene(this.engine));
    });

    this.createButton(width / 2, height * 0.75, '编辑牌组', () => {
        this.engine.setScene(new EditorScene(this.engine));
    });
  }

  createButton(x: number, y: number, label: string, onClick: () => void) {
    const btn = new Container();
    const w = 250;
    const h = 70;

    const bg = new Graphics();
    bg.roundRect(-w/2, -h/2, w, h, 15);
    bg.fill({ color: 0x000000, alpha: 0.8 });
    bg.stroke({ width: 3, color: 0x00ff00 });
    btn.addChild(bg);

    const text = new Text({ text: label, style: { fontFamily: 'Arial', fontSize: 32, fill: 'white' } });
    text.anchor.set(0.5);
    btn.addChild(text);

    btn.x = x;
    btn.y = y;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    // Hover effect
    btn.on('pointerenter', () => {
        bg.fill({ color: 0x003300, alpha: 0.9 });
        text.style.fill = '#ffff00';
    });
    btn.on('pointerleave', () => {
        bg.fill({ color: 0x000000, alpha: 0.8 });
        text.style.fill = 'white';
    });
    btn.on('pointerdown', () => {
        getAudioSystem().play('click');
        onClick();
    });

    this.container.addChild(btn);
  }

  update(deltaTime: number) {}
  onResize(width: number, height: number) {
      if (this.background) {
          this.background.width = width;
          this.background.height = height;
      }
      this.container.removeChildren();
      if (this.background) this.container.addChild(this.background);
      this.createUI();
  }
  destroy() {
    this.container.destroy({ children: true });
  }
}
