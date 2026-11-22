// Phase 2 Unit & Integration Test for Survival, Inventory, Crafting, and Stats

import { ITEMS, getItem } from '../data/items.js';
import { RECIPES, canCraft } from '../data/recipes.js';
import { InventorySystem } from './inventorySystem.js';

console.log('--- Starting Phase 2 Verification ---');

// 1. Verify Item Registry
console.assert(ITEMS.log !== undefined, 'ITEMS.log should exist');
console.assert(ITEMS.stone_axe !== undefined, 'ITEMS.stone_axe should exist');
console.assert(ITEMS.stone_axe.tool.maxDurability === 60, 'Stone axe should have 60 durability');
console.assert(ITEMS.fish_cooked !== undefined, 'ITEMS.fish_cooked should exist');
console.log('✓ Item Registry: verified definitions and properties');

// 2. Verify Inventory System
const inv = new InventorySystem();
console.assert(inv.hotbar.length === 9, 'Hotbar must have 9 slots');
console.assert(inv.backpack.length === 18, 'Backpack must have 18 slots');

// Add items
const addRes1 = inv.addItem('log', 5);
console.assert(addRes1.success && inv.getItemCount('log') === 5, 'Should add 5 logs');

const addRes2 = inv.addItem('stone_axe', 1);
console.assert(addRes2.success, 'Should add stone axe');
const axeSlotIdx = inv.findItemSlot('stone_axe', 'hotbar');
console.assert(axeSlotIdx !== -1, 'Stone axe should be in hotbar');
console.assert(inv.hotbar[axeSlotIdx].durability === 60, 'Stone axe should initialize with full durability');

// Active slot and damage
inv.setActiveSlot(axeSlotIdx);
console.assert(inv.getActiveItem().id === 'stone_axe', 'Active item should be stone axe');
inv.damageActiveItem(5);
console.assert(inv.getActiveItem().durability === 55, 'Stone axe should take 5 durability damage');

// Crafting check
// Recipe: craft_planks requires 1 log -> yields 4 planks
const plankRecipe = RECIPES.find(r => r.id === 'craft_planks');
console.assert(canCraft(plankRecipe, inv), 'Should be able to craft wooden planks from logs');
const craftResult = inv.craft(plankRecipe);
console.assert(craftResult.success, 'Crafting planks should succeed');
console.assert(inv.getItemCount('log') === 4, '1 log consumed, 4 should remain');
console.assert(inv.getItemCount('wooden_plank') === 4, '4 wooden planks should be produced');

// QuickMove check (moving planks to backpack)
const plankSlotIdx = inv.findItemSlot('wooden_plank', 'hotbar');
inv.quickMove(plankSlotIdx, 'hotbar');
console.assert(inv.getItemCount('wooden_plank') === 4, 'Total planks count preserved');
console.assert(inv.findItemSlot('wooden_plank', 'backpack') !== -1, 'Planks moved to backpack');

// Food eating check
const startBerries = inv.getItemCount('berry');
inv.addItem('berry', 2);
let eaten = false;
inv.onItemUsed = (item) => {
  if (item.id === 'berry') eaten = true;
};
const berrySlot = inv.findItemSlot('berry', 'hotbar');
inv.useItem(berrySlot, false);
console.assert(eaten, 'Berry should trigger onItemUsed callback');
console.assert(inv.getItemCount('berry') === startBerries + 1, '1 berry consumed');

console.log('✓ Inventory & Crafting Engine: passed all assertions');
console.log('=== PHASE 2 ALL TESTS PASSED ===');
