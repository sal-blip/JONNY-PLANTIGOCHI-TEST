// Keep the one-use browser invitation even if it arrives before React mounts.
export function createInstallPrompt(browser) {
  const display = browser.matchMedia?.('(display-mode: standalone)');
  const subscribers = new Set();
  let invitation = null;
  let state = 'manual';

  const getState = () => display?.matches || browser.navigator.standalone === true ? 'installed' : state;
  function notify() { for (const update of subscribers) update(); }
  function setState(next) { state = next; notify(); }

  browser.addEventListener('beforeinstallprompt', event => {
    if (getState() === 'installed') return;
    event.preventDefault();
    invitation = event;
    setState('available');
  });
  browser.addEventListener('appinstalled', () => {
    invitation = null;
    setState('installed');
  });
  display?.addEventListener('change', notify);

  async function prompt() {
    if (!invitation || getState() !== 'available') return;
    const event = invitation;
    invitation = null;
    setState('prompting');
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (state === 'prompting') setState(choice?.outcome === 'accepted' ? 'accepted' : 'manual');
    } catch {
      if (state === 'prompting') setState('manual');
    }
  }

  return {
    getState, prompt,
    subscribe(update) {
      subscribers.add(update);
      return () => subscribers.delete(update);
    },
  };
}
