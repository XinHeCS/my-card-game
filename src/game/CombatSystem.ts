import { MoveCard, TechniqueCard, PlayerStats, GamePhase } from '../types/game';
import { BASE_MOVES } from '../data/moves';
import { EnemyAI, getEnemyAI, EnemyState } from './EnemyAI';
import { LevelConfig } from './GameData';

export interface CombatHooks {
  onCardPlay?: (card: MoveCard, index: number) => Promise<void>;
  onTechTrigger?: (tech: TechniqueCard, result: any, diffs: any) => Promise<void>;
  onPlayerAttack?: (enemy: EnemyState, damage: number, actualDamage: number) => Promise<void>;
  onEnemyAttack?: (enemy: EnemyState, damage: number, actualDamage: number) => Promise<void>;
}

export class CombatSystem {
  drawPile: MoveCard[] = [];
  hand: MoveCard[] = [];
  discardPile: MoveCard[] = [];

  playerStats: PlayerStats;
  enemies: EnemyState[] = [];

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
  }

  loadLevel(levelConfig: LevelConfig) {
    this.enemies = levelConfig.enemies.map(e => ({
      id: e.id,
      name: e.name,
      stats: { ...e.stats },
      ai: getEnemyAI(e.id),
      spritePath: e.spritePath
    }));
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

  async playTurn(selectedCardIndices: number[], targetIndices?: number[], hooks?: CombatHooks) {
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

    await this.resolveCombat(playedCards, targetIndices, hooks);

    // Discard played cards
    this.discardPile.push(...playedCards);

    this.endTurnCheck();
  }

  async resolveCombat(playedCards: MoveCard[], targetIndices?: number[], hooks?: CombatHooks) {
    this.currentPhase = 'Resolution';

    // 1. Process Cards one by one for animation
    for (let i = 0; i < playedCards.length; i++) {
        const card = playedCards[i];
        this.playerStats.attack += (card.power || 0);
        this.playerStats.jingdao += (card.jingdao || 0);
        this.playerStats.defense += (card.def || 0);
        if (hooks && hooks.onCardPlay) {
            await hooks.onCardPlay(card, i);
        }
    }

    let cardDef = playedCards.reduce((sum, card) => sum + (card.def || 0), 0);

    // Initial damage calculation
    let totalDamage = this.playerStats.attack * this.playerStats.jingdao;

    // Determine targets
    let aliveEnemies = this.enemies.filter(e => e.stats.hp > 0);
    if (aliveEnemies.length === 0) return;

    let targets = aliveEnemies;
    if (targetIndices && targetIndices.length > 0) {
        targets = targetIndices.map(i => this.enemies[i]).filter(e => e && e.stats.hp > 0);
        if (targets.length === 0) targets = aliveEnemies; // Fallback
    }

    // 2. Trigger Techniques sequentially
    for (let tech of this.equippedTechniques) {
      if (tech.triggerCondition(playedCards)) {
        const oldAtk = this.playerStats.attack;
        const oldJing = this.playerStats.jingdao;
        const oldDef = this.playerStats.defense;

        // Since effect signature only takes one enemy, let's just pass the first target for now
        // A better refactor would update effect signature, but let's keep it simple
        const firstTargetStats = targets[0].stats;
        const result = tech.effect(this.playerStats, firstTargetStats, totalDamage, playedCards);
        this.playerStats = result.player;
        targets[0].stats = result.enemy;

        const diffs = {
            atkDiff: this.playerStats.attack - oldAtk,
            jingDiff: this.playerStats.jingdao - oldJing,
            defDiff: this.playerStats.defense - oldDef,
            dmgDiff: result.damage - totalDamage
        };

        totalDamage = result.damage;
        if (result.message) this.log.push(result.message);

        if (hooks && hooks.onTechTrigger) {
            await hooks.onTechTrigger(tech, result, diffs);
        }
      }
    }

    // 3. Apply Damage to Targets (divided equally)
    const damagePerTarget = Math.floor(totalDamage / targets.length);

    for (let target of targets) {
        const actualDamage = Math.max(0, damagePerTarget - target.stats.defense);
        target.stats.hp = Math.max(0, target.stats.hp - actualDamage);

        // Track max damage
        if (actualDamage > this.maxDamage) {
            this.maxDamage = actualDamage;
            this.maxDamageCombo = [...playedCards];
        }

        this.log.push(`对 ${target.name} 造成了 ${actualDamage} 点伤害！ (被格挡: ${Math.min(damagePerTarget, target.stats.defense)})`);

        await target.ai.onDamageTaken(this, target, actualDamage, hooks);

        if (hooks && hooks.onPlayerAttack) {
            await hooks.onPlayerAttack(target, damagePerTarget, actualDamage);
        }
    }

    // Check Win (all enemies dead)
    if (this.enemies.every(e => e.stats.hp <= 0)) {
        this.currentPhase = 'GameOver';
        this.log.push('所有敌人被击败！你赢了！');
        return;
    }

    // 4. Enemy Turn (all alive enemies take a turn)
    const remainingEnemies = this.enemies.filter(e => e.stats.hp > 0);
    for (let enemy of remainingEnemies) {
        if (this.playerStats.hp <= 0) break;
        await this.enemyTurn(enemy, cardDef, hooks);
    }
  }

  async enemyTurn(enemy: EnemyState, bonusDef: number = 0, hooks?: CombatHooks) {
    await enemy.ai.takeTurn(this, enemy, bonusDef, hooks);
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
