/* 量测：按 part 统计模型实际几何包围盒，对照参数注释的物理意义 */
const fs = require("fs");
const path = require("path");
const TPL = path.join(__dirname, "app_template.html");
const LIB = path.join(__dirname, "three_clean.js");

const lib = fs.readFileSync(LIB, "utf8");
const tpl = fs.readFileSync(TPL, "utf8");
const m = tpl.match(/<script>\s*\/\*__THREE__\*\/<\/script>\s*<script>([\s\S]*?)<\/script>/);
let app = m[1];

const vals = {
  Wf:"24", H1:"5", t1:"1.2", m1:"3",
  W:"12", Hs:"6.5", t2:"0.5", L2:"6", m2:"0", m3:"3", elAbs:"146",
  capH:"0.6", capCant:"0.1", capWid:"1.3", bwT:"0.5", bwH:"0.9",
  fd1H:"1", fd1X:"1", fd1Zf:"1", fd1Zb:"1",
  fd2H:"1", fd2X:"1", fd2Zf:"1", fd2Zb:"1",
  capLshow:"", bwLshow:"", t1bshow:"", swUpHshow:"", swTopWshow:"", swBotWshow:"", swLowTopWshow:"", swLowTopTshow:"", swLowHshow:"", swBotTshow:"", swLowBotWshow:"",
  matCap:"C30砼", matFw:"C30砼", matSw:"C30砼", matFd:"C25砼", matFill:"砂砾石",
  excMs:"1", excMr:"1", excW:"0.5", excH:"3", excHs:"1", excHr:"",
  excHst:"5", excB:"1"
};
const checks = {
  useFd2:false, showLabels:false, showAxes:false, showEL:false, showELa:false, wireOnly:false,
  pFw:true, pSw:true, pCap:true, pBw:true, pFd:true, pFill:true,
  exGround:false, exSoil:false, exRock:false
};
const els = {};
for(const k in vals) els[k] = { value: vals[k], checked:true, innerHTML:"", style:{}, disabled:true,
  addEventListener(){}, appendChild(){}, clientWidth:800, clientHeight:560 };
for(const k in checks) els[k] = { value:"", checked:checks[k], innerHTML:"", style:{},
  addEventListener(){}, appendChild(){}, clientWidth:800, clientHeight:560 };
els.projName = { value:"U型桥台", checked:false, innerHTML:"", style:{}, addEventListener(){}, appendChild(){}, clientWidth:800, clientHeight:560 };
els.view3d = { value:"", checked:false, innerHTML:"", style:{}, addEventListener(){},
  appendChild(){}, clientWidth:800, clientHeight:560 };
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

app += "\n;global.__api={readP,calcQ,buildModel,groupRef:()=>group};";
global.THREE = require(LIB);
eval(app);

const api = global.__api;
const p = api.readP(), q = api.calcQ(p);
api.buildModel(p, q);
const g = api.groupRef();

/* 场景轴：x=纵桥向(顺桥, 已减datumX), y=横桥向, z=竖向 */
const bb = {};
g.children.forEach(o=>{
  if(!o.geometry || !o.userData.part) return;
  o.geometry.computeBoundingBox();
  const b = o.geometry.boundingBox.clone();
  b.applyMatrix4(o.matrixWorld || o.matrix);
  const k = o.userData.part;
  if(!bb[k]) bb[k] = { min:b.min.clone(), max:b.max.clone(), n:1 };
  else { bb[k].min.min(b.min); bb[k].max.max(b.max); bb[k].n++; }
});
const f = x => Number(x).toFixed(4);
console.log("参数: W="+p.W+" L2(B)="+p.L2+" H1="+p.H1+" capCant(ec)="+p.capCant+" capWid="+p.capWid+" t1="+p.t1+" t2="+p.t2+" Hs="+p.Hs+" capH="+p.capH+" bwH="+p.bwH);
console.log("datumX =", f(q.datumX !== undefined ? q.datumX : p.capCant));
console.log("");
for(const k in bb){
  const b = bb[k];
  console.log(`part=${k} n=${b.n}`);
  console.log(`  x(顺桥向): ${f(b.min.x)} ~ ${f(b.max.x)}  跨度=${f(b.max.x-b.min.x)}`);
  console.log(`  y(横桥向): ${f(b.min.y)} ~ ${f(b.max.y)}  跨度=${f(b.max.y-b.min.y)}`);
  console.log(`  z(竖向)  : ${f(b.min.z)} ~ ${f(b.max.z)}  跨度=${f(b.max.z-b.min.z)}`);
}
console.log("");
console.log("q 关键字段: t1b="+f(q.t1b)+" capL="+f(q.capL)+" swUpH="+f(q.swUpH)+" swTopW="+f(q.swTopW)+" swBotW="+f(q.swBotW)+" swLowH="+f(q.swLowH)+" swBotT="+f(q.swBotT)+" swLowBotW="+f(q.swLowBotW));
