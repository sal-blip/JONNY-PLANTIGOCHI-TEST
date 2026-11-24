"""Run against a local dev server with Python Playwright and Chromium installed."""
import argparse

from playwright.sync_api import sync_playwright


def play(browser, url):
    context = browser.new_context(
        viewport={"width": 384, "height": 693}, is_mobile=True, has_touch=True
    )
    context.add_init_script("Object.defineProperty(navigator, 'standalone', {value: true})")
    # Capture the buffers Chromium actually plays. Counting calls to the UI
    # handler misses doubled voices and cannot distinguish a tap from a bell.
    context.add_init_script("""(() => {
      window.oneShots = [];
      let activeGuides = new Map();
      function visitGuides() {
        const seen = new Map();
        for (const guide of document.querySelectorAll('.guide-chat')) {
          // The destination holds the popup's space while its own 250ms
          // reveal is pending. Ignore entire surfaces which are still inert.
          if (guide.parentElement.closest('[inert], [hidden], [aria-hidden="true"]')) continue;
          const timing = activeGuides.get(guide) ?? {activeAt: performance.now(), visibleAt: null};
          if (guide.closest('[inert], [hidden], [aria-hidden="true"]')) timing.visibleAt = null;
          else timing.visibleAt ??= performance.now();
          seen.set(guide, timing);
        }
        activeGuides = seen;
      }
      new MutationObserver(visitGuides).observe(document, {
        subtree: true, childList: true, attributes: true, attributeFilter: ['inert','hidden','aria-hidden']
      });
      document.addEventListener('click', () => { window.clickedAt = performance.now(); }, true);
      const outputs = new WeakMap();
      const connect = AudioNode.prototype.connect;
      AudioNode.prototype.connect = function(destination, ...args) {
        outputs.set(this, destination);
        return connect.call(this, destination, ...args);
      };
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function(...args) {
        const buffer = this.buffer;
        if (buffer && !this.loop && this.context.state === 'running') {
          let hash = 2166136261;
          for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const samples = buffer.getChannelData(channel);
            const bits = new Uint32Array(samples.buffer, samples.byteOffset, samples.length);
            for (const value of bits) hash = Math.imul(hash ^ value, 16777619);
          }
          const greeting = document.querySelector('.toy-guide')?.textContent
            .includes('Press my heart button to open the menu');
          visitGuides();
          const playedAt = performance.now();
          const candidates = [...activeGuides.entries()];
          const shot = {
            greeting: !!greeting,
            afterClick: performance.now() - window.clickedAt,
            guides: [],
            sound: {pcm: hash >>> 0, frames: buffer.length, rate: buffer.sampleRate,
                    gain: outputs.get(this)?.gain?.value}
          };
          window.oneShots.push(shot);
          requestAnimationFrame(() => {
            visitGuides();
            shot.guides = candidates.map(([node, timing]) => ({
              afterActivation: playedAt - timing.activeAt,
              afterReveal: activeGuides.has(node) && timing.visibleAt !== null
                ? playedAt - timing.visibleAt : null
            }));
          });
        }
        return start.apply(this, args);
      };
      document.addEventListener('pointerdown', () => {
        window.pressStart = window.oneShots.length;
      }, true);
    })()""")
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(url)

    def button(name):
        return page.get_by_role("button", name=name, exact=True)

    def tap(name):
        button(name).tap()

    def balance(amount):
        page.wait_for_function(
            "amount => document.querySelector('.garden-purse span')?.textContent === String(amount)",
            arg=amount,
        )

    tap("Name your seed")
    tap("Keep Monstera")
    page.locator(".toy-guide").wait_for()

    def shots_for_press():
        return page.evaluate("window.oneShots.slice(window.pressStart)")

    def sounds_for_tap(name):
        tap(name)
        page.wait_for_timeout(470)
        return shots_for_press()

    def expect_button(shot, name, frames=3840):
        sound = shot["sound"]
        assert sound["rate"] == 24000 and sound["frames"] == frames and sound["gain"] == 1, (name, shot)
        assert 0 <= shot["afterClick"] < 70, (name, "Button sound was delayed", shot)

    def expect_plain_tap(name):
        shots = sounds_for_tap(name)
        assert len(shots) == 1, (name, shots)
        expect_button(shots[0], name)

    def expect_chime_timing(shot, name):
        # The destination first reserves its layout, then reveals the text
        # together with the bell. Its activation can follow a camera or a save.
        assert any(
            210 <= guide["afterActivation"] <= 440 and
            guide["afterReveal"] is not None and abs(guide["afterReveal"]) < 60
            for guide in shot["guides"]
        ), (name, shot)

    page.wait_for_function("window.oneShots.some(shot => shot.greeting && shot.sound.frames === 9120)")
    page.wait_for_timeout(300)
    greeting = page.evaluate("window.oneShots.filter(shot => shot.greeting)")
    assert len(greeting) == 1, ("First instruction", greeting)
    bell = greeting[0]["sound"]
    assert bell["rate"] == 24000 and bell["frames"] == 9120 and abs(bell["gain"] - .28) < .001, bell
    expect_chime_timing(greeting[0], "First instruction")

    def expect_arrival_bell(name):
        page.wait_for_function(
            "frames => window.oneShots.slice(window.pressStart).some(shot => shot.sound.frames === frames)",
            arg=bell["frames"], timeout=8000,
        )
        page.wait_for_timeout(120)
        shots = shots_for_press()
        assert len(shots) == 2, (name, "Expected one button sound followed by one chime", shots)
        expect_button(shots[0], name)
        assert shots[1]["sound"] == bell, (name, shots)
        expect_chime_timing(shots[1], name)

    for key in ("Open toy menu", "Previous toy item", "Next toy item", "Back on toy"):
        if key == "Next toy item":
            # Another arrow moves the item, but leaves the same Back instruction.
            expect_plain_tap(key)
            button("Choose Care").wait_for()
            page.get_by_text("That’s how you browse!", exact=False).wait_for()
        else:
            tap(key)
            expect_arrival_bell(key)
            if key == "Previous toy item":
                button("Choose Field guide").wait_for()
                page.get_by_text("That’s how you browse!", exact=False).wait_for()

    # Two real keyboard presses can advance past an instruction before it
    # rings. Each press clicks, and only the instruction left on screen rings.
    button("Open toy menu").focus()
    start = page.evaluate("window.oneShots.length")
    page.keyboard.press("Enter")
    button("Choose Care").wait_for()
    page.keyboard.press("Enter")
    button("Choose Water").wait_for()
    page.wait_for_timeout(470)
    rapid = page.evaluate("i => window.oneShots.slice(i)", start)
    assert len(rapid) == 3, ("Rapid input", rapid)
    for shot in rapid[:2]:
        expect_button(shot, "Rapid input")
    assert rapid[2]["sound"] == bell, ("Rapid input", rapid)
    expect_chime_timing(rapid[2], "Rapid input")

    tap("Choose Water")
    care = shots_for_press()
    assert care, ("First watering press", care)
    expect_button(care[0], "First watering", frames=6000)
    balance(12)
    # A locator tap waits through overlays. A player can tap as soon as the
    # chat appears, while a full-page transition would still swallow the input.
    visit = button("Visit my garden")
    visit.wait_for(state="attached")
    point = visit.evaluate("""button => {
      const box = button.getBoundingClientRect();
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      return {x, y, receivesTouch: button.contains(document.elementFromPoint(x, y))};
    }""")
    assert point["receivesTouch"], "Visit my garden is visible but covered"
    page.touchscreen.tap(point["x"], point["y"])
    button("Open iSEED").wait_for()
    expect_arrival_bell("Visit my garden")
    assert not button("Return to Plantigochi").count()
    tap("Open iSEED")
    expect_arrival_bell("Open iSEED")
    tap("Shop")
    # Track the furniture in the first room through the handset slide and the
    # receipt. An instruction panel that resizes the camera moves every object.
    page.evaluate("""() => {
      const frame = document.querySelector('.room-frame');
      const room = frame.querySelector('.room-actors');
      const interior = frame.querySelector('.room-interior');
      window.furnitureYs = [];
      function sample() {
        const box = room.getBoundingClientRect();
        window.furnitureYs.push(box.top + box.height * parseFloat(interior.style.top) / 100);
        window.roomFrame = requestAnimationFrame(sample);
      }
      sample();
    }""")
    tap("Terracotta pot · 12 coins")
    tap("Buy")
    expect_arrival_bell("Terracotta pot")
    tap("Place at Center of the living room windowsill")
    tap("Buy for 12 coins")
    button("Return to my seed").wait_for()
    balance(0)
    assert page.locator('[data-pot-slot="0/window-middle"]').count() == 1
    movement = page.evaluate("""() => {
      cancelAnimationFrame(window.roomFrame);
      return Math.max(...window.furnitureYs) - Math.min(...window.furnitureYs);
    }""")
    assert movement < 2, f"Furniture shifted {movement:.1f}px while buying the starter pot"
    assert not button("Open iSEED").count()

    # Keep a second *real* transaction ahead of the gift write. A fast mock
    # misses the stale garden instruction that was visible on the toy here.
    page.evaluate("""async () => {
      const db = await new Promise((resolve, reject) => {
        const open = indexedDB.open('plantigochi.pocket.garden');
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      const tx = db.transaction('garden', 'readwrite');
      const store = tx.objectStore('garden');
      window.releaseGift = false;
      function hold() {
        store.get('setup').onsuccess = () => { if (!window.releaseGift) hold(); };
      }
      hold();
      tx.oncomplete = () => db.close();
    }""")
    try:
        tap("Return to my seed")
        button("Returning…").wait_for()
        assert page.locator("main[data-surface]").get_attribute("data-surface") == "garden"
        assert not button("Open garden").is_visible()
    finally:
        page.evaluate("window.releaseGift = true")

    balance(200)
    expect_arrival_bell("Return to my seed")
    assert page.locator('[data-global-menu]:visible').count() == 0
    assert page.locator('.garden-share:visible').count() == 0
    tap("Open toy menu")
    tap("Next toy item")
    tap("Next toy item")
    tap("Choose Growth")
    tap("Choose Growth Spurt")
    for remaining in (150, 100, 50, 0):
        tap("Choose Spend 50 coins")
        balance(remaining)
    tap("Maybe later")
    claim = "Claim 20 coins"
    button(claim).wait_for()
    # The focused action used to spill below the speech bubble on Android.
    fits = button(claim).evaluate("""action => {
      const popup = action.closest('.guide-chat');
      const bubble = popup.getBoundingClientRect(), button = action.getBoundingClientRect();
      const inside = button.top >= bubble.top && button.bottom <= bubble.bottom - 6 &&
        button.left >= bubble.left && button.right <= bubble.right;
      const fitsText = [...popup.querySelectorAll('.chat-copy, .farewell-message')].every(
        part => part.scrollHeight <= part.clientHeight + 1);
      return inside && fitsText;
    }""")
    assert fits, "The farewell text and claim button must fit inside the mobile bubble"
    balance(0)
    page.reload()
    tap(claim)
    balance(20)
    page.reload()
    balance(20)
    assert not button(claim).count()
    button("Open Plantigochi menu").wait_for()
    button("Share Plantigochi").wait_for()
    tap("Open garden")
    tap("Return to Plantigochi")
    button("Open toy menu").wait_for()
    assert not page.locator(".toy-guide").count()
    expect_plain_tap("Open Plantigochi menu")
    tap("Settings")
    effects = page.get_by_role("slider", name="Sound effects", exact=True)
    assert effects.input_value() == "100"
    effects.press("Home")
    assert effects.input_value() == "0"
    tap("Close menu")
    # Both ordinary navigation and the previously unseen Dew guide honor mute.
    for key in ("Open toy menu", "Next toy item", "Choose Play", "Choose Dew Catch"):
        sounds = sounds_for_tap(key)
        assert not sounds, (key, "Unexpected sound after muting in Settings", sounds)
    page.get_by_text("Three misses end the run.", exact=False).wait_for()
    tap("Play heart")
    assert not page.locator(".toy-guide").count()
    assert not errors, errors
    context.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Play the first visit in a fresh, isolated browser profile.")
    parser.add_argument("url")
    parser.add_argument("--chromium", help="Optional path to a Chromium executable")
    args = parser.parse_args()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=args.chromium)
        play(browser, args.url)
        browser.close()
