// Inventory & Hotbar Management System for "The Living Valley"
// Supports 9 hotbar slots, 18 backpack slots, item stacking, durability decay, and quick actions.

import { ITEMS } from '../data/items.js';
import { soundFX } from '../utils/soundFX.js';

export class InventorySystem {
  constructor() {
    this.hotbarSize = 9;
    this.backpackSize = 18;

    this.hotbar = new Array(this.hotbarSize).fill(null);
    this.backpack = new Array(this.backpackSize).fill(null);

    this.selectedHotbarIndex = 0;
    this.onChange = null; // Callback for UI updates
    this.onActiveSlotChanged = null;
    this.onItemUsed = null; // Callback when food or consumable is used
    this.onToolBroken = null; // Callback when tool breaks

    // Give starter survival equipment
    this.initStarterItems();
  }

  get activeSlotIndex() {
    return this.selectedHotbarIndex;
  }

  set activeSlotIndex(val) {
    this.selectHotbar(val);
  }

  initStarterItems() {
    // Basic starter pack
    this.addItem('stick', 4);
    this.addItem('berry', 3);
  }

  getSelectedSlot() {
    return this.hotbar[this.selectedHotbarIndex];
  }

  getActiveItem() {
    return this.getSelectedSlot();
  }

  getSelectedItem() {
    const slot = this.getSelectedSlot();
    if (!slot) return null;
    return ITEMS[slot.id] || null;
  }

  selectHotbar(index) {
    if (index >= 0 && index < this.hotbarSize) {
      this.selectedHotbarIndex = index;
      if (this.onActiveSlotChanged) {
        this.onActiveSlotChanged(this.getSelectedSlot());
      }
      this.notifyChange();
    }
  }

  setActiveSlot(index) {
    this.selectHotbar(index);
  }

  // Count total quantity of an item across hotbar & backpack
  getItemCount(itemId) {
    if (!itemId) {
      console.warn('[Inventory] getItemCount called with null/undefined itemId');
      return 0;
    }
    let total = 0;
    const countIn = (arr) => {
      arr.forEach(slot => {
        if (slot && slot.id === itemId) total += slot.count;
      });
    };
    countIn(this.hotbar);
    countIn(this.backpack);
    return total;
  }

  findItemSlot(itemId, container = 'hotbar') {
    if (!itemId) return -1;
    const arr = container === 'hotbar' ? this.hotbar : this.backpack;
    return arr.findIndex(slot => slot && slot.id === itemId);
  }

  hasItem(itemId, count = 1) {
    if (!itemId) {
      console.warn('[Inventory] hasItem called with null/undefined itemId');
      return false;
    }
    return this.getItemCount(itemId) >= count;
  }

  hasIngredients(ingredients) {
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) return true;
    return ingredients.every(ing => {
      if (!ing || !ing.id) {
        console.warn('[Inventory] hasIngredients encountered invalid ingredient entry:', ing);
        return false;
      }
      return this.hasItem(ing.id, ing.count || 1);
    });
  }

  consumeIngredients(ingredients) {
    if (!this.hasIngredients(ingredients)) return false;
    ingredients.forEach(ing => {
      if (ing && ing.id) {
        this.removeItem(ing.id, ing.count || 1);
      }
    });
    this.notifyChange();
    return true;
  }

  // Crafting execution
  craft(recipe) {
    if (!recipe || !recipe.ingredients || !recipe.output) {
      return { success: false, reason: 'Invalid recipe' };
    }

    if (!this.hasIngredients(recipe.ingredients)) {
      return { success: false, reason: 'Missing ingredients' };
    }

    // Consume materials
    this.consumeIngredients(recipe.ingredients);

    // Add crafted output
    this.addItem(recipe.output.id, recipe.output.count || 1);

    this.notifyChange();
    return { success: true, item: recipe.output };
  }

  // Use / Eat item at slot
  useItem(index, isBackpack = false) {
    const arr = isBackpack ? this.backpack : this.hotbar;
    const slot = arr[index];
    if (!slot) return false;

    const def = ITEMS[slot.id];
    if (!def) return false;

    // If item is consumable food
    if (def.category === 'food' || def.food) {
      slot.count -= 1;
      if (slot.count <= 0) {
        arr[index] = null;
      }
      if (this.onItemUsed) {
        this.onItemUsed(slot);
      }
      this.notifyChange();
      return true;
    }

    return false;
  }

  damageActiveItem(amount = 1) {
    return this.decayActiveTool(amount);
  }

  // Add items with stacking support
  addItem(itemId, count = 1, durability = null) {
    const itemDef = ITEMS[itemId];
    if (!itemDef) {
      console.warn(`[Inventory] Unknown item id: ${itemId}`);
      return { success: false, remaining: count, added: 0 };
    }

    const stackMax = itemDef.stackMax || 1;
    let remaining = count;

    // Default durability for fresh tools
    if ((itemDef.tool || itemDef.maxDurability) && durability === null) {
      durability = itemDef.tool ? itemDef.tool.maxDurability : itemDef.maxDurability;
    }

    // 1. Try to stack into existing non-full slots (tools do not stack)
    if (stackMax > 1) {
      const tryStack = (slots) => {
        for (let i = 0; i < slots.length && remaining > 0; i++) {
          const slot = slots[i];
          if (slot && slot.id === itemId && slot.count < stackMax) {
            const add = Math.min(remaining, stackMax - slot.count);
            slot.count += add;
            remaining -= add;
          }
        }
      };

      tryStack(this.hotbar);
      tryStack(this.backpack);
    }

    // 2. Put remainder into first available empty slots (hotbar prioritized, then backpack)
    if (remaining > 0) {
      const tryEmpty = (slots) => {
        for (let i = 0; i < slots.length && remaining > 0; i++) {
          if (!slots[i]) {
            const add = Math.min(remaining, stackMax);
            slots[i] = {
              id: itemId,
              count: add,
              durability: durability !== null ? durability : undefined
            };
            remaining -= add;
          }
        }
      };

      tryEmpty(this.hotbar);
      tryEmpty(this.backpack);
    }

    this.notifyChange();
    const added = count - remaining;
    return { success: remaining === 0, added, remaining };
  }

  // Remove quantity of an item
  removeItem(itemId, count = 1) {
    let remaining = count;

    const removeFrom = (slots) => {
      for (let i = 0; i < slots.length && remaining > 0; i++) {
        const slot = slots[i];
        if (slot && slot.id === itemId) {
          if (slot.count > remaining) {
            slot.count -= remaining;
            remaining = 0;
          } else {
            remaining -= slot.count;
            slots[i] = null;
          }
        }
      }
    };

    removeFrom(this.hotbar);
    removeFrom(this.backpack);

    this.notifyChange();
    return count - remaining;
  }

  // Swap or move slots between hotbar and backpack
  moveSlot(fromContainer, fromIndex, toContainer, toIndex) {
    const fromArr = fromContainer === 'hotbar' ? this.hotbar : this.backpack;
    const toArr = toContainer === 'hotbar' ? this.hotbar : this.backpack;

    const source = fromArr[fromIndex];
    const target = toArr[toIndex];

    // If same item and stackable, merge stacks
    if (source && target && source.id === target.id) {
      const itemDef = ITEMS[source.id];
      const max = itemDef ? itemDef.stackMax : 1;
      if (max > 1 && target.count < max) {
        const space = max - target.count;
        const move = Math.min(source.count, space);
        target.count += move;
        source.count -= move;
        if (source.count <= 0) fromArr[fromIndex] = null;
        this.notifyChange();
        return;
      }
    }

    // Otherwise swap
    fromArr[fromIndex] = target;
    toArr[toIndex] = source;

    this.notifyChange();
  }

  // Quick move (tap on item to move between hotbar <-> backpack)
  quickMove(arg1, arg2) {
    let fromContainer, index;
    if (typeof arg1 === 'string') {
      fromContainer = arg1;
      index = arg2;
    } else {
      index = arg1;
      fromContainer = arg2 || 'hotbar';
    }

    const fromArr = fromContainer === 'hotbar' ? this.hotbar : this.backpack;
    const toArr = fromContainer === 'hotbar' ? this.backpack : this.hotbar;
    const source = fromArr[index];
    if (!source) return;

    // Try stacking into destination first
    const itemDef = ITEMS[source.id];
    const max = itemDef ? itemDef.stackMax : 1;
    if (max > 1) {
      for (let i = 0; i < toArr.length; i++) {
        const slot = toArr[i];
        if (slot && slot.id === source.id && slot.count < max) {
          const space = max - slot.count;
          const move = Math.min(source.count, space);
          slot.count += move;
          source.count -= move;
          if (source.count <= 0) {
            fromArr[index] = null;
            this.notifyChange();
            return;
          }
        }
      }
    }

    // Find first empty destination slot
    const emptyIdx = toArr.findIndex(s => s === null);
    if (emptyIdx !== -1) {
      toArr[emptyIdx] = source;
      fromArr[index] = null;
      this.notifyChange();
    }
  }

  // Decay durability of active tool; removes tool when broken
  decayActiveTool(amount = 1) {
    const slot = this.getSelectedSlot();
    if (!slot || slot.durability === undefined) return;

    slot.durability -= amount;
    if (slot.durability <= 0) {
      // Tool breaks!
      const itemDef = ITEMS[slot.id];
      const toolName = itemDef ? itemDef.name : 'Tool';
      this.hotbar[this.selectedHotbarIndex] = null;
      soundFX.playPop();
      this.notifyChange();
      return { broken: true, name: toolName };
    }

    this.notifyChange();
    return { broken: false, durability: slot.durability };
  }

  notifyChange() {
    if (this.onChange) {
      this.onChange({
        hotbar: this.hotbar,
        backpack: this.backpack,
        selectedIndex: this.selectedHotbarIndex,
        selectedSlot: this.getSelectedSlot()
      });
    }
  }

  serialize() {
    return {
      hotbar: this.hotbar,
      backpack: this.backpack,
      selectedIndex: this.selectedHotbarIndex
    };
  }

  deserialize(data) {
    if (!data) return;
    if (Array.isArray(data.hotbar)) this.hotbar = data.hotbar;
    if (Array.isArray(data.backpack)) this.backpack = data.backpack;
    if (typeof data.selectedIndex === 'number') this.selectedHotbarIndex = data.selectedIndex;
    this.notifyChange();
  }
}
