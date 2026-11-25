"""Exercise the shared HUD, room controls and native/fallback sharing in mobile Chromium."""
import argparse
import itertools
import json
import re
from time import time
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import expect, sync_playwright

from dew_lesson import READ_PLANT, sprout_fixture
from pot_purchase import select_center
from scene_music import SEED_SETUP, button, context_for, taps

SHARE = "Share Plantigochi"
MENU = "Open Plantigochi menu"
VIEWPORTS = ((393, 710), (320, 568), (568, 320), (844, 390))


def surface(page, name):
    page.locator(f'main[data-surface="{name}"]:not([data-transitioning])').wait_for()


def hud_boxes(page, garden):
    # Only count controls on the active surface, including controls mounted
    # outside that surface to keep them stationary during parallax.
    controls = page.evaluate("""garden => {
      const active = selector => [...document.querySelectorAll(selector)].filter(el =>
        !el.closest('[hidden],[inert],[aria-hidden="true"]') && el.checkVisibility());
      const selectors = {
        name:'.garden-wordmark',clock:'.garden-clock',share:'.garden-share',
        menu:'[data-global-menu]',purse:'.garden-purse',cue:garden?'[data-room-return]':'[data-toy-handle]'
      };
      if (garden) Object.assign(selectors,{phone:'[data-room-open-phone]',rooms:'[data-room-direction="right"]:enabled'});
      return Object.fromEntries(Object.entries(selectors).map(([name,selector])=>{
        const nodes=active(selector);
        if (nodes.length!==1) throw Error(name+' active instances: '+nodes.length);
        const el=nodes[0], rect=el.getBoundingClientRect();
        const hit=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);
        return [name,{x:rect.x, y:rect.y, w:rect.width, h:rect.height, hit:el.contains(hit)}];
      }));
    }""", garden)
    width, height = page.viewport_size["width"], page.viewport_size["height"]
    for name, area in controls.items():
        assert area["x"] >= 0 and area["y"] >= 0, (name, area)
        assert area["x"] + area["w"] <= width + 1 and area["y"] + area["h"] <= height + 1, (name, area)
        if name in {"share", "menu", "cue", "phone"}:
            assert area["hit"] and min(area["w"], area["h"]) >= 44, (name, area)
    for (one, a), (two, b) in itertools.combinations(controls.items(), 2):
        overlap_x = min(a["x"] + a["w"], b["x"] + b["w"]) - max(a["x"], b["x"])
        overlap_y = min(a["y"] + a["h"], b["y"] + b["h"]) - max(a["y"], b["y"])
        assert min(overlap_x, overlap_y) <= 1, (one, two, width, height, a, b)
    if garden:
        p = controls["phone"]
        arrow = controls["rooms"]
        assert arrow["hit"] and arrow["x"] >= width/2 and arrow["y"] + arrow["h"] <= p["y"]
        # These are the original room button's measured bounds with zero safe-area insets.
        assert [p["x"], p["y"], p["w"], p["h"]] == [width - 56, height - 56, 44, 44], p
    assert not page.get_by_text(re.compile("Waz Lab", re.I)).filter(visible=True).count()
    return controls


SHARE_API = """mode => {
  window.shareCalls=[]; window.copiedGameLink=null;
  Object.defineProperty(navigator,'share',{configurable:true, value:mode==='absent' ? undefined : payload=>{
    window.shareCalls.push({payload,activation:navigator.userActivation.isActive});
    return new Promise((resolve,reject)=>{
      window.finishShare = () => mode==='success' ? resolve() :
        reject(new DOMException('Share did not complete',mode==='cancel'?'AbortError':'NotAllowedError'));
    });
  }});
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
    writeText:async text=>{window.copiedGameLink=text;}
  }});
}"""


def check_share(page, location, mode):
    page.evaluate(SHARE_API, mode)
    trigger = button(page, SHARE)
    # Keyboard activation also checks where focus lands after closing a modal.
    trigger.focus()
    trigger.press("Enter")
    canonical = page.locator('link[rel="canonical"]').get_attribute("href")
    if mode != "absent":
        page.wait_for_function("window.shareCalls.length === 1")
        saved = page.evaluate("window.shareCalls[0]")
        assert saved["payload"]["url"] == canonical and saved["payload"]["title"] == "Plantigochi", saved
        assert saved["activation"], "Web Share must run within the originating gesture"
        page.evaluate("window.finishShare()")
    popup = page.get_by_role("dialog", name=SHARE)
    if mode in {"absent", "error"}:
        expect(popup).to_be_visible()
        expect(popup.get_by_role("textbox", name="Game link to copy")).to_have_value(canonical)
        taps(page, "Copy game link")
        assert page.evaluate("window.copiedGameLink") == canonical
        if mode == "error":
            page.keyboard.press("Escape")
        else:
            taps(page, "Close menu")
    expect(popup).to_have_count(0)
    surface(page, location)
    expect(trigger).to_be_focused()


def play(browser, source, screenshots=None):
    context, url, blank = context_for(browser, source)
    try:
        page = context.new_page()
        page.set_default_timeout(7000)
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        plant = sprout_fixture()["plant"]
        for key in ("sproutDebut", "sproutBurstPending", "dewLesson", "tutorial"):
            plant.pop(key, None)
        plant.update(sound=False, ambience=False)
        life = plant["gardenLife"]
        life.update(balance=1022, visit={"date": life["day"], "streak": 1, "claimed": True, "shown": True})
        plant["gardenLife"]["items"].append({"sku": "terra", "id": "hud-pot", "slot": "0/window-middle"})
        page.goto(blank)
        page.evaluate(SEED_SETUP, plant)
        page.goto(url)
        for width, height in VIEWPORTS:
            page.set_viewport_size({"width": width, "height": height})
            surface(page, "toy")
            expect(button(page, SHARE)).to_be_visible()
            toy = hud_boxes(page, False)
            taps(page, "Open garden")
            surface(page, "garden")
            garden = hud_boxes(page, True)
            for name in ("name", "clock", "menu", "share", "purse"):
                for key in ("x", "y", "w", "h"):
                    assert abs(toy[name][key] - garden[name][key]) <= 1, (name, key, toy[name], garden[name])
            if screenshots:
                screenshots.mkdir(exist_ok=True, parents=True)
                page.screenshot(path=screenshots / f"garden-hud-{width}x{height}.png")
            expect(button(page, "Previous room")).to_be_hidden()
            if width == 393:
                page.emulate_media(reduced_motion="no-preference")
                room = page.locator(".room-picture")
                start = room.evaluate("e => e.scrollLeft")
                frame = room.evaluate("e => parseFloat(getComputedStyle(e).getPropertyValue('--room-width'))")
                touch = context.new_cdp_session(page)
                def pan(x, end, held=False):
                    stamp = time()
                    move_delay = .32 if held else .06
                    touch.send("Input.dispatchTouchEvent", {"type": "touchStart",
                               "touchPoints": [{"x": x, "y": 105}], "timestamp": stamp})
                    touch.send("Input.dispatchTouchEvent", {"type": "touchMove",
                               "touchPoints": [{"x": end, "y": 105}], "timestamp": stamp + move_delay})
                    touch.send("Input.dispatchTouchEvent", {"type": "touchEnd",
                               "touchPoints": [], "timestamp": stamp + move_delay + .025})

                def centered(position):
                    page.wait_for_function("x => Math.abs(document.querySelector('.room-picture').scrollLeft - x) <= 1",
                                           arg=position)
                pan(245, 153)
                centered(start + frame)
                pan(153, 245)
                centered(start)
                pan(245, 153, held=True)
                centered(start + 92)
                page.wait_for_timeout(500)
                assert abs(room.evaluate("e => e.scrollLeft") - start - 92) <= 1
                touch.detach()
                expect(button(page, "Previous room")).to_be_visible()
                expect(button(page, "Next room")).to_be_visible()
                page.wait_for_function("""() => [...document.querySelectorAll('.room-controls .swipe-cue')]
                  .every(cue => [...cue.querySelectorAll('path')].every(path =>
                    path.getAnimations().some(a => a.startTime === 0)))""", timeout=5000)
                taps(page, "Previous room")
                expect(button(page, "Previous room")).to_be_hidden()
                page.emulate_media(reduced_motion="reduce")
            taps(page, "Next room")
            expect(button(page, "Next room")).to_be_hidden()
            taps(page, "Previous room")
            expect(button(page, "Previous room")).to_be_hidden()
            taps(page, "Return to Plantigochi")
            surface(page, "toy")
        for where in ("toy", "garden"):
            if where == "garden":
                taps(page, "Open garden")
                surface(page, where)
            for mode in ("success", "cancel", "absent", "error"):
                check_share(page, where, mode)
            taps(page, MENU, "App & data", "About")
            about = page.get_by_role("dialog", name="About")
            version = json.loads((Path(__file__).resolve().parents[2] / "package.json").read_text())["version"]
            expect(about.get_by_text(f"Version {version}", exact=True)).to_be_visible()
            expect(about.get_by_text(re.compile(r"^Made by Waz Lab\."))).to_be_visible()
            link = about.get_by_role("link", name=re.compile(r"wazlab\.com"))
            expect(link).to_have_attribute("href", "https://wazlab.com")
            expect(link).to_have_attribute("target", "_blank")
            assert "noopener" in link.get_attribute("rel").split()
            taps(page, "Back")
            expect(page.get_by_role("dialog", name="App & data")).to_be_visible()
            taps(page, "Report a bug")
            report = page.get_by_role("dialog", name="Report a bug")
            contact = report.get_by_role("link", name=re.compile(r"info@wazlab\.com", re.I))
            expect(contact).to_be_visible()
            address = urlparse(contact.get_attribute("href"))
            assert address.scheme == "mailto" and address.path == "info@wazlab.com", address
            assert any(version in subject for subject in parse_qs(address.query).get("subject", [])), address
            taps(page, "Back")
            expect(page.get_by_role("dialog", name="App & data")).to_be_visible()
            taps(page, "Back", "Settings", "Close menu")
            surface(page, where)
            expect(button(page, MENU)).to_be_focused()

        # While iSEED is raised its menu belongs to the handset, and the HUD
        # must not intercept any touch intended for the launcher or its apps.
        taps(page, "Open iSEED")
        surface(page, "phone")
        expect(button(page, SHARE)).to_have_count(0)
        expect(page.locator(".garden-purse")).to_be_hidden()
        phone_purse = page.locator(".iseed-purse")
        expect(phone_purse).to_be_visible()
        purse = phone_purse.bounding_box()
        rewards = page.locator(".iseed-reward-key").bounding_box()
        assert 0 <= rewards["x"] - purse["x"] - purse["width"] <= 12
        assert abs(purse["y"] + purse["height"]/2 - rewards["y"] - rewards["height"]/2) <= 1
        expect(phone_purse).to_have_text(page.locator(".garden-purse").text_content())
        expect(page.get_by_text(re.compile(r"^Today [+]"))).to_have_count(0)
        taps(page, "Journal", MENU, "Settings", "Close menu")
        surface(page, "phone")
        expect(button(page, MENU)).to_be_focused()
        expect(button(page, SHARE)).to_have_count(0)
        taps(page, "Put down iSEED")
        surface(page, "garden")

        page.locator('[data-item-id="hud-pot"]:visible').tap()
        expect(button(page, SHARE)).to_have_count(0)
        taps(page, "Move to another spot")
        expect(button(page, "Cancel move")).to_be_visible()
        for label in (MENU, SHARE, "Open iSEED"):
            expect(button(page, label)).to_have_count(0)
        taps(page, "Cancel move")
        expect(button(page, SHARE)).to_be_visible()
        saved_items = page.evaluate(READ_PLANT)["gardenLife"]["items"]
        assert next(item["slot"] for item in saved_items if item["id"] == "hud-pot") == "0/window-middle"
        assert not errors, errors
    finally:
        context.close()


def tutorial(browser, source):
    context, url, _ = context_for(browser, source)
    try:
        page = context.new_page()
        page.goto(url)
        expect(button(page, "Name your seed")).to_be_visible()
        for name in (MENU, SHARE):
            expect(button(page, name)).to_have_count(0)
        select_center(page)
        expect(button(page, "Buy for 12 coins")).to_be_visible()
        expect(page.locator(".garden-purse span").first).to_have_text("12")
        for name in (MENU, SHARE, "Open iSEED"):
            expect(button(page, name)).to_have_count(0)
    finally:
        context.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", help="A game URL, production dist directory or standalone HTML")
    parser.add_argument("--chromium", help="Path to an installed Chromium executable")
    parser.add_argument("--screenshots", type=Path, help="Directory for optional viewport captures")
    args = parser.parse_args()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=args.chromium)
        try:
            play(browser, args.source, args.screenshots)
            tutorial(browser, args.source)
            print("Passed toy and garden HUDs, sharing, About, iSEED and placement")
        finally:
            browser.close()
