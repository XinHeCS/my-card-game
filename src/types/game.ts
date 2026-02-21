export type WeaponType = 'Fist' | 'Blade' | 'Spear' | 'Sword' | 'Staff'; // 拳, 刀, 枪, 剑, 棒
export type MoveWeight = 'Light' | 'Heavy' | 'Charge' | 'Block'; // 轻击, 重击, 蓄力, 格挡

export interface MoveCard {
  id: string;
  name: string;
  icon: string;
  weapon: WeaponType;
  weight: MoveWeight;
  description: string;
  power: number; // Attack bonus
  def?: number; // Defense bonus
  jingdao?: number; // Jingdao bonus
  cost: number;
}

export interface TechniqueCard {
  id: string;
  name: string;
  icon: string;
  description: string;
  triggerCondition: (playedCards: MoveCard[]) => boolean;
  effect: (player: PlayerStats, enemy: PlayerStats, damage: number, playedCards: MoveCard[]) => { player: PlayerStats, enemy: PlayerStats, damage: number, message?: string };
  type: 'Passive' | 'Triggered';
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  jingdao: number; // 劲道 (Internal Force/Power)
}

export type GamePhase = 'Preparation' | 'Action' | 'Resolution' | 'Discard' | 'End';
