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

export class RogueMonkAI extends DefaultAI {
    async takeTurn(combat: CombatSystem, enemy: EnemyState, bonusDef: number, hooks?: CombatHooks) {
        // 检查是否有其他的双生妖僧存活
        const otherMonks = combat.enemies.filter(e => e.id === 'rogue_monk' && e !== enemy && e.stats.hp > 0);

        if (otherMonks.length > 0) {
            // 查找血量低于30%的同伴
            const lowHpMonks = otherMonks.filter(e => e.stats.hp < e.stats.maxHp * 0.3);
            if (lowHpMonks.length > 0) {
                for (const target of lowHpMonks) {
                    const healAmount = Math.floor(target.stats.maxHp * 0.05);
                    target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + healAmount);
                    combat.log.push(`✨ ${enemy.name} 施展【双生妖法】，为 ${target.name} 恢复了 ${healAmount} 点生命！`);
                }
            }
        }

        // 继续执行默认的攻击行为
        await super.takeTurn(combat, enemy, bonusDef, hooks);
    }
}

export class TrainingDummyAI extends DefaultAI {
    async takeTurn(combat: CombatSystem, enemy: EnemyState, bonusDef: number, hooks?: CombatHooks) {
        combat.log.push(`${enemy.name}静静地立在原地...`);
    }
}

export function getEnemyAI(enemyId?: string): EnemyAI {
    switch (enemyId) {
        case 'mecha_general':
            return new MechaGeneralAI();
        case 'rogue_monk':
            return new RogueMonkAI();
        case 'training_dummy':
            return new TrainingDummyAI();
        default:
            return new DefaultAI();
    }
}