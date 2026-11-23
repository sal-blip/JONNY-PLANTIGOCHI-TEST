"""Check legacy audio preferences, the Settings sliders and their real output in Chromium."""
import argparse
import json
import subprocess

from playwright.sync_api import expect, sync_playwright

from dew_lesson import READ_PLANT, ROOT
from scene_music import SEED_SETUP, button, context_for, taps

CHANNELS = {"Music": "musicVolume", "Sound effects": "fxVolume", "Garden ambience": "ambienceVolume"}


def legacy_seed(sound, ambience):
    data = subprocess.run(
        ["node", "--input-type=module", "-e",
         "import {newPlant} from './src/game.js'; console.log(JSON.stringify(newPlant()));"],
        cwd=ROOT, capture_output=True, text=True, check=True,
    )
    plant = json.loads(data.stdout)
    for key in CHANNELS.values():
        plant.pop(key, None)
    plant.update(sound=sound, ambience=ambience)
    return plant


def settings(page):
    taps(page, "Open Plantigochi menu", "Settings")
    return page.get_by_role("dialog", name="Settings")


def slider(page, label):
    return page.get_by_role("slider", name=label, exact=True)


def levels(page):
    return [int(slider(page, name).input_value()) for name in CHANNELS]


def adjust(page, label, value):
    control = slider(page, label)
    before = int(control.input_value())
    if value in (0, 100):
        control.press("End" if value else "Home")
    else:
        # Native keyboard steps keep a positive-to-positive adjustment away
        # from zero, so the song's existing playhead can be verified.
        delta = value - before
        for _ in range(abs(delta) // 10):
            control.press("PageUp" if delta > 0 else "PageDown")
        for _ in range(abs(delta) % 10):
            control.press("ArrowRight" if delta > 0 else "ArrowLeft")
    expect(control).to_have_value(str(value))
    expect(control).to_have_attribute("aria-valuetext", f"{value}%")


def audible_loop(page, seconds, level):
    page.wait_for_function(
        """([seconds,level]) => {
          const loops=loopMix().filter(s=>Math.abs(s.seconds-seconds)<.02);
          return level ? loops.some(s=>Math.abs(s.level-level)<.012) :
                         loops.every(s=>s.level<.002);
        }""", arg=[seconds,level],
    )


def theme_level(page, value):
    page.wait_for_function(
        """value => {
          const active=score().filter(t=>!t.ended);
          return value ? active.some(t=>t.role==='mystic' && Math.abs(t.effective-value)<.005) :
                         active.every(t=>t.effective<.002);
        }""", arg=value,
    )
    if value:
        return page.evaluate("score().findLast(t=>!t.ended && t.role==='mystic').id")


def assert_click(page, name, expected):
    before = page.evaluate("oneShotMix().length")
    taps(page, name)
    page.wait_for_timeout(160)
    shots = page.evaluate("i=>oneShotMix().slice(i)", before)
    heard = [s for s in shots if s["level"]>.001 and s["state"]=="running"]
    if expected == 0:
        assert not heard, (name, heard)
    else:
        assert len(heard) == 1 and heard[0]["frames"] == 3840, (name, heard)
        assert abs(heard[0]["level"] - expected) < .012, (name, heard)


def mobile_layout(page):
    for w,h in ((393,710), (320,568), (568,320)):
        page.set_viewport_size({"width":w, "height":h})
        sliders = page.get_by_role("slider")
        expect(sliders).to_have_count(3)
        for name in CHANNELS:
            control = slider(page, name)
            control.scroll_into_view_if_needed()
            rect = control.bounding_box()
            assert rect and rect["width"] >= 90 and rect["height"] >= 16, (w,h,name,rect)
            assert control.evaluate("""el => {
              const r=el.getBoundingClientRect(), x=r.x+r.width/2, y=r.y+r.height/2;
              return x>=0 && x<innerWidth && y>=0 && y<innerHeight &&
                el.contains(document.elementFromPoint(x,y));
            }"""), (w,h,name,rect)
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    page.set_viewport_size({"width":393, "height":710})
    effects = slider(page, "Sound effects")
    box = effects.bounding_box()
    touch = page.context.new_cdp_session(page)
    try:
        y = box["y"] + box["height"] / 2
        for kind, fraction in [("touchStart", .08), ("touchMove", .3), ("touchMove", .7)]:
            x = box["x"] + box["width"] * fraction
            touch.send("Input.dispatchTouchEvent", {"type":kind, "touchPoints":[{"x":x,"y":y}]})
        touch.send("Input.dispatchTouchEvent", {"type":"touchEnd", "touchPoints":[]})
        assert 45 < int(effects.input_value()) < 95, effects.input_value()
        assert page.get_by_role("dialog", name="Settings").is_visible()
    finally:
        touch.detach()
    adjust(page, "Sound effects", 0)


def play(browser, source):
    # Start from an old seed without any of the three numeric preferences.
    for sound, ambience, expected in [(True,False,[0,100,0]),(False,True,[0,0,0])]:
        ctx,url,blank = context_for(browser,source)
        try:
            page = ctx.new_page()
            page.set_default_timeout(12000)
            page.set_default_navigation_timeout(45000)
            page.goto(blank)
            page.evaluate(SEED_SETUP,legacy_seed(sound,ambience))
            page.goto(url, wait_until="domcontentloaded")
            settings(page)
            assert levels(page) == expected, (sound, ambience, levels(page))
            assert not page.evaluate("score()"), "Muted legacy music started a recorded track"
            if sound:
                assert_click(page, "Close menu", 1)
                continue
            mobile_layout(page)
            adjust(page, "Sound effects", 30)
            assert_click(page, "Close menu", .3)
            theme_level(page, 0)
            audible_loop(page, 23, 0)
            settings(page)
            adjust(page, "Garden ambience", 60)
            audible_loop(page, 23, .6)
            audible_loop(page, 19, 0)
            theme_level(page, 0)
            adjust(page, "Music", 40)
            track = theme_level(page,.20)
            adjust(page, "Music", 70)
            assert theme_level(page,.35) == track
            page.evaluate("""document.addEventListener('keydown',()=>{
              window.lastMusicPosition=score().at(-1).position;
            },{capture:true,once:true})""")
            adjust(page, "Music", 0)
            before_mute = page.evaluate("window.lastMusicPosition")
            page.wait_for_function("score().every(song=>song.ended)")
            audible_loop(page, 23, .6)
            adjust(page, "Music", 70)
            resumed = theme_level(page,.35)
            assert resumed != track
            assert abs(page.evaluate("score().at(-1).offset") - before_mute) < .65
            track = resumed
            audible_loop(page, 23, .6)
            adjust(page, "Sound effects", 0)
            assert_click(page, "Close menu", 0)
            theme_level(page,.35)
            audible_loop(page, 23, .6)
            taps(page, "Open garden")
            audible_loop(page, 19, .6)
            settings(page)
            adjust(page, "Garden ambience", 0)
            audible_loop(page,19,0)
            audible_loop(page,23,0)
            assert theme_level(page,.35) == track
            adjust(page, "Garden ambience", 47)
            adjust(page, "Sound effects", 31)
            taps(page, "Close menu")
            saved = page.evaluate(READ_PLANT)
            assert [round(saved[key]*100) for key in CHANNELS.values()] == [70,31,47], saved
            page.reload()
            settings(page)
            assert levels(page) == [70,31,47]
            theme_level(page,.35)
            audible_loop(page,23,.47)
            audible_loop(page,19,0)
            assert_click(page, "Close menu", .31)
            taps(page, "Open garden", "Open iSEED")
            before = page.evaluate("oneShotMix().length")
            taps(page, "Journal")
            page.wait_for_function(
                "i=>oneShotMix().slice(i).some(s=>s.frames===9120)", arg=before,
            )
            chimes = page.evaluate("i=>oneShotMix().slice(i).filter(s=>s.frames===9120)", before)
            assert len(chimes) == 1 and abs(chimes[0]["level"] - .28*.31) < .005, chimes
        finally:
            ctx.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", help="Game URL, production dist directory, or standalone HTML")
    parser.add_argument("--chromium", help="Path to a Chromium executable")
    args = parser.parse_args()
    with sync_playwright() as runtime:
        browser = runtime.chromium.launch(executable_path=args.chromium)
        try:
            play(browser,args.source)
            print("Passed legacy migration, mobile mixer, live music, ambience, effects and reload")
        finally:
            browser.close()
