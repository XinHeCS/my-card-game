/**
 * 表示一个牌组的结构
 */
export interface DeckData {
    id: string;          // 唯一ID
    name: string;        // 牌组名称（玩家自定义）
    cards: string[];     // 卡牌ID数组，表示这套牌包含的卡片
    createdAt: number;   // 创建时间戳
    updatedAt: number;   // 修改时间戳
}

/**
 * 玩家所有的本地存档数据结构
 */
export interface PlayerSaveData {
    version: string;     // 存档版本号，用于未来可能的数据迁移
    decks: DeckData[];   // 玩家拥有的所有牌组
    activeDeckId: string | null; // 当前正在使用的（选中的）牌组ID
}

/**
 * 保存系统 - 处理基于 localStorage 的本地存档逻辑
 */
export class SaveSystem {
    private static readonly SAVE_KEY = 'vag_player_save_v1';
    private static saveCache: PlayerSaveData | null = null;

    /**
     * 生成唯一ID
     */
    private static generateId(): string {
        return Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
    }

    /**
     * 读取本地存档，如果没有则初始化一个空存档
     */
    public static load(): PlayerSaveData {
        if (this.saveCache) {
            return this.saveCache;
        }

        const dataStr = localStorage.getItem(this.SAVE_KEY);
        if (dataStr) {
            try {
                this.saveCache = JSON.parse(dataStr) as PlayerSaveData;
                return this.saveCache;
            } catch (e) {
                console.error('Failed to parse save data, initializing new save.', e);
            }
        }

        // 默认空存档
        this.saveCache = {
            version: '1.0.0',
            decks: [],
            activeDeckId: null
        };
        return this.saveCache;
    }

    /**
     * 将当前内存中的存档强制写入本地 localStorage
     */
    public static save(): void {
        if (this.saveCache) {
            localStorage.setItem(this.SAVE_KEY, JSON.stringify(this.saveCache));
        }
    }

    /**
     * 创建一个新牌组
     * @param name 牌组名称
     * @returns 新创建的牌组对象
     */
    public static createDeck(name: string): DeckData {
        const save = this.load();
        const newDeck: DeckData = {
            id: this.generateId(),
            name: name,
            cards: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        save.decks.push(newDeck);

        // 如果是第一个牌组，自动设置为当前激活
        if (!save.activeDeckId) {
            save.activeDeckId = newDeck.id;
        }

        this.save();
        return newDeck;
    }

    /**
     * 更新已有牌组（重命名或修改卡牌）
     * @param id 牌组ID
     * @param updates 要更新的字段（名字或卡牌列表）
     */
    public static updateDeck(id: string, updates: Partial<Pick<DeckData, 'name' | 'cards'>>): boolean {
        const save = this.load();
        const deck = save.decks.find(d => d.id === id);

        if (deck) {
            if (updates.name !== undefined) deck.name = updates.name;
            if (updates.cards !== undefined) deck.cards = updates.cards;
            deck.updatedAt = Date.now();
            this.save();
            return true;
        }
        return false;
    }

    /**
     * 重命名特定牌组的快捷方法
     */
    public static renameDeck(id: string, newName: string): boolean {
        return this.updateDeck(id, { name: newName });
    }

    /**
     * 删除一个牌组
     * @param id 牌组ID
     */
    public static deleteDeck(id: string): void {
        const save = this.load();
        save.decks = save.decks.filter(d => d.id !== id);

        // 如果删除的是当前激活的牌组，自动切换到另一个
        if (save.activeDeckId === id) {
            save.activeDeckId = save.decks.length > 0 ? save.decks[0].id : null;
        }

        this.save();
    }

    /**
     * 获取所有牌组
     */
    public static getAllDecks(): DeckData[] {
        return this.load().decks;
    }

    /**
     * 获取特定牌组详情
     */
    public static getDeck(id: string): DeckData | undefined {
        return this.load().decks.find(d => d.id === id);
    }

    /**
     * 设置当前激活的（使用的）牌组
     */
    public static setActiveDeck(id: string): boolean {
        const save = this.load();
        const exists = save.decks.some(d => d.id === id);
        if (exists) {
            save.activeDeckId = id;
            this.save();
            return true;
        }
        return false;
    }

    /**
     * 获取当前正在使用的牌组
     */
    public static getActiveDeck(): DeckData | null {
        const save = this.load();
        if (!save.activeDeckId) return null;
        return this.getDeck(save.activeDeckId) || null;
    }
}
