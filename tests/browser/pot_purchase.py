"""Check the starter pot's center-windowsill purchase against a local app or downloaded HTML."""
import argparse
import time
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

from dew_lesson import READ_PLANT


CENTER = "Place at Center of the living room windowsill"
BUY = "Buy for 12 coins"
RETURN = "Return to my seed"

# Hold a separate, real readwrite transaction on the same object store. A second
# transaction has to queue in Chromium, even though its JS callbacks can run.
BLOCK_WRITES = """async () => {
    const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('plantigochi.pocket.garden');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction('garden', 'readwrite');
    const store = transaction.objectStore('garden');
    let hold = true;
    function keepOpen() {
        store.get('setup').onsuccess = () => { if (hold) keepOpen(); };
    }
    keepOpen();
    window.releasePurchaseLock = abort => {
        hold = false;
        if (abort) transaction.abort();
    };
    transaction.oncomplete = () => db.close();
    transaction.onabort = () => db.close();
}"""

# Model the durable-write/delayed-ack boundary without replacing IndexedDB.
# This only intercepts the first purchase transaction, after it actually commits.
DELAY_ACK = """() => {
    const put = IDBObjectStore.prototype.put;
    window.purchaseAckHeld = false;
    IDBObjectStore.prototype.put = function(value, key) {
        if (key === 'current' && typeof value === 'string') {
            const plant = JSON.parse(value);
            if (plant.tutorial?.step === 'return' &&
                plant.gardenLife.items.some(item => item.sku === 'terra' && item.slot === '0/window-middle')) {
                IDBObjectStore.prototype.put = put;
                const transaction = this.transaction;
                const complete = transaction.oncomplete;
                if (typeof complete !== 'function') throw Error('Missing purchase save callback');
                transaction.oncomplete = event => {
                    window.purchaseAckHeld = true;
                    window.releasePurchaseAck = () => complete.call(transaction, event);
                };
            }
        }
        return put.apply(this, arguments);
    };
}"""


# The first tab's purchase can sit behind an unrelated lifecycle refresh without
# holding a DB lock. A second tab can then legitimately buy the starter pot.
DELAY_REFRESH = """async () => {
    const openTransaction = IDBDatabase.prototype.transaction;
    let captured;
    const waiting = new Promise(resolve => { captured = resolve; });
    IDBDatabase.prototype.transaction = function(stores, mode, ...rest) {
        const tx = openTransaction.call(this, stores, mode, ...rest);
        if (this.name === 'plantigochi.pocket.garden' && mode === 'readwrite') {
            IDBDatabase.prototype.transaction = openTransaction;
            const descriptor = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete');
            Object.defineProperty(tx, 'oncomplete', {
                set(callback) {
                    descriptor.set.call(tx, event => {
                        window.releaseRefresh = () => callback.call(tx, event);
                        captured();
                    });
                },
                configurable: true,
            });
        }
        return tx;
    };
    window.dispatchEvent(new Event('focus'));
    await waiting;
}"""


def button(page, name):
    return page.get_by_role("button", name=name, exact=True)


def select_center(page):
    for label in (
        "Name your seed", "Keep Monstera", "Open toy menu", "Next toy item",
        "Back on toy", "Open toy menu", "Choose Care", "Choose Water",
        "Visit my garden", "Open iSEED", "Shop", "Terracotta pot · 12 coins", "Buy", CENTER,
    ):
        button(page, label).tap()
    expect(button(page, BUY)).to_be_enabled()
    initial = page.evaluate(READ_PLANT)
    assert initial["gardenLife"]["balance"] == 12 and initial["gardenLife"]["items"] == []


def background_and_return(page, context):
    # Headless Chromium keeps document.visibilityState visible even when CDP
    # freezes a page. Model the visibility changes explicitly so the game's
    # foreground refresh handler is exercised alongside the native DB lock.
    page.evaluate("""() => {
        window.potVisibility = [];
        document.addEventListener('visibilitychange', () => window.potVisibility.push(document.visibilityState));
        Object.defineProperties(document, {
            hidden: {configurable:true, value:true},
            visibilityState: {configurable:true, value:'hidden'},
        });
        document.dispatchEvent(new Event('visibilitychange'));
    }""")
    client = context.new_cdp_session(page)
    try:
        client.send("Page.setWebLifecycleState", {"state": "frozen"})
        time.sleep(0.4)
        client.send("Page.setWebLifecycleState", {"state": "active"})
        page.bring_to_front()
    finally:
        client.detach()
    page.evaluate("""() => {
        delete document.hidden;
        delete document.visibilityState;
        document.dispatchEvent(new Event('visibilitychange'));
    }""")
    assert page.evaluate("window.potVisibility") == ["hidden", "visible"]


def assert_purchase(page):
    plant = page.evaluate(READ_PLANT)
    items = plant["gardenLife"]["items"]
    assert [(i["sku"], i["slot"]) for i in items] == [("terra", "0/window-middle")], items
    assert plant["gardenLife"]["balance"] == 0
    assert plant["tutorial"]["step"] == "return"


def exercise(browser, source, case):
    context = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True,
                                  has_touch=True, service_workers="block", reduced_motion="reduce")
    context.add_init_script("Object.defineProperty(navigator, 'standalone', {value:true, configurable:true});")
    source_file = Path(source)
    if source_file.is_file():
        url = "https://pot-test.invalid/"
        context.route("**/*", lambda route: route.fulfill(path=source_file, content_type="text/html")
                      if route.request.url == url else route.fulfill(status=404, body=""))
    else:
        url = source
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    try:
        page.goto(url)
        page.evaluate("window.potDocumentId = crypto.randomUUID()")
        document_id = page.evaluate("window.potDocumentId")
        select_center(page)
        if case in {"slow", "auto-retry", "retry"}:
            page.evaluate(BLOCK_WRITES)
        elif case == "committed":
            page.evaluate(DELAY_ACK)
        elif case == "other-window":
            other = context.new_page()
            other.goto(url)
            for label in ("Shop", "Terracotta pot · 12 coins", "Buy", CENTER):
                button(other, label).tap()
            page.bring_to_front()
            page.evaluate(DELAY_REFRESH)

        button(page, BUY).tap()
        if case in {"slow", "auto-retry", "retry"}:
            expect(button(page, "Saving…")).to_be_disabled()
            if case == "slow":
                background_and_return(page, context)
                page.wait_for_timeout(350)
            else:
                expect(button(page, "Trying again…")).to_be_disabled(timeout=12000)
                background_and_return(page, context)
                if case == "retry":
                    # Keep the competing transaction open through both attempts,
                    # then retry with the same selected spot before releasing it.
                    retry = button(page, "Retry save")
                    expect(retry).to_be_enabled(timeout=12000)
                    assert page.locator("main[data-surface]").get_attribute("data-tutorial") == "pot"
                    retry.tap()
                    expect(button(page, "Saving…")).to_be_disabled()
                else:
                    page.wait_for_timeout(300)
            page.evaluate("abort => window.releasePurchaseLock(abort)", case == "retry")
        elif case == "other-window":
            expect(button(page, "Saving…")).to_be_disabled()
            button(other, BUY).tap()
            expect(button(other, RETURN)).to_be_enabled()
            assert_purchase(other)
            page.bring_to_front()
            page.evaluate("window.releaseRefresh()")
        elif case == "committed":
            page.wait_for_function("window.purchaseAckHeld")
            assert_purchase(page)
            expect(button(page, RETURN)).to_be_enabled(timeout=16000)

        expect(button(page, RETURN)).to_be_enabled(timeout=18000)
        assert_purchase(page)
        button(page, RETURN).tap()
        expect(page.locator(".garden-purse span").first).to_have_text("200")
        if case == "committed":
            # A lost callback must not obstruct the next mutation either.
            page.evaluate("window.releasePurchaseAck()")
            page.wait_for_timeout(200)
        plant = page.evaluate(READ_PLANT)
        assert plant["tutorial"]["step"] == "boost"
        assert plant["gardenLife"]["balance"] == 200
        assert len(plant["gardenLife"]["items"]) == 1
        assert page.evaluate("window.potDocumentId") == document_id, "The app recovered by reloading"
        assert not errors, errors
        print(f"PASS {case}: center pot persisted once and returned to a 200-coin seed.", flush=True)
    except Exception:
        print(f"FAIL {case}: aria status {page.locator('[role=status]').all_text_contents()}; "
              f"visible buttons {page.get_by_role('button').evaluate_all('(els) => els.map(e => e.textContent || e.ariaLabel)')}; "
              f"visibility {page.evaluate('window.potVisibility || []')}; errors {errors}", flush=True)
        raise
    finally:
        context.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", help="Local app URL or a downloaded HTML file")
    parser.add_argument("--chromium", help="Optional path to Chromium")
    parser.add_argument("--case", choices=("all", "normal", "slow", "auto-retry", "retry", "committed", "other-window"), default="all")
    args = parser.parse_args()
    cases = ("normal", "slow", "auto-retry", "retry", "committed", "other-window") if args.case == "all" else (args.case,)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=args.chromium)
        try:
            for name in cases:
                exercise(browser, args.source, name)
        finally:
            browser.close()
