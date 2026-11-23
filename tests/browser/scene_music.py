"""Verify decoded music, its gain envelopes, and playback through the real first visit."""
import argparse
from pathlib import Path
from urllib.parse import urljoin, urlparse

from playwright.sync_api import expect, sync_playwright

from dew_lesson import READ_PLANT


# Observe the real decoded tracks and their gain automation. The much shorter
# synthesized ambience and button buffers are unrelated to the score.
PROBE = """(() => {
  const next = new WeakMap(), automation = new WeakMap(), tracks = [];
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function(dest, ...args) {
    next.set(this,dest);
    return connect.call(this,dest,...args);
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
      const track = {role, source:this, bus, peak, ended:false};
      this.addEventListener('ended', () => { track.ended = true; });
      tracks.push(track);
    }
    return start.apply(this,args);
  };
  window.score = () => tracks.map((track, i) => ({
    id:i, role:track.role, gain:track.bus.gain.value, peak:track.peak,
    audioTime:track.source.context.currentTime, ended:track.ended,
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


def audible(page, role):
    page.wait_for_function(
        """([role,gain]) => score().some(t => t.role === role && !t.ended &&
           t.peak > .005 && Math.abs(t.gain - gain) < .02)""", arg=[role, MAX_SCORE_GAIN],
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
        taps(page, "Next", "Get Plantigochi", "Back")
        assert audible(page, "cotton")["id"] == first["id"]
        assert len(tracks(page)) == 1
    finally:
        ctx.close()


def first_visit(browser, source):
    ctx, url, blank = context_for(browser, source)
    try:
        page = ctx.new_page()
        page.goto(blank)
        # This is the installed, four-card tour checkpoint a reset saves.
        page.evaluate(SEED_SETUP, None)
        page.goto(url)
        taps(page, "Take a peek")
        cotton = audible(page, "cotton")
        taps(page, "Next", "Continue", "Begin setup", "Name your seed", "Keep Monstera",
             "Open toy menu", "Next toy item", "Back on toy", "Open toy menu", "Choose Care",
             "Choose Water", "Visit my garden", "Open iSEED", "Shop", "Terracotta pot · 12 coins",
             "Place at Center of the living room windowsill", "Buy for 12 coins", "Return to my seed",
             "Open toy menu", "Next toy item", "Next toy item", "Choose Growth", "Choose Growth Spurt")
        for _ in range(4):
            taps(page, "Choose Spend 50 coins")
        taps(page, "Play one round", "Play heart")
        assert [t["role"] for t in tracks(page)] == ["cotton"], tracks(page)
        assert audible(page, "cotton")["id"] == cotton["id"]
        claim = button(page, "Claim 20 coins")
        claim.wait_for(timeout=20000)
        claim.tap()
        page.wait_for_function("document.querySelector('.garden-purse span')?.textContent === '23'")
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
        taps(page, "Open toy menu", "Next toy item", "Choose Play", "Choose Dew Catch", "Play heart")
        assert audible(page, "mystic")["id"] == gameplay["id"]
        assert len(tracks(page)) == 2, tracks(page)
        # A completed save starts the main theme on the toy on its next launch.
        page.reload()
        taps(page, "Open Plantigochi menu")
        audible(page, "mystic")
        assert [t["role"] for t in tracks(page)] == ["mystic"]
        taps(page, "Settings")
        ambience = page.get_by_role("button", name="Garden ambience On")
        ambience.tap()
        page.wait_for_function("score().every(t=>t.ended || t.gain < .001)")
        expect(page.get_by_role("button", name="Garden ambience Off")).to_be_visible()
        page.get_by_role("button", name="Garden ambience Off").tap()
        audible(page, "mystic")
        page.locator('button[data-audio="master"]:visible').tap()
        page.wait_for_function("score().every(t=>t.ended || t.gain < .001)")
        page.locator('button[data-audio="master"]:visible').tap()
        audible(page, "mystic")
        return completed
    finally:
        ctx.close()


def saved_record(browser, source, completed):
    ctx, url, blank = context_for(browser, source)
    try:
        page = ctx.new_page()
        page.goto(blank)
        # An already purchased record on the side table; start straight from
        # the completed save captured before its first free garden visit.
        completed["gardenLife"]["items"].append(
            {"id": "music-test-record", "sku": "record", "slot": "0/decor-stand"}
        )
        page.evaluate(SEED_SETUP, completed)
        page.goto(url)
        taps(page, "Open toy menu")
        audible(page, "mystic")
        assert [t["role"] for t in tracks(page)] == ["mystic"]
        taps(page, "Back on toy", "Open garden")
        page.locator('[data-item-id="music-test-record"]:visible').tap()
        taps(page, "Play record")
        page.wait_for_function("document.querySelector('audio').currentTime > .2")
        page.wait_for_function("score().every(t => t.ended || t.gain < .001)")
        assert not page.locator("audio").evaluate("a=>a.paused || a.muted")
        taps(page, "Pause record")
        audible(page, "mystic")
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
