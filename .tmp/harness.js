/* 无头验证：真实 THREE + 严格 DOM 桩（未知 id 抛错），校验几何 bbox 与工程量 */
const fs = require("fs");
const path = require("path");
const TPL = path.join(__dirname, "app_template.html");
const LIB = path.join(__dirname, "three_clean.js");

const lib = fs.readFileSync(LIB, "utf8");
const tpl = fs.readFileSync(TPL, "utf8");
const m = tpl.match(/<script>\s*\/\*__THREE__\*\/<\/script>\s*<script>([\s\S]*?)<\/script>/);
if(!m){ console.error("FAIL: 未找到应用脚本"); process.exit(1); }
let app = m[1];

/* 默认参数桩（与模板一致） */
const vals = {
  Wf:"24", H1:"5", t1:"1.2", m1:"3",
  W:"12", Hs:"6.5", t2:"0.5", L2:"6", m2:"0", m3:"3", elAbs:"146",
  capH:"0.6", capCant:"0.1", capWid:"1.3", bwT:"0.5", bwH:"0.9",
  nbL:"7", nbB:"0.3", nbG:"0.3", nbHt:"0.3", nbA:"0.3",
  fd1H:"1", fd1X:"1", fd1Zf:"1", fd1Zb:"1",
  fd2H:"1", fd2X:"1", fd2Zf:"1", fd2Zb:"1",
  capLshow:"", bwLshow:"", t1bshow:"", swUpHshow:"", swTopWshow:"", swBotWshow:"", swLowTopWshow:"", swLowTopTshow:"", swLowHshow:"", swBotTshow:"", swLowBotWshow:"", nbTopShow:"",
  matCap:"C30砼", matFw:"C30砼", matSw:"C30砼", matFd:"C25砼", matFill:"砂砾石",
  excMs:"1", excMr:"1", excW:"0.5", excH:"3", excHs:"1", excHr:"",
  excHst:"5", excB:"1",
  Nk:"1000", Hk:"165", dBear:"0.40", dH:"0.10", gamC:"24", gamS:"18", fric:"0.30", fa:"400",
  fndType:"soil",
  brkL:"20", brkGrade:"I", brkN:"1",
  chkHf:"", chkPhi:"30", chkDelta:"20", chkKaShow:"", chkEaShow:""
};
const checks = {
  useFd2:false, showLabels:false, showAxes:false, showEL:false, showELa:false, wireOnly:false,
  pFw:true, pSw:true, pCap:true, pNb:true, pBw:true, pFd:true, pFill:true,
  autoHk:true, incEa:true, incFill:true,
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
els.checkBody = { value:"", checked:false, innerHTML:"", style:{}, addEventListener(){}, appendChild(){}, clientWidth:800, clientHeight:560 };
els.checkNote = { value:"", checked:false, innerHTML:"", style:{}, addEventListener(){}, appendChild(){}, clientWidth:800, clientHeight:560 };

global.document = {
  getElementById(id){
    if(!(id in els)) throw new Error("未知元素 id: " + id);
    return els[id];
  },
  querySelectorAll(){ return []; },
  createElement(){ return { getContext(){ return null; }, width:0, height:0, style:{} }; },
  createElementNS(){ return { getContext(){ return null; }, width:0, height:0, style:{} }; }
};
global.window = { addEventListener(){}, devicePixelRatio:1 };
global.requestAnimationFrame = ()=>{};
global.Blob = class {};

/* 提取 api 探针 */
app += "\n;global.__api={brakeForce,readP,calcQ,calcCheck,buildModel,renderTable,renderCheck,rebuild,applyPartVisibility,setScene:(s)=>{scene=s;},groupRef:()=>group,labelRef:()=>labelGroup};";
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

/* 表格渲染（无 3D 时也应成功） */
api.renderTable(api.readP(), api.calcQ(api.readP()));
const tbl = els.resultBody.innerHTML;
isTrue(tbl.indexOf("台身")>=0 && tbl.indexOf("侧墙")>=0 && tbl.indexOf("帽梁")>=0 &&
       tbl.indexOf("背墙")>=0 && tbl.indexOf("基础")>=0 && tbl.indexOf("回填")>=0 &&
       tbl.indexOf("牛腿")>=0 && tbl.indexOf("圬工合计")>=0, "表格含各项汇总（台身/侧墙/帽梁/背墙/牛腿/基础/回填+合计）");
isTrue(els.assumpNote.innerHTML.indexOf("脚本错误")<0 && els.assumpNote.innerHTML.indexOf("建模出错")<0, "无脚本/建模错误提示");

/* 3D 构建 */
const scene = new THREE.Scene();
api.setScene(scene);
const p = api.readP(), q = api.calcQ(p);
try{ api.buildModel(p, q); }catch(e){ console.error("FAIL: buildModel 异常:", e.message); process.exit(1); }
const group = api.groupRef();
isTrue(!!group, "buildModel 生成 group");

/* 按部件收集 mesh */
const parts = {};
group.traverse(o=>{
  if(o.isMesh && o.userData.part){
    (parts[o.userData.part] = parts[o.userData.part] || []).push(o);
  }
});
isTrue((parts.fw||[]).length===1, "前墙 1 块");
isTrue((parts.sw||[]).length===4, "侧墙 4 块（分段点[0,5,6.5]，上段底=前墙顶重合×2）");
isTrue((parts.cap||[]).length===1, "帽梁 1 块");
isTrue((parts.bw||[]).length===1, "背墙 1 块");
isTrue((parts.fd||[]).length===1, "基础 1 块（二层未开）");
isTrue((parts.fill||[]).length===3, "回填 3 块（分段）");

function bbox(meshes){
  const b = new THREE.Box3();
  meshes.forEach(mm=>{ mm.geometry.computeBoundingBox(); b.union(mm.geometry.boundingBox.clone()); });
  return b;
}
const r4 = x => Math.round(x*10000)/10000;
function checkBox(part, e, tol, name){
  const b = bbox(parts[part]);
  const ok = ["min.x","max.x","min.y","max.y","min.z","max.z"].every(k=>{
    const [mm,ax] = k.split(".");
    return Math.abs(b[mm][ax]-e[k]) <= tol;
  });
  ok ? pass++ : fail++;
  console.log((ok?"PASS":"FAIL") + ` ${name}: min(${r4(b.min.x)},${r4(b.min.y)},${r4(b.min.z)}) max(${r4(b.max.x)},${r4(b.max.y)},${r4(b.max.z)})`);
  return b;
}

const zb0 = 1.2+5/3;                 // 前墙底宽/前端缘底 2.866667（显示+0.002）
const xi0 = 6-(0.5+5/3);             // 侧墙内缘底 3.833333（m2=0：t2b=t2=0.5，下段m3放坡）
/* 场景轴：x=纵桥向(前墙前缘=0向台后, 帽梁前缘=−ec), y=横桥向, z=竖向(墙底=0) */
checkBox("fw", {"min.x":0,"max.x":zb0,"min.y":-6,"max.y":6,"min.z":0,"max.z":5}, 0.01, "前墙 bbox(梯形)");
const swB = checkBox("sw", {"min.x":1.202,"max.x":6.0,"min.y":-6,"max.y":6,"min.z":0,"max.z":6.5}, 0.01, "侧墙 bbox");
/* 逐 mesh 检查 +y 侧墙内缘：min.y 应为 xi0=7.0747（内坡 3:1 生效） */
let swInnerMin = Infinity;
(parts.sw||[]).forEach(mm=>{
  mm.geometry.computeBoundingBox();
  if(mm.geometry.boundingBox.max.y > 0) swInnerMin = Math.min(swInnerMin, mm.geometry.boundingBox.min.y);
});
near(swInnerMin, xi0, 0.01, "侧墙内缘 y=3.8333（m2=0 上段矩形+下段m3放坡）");
/* 侧墙前端缘：顶部竖直段 x=t1+0.002（显示外偏），底部贴前墙背坡面（按底面顶点检查） */
let swFrontTop = Infinity, swFrontBot = Infinity;
(parts.sw||[]).forEach(mm=>{
  mm.geometry.computeBoundingBox();
  if(mm.geometry.boundingBox.max.y <= 0) return;
  if(mm.geometry.boundingBox.min.z > 4.9) swFrontTop = Math.min(swFrontTop, mm.geometry.boundingBox.min.x);
  const pos = mm.geometry.attributes.position;
  for(let i=0;i<pos.count;i++){
    if(pos.getZ(i) < 0.01) swFrontBot = Math.min(swFrontBot, pos.getX(i));
  }
});
near(swFrontTop, 1.202, 0.01, "侧墙前端缘顶部 x=t1+0.002（竖直段，贴前墙背）");
near(swFrontBot, zb0+0.002, 0.01, "侧墙前端缘底部 x=2.8687（贴前墙背坡面）");

/* ===== 网格体积独立校核：凸多面体散度定理（面方向先按质心归一化，规避顶点序不一致） ===== */
function meshVol(m){
  const pos = m.geometry.attributes.position;
  const vs = [];
  for(let i=0;i<pos.count;i++) vs.push(new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)));
  const C = vs.reduce((s,v)=>s.add(v), new THREE.Vector3()).multiplyScalar(1/vs.length);
  let vol = 0;
  /* pos 每 6 顶点=1 个四边形面 [a,b,c,a,c,d]；共 6 面 */
  for(let f=0; f<vs.length/6; f++){
    let q = [vs[f*6], vs[f*6+1], vs[f*6+2], vs[f*6+5]];
    const fc = q[0].clone().add(q[1]).add(q[2]).add(q[3]).multiplyScalar(0.25);
    const n = new THREE.Vector3().subVectors(q[1],q[0]).cross(new THREE.Vector3().subVectors(q[2],q[0]));
    if(n.dot(fc.clone().sub(C)) < 0) q = [q[3],q[2],q[1],q[0]];   /* 翻转为外向 */
    for(const t of [[q[0],q[1],q[2]],[q[0],q[2],q[3]]])
      vol += t[0].dot(new THREE.Vector3().crossVectors(t[1],t[2]))/6;
  }
  return Math.abs(vol);
}
const vol = {};
Object.keys(parts).forEach(k=>{ vol[k] = (parts[k]||[]).reduce((s,m)=>s+meshVol(m), 0); });
near(vol.fw,   q.V_fw,   0.001, "网格体积:台身=梯形断面积×Wf");
near(vol.sw,   q.V_sw,   0.20,  "网格体积:侧墙(前端缘+0.002显示偏移)");
near(vol.cap,  q.V_cap,  0.001, "网格体积:帽梁");
near(vol.bw,   q.V_bw,   0.001, "网格体积:背墙");
near(vol.nb,   q.V_nb,   0.001, "网格体积:牛腿(直角梯形断面×全长)");
isTrue((parts.nb||[]).length===1, "牛腿 1 块");
checkBox("nb", {"min.x":1.2,"max.x":1.5,"min.y":-3.5,"max.y":3.5,"min.z":5.6,"max.z":6.2}, 0.01,
  "牛腿 bbox(x 背墙背面1.2→外端1.5、y 以帽梁中心±L腿/2=±3.5、z 根部底5.6→顶面6.2)");
near(q.nbTop, 6.2, 1e-9, "牛腿顶面标高=背墙顶−h槽=6.5−0.3=6.2");
near(q.nbH, 0.3, 1e-9, "牛腿高度=外端竖面高=0.3");
near(q.nbRoot, 0.6, 1e-9, "根部总高=牛腿高度+加腋高度=0.6");
near(q.V_nb, 7*0.3*(0.3+0.3/2), 1e-9, "牛腿 V=L腿×b腿×(h腿+h腋/2)=0.945");
els.nbL.value = "20";
const pN = api.readP(), qN = api.calcQ(pN);
near(qN.nbL, 12.2, 1e-9, "L腿>背墙总长时按背墙总长截断(20→12.2)");
els.nbL.value = "7";
/* 槽口高度增大 → 顶面以背墙顶为基准下移，根部底面向下延伸(可低于帽梁顶)，体积不变 */
els.nbG.value = "0.60";
const pG = api.readP(), qG = api.calcQ(pG);
near(qG.nbTop, 5.9, 1e-9, "h槽=0.6 时牛腿顶面=背墙顶−0.6=5.9");
near(qG.nbBase, 5.3, 1e-9, "h槽增大后根部底向下延伸至5.3（低于帽梁顶5.6）");
near(qG.V_nb, q.V_nb, 1e-9, "h槽变化不影响牛腿体积（断面与长度不变）");
api.buildModel(pG, qG);
let nbG1 = null;
api.groupRef().traverse(o=>{ if(o.isMesh && o.userData.part === "nb") nbG1 = o; });
nbG1.geometry.computeBoundingBox();
const nbGbox = nbG1.geometry.boundingBox.clone();
near(nbGbox.min.z, 5.3, 0.01, "h槽=0.6 时牛腿网格底面=5.3");
near(nbGbox.max.z, 5.9, 0.01, "h槽=0.6 时牛腿网格顶面=5.9");
els.nbG.value = "0.3";
/* 加腋高度加大 → 根部总高=h腿+h腋，根部底面向下延伸(进入帽梁高度范围)，端部底面不变 */
els.nbA.value = "0.90";
const pA = api.readP(), qA = api.calcQ(pA);
near(qA.nbRoot, 1.2, 1e-9, "根部总高=h腿+h腋=0.3+0.9=1.2");
near(qA.nbBase, 5.0, 1e-9, "根部底面=顶面−根部总高=6.2−1.2=5.0（低于帽梁顶5.6）");
near(qA.nbTop - qA.nbH, 5.9, 1e-9, "端部底面=顶面−h腿=5.9（不随加腋变化）");
near(qA.V_nb, 7*0.3*(0.3+0.45), 1e-9, "加腋0.9时 V=L腿×b腿×(h腿+h腋/2)=1.575");
els.nbA.value = "0.3";
/* 竖向限值：h槽+h腿+h腋 ≤ 帽梁高+背墙高（默认 0.6+0.9=1.5） */
els.nbHt.value = "1.00"; els.nbA.value = "1.00";        /* 0.3+1.0+1.0=2.3 > 1.5 */
const pL = api.readP(), qL = api.calcQ(pL);
near(qL.nbHlim, 1.5, 1e-9, "竖向限值=帽梁高+背墙高=0.6+0.9=1.5");
near(qL.nbH, 1.0, 1e-9, "h槽+h腿=1.3 ≤ 1.5 → 牛腿高度不修正，保持1.0");
near(qL.nbAx, 0.2, 1e-9, "加腋超限 → 修正为 帽梁+背墙−h槽−h腿=1.5−0.3−1.0=0.2");
near(qL.nbRoot, 1.2, 1e-9, "根部总高被限值封顶为 帽梁+背墙−h槽=1.2");
near(qL.nbBase, qL.nbTop - 1.2, 1e-9, "根部底面=顶面−1.2（限值内最深位置，等于帽梁底标高）");
near(qL.V_nb, 7*0.3*(1.0+0.1), 1e-9, "修正后 V=L腿×b腿×(h腿+h腋/2)=2.31");
/* 加腋已为0后仍超限 → 修正牛腿高度 */
els.nbHt.value = "1.60"; els.nbA.value = "0.50";        /* 0.3+1.6=1.9 > 1.5 */
const pM = api.readP(), qM = api.calcQ(pM);
near(qM.nbH, 1.2, 1e-9, "h槽+h腿=1.9>1.5 → 牛腿高度修正为 1.5−0.3=1.2");
near(qM.nbAx, 0, 1e-9, "牛腿高度修正后余量为0 → 加腋高度修正为0");
near(qM.nbRoot, 1.2, 1e-9, "根部总高=h腿=1.2（断面退化为矩形）");
/* 修正结果写回输入框 */
api.rebuild();
near(parseFloat(els.nbA.value), 0, 1e-9, "rebuild 后加腋高度输入框写回修正值0");
els.nbHt.value = "0.3"; els.nbA.value = "0.3";
api.buildModel(p, q);
/* 牛腿独立显示开关 */
els.pNb.checked = false; api.applyPartVisibility();
let nbVis = null, capVis = null;
api.groupRef().traverse(o=>{ if(o.isMesh && o.userData.part==="nb") nbVis = o.visible;
                             if(o.isMesh && o.userData.part==="cap") capVis = o.visible; });
isTrue(nbVis === false && capVis === true, "牛腿独立开关：关闭牛腿时牛腿隐藏、帽梁仍显示");
els.pNb.checked = true; api.applyPartVisibility();
let nbVis2 = null;
api.groupRef().traverse(o=>{ if(o.isMesh && o.userData.part==="nb") nbVis2 = o.visible; });
isTrue(nbVis2 === true, "重新勾选牛腿后恢复显示");
api.buildModel(p, q);
near(vol.fd,   q.V_fd,   0.001, "网格体积:基础");
near(vol.fill, q.V_fill, 0.10,  "网格体积:回填");
near(vol.exR, q.V_exRock, 0.001, "网格体积:石方开挖棱台");
near(vol.exS, q.V_exSoil, 0.001, "网格体积:土方开挖棱台");
checkBox("cap", {"min.x":-0.1,"max.x":1.2,"min.y":-6.1,"max.y":6.1,"min.z":5,"max.z":5.6}, 0.01, "帽梁 bbox(全宽立方体)");
checkBox("bw", {"min.x":0.7,"max.x":1.2,"min.y":-6.1,"max.y":6.1,"min.z":5.6,"max.z":6.5}, 0.01, "背墙 bbox(全宽立方体)");
checkBox("fd", {"min.x":-1.0,"max.x":7.0,"min.y":-7,"max.y":7,"min.z":-1,"max.z":0}, 0.01, "基础 bbox");
checkBox("fill", {"min.x":1.2,"max.x":6.0,"min.y":-5.5,"max.y":5.5,"min.z":0,"max.z":6.5}, 0.02, "回填 bbox");

/* 工程量（手算期望值） */
near(q.t1b, 2.8666667, 0.001, "前墙底宽 t1b=t1+H1/m1");
near(q.swTopW, 4.8, 0.001, "上段侧墙顶宽/底宽=B−t1");
near(q.swBotW, 0.5, 0.001, "上段侧墙底厚=t2（m2=0）");
near(q.swLowTopW, 4.8, 0.001, "下段侧墙顶宽=上段顶宽/底宽");
near(q.swLowTopT, 0.5, 0.001, "下段侧墙顶厚=上段底厚");
near(q.swLowH, 5.0, 0.001, "下段侧墙高度=Hs−上段高");
near(q.swBotT, 0.5+5/3, 0.001, "下段侧墙底厚=下段顶厚+下段高/m3");
near(q.swLowBotW, 4.8-5/3, 0.001, "下段侧墙底宽=下段顶宽−下段高/m3");
near(q.capL, 12.2, 0.001, "帽梁总长=W+2×悬出");
near(q.V_fw, 12*5*(1.2+2.8666667)/2, 0.02, "台身(前墙梯形) V=122.0");
near(q.V_sw, 57.774074, 0.1, "侧墙(两道) V=57.774（m2=0 默认）");
near(q.V_cap, 12.2*0.6*1.3, 0.02, "帽梁 V=总长×高×宽=9.516");
near(q.bwL, 12.2, 0.001, "背墙总长=帽梁总长");
near(q.V_bw, 12.2*0.5*0.9, 0.02, "背墙 V=总长×厚×高=5.49");
near(q.V_fd1, 14*8*1, 0.01, "基础一层 V=112");
near(q.V_fd, 112, 0.01, "基础合计（二层未开）");
/* 开挖（默认：坑底15×9，h石=2/m石=1，h土=1/m土=1） */
near(q.excHr, 2, 0.001, "石方高度=开挖总高度−土方高度");
near(q.excWb, 15, 0.001, "坑底横桥向宽=fdW1+2×工作宽度");
near(q.excLb, 9, 0.001, "坑底顺桥向长=fdL1+2×工作宽度");
near(q.V_exRock, 270+96+32/3, 0.01, "石方开挖 V=∫₀²(15+2z)(9+2z)dz=376.667");
near(q.V_exSoil, 247+32+4/3, 0.01, "土方开挖 V=∫₀¹(19+2z)(13+2z)dz=280.333");
near(q.V_ex, 376+2/3+280+1/3, 0.01, "开挖合计 V=657.0");
near(q.total, 122+57.774074+9.516+5.49+0.945+112, 0.2, "圬工合计=307.725（含牛腿0.945，回填另计）");
near(q.V_fill, 266.625926, 0.5, "回填 V≈266.63（m2=0 腔体加大）");

/* 勾选二层基础复算（二层平面=一层+各边再放1m：28×11.56×1） */
els.useFd2.checked = true;
const p2 = api.readP(), q2 = api.calcQ(p2);
near(q2.V_fd2, 16*10*1, 0.01, "二层基础 V=160");
near(q2.total - q2.V_fd, 122+57.774074+9.516+5.49+0.945, 0.2, "勾选二层台上部圬工不变（含牛腿）");
els.useFd2.checked = false;

/* 桥台总宽 W：Wf 自动同步=W，台身与基础横向均随 W */
els.W.value = "20";
near(api.readP().Wf, 20, 0.001, "Wf 自动同步=桥台总宽 W");
const p4 = api.calcQ(api.readP());
near(p4.V_fw, 20*5*(1.2+2.8666667)/2, 0.02, "W=20 时台身 V=203.333");
near(p4.fdW1, 22, 0.001, "基础横向随 W=20 为 22");
els.W.value = "12";

/* m2=0（现与默认相同，回归校验） */
els.m2.value = "0";
const p3 = api.calcQ(api.readP());
near(p3.V_sw, 57.774074, 0.1, "m2=0 上段矩形(t2)+下段m3放坡 V=57.774");
els.m2.value = "0";

/* 分级放坡复算：H挖=8、h分=3、b平=1、h石=2（m石=m土=1），坑底15×9
   平台@3m、@6m（2道），分段 bp=[0,2,3,6,8]
   [0,2] 石方 off=z       ∫(15+2z)(9+2z)dz  =376.6667
   [2,3] 土方 off=z       ∫(15+2z)(9+2z)dz  =280.3333
   [3,6] 土方 off=1+z     ∫(17+2z)(11+2z)dz =1569
   [6,8] 土方 off=2+z     ∫(19+2z)(13+2z)dz =1784.6667 */
els.excH.value = "8"; els.excHs.value = "6"; els.excHst.value = "3"; els.excB.value = "1";
const p5 = api.readP(), q5 = api.calcQ(p5);
near(q5.excHr, 2, 0.001, "分级工况 石方高度=8−6=2");
near(q5.V_exRock, 376.6667, 0.01, "分级工况 石方=376.667");
near(q5.V_exSoil, 280.3333+1569+1784.6667, 0.01, "分级工况 土方=3634.0");
near(q5.V_ex, 4010.6667, 0.01, "分级工况 合计=4010.667");
near(q5.excOffTop, 2*1+(2+6), 0.001, "分级工况 地面处每侧累计外放=10（2道平台2+坡率8）");
/* 分级模型网格体积互证 */
api.buildModel(p5, q5);
const vol5 = {exR:0, exS:0};
api.groupRef().traverse(o=>{ if(o.userData && (o.userData.part==="exR"||o.userData.part==="exS")) vol5[o.userData.part]+=meshVol(o); });
near(vol5.exR, q5.V_exRock, 0.001, "分级工况 网格体积:石方");
near(vol5.exS, q5.V_exSoil, 0.001, "分级工况 网格体积:土方");
els.excH.value = "3"; els.excHs.value = "1"; els.excHst.value = "5"; els.excB.value = "1";

/* ===== 分级工况扩展互证（手算解析值 vs 三维网格测量，meshVol 按棱台带逐段精确） ===== */
function stagedCase(name, H, hs, hst, bst, mR, mS, expRock, expSoil){
  els.excH.value=String(H); els.excHs.value=String(hs); els.excHst.value=String(hst);
  els.excB.value=String(bst); els.excMr.value=String(mR); els.excMs.value=String(mS);
  const pp = api.readP(), qq = api.calcQ(pp);
  near(qq.V_exRock, expRock, 0.01, name+" 公式:石方");
  near(qq.V_exSoil, expSoil, 0.01, name+" 公式:土方");
  api.buildModel(pp, qq);
  const v5 = {exR:0, exS:0};
  api.groupRef().traverse(o=>{ if(o.userData && (o.userData.part==="exR"||o.userData.part==="exS")) v5[o.userData.part]+=meshVol(o); });
  near(v5.exR, qq.V_exRock, 0.01, name+" 网格:石方");
  near(v5.exS, qq.V_exSoil, 0.01, name+" 网格:土方");
}
/* B：H=12、h分=5 → 平台@5、@10（2道），h石=10 与上平台重合；m=1
   [0,5]  石 off=z   ∫(15+2z)(9+2z)dz  =1441.6667
   [5,10] 石 off=1+z ∫(17+2z)(11+2z)dz =4201.6667
   [10,12]土 off=2+z ∫(19+2z)(13+2z)dz =2872.6667 */
stagedCase("B 平台@5/@10、界面重合", 12, 2, 5, 1, 1, 1, 1441.6667+4201.6667, 2872.6667);
/* C：H=6、h分=4 → 平台@4（土层内），h石=2；b平=1.5
   [0,2] 石 off=z      ∫(15+2z)(9+2z)dz  =376.6667
   [2,4] 土 off=z      ∫(15+2z)(9+2z)dz  =632.6667
   [4,6] 土 off=1.5+z  A=(18+2z)(12+2z)=216+60z+4z², ∫₄⁶=432+600+608/3=1234.6667 */
stagedCase("C 平台@4位于土层", 6, 4, 4, 1.5, 1, 1, 376.6667, 632.6667+432+600+(4/3)*(216-64));
/* D：石方竖直 m石=0，H=4、h分=3 → 平台@3（土层内），h石=2，b平=1（u=z−2）
   [0,2] 石 off=0      V=15×9×2=270
   [2,3] 土 off=u      ∫₀¹(15+2u)(9+2u)du=135+24+4/3=160.3333
   [3,4] 土 off=1+u    ∫₁²(17+2u)(11+2u)du=187+84+28/3=280.3333 */
stagedCase("D 石方竖直m石=0", 4, 2, 3, 1, 0, 1, 270, 160.3333+280.3333);
/* 恢复默认 */
els.excH.value="3"; els.excHs.value="1"; els.excHst.value="5"; els.excB.value="1"; els.excMr.value="1"; els.excMs.value="1";

/* ===== 稳定与承载力验算 =====
   形心独立校核：用网格四面体分解求体积形心，与 calcCheck 的解析/积分形心对比 */
function meshStat(m){
  const pos = m.geometry.attributes.position, vs = [];
  for(let i=0;i<pos.count;i++) vs.push(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
  let C = new THREE.Vector3(); vs.forEach(v=>C.add(v)); C.multiplyScalar(1/vs.length);
  let V=0, sx=0, sy=0, sz=0;
  for(let f=0; f<vs.length/6; f++){
    let qd = [vs[f*6], vs[f*6+1], vs[f*6+2], vs[f*6+5]];
    const fc = qd[0].clone().add(qd[1]).add(qd[2]).add(qd[3]).multiplyScalar(0.25);
    const n = new THREE.Vector3().subVectors(qd[1],qd[0]).cross(new THREE.Vector3().subVectors(qd[2],qd[0]));
    if(n.dot(fc.clone().sub(C)) < 0) qd = [qd[3],qd[2],qd[1],qd[0]];
    for(const t of [[qd[0],qd[1],qd[2]],[qd[0],qd[2],qd[3]]]){
      const v = t[0].dot(new THREE.Vector3().crossVectors(t[1],t[2]))/6;
      V += v;
      sx += v*(t[0].x+t[1].x+t[2].x)/4;
      sy += v*(t[0].y+t[1].y+t[2].y)/4;
      sz += v*(t[0].z+t[1].z+t[2].z)/4;
    }
  }
  return {V: Math.abs(V), c: new THREE.Vector3(sx/V, sy/V, sz/V)};
}
/* 本段固定为「手输制动力 Hk=100、不计土压力」，校验纯制动力通路；
   自动制动力与台后土压力另在本段末尾校验 */
els.autoHk.checked = false; els.incEa.checked = false; els.Hk.value = "100";
const pChk = api.readP(), qChk = api.calcQ(pChk), cChk = api.calcCheck(pChk, qChk);
const ec0 = pChk.capCant;
const statOf = part => {
  let V = 0, sx = 0;
  (parts[part]||[]).forEach(m=>{ const r = meshStat(m); V += r.V; sx += r.V*r.c.x; });
  return { V, z: V > 1e-9 ? sx/V + ec0 : NaN };
};
let SV = 0, SZ = 0, SZF = 0, SZc = 0;
[["台身（前墙）","fw",pChk.gamC], ["侧墙（两道）","sw",pChk.gamC], ["帽梁","cap",pChk.gamC],
 ["背墙","bw",pChk.gamC], ["牛腿","nb",pChk.gamC], ["基础","fd",pChk.gamC],
 ["台腔回填","fill",pChk.gamS]].forEach(([n,part,gm])=>{
  const st = statOf(part), it = cChk.items.find(o=>o.n===n);
  if(it) near(it.z, st.z, 0.02, "验算形心 z：" + n + "（网格 vs 公式）");
  const W = st.V*gm;
  SV += W; SZ += W*st.z;
  SZF += W*(st.z - cChk.zF); SZc += W*(cChk.zc - st.z);
});
SV += pChk.Nk; SZ += pChk.Nk*cChk.zN;
SZF += pChk.Nk*(cChk.zN - cChk.zF);
SZc += pChk.Nk*(cChk.zc - cChk.zN);
near(cChk.Vsum, SV, 2.0, "验算 ΣV（网格体积×容重，侧墙含0.002显示偏移）");
near(cChk.zbar, SZ/SV, 0.01, "验算 合力作用点（网格形心加权）");
near(cChk.MsF, SZF, 10.0, "验算 绕前趾稳定力矩 ΣM稳（网格体积×容重×力臂）");
const sumArm = cChk.items.reduce((a,it)=>a + it.W*(it.z - cChk.zF), 0) + pChk.Nk*(cChk.zN - cChk.zF);
near(cChk.MsF, sumArm, 1e-9, "ΣM稳 = Σ(各竖向力×至前趾的力臂)，逐项可复核");
near(cChk.K0, cChk.MsF/cChk.Mh, 1e-9, "K0 = ΣM稳/ΣM倾（只验算前趾）");
isTrue(cChk.MsB === undefined && cChk.K0B === undefined && cChk.K0F === undefined,
       "后趾稳定力矩与 K0(后趾) 已移除");
isTrue(cChk.items.length >= 7 && cChk.items.every(it=>it.W > 0 && it.z > -1),
       "抗倾覆明细含 7 个及以上竖向力分项（各自带 W 与作用点 z）");
near(cChk.M, SZc + cChk.Mh, 10.0, "验算 基底弯矩（竖向偏心＋水平力，同向叠加）");
/* 独立互证：由绕前趾力矩平衡反求合力作用点 zR，再算 M=ΣV(zc−zR) */
const zR_chk = cChk.zF + (cChk.MsF - cChk.Mh)/cChk.Vsum;
near(cChk.M, cChk.Vsum*(cChk.zc - zR_chk), 10.0,
     "基底弯矩 = ΣV×(形心−合力作用点)，与 Σ(M稳−M倾)=ΣV·力臂 等价");
near(cChk.e, cChk.zc - zR_chk, 1e-6, "偏心距 e = z形心 − 合力作用点（向河心为正）");
/* 几何基准与代数关系 */
near(cChk.zF, -0.9, 1e-9, "基底前趾 z=ec−fd1Zf=−0.9");
near(cChk.zB, 7.1, 1e-9, "基底后趾 z=ec+L2+fd1Zb=7.1");
near(cChk.A, 112, 1e-9, "基底面积 A=(W+2×1)×(L2+1+1)=14×8=112");
near(cChk.zc, 3.1, 1e-9, "基底形心 z=3.1");
near(cChk.zN, 0.4, 1e-9, "支座作用点 z=背墙前缘0.8−d支0.4=0.4");
near(cChk.yH, 5.7, 1e-9, "水平力作用点标高=H1+capH+dH=5.7");
near(cChk.hH, 6.7, 1e-9, "水平力对基底的力臂=5.7+fdT1.0=6.7");
near(cChk.Mh, 670, 1e-6, "水平力力矩 Hk×h=100×6.7=670");
near(cChk.Kc, 0.3*cChk.Vsum/100, 1e-9, "Kc=μΣV/Hk");
near(cChk.pMean, cChk.Vsum/112, 1e-9, "p均=N/A");
near(cChk.eLim, 8/6, 1e-9, "土基偏心距限值=Lb/6=1.333");
near(cChk.pMax, cChk.pMean + 6*Math.abs(cChk.M)/(14*64), 1e-9, "p最大=N/A+6|M|/(B·L²)");
isTrue(cChk.okAll, "默认工况（Nk=1000、Hk=100、μ=0.3、fa=400）三项验算全部通过");
/* Nk 的力学性质：竖向力 → 计入 ΣM稳；倾覆力矩只来自水平力 */
els.Nk.value = "0";
const cN0 = api.calcCheck(api.readP(), api.calcQ(api.readP()));
els.Nk.value = "4000";
const cN4 = api.calcCheck(api.readP(), api.calcQ(api.readP()));
els.Nk.value = "1000";
isTrue(cN4.K0 > cChk.K0 && cChk.K0 > cN0.K0, "Nk 增大 → K0 单调上升（证明 Nk 是稳定力而非倾覆力）");
isTrue(Math.abs(cN4.Mh - cN0.Mh) < 1e-9, "Nk 不影响 ΣM倾（倾覆力矩只由制动力＋土压力产生）");
isTrue(cN4.Mc > cChk.Mc && cChk.Mc > cN0.Mc,
       "Nk 增大 → 竖向力偏心弯矩 Mc 上升（支座在形心河心侧，把合力往河心拉）");
isTrue(cN4.M > cN0.M, "Nk 增大 → 基底弯矩 M 上升（水平力与竖向偏心同向叠加，不相消）");
near(cChk.Mc, cChk.Vsum*(cChk.zc - cChk.zbar), 5.0, "Mc = ΣV×(形心−竖向合力点)");
isTrue(cChk.M > Math.abs(cChk.Mh), "默认工况 M 大于 ΣM倾（竖向偏心与倾覆同向，不应相减）");
/* 参数敏感性 */
els.Hk.value = "5000";
const cH = api.calcCheck(api.readP(), api.calcQ(api.readP()));
isTrue(cH.Kc < cChk.Kc && !cH.okKc, "Hk=5000 时 Kc 下降且抗滑移不通过");
els.Hk.value = "100";
els.fa.value = "50";
const cF = api.calcCheck(api.readP(), api.calcQ(api.readP()));
isTrue(!cF.okB && cF.okKc && cF.okK0, "fa=50kPa 时仅承载力不通过");
els.fa.value = "400";
els.fndType.value = "rock";
const cR = api.calcCheck(api.readP(), api.calcQ(api.readP()));
near(cR.eLim, 8/4, 1e-9, "岩石地基偏心距限值=Lb/4=2.0");
els.fndType.value = "soil";
els.incFill.checked = false;
const cN = api.calcCheck(api.readP(), api.calcQ(api.readP()));
near(cChk.Vsum - cN.Vsum, qChk.V_fill*pChk.gamS, 1e-6, "不勾选台腔回填时 ΣV 减少回填土重");
els.incFill.checked = true;
els.dBear.value = "5";
const cD = api.calcCheck(api.readP(), api.calcQ(api.readP()));
near(cD.dBear, pChk.capWid - pChk.bwT, 1e-9, "d支超限时按背墙前缘距离截断(0.8)");
near(cD.zN, 0, 1e-9, "d支超限后支座落在帽梁前缘 z=0");
els.dBear.value = "0.40";
/* 验算表渲染 */
api.renderCheck(pChk, qChk);
const ckTbl = els.checkBody.innerHTML;
isTrue(ckTbl.indexOf("抗滑移")>=0 && ckTbl.indexOf("抗倾覆")>=0 && ckTbl.indexOf("偏心距")>=0 &&
       ckTbl.indexOf("p最大")>=0 && ckTbl.indexOf("验算结论")>=0, "验算表含抗滑移/抗倾覆/承载力/结论");
isTrue(els.checkNote.innerHTML.indexOf("标准值")>=0 && els.checkNote.innerHTML.indexOf("3363")>=0, "验算说明含荷载标准值与规范依据");
isTrue(ckTbl.indexOf("ΣM稳 合计")>=0 && ckTbl.indexOf("支座竖向反力 Nk")>=0 &&
       ckTbl.indexOf("台身（前墙）自重")>=0, "验算表逐项列出 ΣM稳（各构件自重＋支座反力，带力臂）");
isTrue(ckTbl.indexOf("K0(后趾)")<0 && ckTbl.indexOf("控制值 K0")<0, "验算表不再出现后趾验算（合力位置仍标注距后趾距离）");
isTrue(ckTbl.indexOf("ΣM倾 合计")>=0, "验算表列出 ΣM倾 合计");

/* ===== 制动力自动计算（JTG D60—2015 第 4.3.6 条） ===== */
els.incEa.checked = false; els.autoHk.checked = true;
els.brkL.value = "20"; els.brkGrade.value = "I"; els.brkN.value = "1";
const pH1 = api.readP();
near(pH1.Hk, 165, 1e-9, "制动力自动：L=20m、Ⅰ级、1 车道 → 下限 165kN 控制（10% 仅 51kN）");
near(pH1.brk.Pk, 300, 1e-9, "Pk 内插 = 270+2×(20−5) = 300kN");
isTrue(els.Hk.value === "165.0" && els.Hk.disabled === true, "自动制动力写回输入框并锁定");
els.brkGrade.value = "II";
near(api.readP().Hk, 90, 1e-9, "Ⅱ级下限 90kN 控制");
els.brkGrade.value = "I"; els.brkN.value = "4";
near(api.readP().Hk, 165*2.68, 1e-9, "4 车道折减 ×2.68 → 442.2kN");
els.brkN.value = "3";
near(api.readP().Hk, 165*2.34, 1e-9, "3 车道折减 ×2.34 → 386.1kN");
els.brkN.value = "1"; els.brkL.value = "150";
near(api.readP().Hk, 0.1*(10.5*150+360), 1e-9, "L=150m 时 10% 控制 = 193.5kN（大于 165 下限）");
els.brkL.value = "3";
near(api.readP().brk.Pk, 270, 1e-9, "L≤5m 时 Pk 取 270kN");
els.brkL.value = "20";
els.autoHk.checked = false;
api.readP();
isTrue(els.Hk.disabled === false, "取消自动后 Hk 恢复可编辑");
els.Hk.value = "100";

/* ===== 台后主动土压力（库仑，仅取水平分量） ===== */
els.incEa.checked = true;
const cE = api.calcCheck(api.readP(), api.calcQ(api.readP()));
const r30 = Math.PI/6, r20 = 20*Math.PI/180;
const KaExp = Math.pow(Math.cos(r30),2) / (Math.cos(r20)*Math.pow(1+Math.sqrt(Math.sin(r20+r30)*Math.sin(r30)/Math.cos(r20)),2));
near(cE.Ka, KaExp, 1e-12, "库仑 Ka(φ=30°、δ=20°) = 0.2974");
near(cE.hf, 6.5, 1e-9, "填土高度留空自动取侧墙总高 = 5+0.6+0.9 = 6.5");
near(cE.Ea, 0.5*18*6.5*6.5*KaExp*12, 1e-6, "Ea = 0.5γs·h填²·Ka·B = 1357kN");
near(cE.EaH, cE.Ea*Math.cos(r20), 1e-9, "EaH = Ea·cosδ");
near(cE.yEa, 1+6.5/3, 1e-9, "土压力合力点距基底 = 基础厚 + h填/3");
near(cE.Htot, 100 + cE.EaH, 1e-9, "ΣH = 制动力 + 土压力水平分量");
near(cE.Mh, 100*cE.hH + cE.EaH*cE.yEa, 1e-9, "ΣM倾 = 制动力 + 土压力");
near(cE.Kc, 0.3*cE.Vsum/cE.Htot, 1e-9, "Kc = μΣV/ΣH");
isTrue(cE.Kc < cChk.Kc*0.2, "计入土压力后 Kc 由 39.6 降至约 2.9（富余收窄一个数量级）");
isTrue(cE.okAll, "计入台后土压力后三项验算仍全部通过");
/* 敏感性 */
els.incEa.checked = false;
const cNoE = api.calcCheck(api.readP(), api.calcQ(api.readP()));
near(cNoE.Ea, 0, 1e-12, "取消土压力后 Ea = 0");
near(cNoE.Htot, 100, 1e-9, "取消土压力后 ΣH 仅剩制动力");
els.incEa.checked = true; els.chkHf.value = "3";
const cHf = api.calcCheck(api.readP(), api.calcQ(api.readP()));
near(cHf.hf, 3, 1e-9, "手填填土高度 3m 生效");
near(cHf.Ea, 0.5*18*9*KaExp*12, 1e-6, "Ea 随 h填² 折减（3m 时约 289kN）");
els.chkHf.value = "";
els.chkPhi.value = "40";
const cPhi = api.calcCheck(api.readP(), api.calcQ(api.readP()));
isTrue(cPhi.Ka < cE.Ka && cPhi.Ea < cE.Ea, "φ 增至 40° 时 Ka、Ea 下降");
els.chkPhi.value = "30"; els.chkDelta.value = "0";
const cD0 = api.calcCheck(api.readP(), api.calcQ(api.readP()));
near(cD0.Ka, Math.pow(Math.tan(Math.PI/4 - r30/2),2), 1e-9, "δ=0 退化为朗肯 Ka=tan²(45°−φ/2)=0.3333");
els.chkDelta.value = "20";
/* 默认工况：自动制动力 165kN + 土压力 */
els.autoHk.checked = true;
const cAll = api.calcCheck(api.readP(), api.calcQ(api.readP()));
isTrue(cAll.Htot > 1400 && cAll.Htot < 1500, "默认工况 ΣH ≈ 165+1275 = 1440kN");
isTrue(cAll.EaH > 6*cAll.Hk, "土压力水平分量是制动力的 7 倍以上（默认工况）");
isTrue(cAll.okAll, "默认工况（自动制动力＋台后土压力）三项验算全部通过");
els.autoHk.checked = false; els.Hk.value = "100";

console.log(`\n=== 结果: ${pass} PASS, ${fail} FAIL ===`);
process.exit(fail?1:0);
