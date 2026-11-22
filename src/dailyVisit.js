import {localDay} from './gardenEconomy.js';

// A web app can initialize while hidden, or resume from the back/forward cache.
// Both cases can reveal an eligible garden without changing the date in React.
export function watchDailyVisit(lastDay, onVisit, page = document) {
  function check() {
    const now = Date.now();
    if (!page.hidden && localDay(now) > lastDay) onVisit(now);
  }
  check();
  page.addEventListener('visibilitychange', check);
  page.defaultView.addEventListener('pageshow', check);
  return () => {
    page.removeEventListener('visibilitychange', check);
    page.defaultView.removeEventListener('pageshow', check);
  };
}
