import { MoveCard, TechniqueCard, PlayerStats } from '../types/game';
import { BASE_MOVES } from '../data/moves';
import { TECHNIQUES } from '../data/techniques';

export interface EnemyConfig {
  id: string;
  name: string;
  stats: PlayerStats;
  spritePath: string;
  difficulty: string;
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
  public enemies: EnemyConfig[] = [
    {
      id: 'training_dummy',
      name: '木人桩',
      stats: { hp: 50, maxHp: 50, attack: 5, defense: 0, jingdao: 1 },
      spritePath: 'images/enemy.png',
      difficulty: '简单'
    },
    {
      id: 'rogue_monk',
      name: '赛博妖僧',
      stats: { hp: 100, maxHp: 100, attack: 4, defense: 3, jingdao: 4 },
      spritePath: 'images/enemy.png',
      difficulty: '普通'
    },
    {
      id: 'mecha_general',
      name: '机甲武圣',
      stats: { hp: 200, maxHp: 200, attack: 12, defense: 8, jingdao: 2 },
      spritePath: 'images/enemy.png',
      difficulty: '困难'
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
