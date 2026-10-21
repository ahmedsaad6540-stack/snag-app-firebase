'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const file=require('node:path').join(__dirname,'../preview/Park_Street_Operations_Interactive_Demo.html');
function preview(){const text=fs.readFileSync(file,'utf8');const script=text.split('<script>')[1].split('</script>')[0];
 const nodes=new Map();const doc={getElementById(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',classList:{add(){},remove(){}}});return nodes.get(id)}};
 const mem=new Map(),localStorage={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)};
 const env={console,document:doc,localStorage,window:{scrollTo(){}},Blob:class{},URL:{createObjectURL(){return 'test'},revokeObjectURL(){}},alert(){},confirm(){return true}};
 vm.createContext(env);vm.runInContext(script,env,{timeout:2500});return {env,doc,nodes};}
test('interactive HTML preview renders dashboard, all 51 sector rows, 29 restroom rows',()=>{const {env,nodes}=preview();
 assert.ok(nodes.get('sections').innerHTML.includes('تغطية تفتيش Park Street'));
 vm.runInContext("go('park')",env,{timeout:1500});
 assert.equal((nodes.get('sections').innerHTML.match(/<tr>/g)||[]).length,52);
 vm.runInContext("go('restrooms')",env,{timeout:1500});
 assert.equal((nodes.get('sections').innerHTML.match(/<tr>/g)||[]).length,30);
 vm.runInContext("go('units')",env,{timeout:1500});assert.ok(nodes.get('sections').innerHTML.includes('لا توجد سجلات'));
});
test('interactive preview includes no network calls or production credentials',()=>{
 const html=fs.readFileSync(file,'utf8');assert.ok(!html.includes('snag-app-firebase.web.app'));
 assert.ok(!html.includes('firebaseConfig'));assert.ok(!/\bfetch\(/.test(html));assert.ok(!/\bXMLHttpRequest\b/.test(html));assert.ok(!html.includes('hooks.slack.com/services'));
});
