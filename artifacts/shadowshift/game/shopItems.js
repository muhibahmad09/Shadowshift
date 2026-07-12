// Shop catalog — static definitions for every purchasable cosmetic.
// Pure data: no DOM, no persistence. See shopStore.js for ownership/equip
// state and wallet.js for the currency that pays for it.

export const SHOP_CATEGORIES = [
  { id: 'skins', label: 'Skins' },
  { id: 'trails', label: 'Trails' },
  { id: 'worldEffects', label: 'World FX' },
  { id: 'themes', label: 'Themes' },
];

export const SHOP_ITEMS = [
  // --- Character skins: recolor the runner's body/limbs/glow. ---
  {
    id: 'skin-violet',
    category: 'skins',
    name: 'Violet Drifter',
    price: 0,
    swatch: '#c4b5fd',
    skin: { body: '#c4b5fd', limb: '#8b5cf6', arm: '#a78bfa', glow: 'rgba(139, 92, 246, 0.65)' },
  },
  {
    id: 'skin-ember',
    category: 'skins',
    name: 'Ember Runner',
    price: 120,
    swatch: '#f87171',
    skin: { body: '#fca5a5', limb: '#dc2626', arm: '#f87171', glow: 'rgba(220, 38, 38, 0.65)' },
  },
  {
    id: 'skin-aqua',
    category: 'skins',
    name: 'Aqua Phase',
    price: 120,
    swatch: '#22d3ee',
    skin: { body: '#a5f3fc', limb: '#0891b2', arm: '#22d3ee', glow: 'rgba(8, 145, 178, 0.65)' },
  },
  {
    id: 'skin-toxic',
    category: 'skins',
    name: 'Toxic Bloom',
    price: 250,
    swatch: '#4ade80',
    skin: { body: '#bbf7d0', limb: '#15803d', arm: '#4ade80', glow: 'rgba(21, 128, 61, 0.65)' },
  },
  {
    id: 'skin-gold',
    category: 'skins',
    name: 'Gilded Sprinter',
    price: 400,
    swatch: '#fbbf24',
    skin: { body: '#fde68a', limb: '#b45309', arm: '#fbbf24', glow: 'rgba(180, 83, 9, 0.7)' },
  },
  {
    id: 'skin-void',
    category: 'skins',
    name: 'Voidwalker',
    price: 650,
    swatch: '#9ca3af',
    skin: { body: '#e5e7eb', limb: '#1f2937', arm: '#4b5563', glow: 'rgba(31, 41, 55, 0.8)' },
  },

  // --- Trails: motion-trail afterimage color behind the runner. ---
  { id: 'trail-violet', category: 'trails', name: 'Violet Streak', price: 0, swatch: '#8b5cf6', trail: { color: '#8b5cf6' } },
  { id: 'trail-none', category: 'trails', name: 'No Trail', price: 0, swatch: 'rgba(255,255,255,0.08)', trail: { color: null } },
  { id: 'trail-ember', category: 'trails', name: 'Ember Streak', price: 100, swatch: '#f97316', trail: { color: '#f97316' } },
  { id: 'trail-frost', category: 'trails', name: 'Frost Streak', price: 100, swatch: '#38bdf8', trail: { color: '#38bdf8' } },
  { id: 'trail-toxic', category: 'trails', name: 'Toxic Streak', price: 200, swatch: '#4ade80', trail: { color: '#4ade80' } },
  {
    id: 'trail-prism',
    category: 'trails',
    name: 'Prism Streak',
    price: 450,
    swatch: 'conic-gradient(from 0deg, #f87171, #fbbf24, #4ade80, #38bdf8, #a78bfa, #f87171)',
    trail: { color: 'rainbow' },
  },

  // --- World effects: ambient floating-particle color during a run. ---
  { id: 'fx-classic', category: 'worldEffects', name: 'Classic Motes', price: 0, swatch: 'rgba(255,255,255,0.08)', worldEffect: { particleColor: null } },
  { id: 'fx-embers', category: 'worldEffects', name: 'Rising Embers', price: 150, swatch: '#f97316', worldEffect: { particleColor: '#f97316' } },
  { id: 'fx-fireflies', category: 'worldEffects', name: 'Fireflies', price: 150, swatch: '#facc15', worldEffect: { particleColor: '#facc15' } },
  { id: 'fx-frost', category: 'worldEffects', name: 'Frost Drift', price: 300, swatch: '#7dd3fc', worldEffect: { particleColor: '#7dd3fc' } },
  { id: 'fx-starlight', category: 'worldEffects', name: 'Starlight Dust', price: 450, swatch: '#f0abfc', worldEffect: { particleColor: '#f0abfc' } },

  // --- Color themes: override both worlds' full background/ground/accent palette. ---
  {
    id: 'theme-classic',
    category: 'themes',
    name: 'Classic',
    price: 0,
    swatch: '#8b5cf6',
    theme: {
      light: { bgInner: '#fdfbff', bgOuter: '#c9b8f8', ground: '#4b3f7a', accent: '#6d28d9', hudText: '#241a3d' },
      shadow: { bgInner: '#12162a', bgOuter: '#05060a', ground: '#8b5cf6', accent: '#c4b5fd', hudText: '#e8e6f5' },
    },
  },
  {
    id: 'theme-sunset',
    category: 'themes',
    name: 'Sunset Rift',
    price: 250,
    swatch: '#ea580c',
    theme: {
      light: { bgInner: '#fff6ec', bgOuter: '#f7b98c', ground: '#7a3b1e', accent: '#ea580c', hudText: '#3a1c0d' },
      shadow: { bgInner: '#2a1220', bgOuter: '#0d0508', ground: '#fb923c', accent: '#fdba74', hudText: '#fde8d8' },
    },
  },
  {
    id: 'theme-frost',
    category: 'themes',
    name: 'Frostbite',
    price: 250,
    swatch: '#0ea5e9',
    theme: {
      light: { bgInner: '#f4fbff', bgOuter: '#bfe3f7', ground: '#284a5e', accent: '#0ea5e9', hudText: '#0b2531' },
      shadow: { bgInner: '#0b1a24', bgOuter: '#020608', ground: '#38bdf8', accent: '#bae6fd', hudText: '#e6f6ff' },
    },
  },
  {
    id: 'theme-toxic',
    category: 'themes',
    name: 'Toxic Circuit',
    price: 400,
    swatch: '#22c55e',
    theme: {
      light: { bgInner: '#f2ffe8', bgOuter: '#a3e88f', ground: '#245c1f', accent: '#22c55e', hudText: '#12280d' },
      shadow: { bgInner: '#0c1c0a', bgOuter: '#020602', ground: '#4ade80', accent: '#86efac', hudText: '#e3ffe0' },
    },
  },
  {
    id: 'theme-nebula',
    category: 'themes',
    name: 'Nebula',
    price: 600,
    swatch: '#a21caf',
    theme: {
      light: { bgInner: '#fdf2ff', bgOuter: '#d9a6f7', ground: '#4a1d6e', accent: '#a21caf', hudText: '#2a0d3d' },
      shadow: { bgInner: '#170a24', bgOuter: '#050208', ground: '#c026d3', accent: '#e879f9', hudText: '#f6e3ff' },
    },
  },
];

export function getItemsByCategory(category) {
  return SHOP_ITEMS.filter((item) => item.category === category);
}

export function getItem(id) {
  return SHOP_ITEMS.find((item) => item.id === id);
}
