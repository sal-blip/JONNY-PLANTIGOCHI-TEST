// Slot numbers stay stable across room redesigns and v3 garden backups.
export const PLACES_PER_VIEW = 6;
const VIEWS_PER_SUITE = 2;
const PLACES_PER_SUITE = PLACES_PER_VIEW * VIEWS_PER_SUITE;

export function gardenViews(graduates) {
  const highest = graduates.reduce((last, plant) => Math.max(last, plant.slot), -1);
  const occupiedSuites = Math.ceil((highest + 1) / PLACES_PER_SUITE);
  const availableSuites = 1 + Math.floor(graduates.length / PLACES_PER_SUITE);
  return VIEWS_PER_SUITE * Math.max(occupiedSuites, availableSuites);
}

export function canPlaceAt(graduates, slot) {
  return Number.isSafeInteger(slot) && slot >= 0 && slot < gardenViews(graduates) * PLACES_PER_VIEW &&
    !graduates.some(plant => plant.slot === slot);
}

export function viewName(view) {
  const title = view % 2 === 0 ? 'Living room' : 'Plant studio';
  return view < 2 ? title : title + ' ' + (Math.floor(view / 2) + 1);
}

export function speciesName(plant) {
  return plant.species.charAt(0).toUpperCase() + plant.species.slice(1).replaceAll('-', ' ');
}
