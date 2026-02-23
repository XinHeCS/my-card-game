import { MoveCard, TechniqueCard, PlayerStats } from '../types/game';
import { BASE_MOVES } from '../data/moves';
import { TECHNIQUES } from '../data/techniques';

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

const STORAGE_KEY = 'VAG_PLAYGROUND_DATA_V1';

export class GameData {
  private static instance: GameData;

  // Player's current build
  public currentDeck: MoveCard[] = [];
  public currentTechniques: TechniqueCard[] = [];

  // Available pools (Locked/Unlocked logic can go here later)
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
          stats: { hp: 50, maxHp: 50, attack: 5, defense: 0, jingdao: 1 },
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
          stats: { hp: 80, maxHp: 80, attack: 4, defense: 5, jingdao: 4 },
          spritePath: 'images/enemy_monk.png'
        },
        {
          id: 'rogue_monk',
          name: '赛博妖僧·阴',
          stats: { hp: 80, maxHp: 80, attack: 4, defense: 5, jingdao: 4 },
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
          stats: { hp: 200, maxHp: 200, attack: 12, defense: 8, jingdao: 2 },
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

  private load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (data.deckIds && Array.isArray(data.deckIds)) {
            this.currentDeck = data.deckIds
                .map((id: string) => this.allMoves.find(m => m.id === id))
                .filter((m: MoveCard | undefined): m is MoveCard => !!m);
        }
        if (data.techIds && Array.isArray(data.techIds)) {
            this.currentTechniques = data.techIds
                .map((id: string) => this.allTechniques.find(t => t.id === id))
                .filter((t: TechniqueCard | undefined): t is TechniqueCard => !!t);
        }

        // Basic validation: if load failed to produce valid deck, fallback
        if (this.currentDeck.length === 0) {
            console.warn('Loaded deck is empty or invalid, using default.');
            this.createDefaultDeck();
        }
        return;
      } catch (e) {
        console.error('Failed to load game data:', e);
      }
    }

    // Fallback: Default Deck
    this.createDefaultDeck();
  }

  private createDefaultDeck() {
    this.currentDeck = [];
    while (this.currentDeck.length < 30) {
        const randomMove = this.allMoves[Math.floor(Math.random() * this.allMoves.length)];
        this.currentDeck.push(randomMove);
    }
    // Default Techniques: First 5
    this.currentTechniques = this.allTechniques.slice(0, 5);
  }

  public saveDeck(deck: MoveCard[], techniques: TechniqueCard[]) {
    this.currentDeck = [...deck];
    this.currentTechniques = [...techniques];
    this.save();
  }

  private save() {
      const data = {
          deckIds: this.currentDeck.map(c => c.id),
          techIds: this.currentTechniques.map(t => t.id)
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}
