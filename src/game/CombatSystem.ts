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

  // Track max damage and combo
  maxDamage: number = 0;
  maxDamageCombo: MoveCard[] = [];

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

    // Reset stats per turn
    this.playerStats.attack = 0;
    this.playerStats.defense = 0;
    this.playerStats.jingdao = 0;

    // Draw cards: 7 on turn 1, 2 on subsequent turns
    if (this.turnCount === 1) {
        this.drawCards(7);
    } else {
        this.drawCards(2);
    }

    this.currentPhase = 'Action';
  }

  playTurn(selectedCardIndices: number[]) {
    if (this.currentPhase !== 'Action') return;

    // Rule: Can play 0 to 5 cards
    if (selectedCardIndices.length > 5) {
      this.log.push('最多只能选择 5 张牌！');
      return;
    }

    if (selectedCardIndices.length === 0) {
      this.log.push('未出牌，直接结束回合。');
    }

    const playedCards = selectedCardIndices.map(i => this.hand[i]);

    // Remove from hand (handle indices carefully, sort descending first)
    selectedCardIndices.sort((a, b) => b - a).forEach(i => {
      this.hand.splice(i, 1);
    });

    this.resolveCombat(playedCards);

    // Discard played cards
    this.discardPile.push(...playedCards);

    this.endTurnCheck();
  }

  resolveCombat(playedCards: MoveCard[]) {
    this.currentPhase = 'Resolution';

    // 1. Calculate Base Stats from Cards
    let cardPower = playedCards.reduce((sum, card) => sum + card.power, 0);
    let cardDef = playedCards.reduce((sum, card) => sum + (card.def || 0), 0);
    let cardJingdao = playedCards.reduce((sum, card) => sum + (card.jingdao || 0), 0);

    // Apply card stats to player for this resolution so techniques can read them
    this.playerStats.attack += cardPower;
    this.playerStats.jingdao += cardJingdao;

    // Initial damage calculation
    let totalDamage = this.playerStats.attack * this.playerStats.jingdao;

    // 2. Trigger Techniques
    // "当玩家打出特定的招式牌组合时，功法牌会自动提供增益效果"
    this.equippedTechniques.forEach(tech => {
      if (tech.triggerCondition(playedCards)) {
        const result = tech.effect(this.playerStats, this.enemyStats, totalDamage, playedCards);
        this.playerStats = result.player;
        this.enemyStats = result.enemy;
        totalDamage = result.damage;
        if (result.message) this.log.push(result.message);
      }
    });

    // 3. Apply Damage to Enemy
    const actualDamage = Math.max(0, totalDamage - this.enemyStats.defense);
    this.enemyStats.hp = Math.max(0, this.enemyStats.hp - actualDamage);

    // Track max damage
    if (actualDamage > this.maxDamage) {
        this.maxDamage = actualDamage;
        this.maxDamageCombo = [...playedCards];
    }

    this.log.push(`造成了 ${actualDamage} 点伤害！ (被格挡: ${Math.min(totalDamage, this.enemyStats.defense)})`);

    // Check Win
    if (this.enemyStats.hp <= 0) {
        this.currentPhase = 'GameOver';
        this.log.push('敌人被击败！你赢了！');
        return;
    }

    // 4. Enemy Turn (Simple AI for MVP)
    if (this.enemyStats.hp > 0) {
      // Pass temporary defense bonus (Shield) from cards
      this.enemyTurn(cardDef);
    }
  }

  enemyTurn(bonusDef: number = 0) {
    // Simple Enemy Logic: Attack for base damage
    const enemyDmg = this.enemyStats.attack * this.enemyStats.jingdao;

    // Total Player Defense = Base Defense + Bonus Defense from cards (Shield)
    const totalPlayerDef = this.playerStats.defense + bonusDef;

    const actualDmg = Math.max(0, enemyDmg - totalPlayerDef);
    this.playerStats.hp = Math.max(0, this.playerStats.hp - actualDmg);

    let msg = `敌人攻击！受到了 ${actualDmg} 点伤害。`;
    if (bonusDef > 0) {
        msg += ` (护盾抵消了部分伤害)`;
    }
    this.log.push(msg);

    // Check Lose
    if (this.playerStats.hp <= 0) {
        this.currentPhase = 'GameOver';
        this.log.push('你被击败了...');
    }
  }

  endTurnCheck() {
    if (this.currentPhase === 'GameOver') return;

    if (this.hand.length > 7) {
        this.currentPhase = 'Discard';
        this.log.push(`手牌过多，请选择 ${this.hand.length - 7} 张牌丢弃。`);
    } else {
        this.currentPhase = 'End';
        this.log.push('回合结束。');
    }
  }

  discardCards(selectedCardIndices: number[]) {
      if (this.currentPhase !== 'Discard') return;
      const cardsToDiscardCount = this.hand.length - 7;
      if (selectedCardIndices.length !== cardsToDiscardCount) {
          return;
      }

      const discardedCards = selectedCardIndices.map(i => this.hand[i]);
      selectedCardIndices.sort((a, b) => b - a).forEach(i => {
          this.hand.splice(i, 1);
      });
      this.discardPile.push(...discardedCards);

      this.currentPhase = 'End';
      this.log.push(`丢弃了 ${cardsToDiscardCount} 张牌，回合结束。`);
  }
}
