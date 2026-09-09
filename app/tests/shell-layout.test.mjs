import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nativeChromeGeometry, installShellLayout } from '../web/shell-layout.mjs';
const packet = {schemaVersion:1,platform:'macos',overlay:true,controlsInsetLeft:88,toolbarHeight:56};
test('native chrome accepts bounded geometry and rejects arbitrary or invalid injection', () => {
  assert.deepEqual(nativeChromeGeometry(packet), {overlay:true,controlsInsetLeft:88,toolbarHeight:56});
  for (const patch of [{schemaVersion:2},{platform:'other'},{controlsInsetLeft:-1},{controlsInsetLeft:Infinity},{controlsInsetLeft:257},{toolbarHeight:NaN},{toolbarHeight:39},{toolbarHeight:97}]) assert.equal(nativeChromeGeometry({...packet,...patch}),null);
});
test('host geometry updates and fullscreen/native nonoverlay remove reservations without adding a strip', () => {
  const events = new Map(), props = new Map();
  const root = {dataset:{},style:{setProperty:(k,v)=>props.set(k,v),removeProperty:k=>props.delete(k)}};
  const host = {location:{search:''},__CW_NATIVE_CHROME__:packet,addEventListener:(k,fn)=>events.set(k,fn)};
  installShellLayout({window:host,document:{documentElement:root},navigator:{}});
  assert.equal(root.dataset.shell,'desktop');
  assert.equal(props.get('--native-controls-inset'),'88px');
  events.get('courtwork:native-chrome')({detail:{...packet,controlsInsetLeft:0}});
  assert.equal(props.get('--native-controls-inset'),'0px');
  events.get('courtwork:native-chrome')({detail:{...packet,controlsInsetLeft:-10}});
  assert.equal(props.get('--native-controls-inset'),'0px');
  events.get('courtwork:native-chrome')({detail:{...packet,overlay:false}});
  assert.equal(root.dataset.shell,undefined);
  assert.equal(props.size,0);
});
