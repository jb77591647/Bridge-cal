/* 三口径对比：三维网格测量 vs 拟棱台(Simpson,现实现) vs 经典棱台公式 */
const fs = require("fs");
const path = require("path");
const TPL = path.join(__dirname, "app_template.html");
const LIB = path.join(__dirname, "three_clean.js");
const lib = fs.readFileSync(LIB, "utf8");
const tpl = fs.readFileSync(TPL, "utf8");
const m = tpl.match(/<script>\s*\/\*__THREE__\*\/<\/script>\s*<script>([\s\S]*?)<\/script>/);
if(!m){ console.error("未找到应用脚本"); process.exit(1); }
let app = m[1];

const vals = {
  Wf:"24", H1:"5", t1:"1.2", m1:"3",
  W:"12", Hs:"6.5", t2:"0.5", L2:"6", m2:"0", m3:"3",
  capH:"0.6", capCant:"0.1", capWid:"1.3", bwT:"0.5", bwH:"0.9",
  fd1H:"1", fd1X:"1", fd1Zf:"1", fd1Zb:"1",
  fd2H:"1", fd2X:"1", fd2Zf:"1", fd2Zb:"1",
  capLshow:"", bwLshow:"", t1bshow:"", swUpHshow:"", swTopWshow:"", swBotWshow:"", swLowTopWshow:"", swLowTopTshow:"", swLowHshow:"", swBotTshow:"", swLowBotWshow:"",
  excMs:"1", excMr:"1", excW:"0.5", excH:"3", excHs:"1", excHr:"",
  excHst:"5", excB:"1"
};
const checks = {
  useFd2:false, showLabels:false, showAxes:false, showEL:false, wireOnly:false,
  pFw:true, pSw:true, pCap:true, pBw:true, pFd:true, pFill:true,
  exGround:false, exSoil:false, exRock:false
};
const els = {};
for(const k in vals) els[k] = { value: vals[k], checked:true, innerHTML:"", style:{}, disabled:true,
  addEventListener(){}, appendChild(){}, clientWidth:800, clientHeight:560 };
for(const k in checks) els[k] = { value:"", checked:checks[k], innerHTML:"", style:{},
  addEventListener(){}, appendChild(){}, clientWidth:800, clientHeight:560 };
els.projName = { value:"U型桥台", checked:false, innerHTML:"", style:{}, addEventListener(){}, appendChild(){}, clientWidth:800, clientHeight:560 };
els.view3d = { value:"", checked:false, innerHTML:"", style:{}, addEventListener(){}, appendChild(){}, clientWidth:800, clientHeight:560 };
els.resultBody = { value:"", checked:false, innerHTML:"", style:{}, addEventListener(){}, appendChild(){}, clientWidth:800, clientHeight:560 };
els.assumpNote = { value:"", checked:false, innerHTML:"", style:{}, addEventListener(){}, appendChild(){}, clientWidth:800, clientHeight:560 };

global.document = {
  getElementById(id){ if(!(id in els)) throw new Error("未知元素 id: " + id); return els[id]; },
  querySelectorAll(){ return []; },
  createElement(){ return { getContext(){ return null; }, width:0, height:0, style:{} }; },
  createElementNS(){ return { getContext(){ return null; }, width:0, height:0, style:{} }; }
};
global.window = { addEventListener(){}, devicePixelRatio:1 };
global.requestAnimationFrame = ()=>{};
global.Blob = class {};
app += "\n;global.__api={readP,calcQ,buildModel,setScene:(s)=>{scene=s;},groupRef:()=>group};";
global.THREE = require(LIB);
eval(app);
const api = global.__api;
const scene = new THREE.Scene();
api.setScene(scene);

/* 网格体积（散度定理，面方向按质心归一）— 同 harness */
function meshVol(m){
  const pos = m.geometry.attributes.position;
  const vs = [];
  for(let i=0;i<pos.count;i++) vs.push(new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)));
  const C = vs.reduce((s,v)=>s.add(v), new THREE.Vector3()).multiplyScalar(1/vs.length);
  let vol = 0;
  for(let f=0; f<vs.length/6; f++){
    let q = [vs[f*6], vs[f*6+1], vs[f*6+2], vs[f*6+5]];
    const fc = q[0].clone().add(q[1]).add(q[2]).add(q[3]).multiplyScalar(0.25);
    const n = new THREE.Vector3().subVectors(q[1],q[0]).cross(new THREE.Vector3().subVectors(q[2],q[0]));
    if(n.dot(fc.clone().sub(C)) < 0) q = [q[3],q[2],q[1],q[0]];
    for(const t of [[q[0],q[1],q[2]],[q[0],q[2],q[3]]])
      vol += t[0].dot(new THREE.Vector3().crossVectors(t[1],t[2]))/6;
  }
  return Math.abs(vol);
}

/* 经典棱台公式（逐段，与 calcQ 同分段点；顶底面积用段两端断面） */
function classical(q, p){
  const hSt = p.excHst > 1e-6 ? p.excHst : 1e9;
  const bSt = Math.max(p.excB, 0);
  const rR = p.excMr>0?1/p.excMr:0, rS = p.excMs>0?1/p.excMs:0;
  const nA = z => Math.floor(z/hSt + 1e-9), nB = z => Math.floor((z-1e-9)/hSt);
  const offAB = (z,n)=> bSt*n + Math.min(z,q.excHr)*rR + Math.max(z-q.excHr,0)*rS;
  const bps=[0,p.excH];
  for(let k=1;k*hSt<p.excH-1e-9;k++) bps.push(k*hSt);
  if(q.excHr>1e-6 && q.excHr<p.excH-1e-9) bps.push(q.excHr);
  bps.sort((a,b)=>a-b);
  let R=0,S=0;
  for(let i=0;i<bps.length-1;i++){
    const a=bps[i], b=bps[i+1]; if(b-a<1e-9) continue;
    const o1=offAB(a,nA(a)), o2=offAB(b,nB(b));
    const S1=(q.excWb+2*o1)*(q.excLb+2*o1), S2=(q.excWb+2*o2)*(q.excLb+2*o2);
    const V=(b-a)/3*(S1+S2+Math.sqrt(S1*S2));
    if((a+b)/2<=q.excHr) R+=V; else S+=V;
  }
  return {R,S};
}

function measure(pp, qq){
  api.buildModel(pp, qq);
  const v = {exR:0, exS:0};
  api.groupRef().traverse(o=>{ if(o.isMesh && (o.userData.part==="exR"||o.userData.part==="exS")) v[o.userData.part]+=meshVol(o); });
  return v;
}

const cases = [
  ["默认(不分级) H=3",        {excH:"3", excHs:"1", excHst:"5", excB:"1",   excMr:"1", excMs:"1"}],
  ["A H=8,h分3,平台@3/@6",    {excH:"8", excHs:"6", excHst:"3", excB:"1",   excMr:"1", excMs:"1"}],
  ["B H=12,h分5,平台@5/@10",  {excH:"12",excHs:"2", excHst:"5", excB:"1",   excMr:"1", excMs:"1"}],
  ["C H=6,h分4,平台@4,b1.5",  {excH:"6", excHs:"4", excHst:"4", excB:"1.5", excMr:"1", excMs:"1"}],
  ["D H=4,m石=0,平台@3",      {excH:"4", excHs:"2", excHst:"3", excB:"1",   excMr:"0", excMs:"1"}]
];
console.log("工况 | 层 | 网格测量 | 拟棱台(Simpson) | 经典棱台 | 经典-测量 偏差");
let agg = [];
for(const [name, ov] of cases){
  Object.assign(...Object.keys(ov).map(k=>({})), []); // noop
  for(const k in ov) els[k].value = ov[k];
  const pp = api.readP(), qq = api.calcQ(pp);
  const mv = measure(pp, qq);
  const cl = classical(qq, pp);
  const rows = [["石方", mv.exR, qq.V_exRock, cl.R], ["土方", mv.exS, qq.V_exSoil, cl.S]];
  for(const [ly, mvol, simp, cla] of rows){
    const dev = cla - mvol, pct = mvol>1e-9 ? (dev/mvol*100) : 0;
    console.log(`${name} | ${ly} | ${mvol.toFixed(3)} | ${simp.toFixed(3)} | ${cla.toFixed(3)} | ${dev>=0?"+":""}${dev.toFixed(3)} (${pct>=0?"+":""}${pct.toFixed(3)}%)`);
  }
  agg.push([name, mv.exR+mv.exS, qq.V_exRock+qq.V_exSoil, cl.R+cl.S]);
}
for(const [name, mvol, simp, cla] of agg){
  const dev = cla - mvol, pct = mvol>1e-9 ? (dev/mvol*100) : 0;
  console.log(`${name} | 合计 | ${mvol.toFixed(3)} | ${simp.toFixed(3)} | ${cla.toFixed(3)} | ${dev>=0?"+":""}${dev.toFixed(3)} (${pct>=0?"+":""}${pct.toFixed(3)}%)`);
}
