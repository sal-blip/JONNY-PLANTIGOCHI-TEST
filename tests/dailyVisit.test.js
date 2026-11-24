import test from 'node:test';
import assert from 'node:assert/strict';
import {checkIn, localDay, openDailyVisit, claimDaily} from '../src/gardenEconomy.js';
import {watchDailyVisit} from '../src/dailyVisit.js';

test('a hidden launch opens a single pending reward and claiming pays it once', () => {
  const page = Object.assign(new EventTarget(), {hidden: true, defaultView: new EventTarget()});
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  let garden = checkIn({}, yesterday.getTime());
  let visits = 0;
  const stop = watchDailyVisit(garden.gardenLife.day, now => {
    garden = openDailyVisit(garden, now);
    visits++;
  }, page);
  assert.equal(visits, 0);
  page.hidden = false;
  page.dispatchEvent(new Event('visibilitychange'));
  page.defaultView.dispatchEvent(new Event('pageshow'));
  assert.equal(garden.gardenLife.day, localDay(Date.now()));
  assert.equal(garden.gardenLife.balance, 10);
  garden=claimDaily(garden,Date.now(),garden.gardenLife.day);
  assert.equal(garden.gardenLife.balance, 20);
  assert.equal(claimDaily(garden,Date.now(),garden.gardenLife.day),garden);
  const before = visits;
  stop();
  page.dispatchEvent(new Event('visibilitychange'));
  assert.equal(visits, before);
});
