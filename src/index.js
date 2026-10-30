const J=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json'}});
const IV={'30s':3e4,'1m':6e4,'3m':18e4,'5m':3e5},enc=new TextEncoder();
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const hmac=async(k,m)=>b64(await crypto.subtle.sign('HMAC',await crypto.subtle.importKey('raw',enc.encode(k),{name:'HMAC',hash:'SHA-256'},false,['sign']),enc.encode(m)));
const hash=async(p,s)=>b64(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode(s),iterations:1e5},await crypto.subtle.importKey('raw',enc.encode(p),'PBKDF2',false,['deriveBits']),256));
const sign=async(env,id)=>{const p=b64(enc.encode(JSON.stringify({u:id,e:Date.now()+30*864e5})));return p+'.'+await hmac(env.SECRET,p)};
async function auth(req,env){const [p,s]=(req.headers.get('authorization')||'').slice(7).split('.');if(!p||!s||s!==await hmac(env.SECRET,p))return 0;try{const d=JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/')));return d.e>Date.now()?d.u:0}catch{return 0}}
const pad=n=>String(n).padStart(2,0);
const rd=(t,now)=>{const iv=IV[t],i=Math.floor(now/iv),d=new Date(i*iv),day=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate());return{end:(i+1)*iv,issue:`${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}1000${50001+Math.floor((i*iv-day)/iv)}`}};
const rnd=()=>{let x;do{x=crypto.getRandomValues(new Uint8Array(1))[0]}while(x>=250);return x%10};
const G=[1,3,7,9],R=[2,4,6,8];
const mult=(c,n)=>c==='g'?(G.includes(n)?2:n===5?1.5:0):c==='r'?(R.includes(n)?2:n===0?1.5:0):c==='v'?(n===0||n===5?4.5:0):c==='b'?(n>=5?2:0):c==='s'?(n<5?2:0):(+c===n?9:0);
async function settle(env,uid){
  const {results}=await env.DB.prepare('SELECT * FROM bets WHERE uid=? AND status=0 AND endms<=?').bind(uid,Date.now()).all();
  for(const b of results){
    await env.DB.prepare('INSERT OR IGNORE INTO rounds VALUES(?,?,?)').bind(b.type,b.issue,rnd()).run();
    const {num}=await env.DB.prepare('SELECT num FROM rounds WHERE type=? AND issue=?').bind(b.type,b.issue).first();
    const pay=+(b.amount*0.98*mult(b.choice,num)).toFixed(2);
    const u=await env.DB.prepare('UPDATE bets SET status=?,payout=? WHERE id=? AND status=0').bind(pay>0?1:2,pay,b.id).run();
    if(u.meta.changes&&pay>0)await env.DB.prepare('UPDATE users SET balance=balance+? WHERE id=?').bind(pay,uid).run();
  }
}
async function route(req,env){
  const u=new URL(req.url),p=u.pathname.slice(5),body=req.method==='POST'?await req.json().catch(()=>({})):{};
  if(p==='signup'||p==='login'){
    const un=String(body.username||'').toLowerCase().trim(),pw=String(body.password||'');
    if(!/^[a-z0-9_]{3,20}$/.test(un)||pw.length<6||pw.length>100)return J({error:'Username 3-20 (a-z, 0-9, _), password min 6 chars'},400);
    let id;
    if(p==='signup'){
      const salt=b64(crypto.getRandomValues(new Uint8Array(16)));
      try{id=(await env.DB.prepare('INSERT INTO users(username,salt,hash) VALUES(?,?,?)').bind(un,salt,await hash(pw,salt)).run()).meta.last_row_id}catch{return J({error:'Username already taken'},409)}
    }else{
      const x=await env.DB.prepare('SELECT * FROM users WHERE username=?').bind(un).first();
      if(!x||x.hash!==await hash(pw,x.salt))return J({error:'Wrong username or password'},401);id=x.id;
    }
    return J({token:await sign(env,id),username:un});
  }
  const uid=await auth(req,env);if(!uid)return J({error:'Unauthorized'},401);
  const q=u.searchParams.get('type')||body.type,t=IV[q]?q:'30s',now=Date.now();
  if(p==='bet'){
    const c=String(body.choice),a=Math.floor(+body.amount),r=rd(t,now);
    if(!/^[0-9gvrbs]$/.test(c)||!(a>=1&&a<=100000))return J({error:'Invalid bet'},400);
    if(r.end-now<=5000)return J({error:'Betting closed'},400);
    const d=await env.DB.prepare('UPDATE users SET balance=balance-? WHERE id=? AND balance>=?').bind(a,uid,a).run();
    if(!d.meta.changes)return J({error:'Insufficient balance'},400);
    await env.DB.prepare('INSERT INTO bets(uid,type,issue,choice,amount,endms) VALUES(?,?,?,?,?,?)').bind(uid,t,r.issue,c,a,r.end).run();
    return J({balance:(await env.DB.prepare('SELECT balance FROM users WHERE id=?').bind(uid).first()).balance});
  }
  if(p==='sync'){
    await settle(env,uid);
    const iv=IV[t],i=Math.floor(now/iv),cur=rd(t,now);
    await env.DB.batch(Array.from({length:10},(_,k)=>env.DB.prepare('INSERT OR IGNORE INTO rounds VALUES(?,?,?)').bind(t,rd(t,(i-k-1)*iv).issue,rnd())));
    const hist=(await env.DB.prepare('SELECT issue,num FROM rounds WHERE type=? ORDER BY issue DESC LIMIT 10').bind(t).all()).results;
    const me=await env.DB.prepare('SELECT username,balance FROM users WHERE id=?').bind(uid).first();
    const res=(await env.DB.prepare('SELECT b.issue,b.type,b.choice,b.amount,b.status,b.payout,r.num FROM bets b JOIN rounds r ON r.type=b.type AND r.issue=b.issue WHERE b.uid=? AND b.status>0 AND b.notified=0').bind(uid).all()).results;
    if(res.length)await env.DB.prepare('UPDATE bets SET notified=1 WHERE uid=? AND status>0').bind(uid).run();
    return J({now,end:cur.end,issue:cur.issue,balance:me.balance,username:me.username,history:hist,results:res});
  }
  return J({error:'Not found'},404);
}
export default{async fetch(req,env){try{return await route(req,env)}catch(e){return J({error:'Server error'},500)}}};
