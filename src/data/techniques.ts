import { TechniqueCard, MoveCard, PlayerStats } from '../types/game';

export const TECHNIQUES: TechniqueCard[] = [
  {
    id: 'iron-shirt',
    name: '铁布衫',
    icon: '👕',
    description: '如果你打出至少3张[格挡]牌，防御力+15。',
    type: 'Triggered',
    triggerCondition: (playedCards: MoveCard[]) => {
      return playedCards.filter(c => c.weight === 'Block').length >= 3;
    },
    effect: (player, enemy, damage, playedCards) => {
      player.defense += 15;
      return { player, enemy, damage, message: '铁布衫发动！防御+15' };
    }
  },
  {
    id: 'vampiric-touch',
    name: '嗜血功',
    icon: '🩸',
    description: '回复造成伤害的10%生命值。',
    type: 'Passive',
    triggerCondition: () => true,
    effect: (player, enemy, damage, playedCards) => {
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
    effect: (player, enemy, damage, playedCards) => {
       const swordCount = playedCards.filter(c => c.weapon === 'Sword').length;
       player.attack += swordCount * 2;
       return { player, enemy, damage: damage + (swordCount * 2) * player.jingdao, message: '剑意共鸣！攻击力增加' };
    }
  },
  {
    id: 'heavy-hand',
    name: '大力金刚掌',
    icon: '💪',
    description: '打出四张[拳-轻击]时，力量+30，劲道+10。',
    type: 'Triggered',
    triggerCondition: (playedCards: MoveCard[]) => {
      return playedCards.filter(c => c.weapon === 'Fist' && c.weight === 'Light').length === 4;
    },
    effect: (player, enemy, damage, playedCards) => {
      player.attack += 30;
      player.jingdao += 10;
      // Re-calculate bonus damage based on new stats or let it just boost stats.
      // Wait, damage is pre-calculated. We should probably adjust damage for this hit?
      // "玩家力量+30 劲道+10"
      return { player, enemy, damage: damage, message: '大力金刚掌！力量+30 劲道+10' };
    }
  },
  {
    id: 'xing-yi-quan',
    name: '形意拳',
    icon: '🤜',
    description: '每打出一张[拳]牌(非格挡)，攻击力+3。',
    type: 'Triggered',
    triggerCondition: (playedCards: MoveCard[]) => {
      return playedCards.some(c => c.weapon === 'Fist' && c.weight !== 'Block');
    },
    effect: (player, enemy, damage, playedCards) => {
      const fistCount = playedCards.filter(c => c.weapon === 'Fist' && c.weight !== 'Block').length;
      player.attack += fistCount * 3;
      return { player, enemy, damage: damage + (fistCount * 3) * player.jingdao, message: `形意拳！攻击力+${fistCount * 3}` };
    }
  },
  {
    id: 'shaolin-chang-quan',
    name: '少林长拳',
    icon: '📿',
    description: '打出恰好三张[拳-重击]时，力量+10，劲道+5。',
    type: 'Triggered',
    triggerCondition: (playedCards: MoveCard[]) => {
      return playedCards.filter(c => c.weapon === 'Fist' && c.weight === 'Heavy').length === 3;
    },
    effect: (player, enemy, damage, playedCards) => {
      player.attack += 10;
      player.jingdao += 5;
      return { player, enemy, damage, message: '少林长拳！力量+10 劲道+5' };
    }
  },
  {
    id: 'kong-ming-quan',
    name: '空明拳',
    icon: '🌪️',
    description: '包含拳系四种牌（轻击、重击、蓄力、格挡）各至少1张，劲道x2。',
    type: 'Triggered',
    triggerCondition: (playedCards: MoveCard[]) => {
      const hasLight = playedCards.some(c => c.weapon === 'Fist' && c.weight === 'Light');
      const hasHeavy = playedCards.some(c => c.weapon === 'Fist' && c.weight === 'Heavy');
      const hasCharge = playedCards.some(c => c.weapon === 'Fist' && c.weight === 'Charge');
      const hasBlock = playedCards.some(c => c.weapon === 'Fist' && c.weight === 'Block');
      return hasLight && hasHeavy && hasCharge && hasBlock;
    },
    effect: (player, enemy, damage, playedCards) => {
      player.jingdao *= 2;
      return { player, enemy, damage, message: '空明拳！劲道翻倍！' };
    }
  },
  {
    id: 'jin-zhong-zhao',
    name: '金钟罩',
    icon: '🔔',
    description: '打出至少4张[格挡]时，下回合对攻击者造成15%反伤（仅限一次）。',
    type: 'Triggered',
    triggerCondition: (playedCards: MoveCard[]) => {
      return playedCards.filter(c => c.weight === 'Block').length >= 4;
    },
    effect: (player, enemy, damage, playedCards) => {
      player.thorns = 0.15;
      return { player, enemy, damage, message: '金钟罩发动！附加 15% 反伤。' };
    }
  },
  {
    id: 'yi-zhi-chan',
    name: '一指禅',
    icon: '☝️',
    description: '打出5张完全相同的[拳]牌，力量+50，劲道+30。',
    type: 'Triggered',
    triggerCondition: (playedCards: MoveCard[]) => {
      if (playedCards.length !== 5) return false;
      const firstId = playedCards[0].id;
      const allSame = playedCards.every(c => c.id === firstId);
      return allSame && playedCards[0].weapon === 'Fist';
    },
    effect: (player, enemy, damage, playedCards) => {
      player.attack += 50;
      player.jingdao += 30;
      return { player, enemy, damage, message: '一指禅！力量大增！' };
    }
  }
];
