// Crafting & Backpack UI Modal for "The Living Valley"
// Mobile-friendly responsive panel: 2x2 Pocket Crafting, Workbench, Campfire Cooking, and Backpack Grid.

import { ITEMS } from '../data/items.js';
import { RECIPES } from '../data/recipes.js';
import { soundFX } from '../utils/soundFX.js';

export class CraftingUI {
  constructor(container, { inventory, onCraftRecipe, onEatFood, isNearCampfire, isNearWorkbench }) {
    this.container = container;
    this.inventory = inventory;
    this.onCraftRecipe = onCraftRecipe;
    this.onEatFood = onEatFood;
    this.isNearCampfire = isNearCampfire || (() => false);
    this.isNearWorkbench = isNearWorkbench || (() => false);

    this.isOpen = false;
    this.activeTab = 'crafting'; // 'crafting', 'backpack', 'cooking'
    this.craftableOnly = false;
    this.selectedRecipeId = RECIPES[0]?.id;
    this.selectedInventorySlot = null; // { container: 'hotbar'|'backpack', index: N }

    this.render();
    this.bindEvents();

    if (this.inventory) {
      this.inventory.onChange = () => {
        if (this.isOpen) this.refreshContent();
      };
    }
  }

  toggle(forceState = null) {
    this.isOpen = forceState !== null ? forceState : !this.isOpen;
    const modal = this.container.querySelector('#crafting-modal');
    if (!modal) return;

    if (this.isOpen) {
      modal.classList.remove('hidden');
      soundFX.playPop();
      // Auto-switch to cooking tab if near campfire
      if (this.isNearCampfire() && this.activeTab !== 'cooking') {
        this.activeTab = 'cooking';
      }
      this.refreshContent();
    } else {
      modal.classList.add('hidden');
      this.selectedInventorySlot = null;
    }
  }

  render() {
    this.container.innerHTML = `
      <div id="crafting-modal" class="party-modal-backdrop hidden">
        <div class="crafting-card glass-panel">
          <!-- Header with Tabs -->
          <div class="crafting-header">
            <div class="crafting-title-group">
              <span class="crafting-icon">🎒</span>
              <h2>Wilderness Crafting & Pack</h2>
            </div>
            <div class="crafting-tabs">
              <button id="tab-btn-crafting" class="crafting-tab-btn active">🔨 Crafting</button>
              <button id="tab-btn-backpack" class="crafting-tab-btn">🎒 Backpack</button>
              <button id="tab-btn-cooking" class="crafting-tab-btn">🍳 Cooking</button>
            </div>
            <button id="btn-close-crafting" class="party-close-btn" title="Close Panel">✕</button>
          </div>

          <div class="crafting-body">
            <!-- Filter Bar for Recipes -->
            <div id="recipe-filter-bar" class="recipe-filter-row">
              <label class="craftable-toggle-label">
                <input type="checkbox" id="check-craftable-only" />
                <span>Show Craftable Only</span>
              </label>
              <span id="workbench-status-pill" class="station-pill">Pocket 2x2</span>
            </div>

            <!-- Content Container -->
            <div id="crafting-content-area" class="crafting-content-area"></div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const modal = this.container.querySelector('#crafting-modal');
    const closeBtn = this.container.querySelector('#btn-close-crafting');
    const tabCraft = this.container.querySelector('#tab-btn-crafting');
    const tabBackpack = this.container.querySelector('#tab-btn-backpack');
    const tabCooking = this.container.querySelector('#tab-btn-cooking');
    const craftableCheck = this.container.querySelector('#check-craftable-only');

    closeBtn.addEventListener('click', () => this.toggle(false));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.toggle(false);
    });

    tabCraft.addEventListener('click', () => this.switchTab('crafting'));
    tabBackpack.addEventListener('click', () => this.switchTab('backpack'));
    tabCooking.addEventListener('click', () => this.switchTab('cooking'));

    craftableCheck.addEventListener('change', (e) => {
      this.craftableOnly = e.target.checked;
      this.refreshContent();
    });

    // Keyboard 'C' or 'B' to toggle crafting / backpack
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'KeyC' || e.code === 'KeyB') {
        if (!this.isOpen) {
          this.activeTab = (e.code === 'KeyB') ? 'backpack' : 'crafting';
        }
        this.toggle();
      } else if (e.code === 'Escape' && this.isOpen) {
        this.toggle(false);
      }
    });
  }

  switchTab(tab) {
    this.activeTab = tab;
    const tabs = this.container.querySelectorAll('.crafting-tab-btn');
    tabs.forEach(t => t.classList.remove('active'));

    const activeBtn = this.container.querySelector(`#tab-btn-${tab}`);
    if (activeBtn) activeBtn.classList.add('active');

    soundFX.playPop();
    this.refreshContent();
  }

  refreshContent() {
    const content = this.container.querySelector('#crafting-content-area');
    const filterBar = this.container.querySelector('#recipe-filter-bar');
    const stationPill = this.container.querySelector('#workbench-status-pill');

    if (this.activeTab === 'backpack') {
      filterBar.style.display = 'none';
      content.innerHTML = this.renderBackpackView();
      this.bindBackpackEvents();
    } else {
      filterBar.style.display = 'flex';
      const nearBench = this.isNearWorkbench();
      const nearFire = this.isNearCampfire();

      if (this.activeTab === 'cooking') {
        stationPill.textContent = nearFire ? '🔥 At Campfire' : '⚠️ Need Campfire';
        stationPill.className = nearFire ? 'station-pill active' : 'station-pill warning';
      } else {
        stationPill.textContent = nearBench ? '🛠️ At Workbench' : 'Pocket 2x2';
        stationPill.className = nearBench ? 'station-pill active' : 'station-pill';
      }

      content.innerHTML = this.renderRecipeView();
      this.bindRecipeEvents();
    }
  }

  // -------------------------------------------------------------
  // RECIPES LIST & CRAFTING VIEW
  // -------------------------------------------------------------
  renderRecipeView() {
    const isCooking = (this.activeTab === 'cooking');
    const targetCategory = isCooking ? 'cooking' : null;
    const nearBench = this.isNearWorkbench();
    const nearFire = this.isNearCampfire();

    let list = RECIPES.filter(recipe => {
      if (isCooking) return recipe.category === 'cooking';
      if (recipe.category === 'cooking') return false;
      // Workbench recipes require standing near a workbench
      if (recipe.category === 'workbench' && !nearBench) return false;
      return true;
    });

    if (this.craftableOnly) {
      list = list.filter(r => this.inventory.hasIngredients(r.ingredients));
    }

    if (list.length === 0) {
      return `
        <div class="empty-recipes-msg">
          <p>No recipes match the current criteria.</p>
          <small>${isCooking && !nearFire ? 'Walk near the central campfire to cook hot meals!' : ''}</small>
        </div>
      `;
    }

    // Default select first recipe if none selected or no longer in list
    if (!list.some(r => r.id === this.selectedRecipeId)) {
      this.selectedRecipeId = list[0].id;
    }

    const selectedRecipe = RECIPES.find(r => r.id === this.selectedRecipeId) || list[0];
    const outItem = ITEMS[selectedRecipe.output.id] || {};
    const canCraft = this.inventory.hasIngredients(selectedRecipe.ingredients) && (!isCooking || nearFire);

    return `
      <div class="recipes-split-view">
        <!-- Recipe Selector List -->
        <div class="recipe-cards-list">
          ${list.map(r => {
            const out = ITEMS[r.output.id] || {};
            const craftable = this.inventory.hasIngredients(r.ingredients) && (!isCooking || nearFire);
            const isSel = r.id === this.selectedRecipeId;
            return `
              <div class="recipe-item-card ${isSel ? 'selected' : ''} ${craftable ? 'can-craft' : ''}" data-recipe-id="${r.id}">
                <div class="recipe-icon">${out.icon || '📦'}</div>
                <div class="recipe-info">
                  <div class="recipe-name">${r.name}</div>
                  <div class="recipe-out-count">Yield: ${r.output.count}x</div>
                </div>
                <div class="recipe-status-indicator">${craftable ? '✨' : '🔒'}</div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Recipe Detail Preview & Craft Action -->
        <div class="recipe-detail-panel">
          <div class="detail-hero">
            <span class="detail-big-icon">${outItem.icon || '📦'}</span>
            <div class="detail-hero-info">
              <h3 class="detail-title">${selectedRecipe.name}</h3>
              <p class="detail-desc">${selectedRecipe.desc || outItem.desc || ''}</p>
            </div>
          </div>

          <!-- Required Ingredients -->
          <div class="ingredients-list-header">Required Materials</div>
          <div class="ingredients-grid">
            ${selectedRecipe.ingredients.map(ing => {
              const item = ITEMS[ing.id] || {};
              const currentCount = this.inventory.getItemCount(ing.id);
              const enough = currentCount >= ing.count;
              return `
                <div class="ingredient-badge ${enough ? 'has-enough' : 'missing'}">
                  <span class="ing-icon">${item.icon || '🪵'}</span>
                  <span class="ing-name">${item.name || ing.id}</span>
                  <span class="ing-count">${currentCount} / ${ing.count}</span>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Craft Button -->
          <div class="craft-action-wrapper">
            <button id="btn-execute-craft" class="btn btn-primary btn-craft ${canCraft ? '' : 'disabled'}" ${canCraft ? '' : 'disabled'}>
              ${isCooking ? '🍳 Cook over Fire' : '🔨 Craft Item'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  bindRecipeEvents() {
    const list = this.container.querySelectorAll('.recipe-item-card');
    list.forEach(card => {
      card.addEventListener('click', () => {
        this.selectedRecipeId = card.getAttribute('data-recipe-id');
        soundFX.playPop();
        this.refreshContent();
      });
    });

    const craftBtn = this.container.querySelector('#btn-execute-craft');
    if (craftBtn) {
      craftBtn.addEventListener('click', () => {
        const recipe = RECIPES.find(r => r.id === this.selectedRecipeId);
        if (!recipe) return;

        if (this.inventory.hasIngredients(recipe.ingredients)) {
          this.inventory.consumeIngredients(recipe.ingredients);
          this.inventory.addItem(recipe.output.id, recipe.output.count);
          soundFX.playSuccess();

          if (this.onCraftRecipe) {
            this.onCraftRecipe(recipe);
          }
          this.refreshContent();
        }
      });
    }
  }

  // -------------------------------------------------------------
  // BACKPACK & HOTBAR INVENTORY VIEW
  // -------------------------------------------------------------
  renderBackpackView() {
    const renderSlot = (slot, container, idx) => {
      if (!slot) {
        return `<div class="inv-grid-slot empty" data-container="${container}" data-index="${idx}"></div>`;
      }
      const itemDef = ITEMS[slot.id] || {};
      const durPct = slot.durability !== undefined && itemDef.tool ? Math.round((slot.durability / itemDef.tool.maxDurability) * 100) : null;
      const isSel = this.selectedInventorySlot && this.selectedInventorySlot.container === container && this.selectedInventorySlot.index === idx;

      return `
        <div class="inv-grid-slot filled ${isSel ? 'selected' : ''}" data-container="${container}" data-index="${idx}">
          <span class="slot-icon">${itemDef.icon || '📦'}</span>
          ${slot.count > 1 ? `<span class="slot-count">${slot.count}</span>` : ''}
          ${durPct !== null ? `<div class="durability-bar" style="width: ${durPct}%;"></div>` : ''}
        </div>
      `;
    };

    const selSlot = this.selectedInventorySlot
      ? (this.selectedInventorySlot.container === 'hotbar' ? this.inventory.hotbar[this.selectedInventorySlot.index] : this.inventory.backpack[this.selectedInventorySlot.index])
      : null;
    const selItem = selSlot ? ITEMS[selSlot.id] : null;

    return `
      <div class="backpack-view-wrapper">
        <div class="backpack-grids-column">
          <!-- Main Backpack Grid (3x6 = 18 slots) -->
          <div class="grid-section-label">Backpack (Tap slot to move/inspect)</div>
          <div class="backpack-grid-18">
            ${this.inventory.backpack.map((s, i) => renderSlot(s, 'backpack', i)).join('')}
          </div>

          <!-- Hotbar Grid (9 slots) -->
          <div class="grid-section-label">Equipped Hotbar (Number keys 1-9)</div>
          <div class="hotbar-grid-9">
            ${this.inventory.hotbar.map((s, i) => renderSlot(s, 'hotbar', i)).join('')}
          </div>
        </div>

        <!-- Slot Details / Item Inspector -->
        <div class="slot-inspector-panel">
          ${selSlot && selItem ? `
            <div class="inspect-icon-hero">${selItem.icon}</div>
            <div class="inspect-title">${selItem.name}</div>
            <div class="inspect-category">${selItem.category.toUpperCase()} • Qty: ${selSlot.count}</div>
            <p class="inspect-desc">${selItem.desc || ''}</p>

            ${selItem.food ? `
              <div class="food-stats-preview">
                <span>⚡ +${selItem.food.energy} Energy</span>
                <span>🔥 +${selItem.food.warmth} Warmth</span>
                <span>🛋️ +${selItem.food.comfort} Comfort</span>
              </div>
            ` : ''}

            <div class="inspect-actions">
              ${selItem.food ? `<button id="btn-inspect-eat" class="btn btn-primary">Eat / Drink</button>` : ''}
              <button id="btn-inspect-move" class="btn btn-secondary">Move to ${this.selectedInventorySlot.container === 'hotbar' ? 'Backpack' : 'Hotbar'}</button>
            </div>
          ` : `
            <div class="inspect-placeholder">
              <p>Tap or click any item slot to inspect details, consume food, or re-arrange your pack.</p>
            </div>
          `}
        </div>
      </div>
    `;
  }

  bindBackpackEvents() {
    const slots = this.container.querySelectorAll('.inv-grid-slot');
    slots.forEach(slotEl => {
      slotEl.addEventListener('click', () => {
        const container = slotEl.getAttribute('data-container');
        const index = parseInt(slotEl.getAttribute('data-index'), 10);

        if (this.selectedInventorySlot && (this.selectedInventorySlot.container !== container || this.selectedInventorySlot.index !== index)) {
          // If we had a slot selected and clicked another slot, perform swap/move!
          this.inventory.moveSlot(
            this.selectedInventorySlot.container,
            this.selectedInventorySlot.index,
            container,
            index
          );
          soundFX.playPop();
          this.selectedInventorySlot = null;
        } else {
          // Select slot
          const slotData = (container === 'hotbar' ? this.inventory.hotbar[index] : this.inventory.backpack[index]);
          this.selectedInventorySlot = slotData ? { container, index } : null;
          soundFX.playPop();
        }
        this.refreshContent();
      });
    });

    const eatBtn = this.container.querySelector('#btn-inspect-eat');
    if (eatBtn && this.selectedInventorySlot) {
      eatBtn.addEventListener('click', () => {
        const { container, index } = this.selectedInventorySlot;
        const arr = container === 'hotbar' ? this.inventory.hotbar : this.inventory.backpack;
        const slot = arr[index];
        if (slot) {
          const item = ITEMS[slot.id];
          if (item && item.food) {
            if (this.onEatFood) this.onEatFood(item);
            soundFX.playPop();
            slot.count--;
            if (slot.count <= 0) arr[index] = null;
            this.inventory.notifyChange();
            this.refreshContent();
          }
        }
      });
    }

    const moveBtn = this.container.querySelector('#btn-inspect-move');
    if (moveBtn && this.selectedInventorySlot) {
      moveBtn.addEventListener('click', () => {
        const { container, index } = this.selectedInventorySlot;
        this.inventory.quickMove(container, index);
        soundFX.playPop();
        this.selectedInventorySlot = null;
        this.refreshContent();
      });
    }
  }
}
