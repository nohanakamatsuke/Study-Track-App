import {noteHTML,noteMarkdown} from './notes.js';
import {keyOf,minutes,totalOf,validateData} from './model.js';
const $=s=>document.querySelector(s),today=keyOf(new Date());let data={},month=new Date(),selected=today,active='calendar',installPrompt;
try{data=validateData(JSON.parse(localStorage.getItem('study-track-data')||'{}'));}catch{toast('保存データを読み込めませんでした。インポートで復元できます。');}
month.setDate(1);
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),3500);}
function persist(next){try{localStorage.setItem('study-track-data',JSON.stringify(next));data=next;return true;}catch{toast('保存できません。空き容量とブラウザの保存設定を確認してください。');return false;}}
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){const y=month.getFullYear(),m=month.getMonth(),prefix=`${y}-${String(m+1).padStart(2,'0')}`;$('#month').textContent=`${y}年 ${m+1}月`;$('#month-en').textContent=month.toLocaleDateString('en',{month:'long'}).toUpperCase();const entries=Object.entries(data).filter(([k])=>k.startsWith(prefix));$('#total').textContent=entries.reduce((n,[,e])=>n+totalOf(e),0).toLocaleString();const days=entries.filter(([,e])=>totalOf(e)>0).length;$('#days').textContent=days;$('#days-caption').textContent=days?`${new Date(y,m+1,0).getDate()}日中 ${days}日、学びを記録`:'今月の学びを積み重ねよう';let streak=0,d=new Date();if(!totalOf(data[keyOf(d)]))d.setDate(d.getDate()-1);while(totalOf(data[keyOf(d)])){streak++;d.setDate(d.getDate()-1);}$('#streak').textContent=streak;const start=new Date(y,m,1-month.getDay());const cells=Math.ceil((month.getDay()+new Date(y,m+1,0).getDate())/7)*7;$('#calendar').innerHTML=Array.from({length:cells},(_,i)=>{const date=new Date(start);date.setDate(start.getDate()+i);const key=keyOf(date),e=data[key],total=totalOf(e),outside=date.getMonth()!==m;return `<button class="day ${outside?'outside':''} ${key===today?'today':''} ${total?'has-study':''}" data-date="${key}" aria-label="${key}、勉強 ${total} 分${e?.body?'、ノートあり':''}"><span class="date-number">${date.getDate()}</span>${total?`<span class="study-time ${total>=120?'intense':total>=60?'medium':''}">${total}<small>分</small></span>`:''}${e?.body||e?.title?'<span class="note-mark" title="ノートあり">▤</span>':''}</button>`;}).join('');$('#note-count').textContent=Object.values(data).filter(e=>e.title||e.body).length;renderNotes();}
function renderNotes(){const q=$('#search').value.toLowerCase();const entries=Object.entries(data).filter(([k,e])=>(e.title||e.body)&&`${k} ${e.title} ${e.body}`.toLowerCase().includes(q)).sort(([a],[b])=>b.localeCompare(a));$('#notes-list').innerHTML=entries.length?entries.map(([k,e])=>`<button class="note-card" data-date="${k}"><span class="note-card-date">${k.replaceAll('-',' / ')}</span><h3>${escape(e.title||'無題のノート')}</h3><p>${escape(e.body.slice(0,160))}</p><small>${totalOf(e)} 分の学び ↗</small></button>`).join(''):'<div class="empty-notes"><span>▤</span><h3>ここに、あなたの学びを。</h3><p>カレンダーの日付からノートを記録できます。</p></div>';}
function setView(view){active=view;$('#calendar-view').hidden=view!=='calendar';$('#notes-view').hidden=view!=='notes';$('#calendar-nav').classList.toggle('nav-active',view==='calendar');$('#notes-nav').classList.toggle('nav-active',view==='notes');$('#page-name').textContent=view==='calendar'?'カレンダー':'ノート一覧';}
function updateTotal(){$('#day-total').textContent=[...$('#sessions').children].reduce((n,row)=>n+minutes(row.querySelector('.start').value,row.querySelector('.end').value),0)+' 分';}
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
function editorState(){return JSON.stringify({title:$('#note-title').value,body:noteMarkdown($('#note-body')),sessions:[...$('#sessions').children].map(row=>({start:row.querySelector('.start').value,end:row.querySelector('.end').value}))});}
function closeEditor(){if(editorState()!==editorSnapshot&&!confirm('保存していない変更を破棄しますか？'))return;$('#editor').close();}
function openEditor(key,focusNote=false){
 selected=key;$('#editor-title').textContent=new Date(key+'T12:00:00').toLocaleDateString('ja',{year:'numeric',month:'long',day:'numeric',weekday:'short'});
 $('#note-title').value=data[key]?.title||'';$('#note-body').innerHTML=noteHTML(data[key]?.body||'');$('#sessions').replaceChildren();
 const sessions=data[key]?.sessions||[];(sessions.length?sessions:[{start:'',end:''}]).forEach(addSession);
 updateTotal();$('#delete').hidden=!data[key];editorSnapshot=editorState();$('#editor').showModal();$('#editor').scrollTop=0;
 if(focusNote)$('#note-body').focus({preventScroll:true});syncFormatButtons();
}
$('#calendar').onclick=e=>{const day=e.target.closest('[data-date]');if(day)openEditor(day.dataset.date);};$('#notes-list').onclick=e=>{const day=e.target.closest('[data-date]');if(day)openEditor(day.dataset.date,true);};$('#calendar-nav').onclick=()=>setView('calendar');$('#notes-nav').onclick=()=>setView('notes');$('#search').oninput=renderNotes;$('#add').onclick=()=>openEditor(today);$('#close').onclick=closeEditor;$('#editor').addEventListener('cancel',e=>{e.preventDefault();closeEditor();});$('#editor').onclick=e=>{if(e.target===$('#editor')){const r=$('#editor').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeEditor();}};$('#add-session').onclick=()=>addSession().focus();$('#prev').onclick=()=>{month.setMonth(month.getMonth()-1);render();};$('#next').onclick=()=>{month.setMonth(month.getMonth()+1);render();};$('#today').onclick=()=>{month=new Date();month.setDate(1);render();};$('#entry-form').onsubmit=e=>{e.preventDefault();const key=selected;const entry=JSON.parse(editorState());entry.title=entry.title.trim();entry.sessions=entry.sessions.filter(s=>s.start||s.end);const next={...data,[key]:entry};if(persist(next)){$('#editor').close();render();toast('保存しました');}};$('#delete').onclick=()=>{if(confirm('この日の勉強記録とノートを削除しますか？')){const next={...data};delete next[selected];if(persist(next)){$('#editor').close();render();toast('記録を削除しました');}}};
function setTheme(mode){document.documentElement.dataset.theme=mode;$('#theme').textContent=mode==='dark'?'☾ ダーク':'☀ ライト';$('meta[name="theme-color"]').content=mode==='dark'?'#171b24':'#f6f7f9';}let savedTheme;try{savedTheme=localStorage.getItem('study-track-theme');}catch{}setTheme(savedTheme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));$('#theme').onclick=()=>{const mode=document.documentElement.dataset.theme==='dark'?'light':'dark';setTheme(mode);try{localStorage.setItem('study-track-theme',mode);}catch{}};
$('#export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,entries:data},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`study-track-${today}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};$('#import').onclick=()=>$('#import-file').click();$('#import-file').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>10_000_000)throw Error('ファイルが大きすぎます');const parsed=JSON.parse(await file.text());if(parsed.version!==1)throw Error('対応していないバックアップ形式です');const imported=validateData(parsed.entries);if(confirm('バックアップを読み込みます。同じ日付の記録は上書きされます。続けますか？')&&persist({...data,...imported})){render();toast('バックアップを読み込みました');}}catch(err){toast('読み込みに失敗しました: '+err.message);}e.target.value='';};
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
$('#note-title').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();noteField.focus();}});
window.addEventListener('beforeunload',e=>{if($('#editor').open&&editorState()!==editorSnapshot){e.preventDefault();e.returnValue='';}});

// Desktop tools stay visible; on phones they live in a compact settings menu.
const mobileLayout=matchMedia('(max-width:760px)');
function syncSettingsMenu(){document.querySelector('.mobile-menu').open=!mobileLayout.matches;}
mobileLayout.addEventListener('change',syncSettingsMenu);syncSettingsMenu();
