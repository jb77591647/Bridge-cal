/* 桥墩页无头验证：真实 THREE + 严格 DOM 桩（未知 id 抛错），校验工程量与几何 bbox */
const fs = require("fs");
const path = require("path");
const TPL = path.join(__dirname, "pier_template.html");
const LIB = path.join(__dirname, "three_clean.js");

const lib = fs.readFileSync(LIB, "utf8");
const tpl = fs.readFileSync(TPL, "utf8");
const m = tpl.match(/<script>\s*\/\*__THREE__\*\/<\/script>\s*<script>([\s\S]*?)<\/script>/);
if(!m){ console.error("FAIL: 未找到应用脚本"); process.exit(1); }
let app = m[1];

/* 默认参数桩（与模板一致） */
const vals = {
  Hp:"8", Lp:"2.5", Wp:"6", elAbs:"146",
  d:"1.6", n:"3", s:"4.5", Wdshow:"", f1ABshow:"", f2ABshow:"",
  fh1:"1", c1:"0.5", fh2:"1", c2:"0.5",
  matPier:"C30砼", matFd:"C25砼",
  excMs:"1", excMr:"1", excW:"0.5", excH:"3", excHs:"1", excHr:"", excHst:"5", excB:"1"
};
const checks = {
  useFd2:false, showLabels:false, showEL:false, showELa:false, showAxes:false, wireOnly:false, pPier:true, pFd:true,
  exGround:false, exSoil:false, exRock:false
};
const els = {};
for(const k in vals) els[k] = { value: vals[k], checked:true, innerHTML:"", style:{}, disabled:true,
  addEventListener(){}, appendChild(){}, clientWidth:800, clientHeight:560 };
for(const k in checks) els[k] = { value:"", checked:checks[k], innerHTML:"", style:{},
  addEventListener(){}, appendChild(){}, clientWidth:800, clientHeight:560 };
els.pierType = { value:"实体矩形桥墩", checked:false, innerHTML:"", style:{}, addEventListener(){}, appendChild(){}, clientWidth:800, clientHeight:560 };
els.fldRect = { value:"", checked:false, innerHTML:"", style:{}, addEventListener(){}, appendChild(){}, clientWidth:800, clientHeight:560 };
els.fldCyl  = { value:"", checked:false, innerHTML:"", style:{}, addEventListener(){}, appendChild(){}, clientWidth:800, clientHeight:560 };
els.projName = { value:"桥墩", checked:false, innerHTML:"", style:{}, addEventListener(){}, appendChild(){}, clientWidth:800, clientHeight:560 };
els.view3d = { value:"", checked:false, innerHTML:"", style:{}, addEventListener(){},
  appendChild(){}, clientWidth:800, clientHeight:560 };
els.resultBody = { value:"", checked:false, innerHTML:"", style:{}, addEventListener(){}, appendChild(){}, clientWidth:800, clientHeight:560 };
els.assumpNote = { value:"", checked:false, innerHTML:"", style:{}, addEventListener(){}, appendChild(){}, clientWidth:800, clientHeight:560 };

global.document = {
  getElementById(id){
    if(!(id in els)) throw new Error("未知元素 id: " + id);
    return els[id];
  },
  querySelectorAll(){ return []; },
  createElement(){ return { getContext(){ return ctx2d; }, width:0, height:0, style:{} }; },
  createElementNS(){ return { getContext(){ return ctx2d; }, width:0, height:0, style:{} }; }
};
const ctx2d = { font:"", fillStyle:"", strokeStyle:"", lineWidth:1, textBaseline:"",
  measureText:t=>({width:String(t).length*30}), fillText(){}, strokeText(){},
  beginPath(){}, moveTo(){}, lineTo(){}, quadraticCurveTo(){}, fill(){}, stroke(){} };
global.window = { addEventListener(){}, devicePixelRatio:1 };
global.requestAnimationFrame = ()=>{};
global.Blob = class {};

app += "\n;global.__api={readP,calcQ,buildModel,renderTable,setScene:(s)=>{scene=s;},groupRef:()=>group};";
global.THREE = require(LIB);

let pass=0, fail=0;
function near(actual, exp, tol, name){
  const ok = Math.abs(actual-exp) <= tol;
  ok ? pass++ : fail++;
  console.log((ok?"PASS":"FAIL") + ` ${name}: 实际=${f3(actual)} 期望=${f3(exp)} ±${tol}`);
  function f3(x){ return (typeof x==="number" && isFinite(x)) ? x.toFixed(4) : String(x); }
}
function isTrue(cond, name){
  cond ? pass++ : fail++;
  console.log((cond?"PASS":"FAIL") + " " + name);
}

try{
  eval(app);
}catch(e){ console.error("FAIL: 应用脚本执行异常:", e.message); process.exit(1); }

const api = global.__api;
isTrue(!!api, "应用脚本暴露探针");
const scene = new THREE.Scene();
api.setScene(scene);

function partsOf(){
  const parts = {};
  api.groupRef().traverse(o=>{
    if(o.isMesh && o.userData.part) (parts[o.userData.part] = parts[o.userData.part] || []).push(o);
  });
  return parts;
}
function bb(mesh){
  scene.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(mesh);
}
/* 凸多面体体积（散度定理，面朝向按形心归一化——hexaMesh 面绕向不一致，须先定向）
   position 为展开顶点：每面 6 个 [a,b,c,a,c,d]，面 f 四角 = f*6, f*6+1, f*6+2, f*6+5 */
function meshVol(mesh){
  const pos = mesh.geometry.getAttribute("position");
  const P = i => new THREE.Vector3().fromBufferAttribute(pos,i);
  const vs = []; for(let i=0;i<pos.count;i++) vs.push(P(i));
  const C = vs.reduce((s,v)=>s.add(v), new THREE.Vector3()).multiplyScalar(1/vs.length);
  let V = 0;
  for(let f=0; f*6+5 < pos.count; f++){
    let a=P(f*6), b=P(f*6+1), c=P(f*6+2), d=P(f*6+5);
    const n = new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a));
    const fc = a.clone().add(b).add(c).add(d).multiplyScalar(0.25);
    if(n.dot(new THREE.Vector3().subVectors(fc,C)) < 0){ const t=b; b=d; d=t; }  // 反转周序 a,d,c,b
    V += a.dot(new THREE.Vector3().crossVectors(b,c))/6;
    V += a.dot(new THREE.Vector3().crossVectors(c,d))/6;
  }
  return V;
}
function sumMeshVol(meshes){ return meshes.reduce((s,m)=>s+meshVol(m), 0); }

/* ===== 工况A：实体矩形（默认） ===== */
let p = api.readP(), q = api.calcQ(p);
near(q.V_pier, 120, 1e-6, "A 墩身体积 2.5×6×8=120");
near(q.a1, 3.5, 1e-9, "A 一层边长(纵)=Lp+2c1=3.5");
near(q.b1, 7, 1e-9, "A 一层边长(横)=Wp+2c1=7");
near(q.V_fd, 24.5, 1e-6, "A 基础体积（1层）=24.5");
near(q.total, 144.5, 1e-6, "A 圬工合计=144.5");
api.renderTable(p, q);
let tbl = els.resultBody.innerHTML;
isTrue(tbl.indexOf("墩身")>=0 && tbl.indexOf("基础一层")>=0 && tbl.indexOf("圬工合计")>=0, "A 表格行齐全");
isTrue(tbl.indexOf("π")<0, "A 矩形行无 π 圆柱公式");
try{ api.buildModel(p, q); }catch(e){ console.error("FAIL: buildModel(矩形) 异常:", e.message); process.exit(1); }
let parts = partsOf();
isTrue((parts.pier||[]).length===1 && (parts.fd1||[]).length===1 && !parts.fd2, "A 构件数：墩身1+基础1");
let bbP = bb(parts.pier[0]), bbF = bb(parts.fd1[0]);
near(bbP.min.z, 0, 1e-6, "A 墩身底 z=0");
near(bbP.max.z, 8, 1e-6, "A 墩身顶 z=H=8");
near(bbP.max.x - bbP.min.x, 2.5, 1e-6, "A 墩身纵向尺寸=2.5");
near(bbF.min.z, -1, 1e-6, "A 基础底 z=−fh1");
near(bbF.max.x - bbF.min.x, 3.5, 1e-6, "A 基础纵向边长=3.5");
near(bbF.max.y - bbF.min.y, 7, 1e-6, "A 基础横向边长=7");
isTrue(els.assumpNote.innerHTML.indexOf("出错")<0, "A 无错误提示");

/* ===== 工况B：圆柱式（默认 d1.6 n3 s4.5） ===== */
els.pierType.value = "圆柱式桥墩";
p = api.readP(), q = api.calcQ(p);
near(q.Wd, 10.6, 1e-9, "B 最外侧圆柱外缘距 Wd=(3−1)×4.5+1.6=10.6");
near(q.V_pier, 3*Math.PI*1.6*1.6/4*8, 1e-9, "B 墩身体积=n×π d²/4×H");
near(q.a1, 2.6, 1e-9, "B 一层边长(纵)=d+2c1=2.6");
near(q.b1, 11.6, 1e-9, "B 一层边长(横)=Wd+2c1=11.6");
near(q.V_fd, 30.16, 1e-6, "B 基础体积=2.6×11.6×1=30.16");
near(q.total, q.V_pier+30.16, 1e-9, "B 圬工合计=墩身+基础");
api.renderTable(p, q);
tbl = els.resultBody.innerHTML;
isTrue(tbl.indexOf("π")>=0 && tbl.indexOf("圆柱")>=0, "B 表格含圆柱公式");
try{ api.buildModel(p, q); }catch(e){ console.error("FAIL: buildModel(圆柱) 异常:", e.message); process.exit(1); }
parts = partsOf();
isTrue((parts.pier||[]).length===3, "B 圆柱根数=3");
const cys = parts.pier.map(bb).sort((a,b)=>a.min.y-b.min.y);
near(cys[0].min.y, -4.5-0.8, 1e-6, "B 首柱外缘 y=−5.3（中心距4.5）");
near(cys[2].max.y, 4.5+0.8, 1e-6, "B 末柱外缘 y=+5.3");
near(cys[0].max.z, 8, 1e-6, "B 圆柱顶 z=H");
near(cys[0].max.x - cys[0].min.x, 1.6, 1e-6, "B 圆柱直径=1.6");
isTrue(els.assumpNote.innerHTML.indexOf("出错")<0, "B 无错误提示");

/* ===== 工况C：圆柱式 + 第二层基础 ===== */
els.useFd2.checked = true;
p = api.readP(), q = api.calcQ(p);
near(q.a2, 3.6, 1e-9, "C 二层边长(纵)=2.6+2×0.5=3.6");
near(q.b2, 12.6, 1e-9, "C 二层边长(横)=11.6+2×0.5=12.6");
near(q.V_fd2, 45.36, 1e-6, "C 二层体积=3.6×12.6×1=45.36");
near(q.fdT, 2, 1e-9, "C 基础总厚=2");
near(q.total, q.V_pier+30.16+45.36, 1e-9, "C 圬工合计");
api.renderTable(p, q);
tbl = els.resultBody.innerHTML;
isTrue(tbl.indexOf("基础二层")>=0, "C 表格含基础二层行");
try{ api.buildModel(p, q); }catch(e){ console.error("FAIL: buildModel(两层) 异常:", e.message); process.exit(1); }
parts = partsOf();
isTrue((parts.fd2||[]).length===1, "C 二层构件1块");
const bbF2 = bb(parts.fd2[0]);
near(bbF2.min.z, -2, 1e-6, "C 二层底 z=−fdT=−2");
near(bbF2.max.z, -1, 1e-6, "C 二层顶 z=−fh1=−1");
near(bbF2.max.x - bbF2.min.x, 3.6, 1e-6, "C 二层纵向边长=3.6");
els.useFd2.checked = false;

/* ===== 工况D：中心距<直径（按直径取值防重叠）与根数取整 ===== */
els.s.value = "1"; els.n.value = "2.7";
p = api.readP(), q = api.calcQ(p);
near(p.s===p.d ? 1 : 0, 1, 1e-9, "D 中心距 s<d 时按直径取值");
near(p.n, 3, 1e-9, "D 根数四舍五入=3");
near(q.Wd, 2*1.6+1.6, 1e-9, "D Wd=(n−1)×s+d=4.8");
els.s.value = "4.5"; els.n.value = "3";

/* ===== 工况E：尺寸标注开关（不报错） ===== */
els.showLabels.checked = true; els.showAxes.checked = true;
els.pierType.value = "实体矩形桥墩";
p = api.readP(), q = api.calcQ(p);
try{ api.buildModel(p, q); isTrue(true, "E 矩形+标注+坐标轴 建模无异常"); }
catch(e){ isTrue(false, "E 矩形+标注+坐标轴 建模无异常: " + e.message); }
els.pierType.value = "圆柱式桥墩";
p = api.readP(), q = api.calcQ(p);
try{ api.buildModel(p, q); isTrue(true, "E 圆柱+标注+坐标轴 建模无异常"); }
catch(e){ isTrue(false, "E 圆柱+标注+坐标轴 建模无异常: " + e.message); }
els.showLabels.checked = false; els.showAxes.checked = false;

/* ===== 工况F：开挖（默认 H挖=3、h土=1、m土=m石=1、无分级 h分=5>3） =====
   坑底 4.5×8（一层基础 3.5×7 + 每侧 c=0.5）；off(z)=z（石土坡率相同连续线性）
   A(z)=(4.5+2z)(8+2z)=36+25z+4z²；V_rock=∫₀²=132.6667、V_soil=∫₂³=123.8333 */
els.pierType.value = "实体矩形桥墩";
p = api.readP(), q = api.calcQ(p);
near(q.excLa, 4.5, 1e-9, "F 坑底纵桥向长=3.5+2×0.5=4.5");
near(q.excWb, 8, 1e-9, "F 坑底横桥向宽=7+2×0.5=8");
near(q.excHr, 2, 1e-9, "F 石方高度=3−1=2");
near(q.V_exRock, 132.6667, 0.001, "F 石方=∫₀²(4.5+2z)(8+2z)dz");
near(q.V_exSoil, 123.8333, 0.001, "F 土方=∫₂³");
near(q.V_ex, 256.5, 0.001, "F 开挖合计=256.5");
try{ api.buildModel(p, q); }catch(e){ console.error("FAIL: buildModel(F开挖) 异常:", e.message); process.exit(1); }
parts = partsOf();
isTrue((parts.exR||[]).length===1 && (parts.exS||[]).length===1, "F 棱台带：石1+土1（无分级）");
near(sumMeshVol(parts.exR.concat(parts.exS)), 256.5, 0.01, "F 网格体积=公式（互证）");

/* ===== 工况G：分级开挖 H挖=12、h分=5（平台@5/@10 共2道）、b平=1.5、h土=10、h石=2 =====
   [0,2]石 off=z          ∫(36+25z+4z²)dz       = 132.6667
   [2,5]土 off=z          ∫₂⁵                    = 526.5
   [5,10]土 off=1.5+z     ∫(7.5+2z)(11+2z)dz    = 2966.6667
   [10,12]土 off=3+z      ∫(10.5+2z)(14+2z)dz   = 2342.6667 */
els.excH.value = "12"; els.excHs.value = "10"; els.excB.value = "1.5";
p = api.readP(), q = api.calcQ(p);
near(q.excHr, 2, 1e-9, "G 石方高度=12−10=2");
near(q.V_exRock, 132.6667, 0.001, "G 石方=∫₀²");
near(q.V_exSoil, 526.5+2966.6667+2342.6667, 0.01, "G 土方=三段拟棱台和（2道平台）");
near(q.V_ex, 5968.5000, 0.01, "G 开挖合计=5968.5");
els.showLabels.checked = true;
try{ api.buildModel(p, q); isTrue(true, "G 分级+标注 建模无异常"); }
catch(e){ isTrue(false, "G 分级+标注 建模无异常: " + e.message); }
els.showLabels.checked = false;
parts = partsOf();
isTrue((parts.exR||[]).length===1 && (parts.exS||[]).length===3, "G 棱台带：石1+土3（平台@5/@10，界面@2）");
near(sumMeshVol(parts.exR.concat(parts.exS)), 5968.5, 0.05, "G 网格体积=公式（互证）");
const bandTop = Math.max(...parts.exS.map(m=>bb(m).max.z));
near(bandTop, -1+12, 1e-6, "G 顶带顶面=坑底+H挖（地面）");
els.excH.value = "3"; els.excHs.value = "1"; els.excB.value = "1";

console.log(`\n=== 结果: ${pass} PASS, ${fail} FAIL ===`);
process.exit(fail ? 1 : 0);
