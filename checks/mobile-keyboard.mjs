// Optional browser regression: run against an already started app.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
 // A real mobile keyboard also changes the visual viewport's offset, not just
 // the window height. Include an empty contenteditable: its Range has no box.
 await context.addInitScript(()=>{
  const viewport=new EventTarget();Object.assign(viewport,{height:844,width:390,offsetTop:0,offsetLeft:0});
  Object.defineProperty(window,'visualViewport',{value:viewport});
  window.resizeKeyboard=(height,offsetTop)=>{Object.assign(viewport,{height,offsetTop});viewport.dispatchEvent(new Event('resize'));viewport.dispatchEvent(new Event('scroll'));};
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.APP_URL||'http://127.0.0.1:3000');await page.locator('#add').click();await page.locator('#note-body').click();
 for(const [height,top] of [[340,0],[240,180],[280,120],[844,0]]){
  await page.evaluate(([height,top])=>window.resizeKeyboard(height,top),[height,top]);
  await page.waitForFunction(([height,top])=>{
   const editor=document.querySelector('#editor').getBoundingClientRect();
   const scroll=document.querySelector('.editor-scroll').getBoundingClientRect();
   const line=document.querySelector('#note-body').firstElementChild.getBoundingClientRect();
   return Math.abs(editor.height-height)<1&&Math.abs(editor.top-top)<1&&line.top>=scroll.top&&line.bottom<=scroll.bottom;
  },[height,top]);
  assert.equal(await page.evaluate(()=>window.scrollY),0);
 }
 await page.keyboard.type('- ');await page.keyboard.type('New note');assert.equal(await page.locator('#note-body li').count(),1);
 await page.evaluate(()=>window.resizeKeyboard(240,180));
 for(let i=0;i<12;i++){await page.keyboard.press('Enter');await page.keyboard.type('Line '+i);}
 await page.waitForFunction(()=>{const range=getSelection().getRangeAt(0).getBoundingClientRect(),scroll=document.querySelector('.editor-scroll').getBoundingClientRect();return range.top>=scroll.top&&range.bottom<=scroll.bottom;});
 // A trailing empty list line must also remain visible, without typing a letter.
 await page.keyboard.press('Enter');await page.waitForFunction(()=>{const li=document.querySelector('#note-body li:last-child').getBoundingClientRect(),scroll=document.querySelector('.editor-scroll').getBoundingClientRect();return li.top>=scroll.top&&li.bottom<=scroll.bottom;});
 await page.locator('.editor-done').click();await page.reload();await page.locator('#add').click();assert.ok((await page.locator('#note-body').innerText()).includes('New note'));assert.deepEqual(errors,[]);
 console.log('Mobile keyboard regression passed: empty note, empty line, viewport pan, long notes and saving.');
}finally{await browser.close();}
