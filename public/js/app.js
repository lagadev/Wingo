const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const T=localStorage.getItem('tk');if(!T)location.href='/login.html';
const api=async(p,b)=>{const r=await fetch('/api/'+p,{method:b?'POST':'GET',headers:{'content-type':'application/json',authorization:'Bearer '+T},body:b&&JSON.stringify(b)});if(r.status===401){localStorage.removeItem('tk');location.href='/login.html'}return r.json()};
const TYPES=['30s','1m','3m','5m'],NAMES=['Win Go 30s','Win Go 1Min','Win Go 3Min','Win Go 5Min'];
let type='30s',round=null,off=0,busy=false,choice='g',amt=1,qty=1,ls=-1;
const fmt=n=>'₹'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const left=()=>round?round.end-(Date.now()+off):0;
const msg=t=>{const e=$('.van-toast--text');if(!e)return;const x=e.querySelector('.van-toast__text');if(x)x.textContent=t;e.style.display='';clearTimeout(msg.t);msg.t=setTimeout(()=>e.style.display='none',2000)};
const pop=$('[data-v-7f36fe93].Betting__Popup-10'),ov=$('.van-overlay[data-v-7f36fe93]'),dlg=$('div[role="dialog"][data-v-7f36fe93]');
const show=on=>{[ov,dlg].forEach(e=>e&&e.style.setProperty('display',on?'':'none'));document.body.classList.toggle('van-overflow-hidden',on)};
show(false);
const pick=(c,cls,label)=>{if(left()<=5000)return msg('Betting closed');choice=c;pop.className=pop.className.replace(/Betting__Popup-\d+/,'Betting__Popup-'+cls);const s=$$('.Betting__Popup-head-selectName span');if(s[1])s[1].textContent=label;$('.Betting__Popup-head-title').textContent=NAMES[TYPES.indexOf(type)];show(true)};
$('.Betting__C-head-g').onclick=()=>pick('g',11,'Green');
$('.Betting__C-head-r').onclick=()=>pick('r',10,'Red');
$('.Betting__C-head-p').onclick=()=>pick('v',12,'Violet');
$('.Betting__C-foot-b').onclick=()=>pick('b',13,'Big');
$('.Betting__C-foot-s').onclick=()=>pick('s',14,'Small');
$$('.Betting__C-numC > div').forEach(el=>el.onclick=()=>{const n=el.className.match(/\d+$/)[0];pick(n,n,n)});
const items=$$('.Betting__Popup-body-line-item'),bal=items.filter(e=>/^\d+$/.test(e.textContent.trim())),qs=items.filter(e=>/^X\d+$/.test(e.textContent.trim())),inp=$('#van-field-5-input'),tot=$('.Betting__Popup-foot-s');
const upd=()=>tot.textContent='Total amount '+fmt(amt*qty);
const hl=()=>qs.forEach(x=>x.classList.toggle('bgcolor',+x.textContent.slice(1)===qty));
bal.forEach(e=>e.onclick=()=>{bal.forEach(x=>x.classList.remove('bgcolor'));e.classList.add('bgcolor');amt=+e.textContent;upd()});
qs.forEach(e=>e.onclick=()=>{qty=+e.textContent.slice(1);inp.value=qty;hl();upd()});
inp.value=1;inp.oninput=()=>{qty=Math.min(100,parseInt(inp.value)||0);hl();upd()};
const step=d=>{qty=Math.min(100,Math.max(1,(parseInt(inp.value)||1)+d));inp.value=qty;hl();upd()};
$('.Betting__Popup-btn:first-child').onclick=()=>step(-1);$('.Betting__Popup-btn:last-child').onclick=()=>step(1);
$('.Betting__Popup-foot-c').onclick=()=>show(false);
tot.onclick=async()=>{if(amt*qty<1)return;const r=await api('bet',{type,choice,amount:amt*qty});if(r.error)return msg(r.error);$('.Wallet__C-balance-l1 > div[data-v-7dd1adab]').textContent=fmt(r.balance);show(false);msg('Bet succeed')};
upd();
const col=n=>n==0?['red','violet']:n==5?['green','violet']:[1,3,7,9].includes(+n)?['green']:['red'];
const row=h=>{const c=col(h.num);return `<div class="van-row" data-v-481307ec><div class="van-col van-col--9" data-v-481307ec>${h.issue}</div><div class="van-col van-col--5 numcenter" data-v-481307ec><div class="GameRecord__C-body-num ${h.num==5?'mixedColor5':h.num==0?'mixedColor0':c[0]=='red'?'defaultColor':'greenColor'}" data-v-481307ec>${h.num}</div></div><div class="van-col van-col--5" data-v-481307ec><span data-v-481307ec>${h.num>=5?'Big':'Small'}</span></div><div class="van-col van-col--5" data-v-481307ec><div class="GameRecord__C-origin" data-v-481307ec>${c.map(x=>`<div class="GameRecord__C-origin-I ${x}" data-v-481307ec></div>`).join('')}</div></div></div>`};
const ctype=n=>n==0?'type0':n==5?'type5':[1,3,7,9].includes(+n)?'type3':'type4';
const cname=n=>n==0?'Red Violet':n==5?'Green Violet':[1,3,7,9].includes(+n)?'Green':'Red';
function win(x){const d=$('.WinningTip__C');if(!d)return;const w=x.status==1,l2=$('.WinningTip__C-body-l2');
$('.WinningTip__C-body').classList.toggle('isL',!w);$('.WinningTip__C-body-l1').textContent=w?'Congratulations':'Sorry';
$('.WinningNum').textContent=x.num;l2.children[2].textContent=x.num>=5?'Big':'Small';l2.children[0].textContent=cname(x.num);
[...l2.classList].filter(c=>/^type/.test(c)).forEach(c=>l2.classList.remove(c));l2.classList.add(ctype(x.num));
$('.bonus').textContent=fmt(x.payout);$('.gameDetail').textContent=`Period: ${NAMES[TYPES.indexOf(x.type)]} ${x.issue}`;
d.removeAttribute('style');document.body.classList.add('van-overflow-hidden')}
$('.closeBtn').onclick=()=>{$('.WinningTip__C').style.setProperty('display','none');document.body.classList.remove('van-overflow-hidden')};
async function sync(){busy=true;try{const r=await api('sync?type='+type);if(r.error)return;off=r.now-Date.now();round=r;
$('.TimeLeft__C-id').textContent=r.issue;$('.Wallet__C-balance-l1 > div[data-v-7dd1adab]').textContent=fmt(r.balance);
$('.GameRecord__C-body').innerHTML=r.history.map(row).join('');
$('.TimeLeft__C-num').innerHTML=r.history.slice(0,4).map(h=>`<div data-v-3e4c6499 class="n${h.num}"></div>`).join('');
if(r.results.length)win(r.results[r.results.length-1])}finally{busy=false}}
const mark=$('.Betting__C-mark');
setInterval(()=>{if(!round)return;const l=Math.max(0,left()),s=Math.ceil(l/1000),tm=$$('.TimeLeft__C-time div');
if(tm.length==5){tm[0].textContent=Math.floor(s/60/10);tm[1].textContent=Math.floor(s/60)%10;tm[3].textContent=Math.floor(s%60/10);tm[4].textContent=s%10}
if(mark){if(l<=5000&&l>0){mark.style.display='flex';mark.innerHTML=`<div data-v-4aca9bd1>0</div><div data-v-4aca9bd1>${s}</div>`;show(false)}else mark.style.display='none'}
if(s!==ls){ls=s;if(l<=5000&&l>0){const a=document.getElementById(s>1?'voice1':'voice2');a&&(a.currentTime=0,a.play().catch(()=>{}))}}
if(l<=0&&!busy)sync()},250);
$$('.GameList__C-item').forEach((el,i)=>el.onclick=()=>{$$('.GameList__C-item').forEach(x=>x.classList.remove('active'));el.classList.add('active');type=TYPES[i];$('.TimeLeft__C-name').textContent=NAMES[i];show(false);round=null;sync()});
const lo=document.createElement('button');lo.textContent='Logout';lo.style.cssText='position:fixed;top:6px;right:6px;z-index:99;padding:4px 10px;border:0;border-radius:6px;background:#0008;color:#fff';lo.onclick=()=>{localStorage.removeItem('tk');location.href='/login.html'};document.body.appendChild(lo);
sync();
