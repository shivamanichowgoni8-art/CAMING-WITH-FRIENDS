// Data-Driven Recipe Registry for "The Living Valley"
// Easily expandable: each recipe defines category, ingredients, and crafted output.

export const RECIPES = [
  // =========================================================================
  // 1. POCKET CRAFTING (Inventory 2x2 - Available anywhere without workbench)
  // =========================================================================
  {
    id: 'craft_planks',
    name: 'Carved Planks',
    category: 'pocket',
    output: { id: 'wooden_plank', count: 4 },
    ingredients: [
      { id: 'log', count: 1 }
    ],
    desc: 'Saw one pine timber log into 4 workable wooden planks.'
  },
  {
    id: 'craft_sticks',
    name: 'Sticks & Kindling',
    category: 'pocket',
    output: { id: 'stick', count: 4 },
    ingredients: [
      { id: 'wooden_plank', count: 1 }
    ],
    desc: 'Carve a wooden plank into 4 sturdy sticks and kindling.'
  },
  {
    id: 'craft_rope',
    name: 'Braided Rope',
    category: 'pocket',
    output: { id: 'rope', count: 1 },
    ingredients: [
      { id: 'fiber', count: 3 }
    ],
    desc: 'Twist wild plant fibers into a durable length of cordage.'
  },
  {
    id: 'craft_torch',
    name: 'Camp Torch',
    category: 'pocket',
    output: { id: 'torch', count: 2 },
    ingredients: [
      { id: 'stick', count: 1 },
      { id: 'coal', count: 1 }
    ],
    desc: 'Light source that wards off the cold night and illuminates trails.'
  },
  {
    id: 'craft_stone_axe',
    name: 'Stone Hatchet',
    category: 'pocket',
    output: { id: 'stone_axe', count: 1 },
    ingredients: [
      { id: 'stick', count: 2 },
      { id: 'stone', count: 3 }
    ],
    desc: 'Basic axe to fell pine trees twice as fast.'
  },
  {
    id: 'craft_pickaxe',
    name: 'Mountain Pickaxe',
    category: 'pocket',
    output: { id: 'pickaxe', count: 1 },
    ingredients: [
      { id: 'stick', count: 2 },
      { id: 'stone', count: 3 }
    ],
    desc: 'Heavy pick to fracture rocks and mine flint and coal veins.'
  },
  {
    id: 'craft_workbench',
    name: 'Carpentry Workbench',
    category: 'pocket',
    output: { id: 'workbench_item', count: 1 },
    ingredients: [
      { id: 'wooden_plank', count: 4 }
    ],
    desc: 'Crafting station required to build furniture, chests, and shelter pieces.'
  },

  // =========================================================================
  // 2. WORKBENCH RECIPES (Requires nearby Workbench)
  // =========================================================================
  {
    id: 'craft_shared_chest',
    name: 'Shared Storage Chest',
    category: 'workbench',
    output: { id: 'chest_item', count: 1 },
    ingredients: [
      { id: 'wooden_plank', count: 8 }
    ],
    desc: 'Placeable storage box that syncs with all campers in the room.'
  },
  {
    id: 'craft_bed',
    name: 'Cozy Sleeping Bed',
    category: 'workbench',
    output: { id: 'bed_item', count: 1 },
    ingredients: [
      { id: 'wooden_plank', count: 6 },
      { id: 'fiber', count: 6 }
    ],
    desc: 'Sheltered bed that restores energy and allows voting to skip night.'
  },
  {
    id: 'craft_shovel',
    name: 'Carved Wood Shovel',
    category: 'workbench',
    output: { id: 'shovel', count: 1 },
    ingredients: [
      { id: 'stick', count: 2 },
      { id: 'stone', count: 1 },
      { id: 'rope', count: 1 }
    ],
    desc: 'Digs rich soil for accelerated tree planting.'
  },
  {
    id: 'craft_fishing_rod',
    name: 'Bamboo Fishing Rod',
    category: 'workbench',
    output: { id: 'fishing_rod', count: 1 },
    ingredients: [
      { id: 'stick', count: 3 },
      { id: 'rope', count: 2 }
    ],
    desc: 'Handcrafted rod with line that increases fish strike precision.'
  },
  {
    id: 'craft_waterskin',
    name: 'Leather Waterskin',
    category: 'workbench',
    output: { id: 'waterskin', count: 1 },
    ingredients: [
      { id: 'fiber', count: 4 },
      { id: 'rope', count: 1 }
    ],
    desc: 'Portable container for water and broth.'
  },

  // =========================================================================
  // 3. CAMPFIRE COOKING RECIPES (Requires standing near Campfire)
  // =========================================================================
  {
    id: 'cook_grilled_fish',
    name: 'Campfire Grilled Fish',
    category: 'cooking',
    output: { id: 'fish_cooked', count: 1 },
    ingredients: [
      { id: 'fish_raw', count: 1 }
    ],
    desc: 'Roast raw lake trout over coals. Restores 45 Energy, 25 Warmth, and 20 Comfort.'
  },
  {
    id: 'cook_mushrooms',
    name: 'Roasted Forest Skewer',
    category: 'cooking',
    output: { id: 'roasted_mushroom', count: 1 },
    ingredients: [
      { id: 'mushroom', count: 2 },
      { id: 'stick', count: 1 }
    ],
    desc: 'Fragrant wild mushrooms grilled on a skewer. Restores 30 Energy and 15 Warmth.'
  },
  {
    id: 'cook_berry_tea',
    name: 'Warm Berry Infusion',
    category: 'cooking',
    output: { id: 'berry_tea', count: 1 },
    ingredients: [
      { id: 'berry', count: 3 },
      { id: 'stick', count: 1 }
    ],
    desc: 'Herbal berry tea brewed in an iron pot. Provides 38 Warmth against freezing nights.'
  }
];

import { ITEMS } from './items.js';

export function validateRecipes() {
  let allValid = true;
  for (const recipe of RECIPES) {
    if (!recipe.id || !recipe.output || !recipe.ingredients) {
      console.warn('[Recipes] Malformed recipe definition:', recipe);
      allValid = false;
      continue;
    }
    if (!ITEMS[recipe.output.id]) {
      console.warn(`[Recipes] Recipe "${recipe.id}" has unknown output item ID: "${recipe.output.id}"`);
      allValid = false;
    }
    for (const ing of recipe.ingredients) {
      if (!ITEMS[ing.id]) {
        console.warn(`[Recipes] Recipe "${recipe.id}" has unknown ingredient item ID: "${ing.id}"`);
        allValid = false;
      }
    }
  }
  return allValid;
}

// Run validation once at module initialization
validateRecipes();

export function getRecipe(id) {
  if (!id) {
    console.warn('[Recipes] getRecipe called with empty or undefined ID');
    return null;
  }
  const r = RECIPES.find(rec => rec.id === id);
  if (!r) {
    console.warn(`[Recipes] Recipe ID "${id}" not found in RECIPES registry`);
    return null;
  }
  return r;
}

export function getRecipesByCategory(category) {
  if (!category) return RECIPES;
  return RECIPES.filter(r => r.category === category);
}

export function canCraft(recipe, inventory) {
  if (!recipe || !inventory) return false;
  return recipe.ingredients.every(ing => {
    return (inventory.getItemCount ? inventory.getItemCount(ing.id) : 0) >= ing.count;
  });
}
