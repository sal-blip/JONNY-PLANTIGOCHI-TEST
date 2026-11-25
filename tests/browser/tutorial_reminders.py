"""Exercise tutorial consent with emulated notification, push and worker APIs."""
import json
from pathlib import Path
from playwright.sync_api import expect, sync_playwright
from dew_lesson import READ_PLANT, sprout_fixture
from scene_music import context_for, SEED_SETUP, taps

APIS = """build => {
  let permission='default', subscription=null;
  window.activations=[];
  Object.defineProperty(window,'PushManager',{value:class {},configurable:false});
  Object.defineProperty(window,'Notification',{value:{
    get permission(){return permission;},
    async requestPermission(){activations.push(['permission',navigator.userActivation.isActive]);return permission='granted';}
  }});
  const worker=Object.assign(new EventTarget(),{state:'activated',scriptURL:location.origin+'/sw.js?build='+build,postMessage(message,ports){
    ports?.[0]?.postMessage({status:'pending'});
  }});
  const registration=Object.assign(new EventTarget(),{active:worker,update:async()=>{},pushManager:{
    getSubscription:async()=>subscription,subscribe:async()=>{
      activations.push(['subscribe',navigator.userActivation.isActive]);
      permission='granted';return subscription={endpoint:'https://example.test/push'};
    }
  }});
  Object.defineProperty(navigator,'serviceWorker',{value:Object.assign(new EventTarget(),{
    controller:worker,ready:Promise.resolve(registration),register:async()=>registration,getRegistration:async()=>registration
  })});
}"""
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium')
    for choice in ('later','android','apple'):
        ctx,url,blank=context_for(browser,str(Path('dist').resolve()))
        ctx.add_init_script('('+APIS+')('+json.dumps(json.loads(Path('dist/game-release.json').read_text())['worker'])+')')
        if choice=='apple':
            ctx.add_init_script("Object.defineProperty(navigator,'vendor',{value:'Apple Computer, Inc.'})")
        ctx.route('**/api/alerts/key',lambda r:r.fulfill(json={'publicKey':'emulated-key'}))
        p=ctx.new_page()
        p.goto(blank)
        p.evaluate(SEED_SETUP,sprout_fixture()['plant'])
        p.goto(url)
        taps(p,'Maybe later')
        expect(p.get_by_role('button',name='Turn on reminders')).to_have_count(0)
        taps(p,'Claim 20 coins')
        offer=p.get_by_role('button',name='Turn on reminders')
        expect(offer).to_be_enabled()
        if choice=='later':
            taps(p,'Maybe later')
            check=p.get_by_text('Come check on me often.',exact=False)
            expect(check).to_be_visible()
            p.reload()
            expect(check).to_be_visible()
            taps(p,'Got it')
            assert p.evaluate('activations')==[]
        else:
            taps(p,'Turn on reminders')
            p.wait_for_function("JSON.parse(localStorage.getItem('plantigochi.alert-device.v1'))?.enabled===true")
            assert p.evaluate('activations')[0]==['subscribe' if choice=='apple' else 'permission',True]
        p.wait_for_function("!document.querySelector('.toy-guide.farewell')")
        assert not p.evaluate(READ_PLANT).get('tutorialReminder')
        p.reload()
        expect(p.get_by_role('button',name='Open toy menu')).to_be_visible()
        expect(offer).to_have_count(0)
        ctx.unroute_all(behavior='wait')
        ctx.close()
        print(choice,'post-tutorial path passed')
    browser.close()
