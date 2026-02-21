import { MoveCard } from '../types/game';

export const BASE_MOVES: MoveCard[] = [
  // 拳 (Fist) 👊
  { id: 'fist-light', name: '拳-轻击', icon: '👊⚡', description: '快速的寸拳打击。', weapon: 'Fist', weight: 'Light', power: 3, cost: 0 },
  { id: 'fist-heavy', name: '拳-重击', icon: '👊💥', description: '势大力沉的撞击。', weapon: 'Fist', weight: 'Heavy', power: 5, cost: 0 },
  { id: 'fist-charge', name: '拳-蓄力', icon: '👊🔋', description: '凝聚内力的重拳。', weapon: 'Fist', weight: 'Charge', power: 0, cost: 0 },
  { id: 'fist-block', name: '拳-格挡', icon: '👊🛡️', description: '运气护体，抵挡伤害。', weapon: 'Fist', weight: 'Block', power: 0, def: 2, cost: 0 },

  // 刀 (Blade) 🔪
  { id: 'blade-light', name: '刀-轻击', icon: '🔪⚡', description: '快如闪电的一刀。', weapon: 'Blade', weight: 'Light', power: 3, cost: 0 },
  { id: 'blade-heavy', name: '刀-重击', icon: '🔪💥', description: '力劈华山的一击。', weapon: 'Blade', weight: 'Heavy', power: 5, cost: 0 },
  { id: 'blade-charge', name: '刀-蓄力', icon: '🔪🔋', description: '蓄力后的致命一击。', weapon: 'Blade', weight: 'Charge', power: 0, cost: 0 },
  { id: 'blade-block', name: '刀-格挡', icon: '🔪🛡️', description: '横刀格挡，不动如山。', weapon: 'Blade', weight: 'Block', power: 0, def: 2, cost: 0 },

  // 枪 (Spear) 🔱
  { id: 'spear-light', name: '枪-轻击', icon: '🔱⚡', description: '刁钻的刺击。', weapon: 'Spear', weight: 'Light', power: 3, cost: 0 },
  { id: 'spear-heavy', name: '枪-重击', icon: '🔱💥', description: '大范围的横扫。', weapon: 'Spear', weight: 'Heavy', power: 5, cost: 0 },
  { id: 'spear-charge', name: '枪-蓄力', icon: '🔱🔋', description: '贯穿一切的突刺。', weapon: 'Spear', weight: 'Charge', power: 0, cost: 0 },
  { id: 'spear-block', name: '枪-格挡', icon: '🔱🛡️', description: '舞动枪身形成防御。', weapon: 'Spear', weight: 'Block', power: 0, def: 2, cost: 0 },

  // 剑 (Sword) ⚔️
  { id: 'sword-light', name: '剑-轻击', icon: '⚔️⚡', description: '轻灵的剑招。', weapon: 'Sword', weight: 'Light', power: 3, cost: 0 },
  { id: 'sword-heavy', name: '剑-重击', icon: '⚔️💥', description: '朴实无华的重斩。', weapon: 'Sword', weight: 'Heavy', power: 5, cost: 0 },
  { id: 'sword-charge', name: '剑-蓄力', icon: '⚔️🔋', description: '从天而降的绝杀。', weapon: 'Sword', weight: 'Charge', power: 0, cost: 0 },
  { id: 'sword-block', name: '剑-格挡', icon: '⚔️🛡️', description: '以柔克刚的防御。', weapon: 'Sword', weight: 'Block', power: 0, def: 2, cost: 0 },

  // 棒 (Staff) 🪵
  { id: 'staff-light', name: '棒-轻击', icon: '🪵⚡', description: '迎头一击。', weapon: 'Staff', weight: 'Light', power: 3, cost: 0 },
  { id: 'staff-heavy', name: '棒-重击', icon: '🪵💥', description: '沉重的一棍。', weapon: 'Staff', weight: 'Heavy', power: 5, cost: 0 },
  { id: 'staff-charge', name: '棒-蓄力', icon: '🪵🔋', description: '震天动地的一击。', weapon: 'Staff', weight: 'Charge', power: 0, cost: 0 },
  { id: 'staff-block', name: '棒-格挡', icon: '🪵🛡️', description: '密不透风的防御网。', weapon: 'Staff', weight: 'Block', power: 0, def: 2, cost: 0 },
];
