"""Verify decoded music, its gain envelopes, and playback through the real first visit."""
import argparse
from pathlib import Path
from urllib.parse import urljoin, urlparse

from playwright.sync_api import expect, sync_playwright

from dew_lesson import READ_PLANT


# Observe the real decoded tracks and their gain automation. The much shorter
# synthesized effect buffers are unrelated to the score.
PROBE = """(() => {
  const next = new WeakMap(), automation = new WeakMap(), tracks = [], voices = [];
  const decks = new WeakMap();
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function(dest, ...args) {
    next.set(this,dest);
    return connect.call(this,dest,...args);
  };
  const disconnect = AudioNode.prototype.disconnect;
  AudioNode.prototype.disconnect = function(...args) {
    if (!args.length || args[0] === next.get(this)) next.delete(this);
    return disconnect.apply(this,args);
  };
  function outputGain(source) {
    let value = 1;
    for (let node=next.get(source); node; node=next.get(node)) {
      if (node instanceof GainNode) value *= node.gain.value;
      if (node === source.context.destination) return value;
    }
    return 0;
  }
  const makeDeck = AudioContext.prototype.createMediaElementSource;
  AudioContext.prototype.createMediaElementSource = function(element) {
    const node = makeDeck.call(this,element);
    decks.set(element,node);
    return node;
  };
  window.recordMix = () => {
    const media=document.querySelector('audio'), node=decks.get(media);
    return media && !media.muted && !media.paused ? media.volume * (node ? outputGain(node) : 1) : 0;
  };
  const clocks = new WeakMap();
  const createGain = BaseAudioContext.prototype.createGain;
  BaseAudioContext.prototype.createGain = function(...args) {
    const bus = createGain.apply(this,args);
    clocks.set(bus.gain,this);
    return bus;
  };
  const ramp = AudioParam.prototype.linearRampToValueAtTime;
  AudioParam.prototype.linearRampToValueAtTime = function(value, end) {
    const entries = automation.get(this) || [];
    entries.push({value, seconds:end-clocks.get(this)?.currentTime, at:performance.now()});
    automation.set(this, entries);
    return ramp.call(this, value, end);
  };
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function(...args) {
    if (this.loop && this.buffer && this.buffer.duration > 150) {
      const duration = this.buffer.duration, samples = this.buffer.getChannelData(0);
      let peak = 0;
      for (let i=0; i<samples.length; i+=4093) peak = Math.max(peak,Math.abs(samples[i]));
      const bus = next.get(this), role = Math.abs(duration - 162.51) < .5 ? 'cotton' :
        Math.abs(duration - 176.88) < .5 ? 'mystic' : 'unknown';
      const track = {role, source:this, bus, peak, ended:false,
                     offset:args[1] || 0, started:args[0] || this.context.currentTime};
      this.addEventListener('ended', () => { track.ended = true; });
      tracks.push(track);
    }
    if (this.buffer && this.buffer.duration <= 150) {
      if (this.loop) {
        const entry={source:this,seconds:this.buffer.duration,ended:false};
        this.addEventListener('ended',()=>{entry.ended=true;});
        voices.push(entry);
      } else {
        voices.push({frames:this.buffer.length,level:outputGain(this),state:this.context.state});
      }
    }
    return start.apply(this,args);
  };
  window.loopMix = () => voices.filter(v=>v.source && !v.ended)
    .map(v=>({seconds:v.seconds,level:outputGain(v.source)}));
  window.oneShotMix = () => voices.filter(v=>!v.source);
  window.score = () => tracks.map((track, i) => ({
    id:i, role:track.role, gain:track.bus.gain.value, peak:track.peak,
    effective:outputGain(track.source), ended:track.ended, offset:track.offset,
    position:track.offset + track.source.context.currentTime - track.started,
    ramps:automation.get(track.bus.gain) || [],
  }));
  window.farewellShown = null;
  new MutationObserver(() => {
    if (window.farewellShown === null &&
        document.querySelector('.farewell:not([inert]):not([aria-hidden="true"])'))
      window.farewellShown = performance.now();
  }).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['inert','aria-hidden']});
})()"""


def tracks(page):
    return page.evaluate("window.score()")


MAX_SCORE_GAIN = 0.5


def audible(page, role, volume=.4):
    page.wait_for_function(
        """([role,gain]) => score().some(t => t.role === role && !t.ended &&
           t.peak > .005 && Math.abs(t.effective - gain) < .02)""", arg=[role, MAX_SCORE_GAIN * volume],
    )
    track = next(t for t in reversed(tracks(page)) if t["role"] == role and not t["ended"])
    # A louder ramp also passes through half volume; verify its target.
    assert max(r["value"] for r in track["ramps"]) == MAX_SCORE_GAIN, (role, track)
    return track


def button(page, name):
    return page.get_by_role("button", name=name, exact=True)


def taps(page, *names):
    for name in names:
        button(page, name).tap()


def context_for(browser, source, installed=True):
    ctx = browser.new_context(
        viewport={"width": 393, "height": 710}, has_touch=True, is_mobile=True,
        reduced_motion="reduce", service_workers="block",
    )
    ctx.add_init_script(PROBE)
    if installed:
        ctx.add_init_script("Object.defineProperty(navigator,'standalone',{value:true})")
    ctx.add_init_script("delete window.PushManager; Math.random=()=>0.5")
    local = Path(source)
    url = "https://music.test/" if local.exists() else source.rstrip("/") + "/"
    if local.exists():
        def serve(route):
            path = urlparse(route.request.url).path.lstrip("/") or "index.html"
            asset = local / path if local.is_dir() else local if path=="index.html" else None
            if asset and asset.is_file():
                route.fulfill(path=asset)
            else:
                route.fulfill(status=404)
        ctx.route("https://music.test/**", serve)
    blank = urljoin(url, "_music_fixture")
    ctx.route(blank, lambda r: r.fulfill(content_type="text/html", body="<title>Setup</title>"))
    return ctx, url, blank


SEED_SETUP = """async fixture => {
  const db=await new Promise((resolve,reject)=>{
    const r = indexedDB.open('plantigochi.pocket.garden',1);
    r.onupgradeneeded=()=>r.result.createObjectStore('garden');
    r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
  });
  const tx=db.transaction('garden','readwrite'),store=tx.objectStore('garden');
  store.put({phase:fixture ? 'game':'tour',revision:1,epoch:crypto.randomUUID()},'setup');
  if (fixture) store.put(JSON.stringify(fixture),'current');
  await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error)});
  db.close();
}"""


def web_tour(browser, source):
    ctx, url, _ = context_for(browser, source, installed=False)
    try:
        page = ctx.new_page()
        page.goto(url)
        taps(page, "Take a peek")
        first = audible(page, "cotton")
        taps(page, "Next", "Continue", "Continue", "Install app", "Back")
        assert audible(page, "cotton")["id"] == first["id"]
        assert len(tracks(page)) == 1
    finally:
        ctx.close()


def first_visit(browser, source):
    ctx, url, blank = context_for(browser, source)
    try:
        page = ctx.new_page()
        close_rewards = button(page, "Close daily rewards")
        page.add_locator_handler(close_rewards, lambda: close_rewards.tap())
        page.goto(blank)
        # This is the installed tour checkpoint a reset saves.
        page.evaluate(SEED_SETUP, None)
        page.goto(url)
        taps(page, "Take a peek")
        cotton = audible(page, "cotton")
        taps(page, "Next", "Continue", "Continue", "Begin setup", "Name your seed", "Keep Monstera",
             "Open toy menu", "Next toy item", "Back on toy", "Open toy menu", "Choose Care",
             "Choose Water", "Visit my garden", "Open iSEED", "Shop", "Terracotta pot · 12 coins", "Buy",
             "Place at Center of the living room windowsill", "Buy for 12 coins", "Return to my seed",
             "Open toy menu", "Next toy item", "Next toy item", "Choose Growth", "Choose Growth Spurt")
        for _ in range(4):
            taps(page, "Choose Spend 50 coins")
        taps(page, "Play Vine Trail", "Play heart")
        assert [t["role"] for t in tracks(page)] == ["cotton"], tracks(page)
        assert audible(page, "cotton")["id"] == cotton["id"]
        claim = button(page, "Claim 20 coins")
        claim.wait_for(timeout=20000)
        expect(page.get_by_text('Find Dew Catch and Leaf Pairs', exact=False)).to_be_visible()
        claim.tap()
        page.wait_for_function("document.querySelector('.garden-purse span')?.textContent === '20'")
        completed = page.evaluate(READ_PLANT)
        fading = tracks(page)[0]
        assert not fading["ended"] and fading["gain"] > .1, ("Quick claim cut the music", fading)
        fade = next(r for r in fading["ramps"] if r["value"] == 0)
        visible = page.evaluate("window.farewellShown")
        assert abs(fade["at"] - visible) < 100, ("Fade should start on the visible farewell", fade, visible)
        assert abs(fade["seconds"] - 5) < .03, fade
        page.wait_for_function("score()[0].ended", timeout=7000)
        assert [t["role"] for t in tracks(page)] == ["cotton"], tracks(page)
        taps(page, "Open garden")
        gameplay = audible(page, "mystic")
        fade_in = next(r for r in gameplay["ramps"] if r["value"] == MAX_SCORE_GAIN)
        assert abs(fade_in["seconds"] - .75) < .03, fade_in
        taps(page, "Open iSEED", "Journal", "Put down iSEED", "Return to Plantigochi")
        taps(page, "Open toy menu", "Next toy item", "Choose Play", "Next toy item", "Choose Dew Catch", "Play heart")
        assert audible(page, "mystic")["id"] == gameplay["id"]
        assert len(tracks(page)) == 2, tracks(page)
        # A completed save starts the main theme on the toy on its next launch.
        page.reload()
        taps(page, "Open Plantigochi menu")
        audible(page, "mystic")
        assert [t["role"] for t in tracks(page)] == ["mystic"]
        taps(page, "Settings")
        music = page.get_by_role("slider", name="Music", exact=True)
        music.press("Home")
        page.wait_for_function("score().every(t=>t.ended || t.effective < .001)")
        music.press("End")
        audible(page, "mystic", 1)
        return completed
    finally:
        ctx.close()


def saved_record(browser, source, completed):
    ctx, url, blank = context_for(browser, source)
    try:
        page = ctx.new_page()
        close_rewards = button(page, "Close daily rewards")
        page.add_locator_handler(close_rewards, lambda: close_rewards.tap())
        page.goto(blank)
        # An already purchased record on the side table; start straight from
        # the completed save captured before its first free garden visit.
        completed["gardenLife"]["items"].append(
            {"id": "music-test-record", "sku": "record", "slot": "0/decor-stand"}
        )
        completed["musicVolume"] = .4
        page.evaluate(SEED_SETUP, completed)
        page.goto(url)
        taps(page, "Open toy menu")
        audible(page, "mystic", .4)
        assert [t["role"] for t in tracks(page)] == ["mystic"]
        taps(page, "Back on toy", "Open garden")
        page.locator('[data-item-id="music-test-record"]:visible').tap()
        taps(page, "Play record")
        page.wait_for_function("document.querySelector('audio').currentTime > .2")
        page.wait_for_function("score().every(t => t.ended || t.effective < .001)")
        assert not page.locator("audio").evaluate("a=>a.paused || a.muted")
        page.wait_for_function("Math.abs(recordMix() - .56 * .4) < .012")
        taps(page, "Close menu", "Open Plantigochi menu", "Settings")
        effects = page.get_by_role("slider", name="Sound effects", exact=True)
        effects.press("Home")
        page.wait_for_function("Math.abs(recordMix() - .56 * .4) < .012")
        music = page.get_by_role("slider", name="Music", exact=True)
        music.press("Home")
        page.wait_for_function("recordMix() < .002")
        taps(page, "Close menu")
        page.locator('[data-item-id="music-test-record"]:visible').tap()
        expect(button(page,"Pause record")).to_be_enabled()
        taps(page, "Close menu", "Open Plantigochi menu", "Settings")
        for _ in range(7):
            music.press("PageUp")
        page.wait_for_function("Math.abs(recordMix() - .56 * .7) < .012")
        taps(page, "Close menu")
        page.locator('[data-item-id="music-test-record"]:visible').tap()
        taps(page, "Pause record")
        audible(page, "mystic", .7)
        assert page.locator("audio").evaluate("a=>a.paused")
    finally:
        ctx.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", help="Game URL, production dist directory, or the one-file HTML download")
    parser.add_argument("--chromium", help="Path to an installed Chromium executable")
    args = parser.parse_args()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=args.chromium)
        try:
            if not Path(args.source).is_file():
                web_tour(browser, args.source)
                print("Passed the browser installation tour", flush=True)
            completed = first_visit(browser, args.source)
            print("Passed tour, tutorial fade, quick claim, main theme, and mute", flush=True)
            saved_record(browser, args.source, completed)
            print("Passed returning toy music and record override")
        finally:
            browser.close()
