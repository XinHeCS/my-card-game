import { MoveCard, TechniqueCard, PlayerStats, GamePhase } from '../types/game';
import { BASE_MOVES } from '../data/moves';

export class CombatSystem {
  drawPile: MoveCard[] = [];
  hand: MoveCard[] = [];
  discardPile: MoveCard[] = [];

  playerStats: PlayerStats;
  enemyStats: PlayerStats;

  equippedTechniques: TechniqueCard[] = [];

  currentPhase: GamePhase = 'Preparation';
  turnCount: number = 0;
  log: string[] = [];

  constructor(initialDeck: MoveCard[], techniques: TechniqueCard[]) {
    this.drawPile = [...initialDeck]; // Deep copy ideally, but refs are ok for readonly data
    this.shuffleDeck();
    this.equippedTechniques = techniques;

    // Default Stats
    this.playerStats = { hp: 100, maxHp: 100, attack: 10, defense: 5, jingdao: 1 };
    this.enemyStats = { hp: 100, maxHp: 100, attack: 8, defense: 3, jingdao: 1 };
  }

  shuffleDeck() {
    for (let i = this.drawPile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.drawPile[i], this.drawPile[j]] = [this.drawPile[j], this.drawPile[i]];
    }
    this.log.push('牌库已洗牌。');
  }

  drawCards(count: number) {
    let drawn = 0;
    while (drawn < count) {
      if (this.drawPile.length === 0) {
        if (this.discardPile.length === 0) break; // No cards left
        this.drawPile = [...this.discardPile];
        this.discardPile = [];
        this.shuffleDeck();
      }
      const card = this.drawPile.pop();
      if (card) {
        this.hand.push(card);
        drawn++;
      }
    }
    this.log.push(`抽了 ${drawn} 张牌。`);
  }

  startTurn() {
    this.turnCount++;
    this.currentPhase = 'Preparation';
    this.log.push(`第 ${this.turnCount} 回合开始。`);

    // Rule: Fill hand to 7 cards
    const cardsToDraw = 7 - this.hand.length;
    if (cardsToDraw > 0) {
      this.drawCards(cardsToDraw);
    }

    this.currentPhase = 'Action';
  }

  playTurn(selectedCardIndices: number[]) {
    if (this.currentPhase !== 'Action') return;

    // Rule: Must play exactly 5 cards (or allow less for flexibility? User prompt says "Must be formed by 5 cards")
    // "每次出招必须由五张招式牌构成" -> Strict rule.
    if (selectedCardIndices.length !== 5) {
      this.log.push('必须选择5张牌！');
      return;
    }

    const playedCards = selectedCardIndices.map(i => this.hand[i]);

    // Remove from hand (handle indices carefully, sort descending first)
    selectedCardIndices.sort((a, b) => b - a).forEach(i => {
      this.hand.splice(i, 1);
    });

    this.resolveCombat(playedCards);

    // Discard played cards
    this.discardPile.push(...playedCards);

    this.endTurn();
  }

  resolveCombat(playedCards: MoveCard[]) {
    this.currentPhase = 'Resolution';

    // 1. Calculate Base Damage
    // Formula: Sum of (Card Power * Player Jingdao)
    let totalPower = playedCards.reduce((sum, card) => sum + card.power, 0);
    let totalDamage = (this.playerStats.attack + playedCards.reduce((s, c) => s + c.power * 5, 0)); // Scaling up card power for balance

    // 2. Trigger Techniques
    // "当玩家打出特定的招式牌组合时，功法牌会自动提供增益效果"
    this.equippedTechniques.forEach(tech => {
      if (tech.triggerCondition(playedCards)) {
        const result = tech.effect(this.playerStats, this.enemyStats, totalDamage);
        this.playerStats = result.player;
        this.enemyStats = result.enemy;
        totalDamage = result.damage;
        if (result.message) this.log.push(result.message);
      }
    });

    // 3. Apply Damage to Enemy
    const actualDamage = Math.max(0, totalDamage - this.enemyStats.defense);
    this.enemyStats.hp = Math.max(0, this.enemyStats.hp - actualDamage);

    this.log.push(`造成了 ${actualDamage} 点伤害！ (被格挡: ${Math.min(totalDamage, this.enemyStats.defense)})`);

    // 4. Enemy Turn (Simple AI for MVP)
    if (this.enemyStats.hp > 0) {
      this.enemyTurn();
    }
  }

  enemyTurn() {
    // Simple Enemy Logic: Attack for base damage
    const enemyDmg = this.enemyStats.attack * this.enemyStats.jingdao;
    const actualDmg = Math.max(0, enemyDmg - this.playerStats.defense);
    this.playerStats.hp = Math.max(0, this.playerStats.hp - actualDmg);
    this.log.push(`敌人攻击！受到了 ${actualDmg} 点伤害。`);
  }

  endTurn() {
    this.currentPhase = 'End';

    // Rule: Discard down to 7 cards.
    // "在结束阶段，玩家需要将多余的手牌丢弃到只剩七张"
    // For MVP automation, let's just discard random/last cards if > 7.
    while (this.hand.length > 7) {
      const discarded = this.hand.pop();
      if (discarded) this.discardPile.push(discarded);
    }

    this.log.push('回合结束。');
  }
}
