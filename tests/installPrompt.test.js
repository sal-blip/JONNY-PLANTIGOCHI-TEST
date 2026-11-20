import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInstallPrompt } from '../src/installPrompt.js';

function setup(standalone = false) {
  const browser = new EventTarget();
  browser.navigator = { standalone };
  const display = new EventTarget();
  browser.matchMedia = () => display;
  const install = createInstallPrompt(browser);
  function offer(prompt, outcome) {
    const event = new Event('beforeinstallprompt', { cancelable:true });
    Object.assign(event, {prompt, userChoice:Promise.resolve({outcome})});
    browser.dispatchEvent(event);
    return event;
  }
  return {browser, display, install, offer};
}

test('captures early install invitations and consumes each prompt only once', async () => {
  const {install,offer} = setup();
  let calls=0;
  assert.ok(offer(()=>{calls++;},'dismissed').defaultPrevented);
  assert.equal(install.getState(),'available');
  await Promise.all([install.prompt(),install.prompt()]);
  assert.equal(calls,1);
  assert.equal(install.getState(),'manual');
  offer(()=>{throw Error('withdrawn');},'dismissed');
  await install.prompt();
  assert.equal(install.getState(),'manual');
});

test('appinstalled takes precedence over a pending choice and standalone mode suppresses install', async () => {
  const {browser,install,offer} = setup();
  offer(()=>browser.dispatchEvent(new Event('appinstalled')),'accepted');
  await install.prompt();
  assert.equal(install.getState(),'installed');
  const ios=setup(true);
  assert.equal(ios.install.getState(),'installed');
  assert.equal(ios.offer(()=>{},'accepted').defaultPrevented,false);
  const tab=setup();
  let changes=0;
  const unsubscribe=tab.install.subscribe(()=>changes++);
  tab.display.matches=true;
  tab.display.dispatchEvent(new Event('change'));
  assert.equal(tab.install.getState(),'installed');
  unsubscribe();
  tab.display.dispatchEvent(new Event('change'));
  assert.equal(changes,1);
});
