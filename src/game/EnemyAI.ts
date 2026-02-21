import { CombatSystem, CombatHooks } from './CombatSystem';
import { PlayerStats } from '../types/game';

export interface EnemyState {
    id: string;
    name: string;
    stats: PlayerStats;
    ai: EnemyAI;
    spritePath: string;
    enraged?: boolean;
}

export interface EnemyAI {
    onDamageTaken(combat: CombatSystem, enemy: EnemyState, damage: number, hooks?: CombatHooks): Promise<void>;
    takeTurn(combat: CombatSystem, enemy: EnemyState, bonusDef: number, hooks?: CombatHooks): Promise<void>;
}

export class DefaultAI implements EnemyAI {
    async onDamageTaken(combat: CombatSystem, enemy: EnemyState, damage: number, hooks?: CombatHooks) {
        // 默认无特殊受击逻辑
    }

    async takeTurn(combat: CombatSystem, enemy: EnemyState, bonusDef: number, hooks?: CombatHooks) {
        // 默认简单的攻击逻辑：造成 力量 x 劲道 的伤害
        const enemyDmg = enemy.stats.attack * enemy.stats.jingdao;
        const totalPlayerDef = combat.playerStats.defense;
        const actualDmg = Math.max(0, enemyDmg - totalPlayerDef);

        combat.playerStats.hp = Math.max(0, combat.playerStats.hp - actualDmg);

        let msg = `${enemy.name}攻击！受到了 ${actualDmg} 点伤害。`;
        if (totalPlayerDef > 0) {
            msg += ` (护盾抵消了部分伤害)`;
        }
        combat.log.push(msg);

        if (hooks && hooks.onEnemyAttack) {
            await hooks.onEnemyAttack(enemy, enemyDmg, actualDmg);
        }

        if (combat.playerStats.hp <= 0) {
            combat.currentPhase = 'GameOver';
            combat.log.push('你被击败了...');
        }
    }
}

export class MechaGeneralAI extends DefaultAI {
    async onDamageTaken(combat: CombatSystem, enemy: EnemyState, damage: number, hooks?: CombatHooks) {
        if (enemy.stats.hp > 0 && enemy.stats.hp <= enemy.stats.maxHp * 0.1 && !enemy.enraged) {
            enemy.enraged = true;
            enemy.stats.attack = 7;
            enemy.stats.jingdao = 7;
            combat.log.push(`⚠️ ${enemy.name}触发【核心过载】！力量变为7，劲道变为7！`);
        }
    }
}

export function getEnemyAI(enemyId?: string): EnemyAI {
    switch (enemyId) {
        case 'mecha_general':
            return new MechaGeneralAI();
        case 'rogue_monk':
        case 'training_dummy':
        default:
            return new DefaultAI();
    }
}