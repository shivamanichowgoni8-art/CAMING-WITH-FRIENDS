// Data-driven Items Registry for "The Living Valley"
// Defines all resources, tools with durability, edibles with survival stats, and placeable items.

export const ITEMS = {
  // --- Natural Resources ---
  log: {
    id: 'log',
    name: 'Pine Log',
    icon: '🪵',
    category: 'resource',
    stackMax: 30,
    desc: 'Sturdy pine timber chopped from forest trees. Fuel for fire and building material.'
  },
  stick: {
    id: 'stick',
    name: 'Fallen Branch',
    icon: '🥢',
    category: 'resource',
    stackMax: 50,
    desc: 'Light wooden branch gathered from the forest floor. Essential for crafting tools and kindling.'
  },
  stone: {
    id: 'stone',
    name: 'Granite Stone',
    icon: '🪨',
    category: 'resource',
    stackMax: 40,
    desc: 'Hard mountain stone mined from trail rocks. Used for foundations, fireplaces, and durable tools.'
  },
  flint: {
    id: 'flint',
    name: 'Sharp Flint',
    icon: '💎',
    category: 'resource',
    stackMax: 30,
    desc: 'Chipped sharp mineral found while mining trail boulders. Striking stone for fire and sharp edges.'
  },
  coal: {
    id: 'coal',
    name: 'Lump of Coal',
    icon: '⬛',
    category: 'resource',
    stackMax: 40,
    desc: 'Dense black fuel mined from deep mountain veins. Long-burning fuel for heat and torches.'
  },
  fiber: {
    id: 'fiber',
    name: 'Plant Fiber',
    icon: '🌿',
    category: 'resource',
    stackMax: 50,
    desc: 'Tough wild plant vines and nettles. Can be woven into sturdy cordage and thatch.'
  },
  tree_seed: {
    id: 'tree_seed',
    name: 'Pine Cone Seed',
    icon: '🌰',
    category: 'seed',
    stackMax: 30,
    desc: 'Fertile conifer seed. Plant in fertile ground to grow a new pine sapling.'
  },

  // --- Foraged & Food Items ---
  berry: {
    id: 'berry',
    name: 'Alpine Berries',
    icon: '🫐',
    category: 'food',
    stackMax: 40,
    food: { energy: 12, warmth: 2, comfort: 5 },
    desc: 'Sweet wild mountain berries picked from valley bushes. Sweet snack or brew into warm tea.'
  },
  mushroom: {
    id: 'mushroom',
    name: 'Forest Chanterelle',
    icon: '🍄',
    category: 'food',
    stackMax: 30,
    food: { energy: 10, warmth: 0, comfort: 2 },
    desc: 'Wild mushroom found in shaded tree groves and near decaying stumps. Best roasted over embers.'
  },
  fish_raw: {
    id: 'fish_raw',
    name: 'Fresh Lake Trout',
    icon: '🐟',
    category: 'food',
    stackMax: 20,
    food: { energy: 8, warmth: -2, comfort: 0 },
    desc: 'Freshly caught alpine fish. Needs to be cooked over the campfire to be delicious and safe.'
  },

  // --- Cooked Campfire Delicacies ---
  fish_cooked: {
    id: 'fish_cooked',
    name: 'Campfire Grilled Fish',
    icon: '🍳',
    category: 'food',
    stackMax: 20,
    food: { energy: 45, warmth: 25, comfort: 20 },
    desc: 'Crispy fire-grilled fish with smoky aroma. Greatly restores energy and keeps you warm.'
  },
  roasted_mushroom: {
    id: 'roasted_mushroom',
    name: 'Roasted Forest Skewer',
    icon: '🍢',
    category: 'food',
    stackMax: 25,
    food: { energy: 30, warmth: 15, comfort: 14 },
    desc: 'Tender mushrooms skewered and browned over coals. Wholesome and warming.'
  },
  berry_tea: {
    id: 'berry_tea',
    name: 'Warm Berry Infusion',
    icon: '🍵',
    category: 'food',
    stackMax: 15,
    food: { energy: 20, warmth: 38, comfort: 30 },
    desc: 'Steaming herbal tea made from steeped berries. Provides immense warmth during freezing nights.'
  },

  // --- Tools (with Durability) ---
  stone_axe: {
    id: 'stone_axe',
    name: 'Stone Hatchet',
    icon: '🪓',
    category: 'tool',
    stackMax: 1,
    tool: { type: 'axe', maxDurability: 60, speedMultiplier: 2.5 },
    desc: 'A chipped flint head lashed to a wooden handle. Chops pine trees in a fraction of the time.'
  },
  pickaxe: {
    id: 'pickaxe',
    name: 'Mountain Pickaxe',
    icon: '⛏️',
    category: 'tool',
    stackMax: 1,
    tool: { type: 'pickaxe', maxDurability: 50, speedMultiplier: 2.0 },
    desc: 'Heavy pick crafted for breaking rocky outcrops. Yields stone, flint, and coal veins.'
  },
  shovel: {
    id: 'shovel',
    name: 'Carved Wood Shovel',
    icon: '🛶',
    category: 'tool',
    stackMax: 1,
    tool: { type: 'shovel', maxDurability: 45, speedMultiplier: 1.5 },
    desc: 'Broad scoop for tilling ash-rich soil and planting seeds.'
  },
  fishing_rod: {
    id: 'fishing_rod',
    name: 'Bamboo Fishing Rod',
    icon: '🎣',
    category: 'tool',
    stackMax: 1,
    tool: { type: 'rod', maxDurability: 35, speedMultiplier: 1.6 },
    desc: 'Flexible pole with braided fiber line. Boosts strike sweet spot and catch rate at the dock.'
  },
  torch: {
    id: 'torch',
    name: 'Pitch Torch',
    icon: '🕯️',
    category: 'tool',
    stackMax: 10,
    tool: { type: 'torch', maxDurability: 120 }, // 120 seconds of burn time
    desc: 'Resin-soaked branch burning with bright yellow light. Wards off cold and illuminates dark paths.'
  },
  waterskin: {
    id: 'waterskin',
    name: 'Leather Waterskin',
    icon: '🍶',
    category: 'tool',
    stackMax: 1,
    tool: { type: 'waterskin', maxDurability: 10 },
    desc: 'Filled with fresh alpine stream water. Quenches thirst and purifies.'
  },

  // --- Building Pieces & Crafting Stations (Placeables) ---
  wooden_plank: {
    id: 'wooden_plank',
    name: 'Carved Plank',
    icon: '🪵',
    category: 'resource',
    stackMax: 60,
    desc: 'Milled wooden lumber. Standard construction unit for floors and wall framing.'
  },
  rope: {
    id: 'rope',
    name: 'Braided Rope',
    icon: '🪢',
    category: 'resource',
    stackMax: 40,
    desc: 'Strong braided cordage spun from wild fibers.'
  },
  workbench_item: {
    id: 'workbench_item',
    name: 'Carpentry Workbench',
    icon: '🛠️',
    category: 'placeable',
    stackMax: 5,
    placeableType: 'workbench',
    desc: 'Heavy wooden table with vise and tool racks. Unlocks advanced crafting recipes and furniture.'
  },
  chest_item: {
    id: 'chest_item',
    name: 'Shared Storage Chest',
    icon: '📦',
    category: 'placeable',
    stackMax: 5,
    placeableType: 'chest',
    desc: 'A wooden chest accessible to all campers in the lobby to store and share gathered resources.'
  },
  bed_item: {
    id: 'bed_item',
    name: 'Cozy Sleeping Bed',
    icon: '🛏️',
    category: 'placeable',
    stackMax: 5,
    placeableType: 'bed',
    desc: 'Woolen mattress and timber frame. Sleep inside a shelter to rest and vote to skip the dark night.'
  }
};

export function getItem(id) {
  return ITEMS[id] || null;
}

export function getItemsByCategory(category) {
  if (!category) return Object.values(ITEMS);
  return Object.values(ITEMS).filter(item => item.category === category);
}
