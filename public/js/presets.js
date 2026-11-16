// Skins de personajes de anime y videojuegos (homenajes en pixel art para uso personal).
// Cada una es un aspecto completo que se puede aplicar a cualquier agente desde el editor.
export const PRESETS = {
  goku:    { label: 'Goku', look: {
    hairStyle: 'puntas', hair: '#1a1a1a', skin: '#f1c7a3', shirt: '#f5821e', pants: '#f5821e', shoes: '#2a4aa0',
    eyes: '#1b1426', accessory: ['belt'], accent: '#2a4aa0', accent2: '#2a4aa0' } },
  vegeta:  { label: 'Vegeta', look: {
    hairStyle: 'llama', hair: '#1a1a1a', skin: '#f1c7a3', shirt: '#2a3aa0', pants: '#2a3aa0', shoes: '#f0f0f0',
    eyes: '#1b1426', accessory: ['armor'], accent: '#f5d442', accent2: '#2a3aa0' } },
  naruto:  { label: 'Naruto', look: {
    hairStyle: 'puntas', hair: '#f5d442', skin: '#f1c7a3', shirt: '#f58a1e', pants: '#f58a1e', shoes: '#2a3a6a',
    eyes: '#3d7bff', accessory: ['bandana'], accent: '#1b1426', accent2: '#2a3a8a' } },
  kakashi: { label: 'Kakashi', look: {
    hairStyle: 'puntas', hair: '#d8d8e0', skin: '#f1c7a3', shirt: '#5a7a3a', pants: '#2a2e48', shoes: '#2a2e48',
    eyes: '#1b1426', accessory: ['bandana', 'mask'], accent: '#2a2e48', accent2: '#2a3a6a' } },
  itachi:  { label: 'Itachi', look: {
    hairStyle: 'largo', hair: '#1a1a1a', skin: '#f1c7a3', shirt: '#1e1c26', pants: '#1e1c26', shoes: '#2a2e48',
    eyes: '#e02020', accessory: ['bandana', 'coat', 'clouds'], accent: '#d02020', accent2: '#2a3a8a' } },
  ichigo:  { label: 'Ichigo', look: {
    hairStyle: 'puntas', hair: '#f07a1e', skin: '#f1c7a3', shirt: '#1e1e26', pants: '#1e1e26', shoes: '#e8e8ee',
    eyes: '#6b3e1e', accessory: ['sword', 'belt'], accent: '#e8e8ee', accent2: '#e8e8ee' } },
  luffy:   { label: 'Luffy', look: {
    hairStyle: 'corto', hair: '#1a1a1a', skin: '#e0b088', shirt: '#d02828', pants: '#3d6bd0', shoes: '#c8945c',
    eyes: '#1b1426', accessory: ['strawhat'], accent: '#e8c860', accent2: '#d02828' } },
  sailor:  { label: 'Sailor Moon', look: {
    hairStyle: 'odango', hair: '#f5d442', skin: '#ffe0c8', shirt: '#f4f4f4', pants: '#ffe0c8', shoes: '#e02040',
    eyes: '#2a5ad0', accessory: ['bow', 'skirt'], accent: '#e02040', accent2: '#2a5ad0' } },
  dante:   { label: 'Dante', look: {
    hairStyle: 'largo', hair: '#e8e8ee', skin: '#f1c7a3', shirt: '#b02020', pants: '#1e1c26', shoes: '#4a2a1a',
    eyes: '#3d7bff', accessory: ['coat', 'sword'], accent: '#5a2a1a', accent2: '#1e1c26' } },
  cloud:   { label: 'Cloud', look: {
    hairStyle: 'puntas', hair: '#f0d860', skin: '#ffe0c8', shirt: '#3a3a6a', pants: '#3a3a6a', shoes: '#4a3a2a',
    eyes: '#45d4c8', accessory: ['sword', 'belt'], accent: '#4a3a2a', accent2: '#6b3e1e' } },
  link:    { label: 'Link', look: {
    hairStyle: 'corto', hair: '#e8c860', skin: '#ffe0c8', shirt: '#3a9a3a', pants: '#e8e8e0', shoes: '#6b3e1e',
    eyes: '#3d7bff', accessory: ['elfcap', 'belt', 'sword'], accent: '#3a9a3a', accent2: '#6b3e1e' } },
  mario:   { label: 'Mario', look: {
    hairStyle: 'corto', hair: '#4a2a14', skin: '#ffd0a8', shirt: '#e02020', pants: '#2a4ad0', shoes: '#6b3e1e',
    eyes: '#2a4ad0', accessory: ['cap', 'mustache', 'overalls'], accent: '#e02020', accent2: '#2a4ad0' } },
};

// Skin por defecto de cada agente
export const AGENT_SKINS = {
  'claude': 'goku', 'frontend-expert': 'naruto', 'backend-expert': 'ichigo', 'security-expert': 'dante',
  'devops-engineer': 'vegeta', 'software-architect': 'itachi', 'data-engineer': 'link', 'qa-engineer': 'mario',
  'mobile-developer': 'luffy', 'postgres-dba': 'cloud', 'product-owner': 'sailor', 'ux-designer': 'kakashi',
};
