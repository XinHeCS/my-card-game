export const GameConfig = {
    // 牌组构建规则
    DECK_SIZE: 30,             // 牌组必须包含的卡牌总数
    MAX_IDENTICAL_CARDS: 5,    // 同一种招式牌的最大数量
    MAX_TECHNIQUES: 5,         // 可装备的功法数量上限

    // 战斗规则
    MAX_HAND_SIZE: 7,          // 玩家回合结束时的最大手牌数量（超过需弃牌）
    MAX_CARDS_PER_TURN: 5,     // 每回合最多可出的招式牌数量

    // 玩家基础属性
    PLAYER_BASE_HP: 100,
    PLAYER_BASE_ATTACK: 10,
    PLAYER_BASE_DEFENSE: 5,
    PLAYER_BASE_JINGDAO: 1,
};
