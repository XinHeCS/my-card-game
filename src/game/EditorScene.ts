import { Container, Text, Graphics, Sprite, Assets, Rectangle } from 'pixi.js';
import { Engine, GameScene } from '../engine/Engine';
import { World } from '../engine/World';
import { GameData } from './GameData';
import { TitleScene } from './TitleScene';
import { getAudioSystem } from '../audio/AudioSystem';
import { MoveCard, TechniqueCard } from '../types/game';

export class EditorScene implements GameScene {
  public world: World;
  private engine: Engine;
  private container: Container;
  private background!: Sprite;

  private tempDeck: MoveCard[] = [];
  private tempTechs: TechniqueCard[] = [];

  private leftListContainer: Container;
  private rightListContainer: Container;
  private leftScrollY: number = 0;
  private rightScrollY: number = 0;
  private listHeight: number = 0;

  private currentTab: 'Moves' | 'Techniques' = 'Moves';

  private scrollListener: (e: WheelEvent) => void;

  private leftContentHeight: number = 0;
  private rightContentHeight: number = 0;

  constructor(engine: Engine) {
    this.engine = engine;
    this.world = new World();
    this.container = new Container();
    this.leftListContainer = new Container();
    this.rightListContainer = new Container();
    this.engine.app.stage.addChild(this.container);

    // Deep copy current state
    const data = GameData.getInstance();
    this.tempDeck = [...data.currentDeck];
    this.tempTechs = [...data.currentTechniques];

    this.scrollListener = this.handleScroll.bind(this);
    window.addEventListener('wheel', this.scrollListener);
  }

  handleScroll(e: WheelEvent) {
    const w = this.engine.app.renderer.width;
    const mx = e.clientX;

    const scrollSpeed = 0.5;
    const delta = e.deltaY * scrollSpeed;

    if (mx < w / 2) {
        this.leftScrollY -= delta;

        const maxLeft = Math.min(0, this.listHeight - this.leftContentHeight);
        if (this.leftScrollY > 0) this.leftScrollY = 0;
        if (this.leftScrollY < maxLeft) this.leftScrollY = maxLeft;

        this.leftListContainer.y = 140 + this.leftScrollY;
    } else {
        this.rightScrollY -= delta;

        const maxRight = Math.min(0, this.listHeight - this.rightContentHeight);
        if (this.rightScrollY > 0) this.rightScrollY = 0;
        if (this.rightScrollY < maxRight) this.rightScrollY = maxRight;

        this.rightListContainer.y = 140 + this.rightScrollY;
    }
  }

  async init() {
    try {
        const bgTexture = await Assets.load('images/background.png');
        this.background = Sprite.from(bgTexture);
        this.background.width = this.engine.app.renderer.width;
        this.background.height = this.engine.app.renderer.height;
        this.background.tint = 0x222222;
        this.container.addChild(this.background);
    } catch (e) {}

    this.createUI();
  }

  createUI() {
    this.container.removeChildren();
    if (this.background) this.container.addChild(this.background);

    const w = this.engine.app.renderer.width;
    const h = this.engine.app.renderer.height;
    this.listHeight = h - 160; // Top header space

    // Header
    const title = new Text({ text: '牌组编辑', style: { fill: 'white', fontSize: 36 } });
    title.x = 20;
    title.y = 20;
    this.container.addChild(title);

    // Tab Buttons
    this.createTabBtn(300, 20, '招式', 'Moves');
    this.createTabBtn(450, 20, '功法', 'Techniques');

    // Save Button
    const saveBtn = new Container();
    const saveBg = new Graphics();
    saveBg.roundRect(0, 0, 150, 50, 10);
    saveBg.fill(0x00FF00);
    saveBtn.addChild(saveBg);
    const saveText = new Text({ text: '保存并返回', style: { fontSize: 20 } });
    saveText.anchor.set(0.5);
    saveText.x = 75;
    saveText.y = 25;
    saveBtn.addChild(saveText);
    saveBtn.x = w - 170;
    saveBtn.y = 20;
    saveBtn.eventMode = 'static';
    saveBtn.cursor = 'pointer';
    saveBtn.on('pointerdown', () => this.saveAndExit());
    this.container.addChild(saveBtn);

    // Setup Lists Containers and Masks
    this.setupListContainers(w, h);

    // Lists
    this.renderLists();
  }

  setupListContainers(w: number, h: number) {
    // Left Mask
    const leftMask = new Graphics();
    leftMask.rect(0, 140, w / 2 - 10, h - 150);
    leftMask.fill(0xffffff);
    this.container.addChild(leftMask);

    this.leftListContainer.mask = leftMask;
    this.leftListContainer.x = 0;
    this.leftListContainer.y = 140 + this.leftScrollY;
    this.container.addChild(this.leftListContainer);

    // Right Mask
    const rightMask = new Graphics();
    rightMask.rect(w / 2 + 50, 140, w / 2 - 60, h - 150);
    rightMask.fill(0xffffff);
    this.container.addChild(rightMask);

    this.rightListContainer.mask = rightMask;
    this.rightListContainer.x = 0;
    this.rightListContainer.y = 140 + this.rightScrollY;
    this.container.addChild(this.rightListContainer);
  }

  createTabBtn(x: number, y: number, label: string, mode: 'Moves' | 'Techniques') {
    const btn = new Text({
        text: label,
        style: {
            fill: this.currentTab === mode ? 'yellow' : 'gray',
            fontSize: 28,
            fontWeight: 'bold'
        }
    });
    btn.x = x;
    btn.y = y;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerdown', () => {
        this.currentTab = mode;
        this.leftScrollY = 0;
        this.rightScrollY = 0;
        this.createUI(); // Re-render
    });
    this.container.addChild(btn);
  }

  renderLists() {
    const w = this.engine.app.renderer.width;

    this.leftListContainer.removeChildren();
    this.rightListContainer.removeChildren();

    // Headers (Static, outside scroll)
    const leftLabel = new Text({
        text: this.currentTab === 'Moves' ? `当前招式 (${this.tempDeck.length}/30)` : `当前功法 (${this.tempTechs.length}/5)`,
        style: { fill: 'white', fontSize: 20 }
    });
    leftLabel.x = 50;
    leftLabel.y = 100;
    this.container.addChild(leftLabel);

    const rightLabel = new Text({
        text: '备选池',
        style: { fill: 'white', fontSize: 20 }
    });
    rightLabel.x = w / 2 + 50;
    rightLabel.y = 100;
    this.container.addChild(rightLabel);

    // Render Items
    let y = 0;
    const currentList = this.currentTab === 'Moves' ? this.tempDeck : this.tempTechs;
    const poolList = this.currentTab === 'Moves' ? GameData.getInstance().allMoves : GameData.getInstance().allTechniques;

    // Left List (Current)
    currentList.forEach((item, idx) => {
        const row = this.createItemRow(item, true);
        row.x = 50;
        row.y = y;
        row.on('pointerdown', () => this.removeItem(idx));
        this.leftListContainer.addChild(row);
        y += 40;
    });

    // Clamp Scroll
    this.leftContentHeight = y;
    const maxLeftScroll = Math.min(0, this.listHeight - this.leftContentHeight);
    if (this.leftScrollY < maxLeftScroll) this.leftScrollY = maxLeftScroll;
    this.leftListContainer.y = 140 + this.leftScrollY;


    // Right List (Pool)
    y = 0;
    poolList.forEach((item) => {
        const row = this.createItemRow(item, false);
        row.x = w / 2 + 50;
        row.y = y;
        row.on('pointerdown', () => this.addItem(item));
        this.rightListContainer.addChild(row);
        y += 40;
    });

    // Clamp Scroll
    this.rightContentHeight = y;
    const maxRightScroll = Math.min(0, this.listHeight - this.rightContentHeight);
    if (this.rightScrollY < maxRightScroll) this.rightScrollY = maxRightScroll;
    this.rightListContainer.y = 140 + this.rightScrollY;
  }


  createItemRow(item: any, isRemove: boolean) {
    const row = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, 400, 35);
    bg.fill({ color: 0x333333, alpha: 0.8 });
    bg.stroke({ width: 1, color: 'gray' });
    row.addChild(bg);

    const name = new Text({ text: item.name, style: { fill: 'white', fontSize: 16 } });
    name.x = 10;
    name.y = 8;
    row.addChild(name);

    const action = new Text({
        text: isRemove ? '[-] 移除' : '[+] 添加',
        style: { fill: isRemove ? '#ff6666' : '#66ff66', fontSize: 16 }
    });
    action.x = 320;
    action.y = 8;
    row.addChild(action);

    row.eventMode = 'static';
    row.cursor = 'pointer';
    return row;
  }

  addItem(item: any) {
    if (this.currentTab === 'Moves') {
        if (this.tempDeck.length < 30) {
            this.tempDeck.push(item);
            this.createUI();
        }
    } else {
        // Techniques must be unique (usually) but let's allow duplicates if not specified
        // Actually techniques are unique in pool, but player can only select 5.
        // Let's check if already have it?
        if (this.tempTechs.length < 5 && !this.tempTechs.find(t => t.id === item.id)) {
            this.tempTechs.push(item);
            this.createUI();
        }
    }
  }

  removeItem(index: number) {
    if (this.currentTab === 'Moves') {
        this.tempDeck.splice(index, 1);
    } else {
        this.tempTechs.splice(index, 1);
    }
    this.createUI();
  }

  saveAndExit() {
    if (this.tempDeck.length !== 30) {
        alert('招式牌必须正好30张！'); // Simple alert for MVP, ideally in-game notification
        return;
    }
    if (this.tempTechs.length !== 5) {
        alert('功法牌必须正好5张！');
        return;
    }

    GameData.getInstance().saveDeck(this.tempDeck, this.tempTechs);
    getAudioSystem().play('click');
    this.engine.setScene(new TitleScene(this.engine));
  }

  update(dt: number) {}
  onResize(w: number, h: number) { this.createUI(); }
  destroy() {
      window.removeEventListener('wheel', this.scrollListener);
      this.container.destroy({ children: true });
  }
}
