import test from 'node:test';
import assert from 'node:assert/strict';
import {noteHTML} from '../public/notes.js';

test('保存済みノートの太字・箇条書き・見出しを編集可能なHTMLに戻す',()=>{
 assert.equal(noteHTML('## 見出し\n**大切**\n- 一つ目\n- **二つ目**\n本文'),'<h2>見出し</h2><div><strong>大切</strong></div><ul><li>一つ目</li><li><strong>二つ目</strong></li></ul><div>本文</div>');
});
test('ノートのHTMLは実行せず文字として表示する',()=>{
 const html=noteHTML('<img src=x onerror=alert(1)>\n**<script>alert(1)</script>**');
 assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script>'));
 assert.ok(html.includes('&lt;img'));assert.ok(html.includes('<strong>&lt;script&gt;'));
});
test('空行と従来のチェックリスト表記を保持する',()=>{
 assert.equal(noteHTML('前\n\n- [x] 完了\n- [ ] 未完了'),'<div>前</div><div><br></div><div>- [x] 完了</div><div>- [ ] 未完了</div>');
});
