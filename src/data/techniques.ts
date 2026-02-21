import { TechniqueCard, MoveCard, PlayerStats } from '../types/game';

export const TECHNIQUES: TechniqueCard[] = [
  {
    id: 'iron-shirt',
    name: '铁布衫',
    icon: '👕',
    description: '如果你打出至少2张[格挡]牌，防御力+5。',
    type: 'Triggered',
    triggerCondition: (playedCards: MoveCard[]) => {
      return playedCards.filter(c => c.weight === 'Block').length >= 2;
    },
    effect: (player, enemy, damage) => {
      player.defense += 5;
      return { player, enemy, damage, message: '铁布衫发动！防御+5' };
    }
  },
  {
    id: 'fist-fury',
    name: '百裂拳',
    icon: '🤜🔥',
    description: '如果所有打出的牌都是[拳]，造成双倍伤害。',
    type: 'Triggered',
    triggerCondition: (playedCards: MoveCard[]) => {
      return playedCards.length > 0 && playedCards.every(c => c.weapon === 'Fist');
    },
    effect: (player, enemy, damage) => {
      return { player, enemy, damage: damage * 2, message: '百裂拳！双倍伤害！' };
    }
  },
  {
    id: 'vampiric-touch',
    name: '嗜血功',
    icon: '🩸',
    description: '回复造成伤害的10%生命值。',
    type: 'Passive',
    triggerCondition: () => true, // Always triggers on hit
    effect: (player, enemy, damage) => {
      const heal = Math.floor(damage * 0.1);
      player.hp = Math.min(player.hp + heal, player.maxHp);
      return { player, enemy, damage, message: `嗜血功：回复 ${heal} 生命` };
    }
  },
  {
    id: 'sword-intent',
    name: '剑意',
    icon: '⚔️✨',
    description: '每打出一张[剑]牌，本回合攻击力+2。',
    type: 'Triggered',
    triggerCondition: (playedCards: MoveCard[]) => {
      return playedCards.some(c => c.weapon === 'Sword');
    },
    effect: (player, enemy, damage) => {
       // Logic handled in calculation, but here we can return a message or temp buff
       return { player, enemy, damage, message: '剑意共鸣！' };
    }
  },
  {
    id: 'heavy-hand',
    name: '大力金刚掌',
    icon: '💪',
    description: '[重击]无视敌人5点防御。',
    type: 'Triggered',
    triggerCondition: (playedCards: MoveCard[]) => {
      return playedCards.some(c => c.weight === 'Heavy');
    },
    effect: (player, enemy, damage) => {
      return { player, enemy, damage: damage + 5, message: '大力金刚掌！无视防御！' };
    }
  }
];
