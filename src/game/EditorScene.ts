import { Container, Text, Graphics, Sprite, Assets } from 'pixi.js';
import { Engine, GameScene } from '../engine/Engine';
import { World } from '../engine/World';
import { GameData } from './GameData';
import { TitleScene } from './TitleScene';
import { getAudioSystem } from '../audio/AudioSystem';
import { MoveCard, TechniqueCard } from '../types/game';
import { GameConfig } from './GameConfig';

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

  // Filters & Sorting - Deck (Left)
  private deckFilterWeapon: string = 'All';
  private deckFilterWeight: string = 'All';
  private deckSortBy: string = 'default';

  // Filters & Sorting - Pool (Right)
  private poolFilterWeapon: string = 'All';
  private poolFilterWeight: string = 'All';
  private poolSortBy: string = 'default';

  private filterContainer: Container;
  private activeDropdown: Container | null = null;
  private stagePointerDownHandler: () => void;

  private scrollListener: (e: WheelEvent) => void;

  private leftContentHeight: number = 0;
  private rightContentHeight: number = 0;

  // Info Panel
  private infoContainer: Container;
  private infoTitle: Text;
  private infoDesc: Text;

  private leftLabel!: Text;
  private rightLabel!: Text;

  constructor(engine: Engine) {
    this.engine = engine;
    this.world = new World();
    this.container = new Container();
    this.leftListContainer = new Container();
    this.rightListContainer = new Container();
    this.infoContainer = new Container();
    this.filterContainer = new Container();

    this.engine.app.stage.addChild(this.container);

    // Deep copy current state
    const data = GameData.getInstance();
    this.tempDeck = [...data.currentDeck];
    this.tempTechs = [...data.currentTechniques];

    this.scrollListener = this.handleScroll.bind(this);
    window.addEventListener('wheel', this.scrollListener);

    // Init Info Panel elements
    this.infoTitle = new Text({ text: '', style: { fill: '#ffff00', fontSize: 18, fontWeight: 'bold' } });
    this.infoDesc = new Text({ text: '', style: { fill: 'white', fontSize: 14, wordWrap: true, wordWrapWidth: 230, breakWords: true } });

    this.stagePointerDownHandler = () => {
        if (this.activeDropdown) {
            this.activeDropdown.visible = false;
            this.activeDropdown = null;
        }
    };
    this.engine.app.stage.eventMode = 'static';
    this.engine.app.stage.on('pointerdown', this.stagePointerDownHandler);
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

        this.leftListContainer.y = 150 + this.leftScrollY;
    } else {
        this.rightScrollY -= delta;

        const maxRight = Math.min(0, this.listHeight - this.rightContentHeight);
        if (this.rightScrollY > 0) this.rightScrollY = 0;
        if (this.rightScrollY < maxRight) this.rightScrollY = maxRight;

        this.rightListContainer.y = 150 + this.rightScrollY;
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
    this.listHeight = h - 160;

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

    // Cancel Button
    const cancelBtn = new Container();
    const cancelBg = new Graphics();
    cancelBg.roundRect(0, 0, 100, 50, 10);
    cancelBg.fill(0xFF4444); // Reddish for cancel
    cancelBtn.addChild(cancelBg);
    const cancelText = new Text({ text: '返回', style: { fontSize: 20, fill: 'white' } });
    cancelText.anchor.set(0.5);
    cancelText.x = 50;
    cancelText.y = 25;
    cancelBtn.addChild(cancelText);
    cancelBtn.x = w - 290; // Position left of save button
    cancelBtn.y = 20;
    cancelBtn.eventMode = 'static';
    cancelBtn.cursor = 'pointer';
    cancelBtn.on('pointerdown', () => this.exitWithoutSave());
    this.container.addChild(cancelBtn);

    // Clear Button
    const clearBtn = new Container();
    const clearBg = new Graphics();
    clearBg.roundRect(0, 0, 100, 50, 10);
    clearBg.fill(0xFFA500); // Orange for clear
    clearBtn.addChild(clearBg);
    const clearText = new Text({ text: '清空', style: { fontSize: 20, fill: 'black' } });
    clearText.anchor.set(0.5);
    clearText.x = 50;
    clearText.y = 25;
    clearBtn.addChild(clearText);
    clearBtn.x = w - 410; // Position left of cancel button
    clearBtn.y = 20;
    clearBtn.eventMode = 'static';
    clearBtn.cursor = 'pointer';
    clearBtn.on('pointerdown', () => this.clearCurrentList());
    this.container.addChild(clearBtn);

    // Info Panel
    this.setupInfoPanel(w);

    // Labels
    this.leftLabel = new Text({
        text: '',
        style: { fill: 'white', fontSize: 20 }
    });
    this.leftLabel.x = 50;
    this.leftLabel.y = 80;
    this.container.addChild(this.leftLabel);

    this.rightLabel = new Text({
        text: '备选池',
        style: { fill: 'white', fontSize: 20 }
    });
    this.rightLabel.x = w / 2 + 50;
    this.rightLabel.y = 80;
    this.container.addChild(this.rightLabel);

    this.createFilterUI(w);

    // Setup Lists Containers and Masks
    this.setupListContainers(w, h);

    // Lists
    this.renderLists();

    // Re-add to ensure Z-order: Masks -> Lists -> Filters -> Info
    this.container.addChild(this.filterContainer);
    this.container.addChild(this.infoContainer);
  }

  setupInfoPanel(w: number) {
      this.infoContainer.removeChildren();
      // Background will be drawn in showInfo
      const bg = new Graphics();
      this.infoContainer.addChild(bg);

      this.infoTitle.position.set(10, 10);
      this.infoDesc.position.set(10, 35);

      this.infoContainer.addChild(this.infoTitle);
      this.infoContainer.addChild(this.infoDesc);

      this.infoContainer.visible = false;
      this.container.addChild(this.infoContainer);
  }

  createDropdown(x: number, y: number, labelPrefix: string, options: {value: string, label: string}[], currentValue: string, onChange: (val: string) => void): Container {
      const container = new Container();
      container.x = x;
      container.y = y;

      const width = 110;
      const height = 30;

      const btnBg = new Graphics();
      btnBg.roundRect(0, 0, width, height, 5);
      btnBg.fill(0x444444);
      container.addChild(btnBg);

      const selectedOpt = options.find(o => o.value === currentValue);
      const labelStr = selectedOpt ? selectedOpt.label : currentValue;
      const btnText = new Text({ text: `${labelPrefix}${labelStr} ▼`, style: { fill: 'white', fontSize: 14 } });
      btnText.anchor.set(0.5);
      btnText.position.set(width / 2, height / 2);
      container.addChild(btnText);

      const menu = new Container();
      menu.y = height + 2;
      menu.visible = false;
      container.addChild(menu);

      const menuBg = new Graphics();
      menuBg.roundRect(0, 0, width, options.length * height, 5);
      menuBg.fill(0x222222);
      menuBg.stroke({ width: 1, color: 0x888888 });
      menu.addChild(menuBg);

      options.forEach((opt, idx) => {
          const itemCont = new Container();
          itemCont.y = idx * height;
          
          const itemBg = new Graphics();
          itemBg.rect(0, 0, width, height);
          itemBg.fill(opt.value === currentValue ? 0x555555 : 0x222222);
          itemCont.addChild(itemBg);

          const itemText = new Text({ text: opt.label, style: { fill: 'white', fontSize: 14 } });
          itemText.anchor.set(0.5);
          itemText.position.set(width / 2, height / 2);
          itemCont.addChild(itemText);

          itemCont.eventMode = 'static';
          itemCont.cursor = 'pointer';
          itemCont.on('pointerenter', () => { if (opt.value !== currentValue) itemBg.fill(0x444444); });
          itemCont.on('pointerleave', () => { if (opt.value !== currentValue) itemBg.fill(0x222222); });
          itemCont.on('pointerdown', (e) => {
              e.stopPropagation();
              menu.visible = false;
              this.activeDropdown = null;
              onChange(opt.value);
          });
          
          menu.addChild(itemCont);
      });

      container.eventMode = 'static';
      container.cursor = 'pointer';
      container.on('pointerdown', (e) => {
          e.stopPropagation();
          if (this.activeDropdown && this.activeDropdown !== menu) {
              this.activeDropdown.visible = false;
          }
          menu.visible = !menu.visible;
          this.activeDropdown = menu.visible ? menu : null;
      });

      return container;
  }

  createFilterUI(w: number) {
      this.filterContainer.removeChildren();
      // Ensure filter container is at correct depth but we handle that in createUI

      if (this.currentTab !== 'Moves') {
          this.filterContainer.visible = false;
          return;
      }
      this.filterContainer.visible = true;

      const weaponOpts = [
          {value: 'All', label: '全部'}, {value: 'Fist', label: '拳'}, 
          {value: 'Blade', label: '刀'}, {value: 'Spear', label: '枪'}, 
          {value: 'Sword', label: '剑'}, {value: 'Staff', label: '棒'}
      ];
      const weightOpts = [
          {value: 'All', label: '全部'}, {value: 'Light', label: '轻击'}, 
          {value: 'Heavy', label: '重击'}, {value: 'Charge', label: '蓄力'}, {value: 'Block', label: '格挡'}
      ];
      const sortOpts = [
          {value: 'default', label: '默认'},
          {value: 'power', label: '力量↓'}, {value: 'power_asc', label: '力量↑'},
          {value: 'def', label: '防御↓'}, {value: 'def_asc', label: '防御↑'},
          {value: 'jingdao', label: '劲道↓'}, {value: 'jingdao_asc', label: '劲道↑'}
      ];

      // Deck Filters (Left)
      const deckStartX = 50;
      const deckStartY = 110;
      
      this.filterContainer.addChild(this.createDropdown(deckStartX, deckStartY, "武:", weaponOpts, this.deckFilterWeapon, (val) => {
          this.deckFilterWeapon = val; this.leftScrollY = 0; this.renderLists();
      }));
      this.filterContainer.addChild(this.createDropdown(deckStartX + 120, deckStartY, "类:", weightOpts, this.deckFilterWeight, (val) => {
          this.deckFilterWeight = val; this.leftScrollY = 0; this.renderLists();
      }));
      this.filterContainer.addChild(this.createDropdown(deckStartX + 240, deckStartY, "排:", sortOpts, this.deckSortBy, (val) => {
          this.deckSortBy = val; this.leftScrollY = 0; this.renderLists();
      }));

      // Pool Filters (Right)
      const poolStartX = w / 2 + 50;
      const poolStartY = 110;

      this.filterContainer.addChild(this.createDropdown(poolStartX, poolStartY, "武:", weaponOpts, this.poolFilterWeapon, (val) => {
          this.poolFilterWeapon = val; this.rightScrollY = 0; this.renderLists();
      }));
      this.filterContainer.addChild(this.createDropdown(poolStartX + 120, poolStartY, "类:", weightOpts, this.poolFilterWeight, (val) => {
          this.poolFilterWeight = val; this.rightScrollY = 0; this.renderLists();
      }));
      this.filterContainer.addChild(this.createDropdown(poolStartX + 240, poolStartY, "排:", sortOpts, this.poolSortBy, (val) => {
          this.poolSortBy = val; this.rightScrollY = 0; this.renderLists();
      }));
  }

  setupListContainers(w: number, h: number) {
    // Left Mask
    const leftMask = new Graphics();
    leftMask.rect(0, 150, w / 2 - 10, h - 150);
    leftMask.fill(0xffffff);
    this.container.addChild(leftMask);

    this.leftListContainer.mask = leftMask;
    this.leftListContainer.x = 0;
    this.leftListContainer.y = 150 + this.leftScrollY;
    this.container.addChild(this.leftListContainer);

    // Right Mask
    const rightMask = new Graphics();
    rightMask.rect(w / 2 + 50, 150, w / 2 - 60, h - 150);
    rightMask.fill(0xffffff);
    this.container.addChild(rightMask);

    this.rightListContainer.mask = rightMask;
    this.rightListContainer.x = 0;
    this.rightListContainer.y = 150 + this.rightScrollY;
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

    // Re-render UI to update filters text (optional, but safe)
    if (this.currentTab === 'Moves' && !this.activeDropdown) {
        this.createFilterUI(w);
        this.container.addChild(this.filterContainer);
        this.container.addChild(this.infoContainer);
    }

    // Update Headers
    this.leftLabel.text = this.currentTab === 'Moves' ? `当前招式 (${this.tempDeck.length}/${GameConfig.DECK_SIZE})` : `当前功法 (${this.tempTechs.length}/${GameConfig.MAX_TECHNIQUES})`;

    let displayDeck = this.currentTab === 'Moves' ? [...this.tempDeck] : [...this.tempTechs];
    let displayPool = this.currentTab === 'Moves' ? [...GameData.getInstance().allMoves] : [...GameData.getInstance().allTechniques];

    if (this.currentTab === 'Moves') {
        const sortFunc = (sortBy: string) => {
            return (a: any, b: any) => {
                if (sortBy === 'default') return 0;
                const field = sortBy.replace('_asc', '');
                const isAsc = sortBy.endsWith('_asc');
                const valA = a[field] || 0;
                const valB = b[field] || 0;
                return isAsc ? valA - valB : valB - valA;
            };
        };

        // Left List Filtering & Sorting
        displayDeck = (displayDeck as MoveCard[]).filter(m => {
            if (this.deckFilterWeapon !== 'All' && m.weapon !== this.deckFilterWeapon) return false;
            if (this.deckFilterWeight !== 'All' && m.weight !== this.deckFilterWeight) return false;
            return true;
        }).sort(sortFunc(this.deckSortBy));

        // Right List Filtering & Sorting
        displayPool = (displayPool as MoveCard[]).filter(m => {
            if (this.poolFilterWeapon !== 'All' && m.weapon !== this.poolFilterWeapon) return false;
            if (this.poolFilterWeight !== 'All' && m.weight !== this.poolFilterWeight) return false;
            return true;
        }).sort(sortFunc(this.poolSortBy));
    }

    // Left List (Current)
    let y = 0;
    displayDeck.forEach((item) => {
        const row = this.createItemRow(item, true);
        row.x = 50;
        row.y = y;
        row.on('pointerdown', () => this.removeItem(item));
        this.leftListContainer.addChild(row);
        y += 40;
    });

    this.leftContentHeight = y;
    const maxLeftScroll = Math.min(0, this.listHeight - this.leftContentHeight);
    if (this.leftScrollY < maxLeftScroll) this.leftScrollY = maxLeftScroll;
    this.leftListContainer.y = 150 + this.leftScrollY; // Shifted down a bit due to filters

    // Right List (Pool)
    y = 0;
    displayPool.forEach((item) => {
        const row = this.createItemRow(item, false);
        row.x = w / 2 + 50;
        row.y = y;
        row.on('pointerdown', () => this.addItem(item));
        this.rightListContainer.addChild(row);
        y += 40;
    });

    this.rightContentHeight = y;
    const maxRightScroll = Math.min(0, this.listHeight - this.rightContentHeight);
    if (this.rightScrollY < maxRightScroll) this.rightScrollY = maxRightScroll;
    this.rightListContainer.y = 150 + this.rightScrollY;
  }
  
  removeItem(item: any) {
    if (this.currentTab === 'Moves') {
        const idx = this.tempDeck.findIndex(m => m.id === item.id);
        if (idx !== -1) this.tempDeck.splice(idx, 1);
    } else {
        const idx = this.tempTechs.findIndex(m => m.id === item.id);
        if (idx !== -1) this.tempTechs.splice(idx, 1);
    }
    this.renderLists();
  }

  createItemRow(item: any, isRemove: boolean) {
    const row = new Container();
    const bg = new Graphics();

    const drawBg = (color: any, alpha: number) => {
        bg.clear();
        bg.rect(0, 0, 400, 35);
        bg.fill({ color, alpha });
        bg.stroke({ width: 1, color: 'gray' });
    };

    drawBg(0x333333, 0.8);
    row.addChild(bg);

    // Icon + Name
    const displayText = `${item.icon} ${item.name}`;
    const name = new Text({ text: displayText, style: { fill: 'white', fontSize: 16 } });
    name.x = 10;
    name.y = 8;
    row.addChild(name);

    // Count
    if (!isRemove && this.currentTab === 'Moves') {
        const count = this.tempDeck.filter(c => c.id === item.id).length;
        const limitText = new Text({ text: `${count}/${GameConfig.MAX_IDENTICAL_CARDS}`, style: { fill: count >= GameConfig.MAX_IDENTICAL_CARDS ? 'red' : 'gray', fontSize: 14 } });
        limitText.x = 250;
        limitText.y = 10;
        row.addChild(limitText);
    }

    const action = new Text({
        text: isRemove ? '[-] 移除' : '[+] 添加',
        style: { fill: isRemove ? '#ff6666' : '#66ff66', fontSize: 16 }
    });
    action.x = 320;
    action.y = 8;
    row.addChild(action);

    row.eventMode = 'static';
    row.cursor = 'pointer';

    // Hover for info
    row.on('pointerenter', (e) => {
        drawBg(0x555555, 0.9);
        this.showInfo(item, e.global.x, e.global.y);
    });
    row.on('pointermove', (e) => {
        if (this.infoContainer.visible) {
            this.updateInfoPosition(e.global.x, e.global.y);
        }
    });
    row.on('pointerleave', () => {
        drawBg(0x333333, 0.8);
        this.hideInfo();
    });

    return row;
  }

  showInfo(item: any, x: number, y: number) {
      this.infoTitle.text = `${item.icon} ${item.name}`;
      let desc = item.description;
      if (item.power !== undefined && item.power !== 0) {
          desc += `\n威力: +${item.power}`;
      }
      if (item.def) {
          desc += `  格挡: +${item.def}`;
      }
      if (item.jingdao) {
          desc += `  劲道: +${item.jingdao}`;
      }
      this.infoDesc.text = desc;

      // Ensure layout is updated before measuring
      this.infoDesc.y = this.infoTitle.y + this.infoTitle.height + 5;

      // Dynamic Background
      const bg = this.infoContainer.children[0] as Graphics;
      bg.clear();
      const totalHeight = this.infoDesc.y + this.infoDesc.height + 10;
      const width = 250;

      bg.roundRect(0, 0, width, totalHeight, 10);
      bg.fill({ color: 0x000000, alpha: 0.9 });
      bg.stroke({ width: 1, color: 0xffff00 });

      this.updateInfoPosition(x, y);
      this.infoContainer.visible = true;
      // Bring to front
      this.container.setChildIndex(this.infoContainer, this.container.children.length - 1);
  }

  updateInfoPosition(x: number, y: number) {
      // Offset from cursor
      let posX = x + 15;
      let posY = y + 15;

      // Boundary check (keep inside screen)
      const bounds = this.infoContainer.getBounds();
      const screenW = this.engine.app.renderer.width;
      const screenH = this.engine.app.renderer.height;

      if (posX + bounds.width > screenW) {
          posX = x - bounds.width - 15;
      }
      if (posY + bounds.height > screenH) {
          posY = y - bounds.height - 15;
      }

      this.infoContainer.x = posX;
      this.infoContainer.y = posY;
  }

  hideInfo() {
      this.infoContainer.visible = false;
  }

  addItem(item: any) {
    if (this.currentTab === 'Moves') {
        const count = this.tempDeck.filter(c => c.id === item.id).length;
        if (count >= GameConfig.MAX_IDENTICAL_CARDS) {
            return;
        }

        if (this.tempDeck.length < GameConfig.DECK_SIZE) {
            this.tempDeck.push(item);
            this.renderLists();
        }
    } else {
        if (this.tempTechs.length < GameConfig.MAX_TECHNIQUES && !this.tempTechs.find(t => t.id === item.id)) {
            this.tempTechs.push(item);
            this.renderLists();
        }
    }
  }

  clearCurrentList() {
      if (this.currentTab === 'Moves') {
          this.tempDeck = [];
      } else {
          this.tempTechs = [];
      }
      getAudioSystem().play('click');
      this.renderLists();
  }

  saveAndExit() {
    if (this.tempDeck.length !== GameConfig.DECK_SIZE) {
        this.showToast(`招式牌必须正好${GameConfig.DECK_SIZE}张！`);
        return;
    }
    // No check for techniques count

    GameData.getInstance().saveDeck(this.tempDeck, this.tempTechs);
    getAudioSystem().play('click');
    this.engine.setScene(new TitleScene(this.engine));
  }

  showToast(message: string) {
      const w = this.engine.app.renderer.width;
      const h = this.engine.app.renderer.height;

      const toast = new Container();
      const bg = new Graphics();
      const text = new Text({ text: message, style: { fill: 'white', fontSize: 24, fontWeight: 'bold' } });

      const padding = 20;
      bg.roundRect(0, 0, text.width + padding * 2, text.height + padding * 2, 10);
      bg.fill({ color: 0x000000, alpha: 0.8 });
      bg.stroke({ width: 2, color: 0xff0000 });

      text.position.set(padding, padding);
      toast.addChild(bg);
      toast.addChild(text);

      toast.position.set((w - toast.width) / 2, h / 2 - 50);
      this.container.addChild(toast);

      // Simple animation
      let elapsed = 0;
      const duration = 2.0;

      const tickerFn = (ticker: any) => {
          elapsed += ticker.deltaMS / 1000;
          toast.y -= 0.5; // Float up slightly

          if (elapsed > 1.5) {
              toast.alpha = 1 - (elapsed - 1.5) * 2;
          }

          if (elapsed >= duration) {
              this.engine.app.ticker.remove(tickerFn);
              toast.destroy();
          }
      };
      this.engine.app.ticker.add(tickerFn);
  }

  exitWithoutSave() {
    getAudioSystem().play('click');
    this.engine.setScene(new TitleScene(this.engine));
  }

  update(dt: number) {}
  onResize(w: number, h: number) { this.createUI(); }
  destroy() {
      window.removeEventListener('wheel', this.scrollListener);
      this.engine.app.stage.off('pointerdown', this.stagePointerDownHandler);
      this.container.destroy({ children: true });
  }
}
