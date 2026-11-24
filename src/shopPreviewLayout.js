// Native baselines on the approved 72 × 64 tiles. A scale of 2 maps each
// double-density art pixel to one tile pixel.
import collectorSeeds from './collectorSeeds.json' with {type:'json'};
export const previewLayout={
  ...Object.fromEntries(Object.keys(collectorSeeds).map(id=>[id,[36,56,1]])),
  'venus-flytrap':[36,56,1],
  'cape-sundew':[36,56,1],
  'white-top-pitcher':[36,56,1],
  'variegated-billie':[36,56,1],
  'pink-princess':[36,56,1],
  'thai-constellation':[36,56,1],
  'raven-zz':[36,56,1],
  'polka-dot-begonia':[36,56,1],
  'pearls-and-jade':[36,56,1],
  'pink-diamond':[36,56,1],
  'prayer-plant':[36,56,1],
  monstera:[36,55,1], terra:[36,55,2], wave:[36,55,2], oak:[36,55,2], lacquer:[36,55,2],
  neko:[36,55,2], record:[36,55,2], 'golden-pothos':[36,32,2], 'snake-plant':[36,57,1.72],
  'honey-glazed-terracotta':[36,55,2],
  'blue-willow-porcelain':[36,55,2],
  'low-sandstone-bowl':[36,55,2],
  'stump-cottage-pot':[36,55,2], 'rain-boot-pot':[36,55,2], 'ringed-planet-pot':[36,55,2],
  'bog-frog-pot':[36,55,2], 'lava-pop-pot':[36,55,2],
  'bird-of-paradise':[36,57,1], 'moth-orchid':[36,57,1],
  'monstera-albo':[36,59,1], 'pink-micans':[36,55,1.04],
  'hoya-serpens-splash':[36,35,1.85], 'queen-anthurium':[36,35,1.8], 'monkey-tail-cactus':[36,26,2],
};
