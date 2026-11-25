"""Play all three games from a newly named seed, then resume the watering lesson."""
import argparse
from collections import deque
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

from scene_music import SEED_SETUP, button, context_for, taps

DIRECTIONS = ((1, 0), (0, 1), (-1, 0), (0, -1))


def turn_for_sun(body, sun):
    head, neck = body[:2]
    heading = DIRECTIONS.index((head[0]-neck[0], head[1]-neck[1]))
    queue = deque([(body, heading, [])])
    visited = set()
    while queue:
        points, heading, path = queue.popleft()
        if points[0] == sun:
            return path[0]
        for turn in (0, -1, 1):
            face = (heading+turn) % 4
            x, y = points[0][0]+DIRECTIONS[face][0], points[0][1]+DIRECTIONS[face][1]
            moved = ((x, y), *points[:-1])
            if 0 <= x < 16 and 0 <= y < 10 and (x, y) not in points[:-1] and moved not in visited:
                visited.add(moved)
                queue.append((moved, face, [*path, turn]))
    raise AssertionError("No route to the sun")


def play(browser, source):
    ctx, url, blank = context_for(browser, source)
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(blank)
    page.evaluate(SEED_SETUP, None)
    page.goto(url)
    taps(page, "Take a peek", "Next", "Continue", "Begin setup", "Name your seed", "Keep Monstera", "Play a game")
    taps(page, "Choose Vine Trail", "Play heart", "Back on toy")
    expect(button(page, "Choose Resume")).to_be_visible()
    page.emulate_media(reduced_motion="no-preference")
    taps(page, "Choose Resume")
    # The SVG travels between grid positions while collision logic stays on whole cells.
    page.wait_for_function("""() => {
      const line = document.querySelector('.lcd-art polyline');
      if (!line || !line.animatedPoints.length) return false;
      const x = line.animatedPoints.getItem(0).x;
      return Math.abs((x-4)/7-Math.round((x-4)/7)) > .1;
    }""", timeout=3000)
    page.emulate_media(reduced_motion="reduce")
    expect(page.locator(".lcd-status")).to_contain_text("Retry", timeout=9000)
    # Measure the painted board, including SVG letterboxing, against the physical LCD.
    bounds = page.locator(".lcd-art svg > rect").first.bounding_box()
    lcd = page.locator(".lcd").bounding_box()
    assert bounds["width"] > lcd["width"] * .89, (bounds, lcd)
    assert bounds["height"] > lcd["height"] * .72, (bounds, lcd)
    taps(page, "Play heart")
    line = page.locator(".lcd-art polyline")
    for _ in range(110):
        if "6 suns" in page.locator(".lcd-status").inner_text():
            break
        body, sun = line.evaluate("""line => {
          const body=Array.from(line.points,p=>[(p.x-4)/7,(p.y-4)/7]);
          const sun=line.ownerSVGElement.querySelector('.vine-sun');
          if(!sun)return [body,null];
          const target=sun.transform.baseVal.getItem(0).matrix;
          return [body,[(target.e-4)/7,(target.f-4)/7]];
        }""")
        if sun is None:
            break
        turn = turn_for_sun(tuple(map(tuple, body)), tuple(sun))
        old = line.get_attribute("points")
        if turn:
            taps(page, "Play right" if turn == 1 else "Play left")
        expect(line).not_to_have_attribute("points", old, timeout=1800)
    expect(page.locator(".lcd-status")).to_contain_text("6 suns")
    def leave():
        taps(page, "Back on toy", "Next toy item", "Choose Leave game")
        expect(button(page, "Play a game")).to_be_visible()
    leave()
    taps(page, "Play a game", "Next toy item", "Choose Dew Catch", "Play heart")
    expect(page.locator(".lcd-status")).to_contain_text("Clear!", timeout=13000)
    leave()
    taps(page, "Play a game", "Previous toy item", "Choose Leaf Pairs", "Play heart")
    # context_for fixes Math.random at .5. Reproduce the 18-packet shuffle.
    packets = page.locator(".lcd-art .leaf-packet")
    expect(packets).to_have_count(18)
    faces = packets.locator("[data-leaf-face]")
    expect(faces).to_have_count(0)
    boxes = packets.evaluate_all("els => els.map(el => el.querySelector('rect').getBoundingClientRect().toJSON())")
    assert len(set(round(box["y"]) for box in boxes)) == 3
    assert len(set(round(box["x"]) for box in boxes)) == 6
    deck = [face for face in range(9) for _ in range(2)]
    for i in range(len(deck)-1, 0, -1):
        j = (i+1)//2
        deck[i], deck[j] = deck[j], deck[i]
    cursor = 0
    def choose(index):
        nonlocal cursor
        while cursor != index:
            step = 1 if (index-cursor) % len(deck) <= len(deck)//2 else -1
            taps(page, "Play right" if step == 1 else "Play left")
            cursor = (cursor+step) % len(deck)
        taps(page, "Play heart")
    different = next(i for i, leaf in enumerate(deck) if leaf != deck[0])
    for miss in range(1, 6):
        # Reverse the order of the same two cards each attempt to stay near them.
        for index in ((0, different) if miss % 2 else (different, 0)):
            choose(index)
        expect(page.locator(".lcd-top")).to_contain_text(f"Misses {miss}/5")
        if miss < 5:
            expect(page.locator(".lcd-status")).to_contain_text("Two different leaves")
            expect(page.locator(".lcd-status")).to_contain_text("Flip")
            expect(faces).to_have_count(0)
    expect(page.locator(".lcd-status")).to_contain_text("Game over")
    expect(faces).to_have_count(2)
    taps(page, "Play heart")
    cursor = 0
    expect(page.locator(".lcd-top")).to_contain_text("Misses 0/5")
    expect(faces).to_have_count(0)
    for leaf in range(9):
        for i, face in enumerate(deck):
            if face == leaf:
                choose(i)
    expect(page.locator(".lcd-status")).to_contain_text("All paired!")
    portraits = faces.evaluate_all("els => els.map(el => [el.dataset.leafFace, el.querySelector('path').getAttribute('d')])")
    assert len(portraits) == 18
    assert len({outline for _, outline in portraits}) == 9
    assert all(portraits.count(pair) == 2 for pair in portraits)
    leave()
    taps(page, "Open toy menu", "Next toy item", "Back on toy", "Open toy menu", "Choose Care", "Choose Water")
    expect(button(page, "Visit my garden")).to_be_visible()
    assert not errors, errors
    ctx.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("--chromium", default="/usr/bin/chromium")
    args = parser.parse_args()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=args.chromium)
        play(browser, str(Path(args.source).resolve()) if Path(args.source).exists() else args.source)
        browser.close()
    print("Passed fresh seed, all three games, collisions, win, pause and watering handoff.")
