/**
 * levels.js
 * Central source of truth for all PvC difficulty levels.
 */

window.GAME_LEVELS = [
  {
    key: "beginner",
    label: "Beginner",
    aiLabel: "AI (Beginner)",
    description: "Mostly random moves.",
    thinkingTime: 250,
    profile: {
      smartChance: 0.1,
      depthLimit: 0,
      centerChance: 0.15,
      cornerChance: 0.15,
    },
  },
  {
    key: "novice",
    label: "Novice",
    aiLabel: "AI (Novice)",
    description: "A little better than random.",
    thinkingTime: 280,
    profile: {
      smartChance: 0.22,
      depthLimit: 0,
      centerChance: 0.2,
      cornerChance: 0.2,
    },
  },
  {
    key: "easy",
    label: "Easy",
    aiLabel: "AI (Easy)",
    description: "Simple with occasional smart moves.",
    thinkingTime: 320,
    profile: {
      smartChance: 0.35,
      depthLimit: 1,
      centerChance: 0.25,
      cornerChance: 0.25,
    },
  },
  {
    key: "normal",
    label: "Normal",
    aiLabel: "AI (Normal)",
    description: "Balanced difficulty.",
    thinkingTime: 360,
    profile: {
      smartChance: 0.55,
      depthLimit: 2,
      centerChance: 0.35,
      cornerChance: 0.35,
    },
  },
  {
    key: "intermediate",
    label: "Intermediate",
    aiLabel: "AI (Intermediate)",
    description: "Sees more threats and opportunities.",
    thinkingTime: 400,
    profile: {
      smartChance: 0.72,
      depthLimit: 3,
      centerChance: 0.45,
      cornerChance: 0.4,
    },
  },
  {
    key: "advanced",
    label: "Advanced",
    aiLabel: "AI (Advanced)",
    description: "Strong and more consistent.",
    thinkingTime: 430,
    profile: {
      smartChance: 0.85,
      depthLimit: 5,
      centerChance: 0.5,
      cornerChance: 0.45,
    },
  },
  {
    key: "hard",
    label: "Hard",
    aiLabel: "AI (Hard)",
    description: "Nearly perfect play.",
    thinkingTime: 500,
    profile: {
      smartChance: 1,
      depthLimit: 7,
      centerChance: 0.65,
      cornerChance: 0.5,
    },
  },
  {
    key: "expert",
    label: "Expert",
    aiLabel: "AI (Expert)",
    description: "Very hard to beat.",
    thinkingTime: 540,
    profile: {
      smartChance: 1,
      depthLimit: 9,
      centerChance: 0.8,
      cornerChance: 0.6,
    },
  },
  {
    key: "master",
    label: "Master",
    aiLabel: "AI (Master)",
    description: "Top-level play.",
    thinkingTime: 580,
    profile: {
      smartChance: 1,
      depthLimit: 9,
      centerChance: 1,
      cornerChance: 0.8,
    },
  },
  {
    key: "impossible",
    label: "Impossible",
    aiLabel: "AI (Impossible)",
    description: "Unbeatable minimax.",
    thinkingTime: 620,
    profile: {
      smartChance: 1,
      depthLimit: null,
      centerChance: 1,
      cornerChance: 1,
    },
  },
];

window.getGameLevel = function getGameLevel(levelKey) {
  return (
    window.GAME_LEVELS.find((level) => level.key === levelKey) ||
    window.GAME_LEVELS[0]
  );
};
