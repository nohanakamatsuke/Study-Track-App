import {noteHTML,noteMarkdown} from './notes.js';
import {keyOf,minutes,totalOf,validateData} from './model.js';
const $=s=>document.querySelector(s),today=keyOf(new Date());let data={},month=new Date(),selected=today,active='calendar',installPrompt;
try{data=validateData(JSON.parse(localStorage.getItem('study-track-data')||'{}'));}catch{toast('保存データを読み込めませんでした。インポートで復元できます。');}
month.setDate(1);
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),3500);}
function persist(next){try{localStorage.setItem('study-track-data',JSON.stringify(next));data=next;return true;}catch{toast('保存できません。空き容量とブラウザの保存設定を確認してください。');return false;}}
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){const y=month.getFullYear(),m=month.getMonth(),prefix=`${y}-${String(m+1).padStart(2,'0')}`;$('#month').textContent=`${y}年 ${m+1}月`;const now=new Date();$('#period-label').textContent=y===now.getFullYear()&&m===now.getMonth()?'今月の勉強時間':`${y}年${m+1}月の勉強時間`;$('#month-en').textContent=month.toLocaleDateString('en',{month:'long'}).toUpperCase();const entries=Object.entries(data).filter(([k])=>k.startsWith(prefix));const monthlyMinutes=entries.reduce((n,[,e])=>n+totalOf(e),0);$('#total').textContent=Math.floor(monthlyMinutes/60).toLocaleString();$('#total-minutes').textContent=monthlyMinutes%60?`${monthlyMinutes%60}分`:'';const days=entries.filter(([,e])=>totalOf(e)>0).length;$('#days').textContent=days;const grid=calendarMarkup(month);$('#calendar').style.setProperty('--calendar-weeks',grid.weeks);$('#calendar').innerHTML=grid.html;$('#note-count').textContent=Object.values(data).filter(e=>e.title||e.body).length;renderNotes();}
function renderNotes(){const q=$('#search').value.toLowerCase();const entries=Object.entries(data).filter(([k,e])=>(e.title||e.body)&&`${k} ${e.title} ${e.body}`.toLowerCase().includes(q)).sort(([a],[b])=>b.localeCompare(a));$('#notes-list').innerHTML=entries.length?entries.map(([k,e])=>`<button class="note-card" data-date="${k}"><span class="note-card-date">${k.replaceAll('-',' / ')}</span>${e.title?`<h3>${escape(e.title)}</h3>`:''}<p>${escape(e.body.slice(0,160))}</p><small>${totalOf(e)} 分の学び ↗</small></button>`).join(''):'<div class="empty-notes"><span>▤</span><h3>ここに、あなたの学びを。</h3><p>カレンダーの日付からノートを記録できます。</p></div>';}
function setView(view){active=view;$('#calendar-view').hidden=view!=='calendar';$('#notes-view').hidden=view!=='notes';$('#calendar-nav').classList.toggle('nav-active',view==='calendar');$('#notes-nav').classList.toggle('nav-active',view==='notes');$('#page-name').textContent=view==='calendar'?'カレンダー':'ノート一覧';}
function durationValue(){return Number($('#duration-hours').value||0)*60+Number($('#duration-minutes').value||0);}
function fillDuration(value){$('#duration-hours').value=Math.floor(value/60)||'';$('#duration-minutes').value=value%60||'';$('#day-total').textContent=value+' 分';}
function updateTotal(){const rows=[...$('#sessions').children];if(rows.some(r=>r.querySelector('.start').value&&r.querySelector('.end').value))fillDuration(rows.reduce((n,r)=>n+minutes(r.querySelector('.start').value,r.querySelector('.end').value),0));else $('#day-total').textContent=durationValue()+' 分';}
for(const id of ['#duration-hours','#duration-minutes'])$(id).addEventListener('input',()=>{$('#day-total').textContent=durationValue()+' 分';});
function addSession(s={start:'',end:''}){
 const row=document.createElement('div');row.className='session';
 row.innerHTML=`<label>開始時刻<input class="start" type="text" inputmode="numeric" placeholder="00:00" aria-label="開始時刻" pattern="([01][0-9]|2[0-3]):[0-5][0-9]" maxlength="5" autocomplete="off" value="${s.start}"></label><span aria-hidden="true">→</span><label>終了時刻<input class="end" type="text" inputmode="numeric" placeholder="00:00" aria-label="終了時刻" pattern="([01][0-9]|2[0-3]):[0-5][0-9]" maxlength="5" autocomplete="off" value="${s.end}"></label><button type="button" class="remove-session" aria-label="この時間帯を削除">×</button>`;
 const start=row.querySelector('.start'),end=row.querySelector('.end');
 for(const field of [start,end]){
  field.addEventListener('input',e=>{
   const digits=field.value.replace(/\D/g,'').slice(0,4);
   // Keep deletion predictable; only format and advance once a time is complete.
   if(!e.inputType?.startsWith('delete')&&digits.length===4){field.value=digits.slice(0,2)+':'+digits.slice(2);if(field===start&&field.validity.valid){end.focus();end.select();}}
   start.required=end.required=Boolean(start.value||end.value);updateTotal();
  });
  field.addEventListener('blur',()=>{if(/^\d{1,2}:\d{2}$/.test(field.value))field.value=field.value.padStart(5,'0');});
  field.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();(field===start?end:$('#note-body')).focus();}});
 }
 start.required=end.required=Boolean(s.start||s.end);
 row.querySelector('button').onclick=()=>{row.remove();updateTotal();};$('#sessions').append(row);updateTotal();return start;
}
let editorSnapshot='';
function editorState(){return JSON.stringify({title:data[selected]?.title||'',durationMinutes:durationValue(),body:noteMarkdown($('#note-body')),sessions:[...$('#sessions').children].map(row=>({start:row.querySelector('.start').value,end:row.querySelector('.end').value}))});}
function closeEditor(){if(editorState()!==editorSnapshot&&!confirm('保存していない変更を破棄しますか？'))return;$('#editor').close();}
function openEditor(key,focusNote=false){
 selected=key;$('#editor-title').textContent=new Date(key+'T12:00:00').toLocaleDateString('ja',{year:'numeric',month:'long',day:'numeric',weekday:'short'});
 $('#note-body').innerHTML=noteHTML(data[key]?.body||'');$('#sessions').replaceChildren();
 const sessions=data[key]?.sessions||[];(sessions.length?sessions:[{start:'',end:''}]).forEach(addSession);
 fillDuration(totalOf(data[key]));$('#optional-times').open=false;$('#delete').hidden=!data[key];editorSnapshot=editorState();$('#editor').showModal();document.querySelector('.editor-scroll').scrollTop=0;queueEditorLayout();
 if(focusNote)$('#note-body').focus({preventScroll:true});syncFormatButtons();
}
$('#calendar').onclick=e=>{const day=e.target.closest('[data-date]');if(day)openEditor(day.dataset.date);};$('#notes-list').onclick=e=>{const day=e.target.closest('[data-date]');if(day)openEditor(day.dataset.date,true);};$('#calendar-nav').onclick=()=>setView('calendar');$('#notes-nav').onclick=()=>setView('notes');$('#search').oninput=renderNotes;$('#add').onclick=()=>openEditor(keyOf(new Date()));$('#close').onclick=closeEditor;$('#editor').addEventListener('cancel',e=>{e.preventDefault();closeEditor();});$('#editor').onclick=e=>{if(e.target===$('#editor')){const r=$('#editor').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeEditor();}};$('#add-session').onclick=()=>addSession().focus();$('#prev').onclick=()=>changeMonth(-1);$('#next').onclick=()=>changeMonth(1);$('#today').onclick=()=>{month=new Date();month.setDate(1);render();};$('#entry-form').onsubmit=e=>{e.preventDefault();const key=selected;const entry=JSON.parse(editorState());entry.title=entry.title.trim();entry.sessions=entry.sessions.filter(s=>s.start||s.end);const next={...data,[key]:entry};if(persist(next)){$('#editor').close();render();toast('保存しました');}};$('#delete').onclick=()=>{if(confirm('この日の勉強記録とノートを削除しますか？')){const next={...data};delete next[selected];if(persist(next)){$('#editor').close();render();toast('記録を削除しました');}}};
function setTheme(mode){document.documentElement.dataset.theme=mode;$('#theme').textContent=mode==='dark'?'☾':'☀';const themeAction=mode==='dark'?'ライトモードに切り替える':'ダークモードに切り替える';$('#theme').setAttribute('aria-label',themeAction);$('#theme').title=themeAction;$('meta[name="theme-color"]').content=mode==='dark'?'#171b24':'#f6f7f9';}let savedTheme;try{savedTheme=localStorage.getItem('study-track-theme');}catch{}setTheme(savedTheme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));$('#theme').onclick=()=>{const mode=document.documentElement.dataset.theme==='dark'?'light':'dark';setTheme(mode);try{localStorage.setItem('study-track-theme',mode);}catch{}};
$('#export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:2,entries:data},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`study-track-${today}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};$('#import').onclick=()=>$('#import-file').click();$('#import-file').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>10_000_000)throw Error('ファイルが大きすぎます');const parsed=JSON.parse(await file.text());if(![1,2].includes(parsed.version))throw Error('対応していないバックアップ形式です');const imported=validateData(parsed.entries);if(confirm('バックアップを読み込みます。同じ日付の記録は上書きされます。続けますか？')&&persist({...data,...imported})){render();toast('バックアップを読み込みました');}}catch(err){toast('読み込みに失敗しました: '+err.message);}e.target.value='';};
$('#today-label').textContent=new Date().toLocaleDateString('ja',{month:'long',day:'numeric',weekday:'short'});window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('#install').hidden=false;});$('#install').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;$('#install').hidden=true;}};if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>toast('オフライン機能を有効にできませんでした'));render();

// Native editing commands preserve selection, undo and visible formatting.
const noteField=$('#note-body');let noteRange;
function rememberSelection(){const selection=getSelection();if(selection.rangeCount&&noteField.contains(selection.anchorNode)&&noteField.contains(selection.focusNode))noteRange=selection.getRangeAt(0).cloneRange();}
function syncFormatButtons(){const selection=getSelection(),inside=selection.rangeCount&&noteField.contains(selection.anchorNode);document.querySelectorAll('[data-command]').forEach(button=>button.setAttribute('aria-pressed',String(Boolean(inside&&document.queryCommandState(button.dataset.command)))));}
document.addEventListener('selectionchange',()=>{rememberSelection();syncFormatButtons();});
document.querySelectorAll('[data-command]').forEach(button=>{
 button.addEventListener('pointerdown',e=>e.preventDefault());
 button.onclick=()=>{noteField.focus({preventScroll:true});const selection=getSelection();if(noteRange&&noteField.contains(noteRange.commonAncestorContainer)){selection.removeAllRanges();selection.addRange(noteRange);}document.execCommand(button.dataset.command);rememberSelection();syncFormatButtons();};
});
noteField.addEventListener('paste',e=>{e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain'));});
// Markdown's list shortcut, with native Enter continuation and undo.
noteField.addEventListener('keydown',e=>{
 if(e.key!==' '||e.isComposing||e.ctrlKey||e.metaKey||e.altKey)return;
 const sel=getSelection();if(!sel.isCollapsed||!sel.rangeCount)return;
 const range=sel.getRangeAt(0),node=sel.anchorNode;
 if(node?.nodeType===3&&node.textContent.slice(0,range.startOffset)==='-'&&!node.parentElement.closest('li')){
  e.preventDefault();range.setStart(node,0);sel.removeAllRanges();sel.addRange(range);document.execCommand('delete');document.execCommand('insertUnorderedList');rememberSelection();syncFormatButtons();
 }
});
window.addEventListener('beforeunload',e=>{if($('#editor').open&&editorState()!==editorSnapshot){e.preventDefault();e.returnValue='';}});

// A single native disclosure works at every viewport size.
const settingsMenu=document.querySelector('.mobile-menu');
settingsMenu.open=false;
document.addEventListener('click',e=>{if(!settingsMenu.contains(e.target))settingsMenu.open=false;});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&settingsMenu.open){settingsMenu.open=false;settingsMenu.querySelector('summary').focus();}});
settingsMenu.querySelectorAll('nav button').forEach(button=>button.addEventListener('click',()=>{settingsMenu.open=false;}));

// Adjacent months follow the finger, then settle with a short eased slide.
const swipeSurface=$('#calendar-view'),gridWindow=document.querySelector('.calendar-window');
let swipeStart=null,dragX=0,ghost=null,ghostDirection=0,monthAnimating=false,suppressDayClickUntil=0;
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
function prepareGhost(direction){
 if(ghost&&ghostDirection===direction)return;
 ghost?.remove();ghostDirection=direction;
 const next=new Date(month);next.setMonth(next.getMonth()+direction);const grid=calendarMarkup(next);
 ghost=document.createElement('div');ghost.className='calendar calendar-ghost';ghost.inert=true;ghost.setAttribute('aria-hidden','true');ghost.innerHTML=grid.html;ghost.style.setProperty('--calendar-weeks',grid.weeks);gridWindow.append(ghost);
}
function drawDrag(x){dragX=x;const direction=x<0?1:-1;prepareGhost(direction);$('#calendar').style.transform=`translateX(${x}px)`;ghost.style.transform=`translateX(${x+direction*gridWindow.clientWidth}px)`;}
async function settleMonth(direction,commit=true){
 if(monthAnimating)return;monthAnimating=true;prepareGhost(direction);
 const width=gridWindow.clientWidth,from=dragX,to=commit?-direction*width:0,duration=reduceMotion.matches?0:260;
 const options={duration,easing:'cubic-bezier(.22,.75,.25,1)',fill:'forwards'};
 const mainAnimation=$('#calendar').animate([{transform:`translateX(${from}px)`},{transform:`translateX(${to}px)`}],options);
 const ghostAnimation=ghost.animate([{transform:`translateX(${from+direction*width}px)`},{transform:`translateX(${to+direction*width}px)`}],options);
 await Promise.all([mainAnimation.finished,ghostAnimation.finished]);
 if(commit){month.setMonth(month.getMonth()+direction);render();}
 $('#calendar').style.transform='';mainAnimation.cancel();ghostAnimation.cancel();ghost?.remove();ghost=null;dragX=0;monthAnimating=false;
}
function changeMonth(direction){if(!monthAnimating){swipeStart=null;settleMonth(direction);}}
swipeSurface.addEventListener('touchstart',e=>{if(monthAnimating||e.touches.length!==1||e.target.closest('.calendar-controls')){swipeStart=null;return;}const t=e.touches[0];swipeStart={x:t.clientX,y:t.clientY,axis:null};},{passive:true});
swipeSurface.addEventListener('touchmove',e=>{
 if(!swipeStart)return;
 if(e.touches.length!==1){if(dragX)settleMonth(ghostDirection,false);swipeStart=null;return;}
 const dx=e.touches[0].clientX-swipeStart.x,dy=e.touches[0].clientY-swipeStart.y;
 if(!swipeStart.axis&&Math.max(Math.abs(dx),Math.abs(dy))>8)swipeStart.axis=Math.abs(dx)>Math.abs(dy)*1.3?'x':'y';
 if(swipeStart.axis==='x'){e.preventDefault();drawDrag(Math.max(-gridWindow.clientWidth,Math.min(gridWindow.clientWidth,dx)));}
},{passive:false});
function finishSwipe(cancel=false){if(!swipeStart)return;const horizontal=swipeStart.axis==='x';swipeStart=null;if(!horizontal)return;suppressDayClickUntil=performance.now()+450;const direction=dragX<0?1:-1;settleMonth(direction,!cancel&&Math.abs(dragX)>Math.min(90,gridWindow.clientWidth*.22));}
swipeSurface.addEventListener('touchend',()=>finishSwipe(),{passive:true});swipeSurface.addEventListener('touchcancel',()=>finishSwipe(true),{passive:true});
swipeSurface.addEventListener('click',e=>{if(monthAnimating||performance.now()<suppressDayClickUntil){e.preventDefault();e.stopImmediatePropagation();}},true);

// Pull the sheet's handle or date down to close; editing and scrolling notes stay independent.
const editor=$('#editor');let sheetStart=null,sheetDrag=0;
editor.addEventListener('touchstart',e=>{if(e.touches.length!==1||!e.target.closest('.sheet-handle,.dialog-head')||e.target.closest('button'))return;sheetStart={x:e.touches[0].clientX,y:e.touches[0].clientY};sheetDrag=0;},{passive:true});
editor.addEventListener('touchmove',e=>{if(!sheetStart)return;if(e.touches.length!==1){sheetStart=null;editor.style.transform='';return;}const dx=e.touches[0].clientX-sheetStart.x,dy=e.touches[0].clientY-sheetStart.y;if(dy>0&&dy>Math.abs(dx)){e.preventDefault();sheetDrag=dy;editor.style.transform=`translateY(${dy}px)`;}},{passive:false});
function finishSheet(cancel=false){if(!sheetStart)return;sheetStart=null;editor.style.transform='';if(!cancel&&sheetDrag>80)closeEditor();else if(sheetDrag&&!reduceMotion.matches)editor.animate([{transform:`translateY(${sheetDrag}px)`},{transform:'translateY(0)'}],{duration:180,easing:'ease-out'});sheetDrag=0;}
editor.addEventListener('touchend',()=>finishSheet(),{passive:true});editor.addEventListener('touchcancel',()=>finishSheet(true),{passive:true});
// Anchor the sheet to the visible screen, rather than the layout viewport behind
// Safari's keyboard. Resize and pan notifications are coalesced into one frame.
const editorScroll=document.querySelector('.editor-scroll'),viewport=window.visualViewport;
let editorLayoutFrame=0;
function keepEditorFocusVisible(){
 if(!editor.open)return;
 const focused=document.activeElement;let rect;
 if(focused===noteField){
  const selection=getSelection();if(!selection.isCollapsed||!selection.rangeCount||!noteField.contains(selection.anchorNode))return;
  rect=selection.getRangeAt(0).getBoundingClientRect();
  // WebKit returns an empty rectangle for a caret on an empty line. That is
  // exactly when a new note must be moved above the newly opened keyboard.
  if(!rect.height){
   const anchor=selection.anchorNode;
   let line=anchor.nodeType===Node.TEXT_NODE?anchor.parentElement:anchor;
   if(line===noteField&&line.childNodes.length)line=line.childNodes[Math.min(selection.anchorOffset,line.childNodes.length-1)];
   if(line.nodeType!==Node.ELEMENT_NODE)line=line.parentElement;
   const box=line.getBoundingClientRect(),style=getComputedStyle(line);
   const height=parseFloat(style.lineHeight)||parseFloat(style.fontSize)*1.8;
   const top=box.top+(parseFloat(style.paddingTop)||0);
   rect={top,bottom:top+height};
  }
 }else if(editorScroll.contains(focused))rect=focused.getBoundingClientRect();
 if(!rect)return;
 const bounds=editorScroll.getBoundingClientRect(),padding=16;
 if(focused===noteField&&!noteField.textContent.trim()){editorScroll.scrollTop+=Math.max(0,rect.top-bounds.top-padding);return;}
 if(rect.bottom>bounds.bottom-padding)editorScroll.scrollTop+=rect.bottom-bounds.bottom+padding;
 else if(rect.top<bounds.top+padding)editorScroll.scrollTop+=rect.top-bounds.top-padding;
}
function queueEditorLayout(){
 if(editorLayoutFrame)return;
 editorLayoutFrame=requestAnimationFrame(()=>{
  editorLayoutFrame=0;if(!editor.open)return;
  const style=editor.style;
  style.setProperty('--visible-top',(viewport?.offsetTop||0)+'px');
  style.setProperty('--visible-left',(viewport?.offsetLeft||0)+'px');
  style.setProperty('--visible-width',(viewport?.width||innerWidth)+'px');
  style.setProperty('--visible-height',(viewport?.height||innerHeight)+'px');
  keepEditorFocusVisible();
 });
}
viewport?.addEventListener('resize',queueEditorLayout);viewport?.addEventListener('scroll',queueEditorLayout);
window.addEventListener('resize',queueEditorLayout);
editor.addEventListener('focusin',queueEditorLayout);
noteField.addEventListener('input',queueEditorLayout);
document.addEventListener('selectionchange',()=>{if(editor.open&&document.activeElement===noteField)queueEditorLayout();});
$('#hide-keyboard').addEventListener('pointerdown',e=>e.preventDefault());
$('#hide-keyboard').onclick=()=>{rememberSelection();if(editor.contains(document.activeElement))document.activeElement.blur();$('#hide-keyboard').focus({preventScroll:true});};
editor.addEventListener('close',()=>{editor.style.transform='';sheetStart=null;sheetDrag=0;});

function calendarMarkup(displayMonth){const y=displayMonth.getFullYear(),m=displayMonth.getMonth();const start=new Date(y,m,1-displayMonth.getDay());const cells=Math.ceil((displayMonth.getDay()+new Date(y,m+1,0).getDate())/7)*7;const html=Array.from({length:cells},(_,i)=>{const date=new Date(start);date.setDate(start.getDate()+i);const key=keyOf(date),e=data[key],total=totalOf(e),outside=date.getMonth()!==m;return `<button class="day ${outside?'outside':''} ${key===today?'today':''} ${total?'has-study':''}" data-date="${key}" aria-label="${key}、勉強 ${total} 分${e?.body?'、ノートあり':''}"><span class="date-number">${date.getDate()}</span>${total?`<span class="study-time ${total>=120?'intense':total>=60?'medium':''}">${total}<small>分</small></span>`:''}${e?.body||e?.title?'<span class="note-mark" title="ノートあり">▤</span>':''}</button>`;}).join('');return {html,weeks:cells/7};}
