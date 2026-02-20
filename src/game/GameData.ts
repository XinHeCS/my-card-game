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
      stats: { hp: 100, maxHp: 100, attack: 8, defense: 3, jingdao: 1 },
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
    // Default Deck: Pick first 30 moves (or repeat base moves to fill 30)
    // For now, let's just fill with random base moves up to 30
    this.currentDeck = [];
    while (this.currentDeck.length < 30) {
        const randomMove = this.allMoves[Math.floor(Math.random() * this.allMoves.length)];
        this.currentDeck.push(randomMove);
    }

    // Default Techniques: First 5
    this.currentTechniques = this.allTechniques.slice(0, 5);
  }

  public static getInstance(): GameData {
    if (!GameData.instance) {
      GameData.instance = new GameData();
    }
    return GameData.instance;
  }

  public saveDeck(deck: MoveCard[], techniques: TechniqueCard[]) {
    this.currentDeck = [...deck];
    this.currentTechniques = [...techniques];
  }
}
