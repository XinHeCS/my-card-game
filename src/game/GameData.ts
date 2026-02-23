import { MoveCard, TechniqueCard, PlayerStats } from '../types/game';
import { BASE_MOVES } from '../data/moves';
import { TECHNIQUES } from '../data/techniques';
import { GameConfig } from './GameConfig';
import { SaveSystem } from '../systems/SaveSystem';

export interface EnemyConfig {
  id: string;
  name: string;
  stats: PlayerStats;
  spritePath: string;
}

export interface LevelConfig {
  id: string;
  name: string;
  difficulty: string;
  description?: string;
  enemies: EnemyConfig[];
}

export class GameData {
  private static instance: GameData;

  // Player's current build (Memory cache)
  public currentDeck: MoveCard[] = [];
  public currentTechniques: TechniqueCard[] = [];

  // Available pools
  public allMoves: MoveCard[] = BASE_MOVES;
  public allTechniques: TechniqueCard[] = TECHNIQUES;

  // Levels
  public levels: LevelConfig[] = [
    {
      id: 'level_1',
      name: '木人桩',
      difficulty: '简单',
      description: '不会攻击的木人桩，适合用来测试牌组伤害。',
      enemies: [
        {
          id: 'training_dummy',
          name: '木人桩甲',
          stats: { hp: 999, maxHp: 999, attack: 5, defense: 0, jingdao: 1 },
          spritePath: 'images/enemy_dummy.png'
        }
      ]
    },
    {
      id: 'level_2',
      name: '双生妖僧',
      difficulty: '普通',
      description: '【双生妖法】：当场上有多个妖僧且一方血量低于30%时，另一方会在回合开始时为其恢复生命值。',
      enemies: [
        {
          id: 'rogue_monk',
          name: '赛博妖僧·阳',
          stats: { hp: 200, maxHp: 200, attack: 4, defense: 5, jingdao: 4 },
          spritePath: 'images/enemy_monk.png'
        },
        {
          id: 'rogue_monk',
          name: '赛博妖僧·阴',
          stats: { hp: 200, maxHp: 200, attack: 4, defense: 5, jingdao: 4 },
          spritePath: 'images/enemy_monk.png'
        }
      ]
    },
    {
      id: 'level_3',
      name: '机甲武圣',
      difficulty: '困难',
      description: '【核心过载】：当血量低于10%时会陷入狂暴，力量和劲道变为7！',
      enemies: [
        {
          id: 'mecha_general',
          name: '机甲武圣',
          stats: { hp: 500, maxHp: 500, attack: 12, defense: 8, jingdao: 2 },
          spritePath: 'images/enemy_general.png'
        }
      ]
    }
  ];

  private constructor() {
    this.load();
  }

  public static getInstance(): GameData {
    if (!GameData.instance) {
      GameData.instance = new GameData();
    }
    return GameData.instance;
  }

  /**
   * Reload currentDeck and currentTechniques from SaveSystem
   */
  public load() {
    let activeDeck = SaveSystem.getActiveDeck();

    // 如果没有激活的牌组（比如第一次玩），创建一个默认牌组
    if (!activeDeck) {
      activeDeck = SaveSystem.createDeck('默认牌组');

      const defaultMoves: string[] = [];
      const defaultTechs: string[] = [];

      // 填充默认数据
      for (let i = 0; i < GameConfig.DECK_SIZE; i++) {
          const randomMove = this.allMoves[Math.floor(Math.random() * this.allMoves.length)];
          defaultMoves.push(randomMove.id);
      }
      for (let i = 0; i < Math.min(this.allTechniques.length, GameConfig.MAX_TECHNIQUES); i++) {
          defaultTechs.push(this.allTechniques[i].id);
      }

      SaveSystem.updateDeck(activeDeck.id, { moves: defaultMoves, techniques: defaultTechs });
      activeDeck = SaveSystem.getActiveDeck()!;
    }

    // 根据ID映射到内存中的卡牌对象
    this.currentDeck = activeDeck.moves
        .map(id => this.allMoves.find(m => m.id === id))
        .filter((m): m is MoveCard => !!m);

    this.currentTechniques = activeDeck.techniques
        .map(id => this.allTechniques.find(t => t.id === id))
        .filter((t): t is TechniqueCard => !!t);

    // 检查是否有缺失导致不满足数量要求，修复之
    if (this.currentDeck.length < GameConfig.DECK_SIZE) {
        console.warn('Loaded deck is invalid or missing cards, fixing...');
        while (this.currentDeck.length < GameConfig.DECK_SIZE) {
            const randomMove = this.allMoves[Math.floor(Math.random() * this.allMoves.length)];
            this.currentDeck.push(randomMove);
        }
        SaveSystem.updateDeck(activeDeck.id, { moves: this.currentDeck.map(c => c.id) });
    }
  }

  /**
   * 保存当前正在编辑的牌组
   */
  public saveDeck(deck: MoveCard[], techniques: TechniqueCard[]) {
    this.currentDeck = [...deck];
    this.currentTechniques = [...techniques];

    const activeDeck = SaveSystem.getActiveDeck();
    if (activeDeck) {
      SaveSystem.updateDeck(activeDeck.id, {
        moves: this.currentDeck.map(c => c.id),
        techniques: this.currentTechniques.map(t => t.id)
      });
    }
  }
}