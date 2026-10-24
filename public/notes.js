// Keep the existing portable Markdown backup format; never insert stored HTML.
const escape=text=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function noteHTML(text){
 let list=false;let html='';
 for(const line of text.split('\n')){
  const bullet=line.startsWith('- ')&&!/^\- \[[ x]\] /.test(line);
  if(list&&!bullet){html+='</ul>';list=false;}
  if(bullet&&!list){html+='<ul>';list=true;}
  const content=escape(bullet?line.slice(2):line).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  html+=bullet?`<li>${content||'<br>'}</li>`:line.startsWith('## ')?`<h2>${content.slice(3)}</h2>`:`<div>${content||'<br>'}</div>`;
 }
 return html+(list?'</ul>':'');
}
export function noteMarkdown(root){
 function read(node){
  if(node.nodeType===3)return node.textContent.replace(/\u00a0/g,' ');
  if(node.nodeType!==1)return '';
  const tag=node.tagName;
  if(tag==='BR')return '\n';
  const text=children(node);
  if(tag==='B'||tag==='STRONG')return text?'**'+text+'**':'';
  if(tag==='LI')return '- '+text.replace(/\n+$/,'')+'\n';
  if(tag==='UL'||tag==='OL')return text;
  if(/^H[1-6]$/.test(tag))return '## '+text.replace(/\n+$/,'')+'\n';
  if(tag==='DIV'||tag==='P')return text.replace(/\n$/,'')+'\n';
  return text;
 }
 function children(parent){let result='';for(const node of parent.childNodes){if(node.nodeType===1&&/^(DIV|P|UL|OL|H[1-6])$/.test(node.tagName)&&result&&!result.endsWith('\n'))result+='\n';result+=read(node);}return result;}
 // A contenteditable's root is a container, not an extra paragraph.
 return children(root).replace(/\n+$/,'');
}
