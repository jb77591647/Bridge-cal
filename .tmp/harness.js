/* 无头验证：真实 THREE + 严格 DOM 桩（未知 id 抛错），校验几何 bbox 与工程量 */
const fs = require("fs");
const path = require("path");
const TPL = path.join(__dirname, "app_template.html");
const LIB = path.join(__dirname, "three_clean.js");

const lib = fs.readFileSync(LIB, "utf8");
const tpl = fs.readFileSync(TPL, "utf8");
/* 应用脚本是文件里最后一个 <script> 块（其前依次是 three.js、MathJax 配置、MathJax 库、MML2OMML 样式表） */
const _end = tpl.lastIndexOf("</script>");
const _beg = tpl.lastIndexOf("<script>", _end);
if(_end < 0 || _beg < 0){ console.error("FAIL: 未找到应用脚本"); process.exit(1); }
let app = tpl.slice(_beg + 8, _end);
if(app.indexOf("__THREE__") >= 0 || app.indexOf("function renderCheck") < 0){
  console.error("FAIL: 应用脚本定位错误"); process.exit(1);
}

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
  chkHf:"", chkPhi:"30", chkDelta:"20", chkKaShow:"", chkKaShow2:"", chkEaShow:""
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
app += "\n;global.__api={brakeForce,readP,calcQ,calcCheck,buildModel,renderTable,renderCheck,rebuild,applyPartVisibility,setScene:(s)=>{scene=s;},groupRef:()=>group,labelRef:()=>labelGroup,M,texPlain,texToMml,texToOmml,exportWord,zipStore,crc32,wRun,inlineFromNode};";
global.THREE = require(LIB);

let pass=0, fail=0;
function near(actual, exp, tol, name){
  const ok = Math.abs(actual-exp) <= tol;
  ok ? pass++ : fail++;
  console.log((ok?"PASS":"FAIL") + ` ${name}: 实际=${f3(actual)} 期望=${f3(exp)} ±${tol}`);
  function f3(x){ return (typeof x==="number" && isFinite(x)) ? x.toFixed(4) : String(x); }
}
/* HTML → 纯文本：.mj 的公式 span 会打断字面量匹配，这里还原成降级文本再去标签，
   使「文本是否存在」类断言可以跨过 MathJax 的包裹标签 */
function plainify(h){
  return String(h)
    .replace(/<span class="mj" data-tex="[^"]*">([\s\S]*?)<\/span>/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
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
/* 场景原点已改为「基底前趾中点」：旧口径（前墙前缘=0）的坐标一律加 OX＝基础前伸 fd1Zf=1.0。
   场景轴：x=纵桥向(基底前趾=0向台后, 前墙前缘=+1.0, 帽梁前缘=+0.9), y=横桥向, z=竖向(墙底=0) */
const OX = 1.0;
checkBox("fw", {"min.x":OX,"max.x":OX+zb0,"min.y":-6,"max.y":6,"min.z":0,"max.z":5}, 0.01, "前墙 bbox(梯形)");
const swB = checkBox("sw", {"min.x":OX+1.202,"max.x":OX+6.0,"min.y":-6,"max.y":6,"min.z":0,"max.z":6.5}, 0.01, "侧墙 bbox");
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
near(swFrontTop, OX+1.202, 0.01, "侧墙前端缘顶部 x=OX+t1+0.002（竖直段，贴前墙背）");
near(swFrontBot, OX+zb0+0.002, 0.01, "侧墙前端缘底部 x=OX+2.8687（贴前墙背坡面）");

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
checkBox("nb", {"min.x":OX+1.2,"max.x":OX+1.5,"min.y":-3.5,"max.y":3.5,"min.z":5.6,"max.z":6.2}, 0.01,
  "牛腿 bbox(x 背墙背面2.2→外端2.5、y 以帽梁中心±L腿/2=±3.5、z 根部底5.6→顶面6.2)");
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
checkBox("cap", {"min.x":OX-0.1,"max.x":OX+1.2,"min.y":-6.1,"max.y":6.1,"min.z":5,"max.z":5.6}, 0.01, "帽梁 bbox(全宽立方体)");
checkBox("bw", {"min.x":OX+0.7,"max.x":OX+1.2,"min.y":-6.1,"max.y":6.1,"min.z":5.6,"max.z":6.5}, 0.01, "背墙 bbox(全宽立方体)");
checkBox("fd", {"min.x":0,"max.x":8.0,"min.y":-7,"max.y":7,"min.z":-1,"max.z":0}, 0.01, "基础 bbox（前趾 x=0，后趾 x=8.0）");
checkBox("fill", {"min.x":OX+1.2,"max.x":OX+6.0,"min.y":-5.5,"max.y":5.5,"min.z":0,"max.z":6.5}, 0.02, "回填 bbox");

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
  /* 场景坐标已减 datumX=ec，即「前墙前缘 x=0」，与 calcCheck 基准一致，无需再补偿 */
  return { V, z: V > 1e-9 ? sx/V : NaN };
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
isTrue(cChk.items.length >= 7 && cChk.items.every(it=>it.W > 0 && it.z >= -1e-9),
       "抗倾覆明细含 7 个及以上竖向力分项（各自带 W 与作用点 x），且作用点 x 全部非负");
near(cChk.M, SZc + cChk.Mh, 10.0, "验算 基底弯矩（竖向偏心＋水平力，同向叠加）");
/* 独立互证：由绕前趾力矩平衡反求合力作用点 xR，再算 M=ΣV(xc−xR) */
const zR_chk = cChk.zF + (cChk.MsF - cChk.Mh)/cChk.Vsum;
near(cChk.M, cChk.Vsum*(cChk.zc - zR_chk), 10.0,
     "基底弯矩 = ΣV×(形心−合力作用点)，与 Σ(M稳−M倾)=ΣV·力臂 等价");
near(cChk.e, cChk.zc - zR_chk, 1e-6, "偏心距 e = x形心 − 合力作用点（向河心为正）");
/* 几何基准与代数关系 */
near(cChk.zF, 0, 1e-9, "基底前趾 x=0（坐标原点＝基底前趾）");
/* 三维坐标轴原点＝基底前趾底边中点（倾覆点）：轴整体下移到基础底面 */
isTrue(tpl.indexOf("const axY = -(q.fdT || 0)") >= 0,
       "坐标轴竖向基准 axY＝−基础总厚（基础底面）");
isTrue(tpl.indexOf("ax.position.set(0, 0, axY)") >= 0 && tpl.indexOf("axG.position.set(0, 0, axY)") >= 0,
       "AxesHelper 与箭头组均平移到基础底面，原点落在基底前趾底边中点（倾覆点）");
isTrue(tpl.indexOf("基底前趾底边中点") >= 0 && tpl.indexOf("倾覆点") >= 0,
       "页面说明注明原点＝基底前趾底边中点（倾覆点）");
near(cChk.zB, 8.0, 1e-9, "基底后趾 x＝前伸1.0＋L2 6.0＋后伸1.0＝8.0（＝基底长 L）");
near(cChk.A, 112, 1e-9, "基底面积 A=(W+2×1)×(L2+1+1)=14×8=112");
near(cChk.zc, 4.0, 1e-9, "基底形心 x＝L/2＝4.0（同时等于距前趾的距离）");
near(cChk.zN, 1.3, 1e-9, "支座作用点 x＝基础前伸1.0＋背墙前缘0.7−d支0.4＝1.3");
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
near(cD.zN, 0.9, 1e-9, "d支超限后支座落在帽梁前缘 x＝前伸1.0−ec0.1＝0.9");
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
/* ΣM倾 计算式明细：力臂分列 + 数值代入可逐步复核 */
isTrue(ckTbl.indexOf("制动力力臂 hH")>=0 && ckTbl.indexOf("土压力力臂 yEa1")>=0 &&
       ckTbl.indexOf("土压力力臂 yEa2")>=0,
       "ΣM倾 分列三根力臂（制动力 hH / 下段 yEa1 / 上段 yEa2）");
isTrue(ckTbl.indexOf("前墙高 "+pChk.H1.toFixed(2)+"＋帽梁高 "+pChk.capH.toFixed(2)+"＋dH "+pChk.dH.toFixed(2))>=0,
       "制动力力臂行逐段列出 前墙高＋帽梁高＋dH");
isTrue(ckTbl.indexOf(qChk.fdT.toFixed(3))>=0, "力臂行列出基础总厚（前墙底至基底）");
isTrue(ckTbl.indexOf("h2/3＝"+cChk.h2.toFixed(2)+"/3＝"+(cChk.h2/3).toFixed(3))>=0,
       "上段土压力力臂行展开为 基础厚＋h1＋h2/3，并给出 h2/3 的数值");
isTrue(ckTbl.indexOf(cChk.Hk.toFixed(1)+"×"+cChk.hH.toFixed(3))>=0,
       "ΣM倾 合计行代入 Hk×hH 的数值");
isTrue(ckTbl.indexOf(cChk.EaH1.toFixed(1)+"×"+cChk.yEa1.toFixed(3))>=0 &&
       ckTbl.indexOf(cChk.EaH2.toFixed(1)+"×"+cChk.yEa2.toFixed(3))>=0,
       "ΣM倾 合计行分段代入 EaH1×yEa1、EaH2×yEa2 的数值");
isTrue(ckTbl.indexOf(cChk.MhB.toFixed(1)+"＋"+cChk.MhE1.toFixed(1)+"＋"+cChk.MhE2.toFixed(1))>=0,
       "ΣM倾 合计行给出三项分力矩之和");
near(cChk.hH, pChk.H1 + pChk.capH + pChk.dH + qChk.fdT, 1e-9,
     "hH ＝ 前墙高＋帽梁高＋dH＋基础总厚（表中所列算式与计算值一致）");
near(cChk.yEa2, qChk.fdT + cChk.h1 + cChk.h2/3, 1e-9,
     "yEa2 ＝ 基础总厚＋h1＋h2/3（表中所列算式与计算值一致）");
isTrue(cChk.yEa1 - qChk.fdT > cChk.h1/3 - 1e-9 && cChk.yEa1 - qChk.fdT < cChk.h1/2 + 1e-9,
       "下段合力点介于 h1/3（纯三角形）与 h1/2（纯均布超载）之间");
/* 坐标符号与原点口径：顺桥向一律记作 x，竖向才是 z；
   表中 x 以「基底前趾中点 = 0」为原点，故坐标数值＝距前趾的距离，且全部非负 */
isTrue(ckTbl.indexOf("前趾 x=")>=0 && ckTbl.indexOf("作用点 x=")>=0,
       "结果表把顺桥向坐标标为 x（作用点 x= / 前趾 x=）");
isTrue(ckTbl.indexOf("前趾 z=")<0 && ckTbl.indexOf("作用点 z=")<0,
       "结果表不再把顺桥向坐标误标为 z");
isTrue(ckTbl.indexOf("前趾 x=0.000")>=0,
       "表中前趾 x=0.000（坐标原点＝基底前趾）");
isTrue(ckTbl.indexOf("绕倾覆点")>=0 && ckTbl.indexOf("倾覆点 z=0")>=0,
       "抗倾覆两节标题均以倾覆点（x=0、z=0）为取矩基准");
isTrue(ckTbl.indexOf("前趾 x=-")<0 && ckTbl.indexOf("前趾 x=−")<0 &&
       ckTbl.indexOf("作用点 x=-")<0 && ckTbl.indexOf("作用点 x=−")<0,
       "表中不再出现任何负的顺桥向坐标（前趾/作用点均非负）");
near(cChk.zN - cChk.zF, 1.3, 1e-9, "支座至前趾距离 1.3（＝支座坐标 1.3 − 前趾 0，坐标即距离）");

/* ===== 验算表分节行：1、2、3… 序号 + 加粗 + 字号较常规分节行大 1px ===== */
const sepHtmls = ckTbl.match(/<tr class="sepChk"><td colspan="5">([\s\S]*?)<\/td><\/tr>/g) || [];
isTrue(sepHtmls.length === 6, "验算表共 6 个分节行（竖向力/水平力/抗滑移/抗倾覆①/抗倾覆②/承载力）");
const sns = sepHtmls.map(h => (h.match(/<span class="sn">(\d+)、<\/span>/) || [])[1]);
isTrue(sns.join(",") === "1,2,3,4,5,6" && sns.every((v,i)=>Number(v)===i+1),
       "分节序号自 1 连续递增、无跳号无重复：" + sns.join(" "));
isTrue(sepHtmls.every(h => /<span class="sn">\d+、<\/span>\S/.test(h)),
       "序号位于分节标题文字之前（1、标题…）");
isTrue(sepHtmls[0].indexOf("竖向力（标准值，基底以上全部竖向力）")>=0 &&
       sepHtmls[1].indexOf("顺桥向水平力（标准值，均取指向河心的不利方向）")>=0 &&
       sepHtmls[2].indexOf("抗滑移稳定")>=0, "序号与既有分节标题文字正确配对");
/* 样式：加粗 + 字号 = 常规 sep 行 +1px */
const cssSep = (tpl.match(/tr\.sep td\{[^}]*\}/) || [""])[0];
const cssChk = (tpl.match(/tr\.sepChk td\{[^}]*\}/) || [""])[0];
const pxOf = s => { const m2 = s.match(/font-size:\s*([\d.]+)px/); return m2 ? Number(m2[1]) : NaN; };
isTrue(/font-weight:\s*(700|bold)/.test(cssChk), "分节行加粗（font-weight:700）");
near(pxOf(cssChk) - pxOf(cssSep), 1, 1e-9, "分节行字号比常规分节行大 1px（11.5 → 12.5）");
isTrue(els.resultBody.innerHTML.indexOf('class="sep"')>=0 &&
       els.resultBody.innerHTML.indexOf('class="sepChk"')<0,
       "工程量表分节行（开挖/回填）不受影响，仍用常规 sep 样式");

/* ===== 验算示意图：每节一张内联 SVG，随参数联动 ===== */
const dgRows = ckTbl.match(/<tr class="diagChk"><td colspan="5">[\s\S]*?<\/tr>/g) || [];
isTrue(dgRows.length === 6, "6 个分节各带 1 张计算示意图（diagChk 行 6 条）");
isTrue((ckTbl.match(/<svg /g) || []).length === 6, "示意图以 6 个内联 SVG 渲染（不依赖外部图片/脚本）");
isTrue(dgRows.every(r => r.indexOf("NaN") < 0 && r.indexOf("undefined") < 0),
       "示意图坐标全部为有限数值（无 NaN / undefined 属性）");
isTrue(dgRows.every(r => r.indexOf('class="dgFig"') >= 0 && r.indexOf('class="dgCap"') >= 0),
       "每张图均为「图 + 图注」两栏结构");
isTrue([1,2,3,4,5,6].every(i => ckTbl.indexOf("图 " + i + "　") >= 0),
       "图注编号 图 1～图 6 齐全且连续");
/* 分节行与图行的先后关系：每节标题后紧跟该节示意图 */
const seq = ckTbl.match(/<tr class="(sepChk|diagChk)"/g) || [];
isTrue(seq.length === 12 && seq.every((v,i)=> i%2===0 ? v.indexOf("sepChk")>=0 : v.indexOf("diagChk")>=0),
       "每个分节标题行之后紧接该节示意图（sepChk / diagChk 交替 6 组）");
/* 图内应画出的关键要素 */
isTrue((ckTbl.match(/<circle /g) || []).length >= 6, "图 1/4 的分项编号圈与图 5 的力臂编号均为实心编号圈");
isTrue((ckTbl.match(/<polygon points=/g) || []).length >= 8, "箭头与倾覆点三角标记用 polygon 绘制");
const dgV = dgRows[0] || "", dgMs = dgRows[3] || "", dgBase = dgRows[5] || "";
isTrue(dgV.indexOf("图 1") >= 0 && dgV.indexOf("前墙") >= 0 && dgV.indexOf("台腔回填") >= 0 &&
       dgV.indexOf("基底前趾") >= 0,
       "图 1 标注了构件名（前墙/台腔回填）与基底前趾位置");
isTrue(dgMs.indexOf("倾覆点") >= 0 && dgMs.indexOf("ΣM稳") >= 0,
       "图 4 标出倾覆点与 ΣM稳");
isTrue(dgBase.indexOf("p最大") >= 0 && dgBase.indexOf("p均") >= 0,
       "图 6 的应力梯形图标注 p最大 / p均");
isTrue(ckTbl.indexOf("μΣV＝") >= 0 && ckTbl.indexOf("ΣH＝") >= 0,
       "图 3 标出摩擦阻力 μΣV 与滑移力 ΣH");

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

/* ===== 台后主动土压力（库仑通式：墙背按前墙背坡倾斜，竖向分量计入 ΣV 与 ΣM稳） ===== */
/* 库仑通式（墙背与水平面夹角 α、填土面水平 β=0） */
const kaGen = (alDeg, phiDeg, dlDeg) => {
  const a = alDeg*Math.PI/180, p2 = phiDeg*Math.PI/180, d2 = dlDeg*Math.PI/180;
  const sa = Math.sin(a), sad = Math.sin(a-d2);
  return Math.pow(Math.sin(a+p2),2) / (sa*sa*sad*Math.pow(1+Math.sqrt(Math.sin(p2+d2)*Math.sin(p2)/(sad*sa)),2));
};
els.incEa.checked = true;
els.chkHf.value = ""; els.chkPhi.value = "30"; els.chkDelta.value = "20"; els.m1.value = "3";
const cE = api.calcCheck(api.readP(), api.calcQ(api.readP()));
const r30 = Math.PI/6, r20 = 20*Math.PI/180;
const thD = Math.atan(1/3)*180/Math.PI;          // 18.435°
const angD = thD + 20;                            // θ+δ = 38.435°
/* 竖直墙基准值（旧口径），用于对比折减 */
const KaVert = Math.pow(Math.cos(r30),2) / (Math.cos(r20)*Math.pow(1+Math.sqrt(Math.sin(r20+r30)*Math.sin(r30)/Math.cos(r20)),2));
near(cE.thDeg, thD, 1e-9, "下段墙背倾角 θ = atan(1/m1) = atan(1/3) = 18.435°（坡比不取 0）");
near(cE.alDeg, 90 + thD, 1e-9, "下段墙背与水平面夹角 α1 = 90°+θ = 108.435°");
near(cE.angDeg, angD, 1e-9, "下段合力与水平方向夹角 = θ+δ = 38.435°");
const KaGenExp = kaGen(90 + thD, 30, 20);
near(cE.Ka1, KaGenExp, 1e-12, "下段 库仑通式 Ka1(α=108.44°、φ=30°、δ=20°) = 0.1829");
near(cE.Ka2, KaVert, 1e-12, "上段 竖直墙 Ka2(α=90°) = 0.2973");
isTrue(cE.Ka1 < 0.7*cE.Ka2, "斜墙 Ka1 比竖直墙 Ka2 小 38%（θ 改变墙背与滑裂面的夹角）");
near(cE.hf, 6.5, 1e-9, "填土高度留空自动取侧墙总高 = 5+0.6+0.9 = 6.5");
/* 分段：下段=前墙背坡段，上段=帽梁/背墙竖直段 */
near(cE.h1, 5, 1e-9, "下段（斜墙）高 h1 = min(h填, H1) = 5.00（前墙全高）");
near(cE.h2, 1.5, 1e-9, "上段（竖直墙）高 h2 = h填 − h1 = 1.50（帽梁 0.6＋背墙 0.9）");
near(cE.qOv, 27, 1e-9, "上段土柱等效超载 q = γs·h2 = 18×1.5 = 27.0 kPa");
/* 下段：梯形分布（超载均布项 ＋ 深度三角形项） */
const k1u = KaGenExp*(27*5 + 0.5*18*25);
near(cE.Ea1, k1u*12, 1e-6, "下段 Ea1 = Ka1(q·h1＋½γs·h1²)·B = " + (k1u*12).toFixed(1) + " kN");
near(cE.EaH1, cE.Ea1*Math.cos(angD*Math.PI/180), 1e-9, "下段 EaH1 = Ea1·cos(θ+δ)");
near(cE.EaV1, cE.Ea1*Math.sin(angD*Math.PI/180), 1e-9, "下段 EaV1 = Ea1·sin(θ+δ)");
near(cE.yEa1 - qChk.fdT, (KaGenExp*(27*25/2 + 0.5*18*125/3))/k1u, 1e-9,
     "下段合力点 y1 = ΣM/ΣF = 1.979（梯形分布，介于 h1/3 与 h1/2 之间）");
near(cE.xEa1, 1.0 + 1.2 + (5 - (cE.yEa1 - qChk.fdT))/3, 1e-9,
     "下段作用点 x = 前伸1.0+t1+(H1−y1)/m1（墙背面在该高度处）");
/* 上段：三角形分布（顶面无超载） */
const k2u = 0.5*KaVert*18*2.25;
near(cE.Ea2, k2u*12, 1e-6, "上段 Ea2 = ½Ka2·γs·h2²·B = " + (k2u*12).toFixed(1) + " kN");
near(cE.EaH2, cE.Ea2*Math.cos(r20), 1e-9, "上段 EaH2 = Ea2·cosδ（θ2=0）");
near(cE.EaV2, cE.Ea2*Math.sin(r20), 1e-9, "上段 EaV2 = Ea2·sinδ");
near(cE.yEa2, qChk.fdT + 5 + 1.5/3, 1e-9, "上段合力点距基底 = 基础厚＋h1＋h2/3 = 6.500");
near(cE.xEa2, 2.2, 1e-9, "上段作用点 x = 前伸1.0+t1 = 2.200（帽梁后缘、背墙背面与之同面）");
/* 合计与分段叠加口径 */
near(cE.EaH, cE.EaH1 + cE.EaH2, 1e-12, "EaH 合计 = 下段＋上段水平分量");
near(cE.EaV, cE.EaV1 + cE.EaV2, 1e-12, "EaV 合计 = 下段＋上段竖向分量");
near(cE.Htot, 100 + cE.EaH, 1e-9, "ΣH = 制动力 + 土压力水平分量合计");
near(cE.Mh, 100*cE.hH + cE.EaH1*cE.yEa1 + cE.EaH2*cE.yEa2, 1e-9,
     "ΣM倾 = 制动力 + 下段/上段土压力各自力矩");
near(cE.Kc, 0.3*cE.Vsum/cE.Htot, 1e-9, "Kc = μΣV/ΣH（ΣV 已含 EaV）");
isTrue(cE.Kc < cChk.Kc*0.25, "计入土压力后 Kc 由 39.6 降至约 4.8（富余收窄近一个数量级）");
isTrue(cE.okAll, "计入台后土压力后三项验算仍全部通过");
/* 分段结果必须比"全高统一按斜墙"更不利（上段竖直墙 Ka2 更大） */
{
  const EaOne = 0.5*18*6.5*6.5*KaGenExp*12;
  isTrue(cE.EaH > EaOne*Math.cos(angD*Math.PI/180),
         "分段后 EaH 大于全高统一斜墙口径（上段竖直墙 Ka2 > Ka1，修正原口径偏不保守处）");
}
/* 土压力计入后仍满足绕前趾力矩平衡（独立互证，防 ΣV 与 ΣM稳 口径不一致） */
{
  const zR = cE.zF + (cE.MsF - cE.Mh)/cE.Vsum;
  near(cE.e, cE.zc - zR, 1e-6, "计入土压力后 e = x形心 − 合力作用点（绕前趾力矩平衡互证）");
  near(cE.M, cE.Vsum*(cE.zc - zR), 1e-6, "计入土压力后 基底弯矩 M = ΣV(形心−合力点)，与 Σ(M稳−M倾) 等价");
}
/* 竖向分量：必须同时进 ΣV 与 ΣM稳 */
els.incEa.checked = false;
const cNoE = api.calcCheck(api.readP(), api.calcQ(api.readP()));
near(cNoE.Ea, 0, 1e-12, "取消土压力后 Ea = 0");
near(cNoE.EaV, 0, 1e-12, "取消土压力后 EaV = 0");
near(cNoE.Htot, 100, 1e-9, "取消土压力后 ΣH 仅剩制动力");
els.incEa.checked = true;
near(cE.Vsum - cNoE.Vsum, cE.EaV, 1e-6, "ΣV 计入土压力竖向分量 EaV（向下）");
near(cE.MsF - cNoE.MsF, cE.EaV1*(cE.xEa1 - cE.zF) + cE.EaV2*(cE.xEa2 - cE.zF), 1e-6,
     "ΣM稳 计入 EaV（下段/上段各按其作用点 x 至前趾的力臂）");
isTrue(cE.MsF > cNoE.MsF, "EaV 使 ΣM稳 增大（δ>0、向下，起稳定作用）");
/* 敏感性 */
els.chkHf.value = "3";
const cHf = api.calcCheck(api.readP(), api.calcQ(api.readP()));
near(cHf.hf, 3, 1e-9, "手填填土高度 3m 生效");
near(cHf.h2, 0, 1e-9, "h填 ≤ 前墙高时上段高 h2 = 0（无竖直墙段）");
near(cHf.qOv, 0, 1e-9, "h2 = 0 时上段超载 q = 0");
near(cHf.Ea2, 0, 1e-12, "h2 = 0 时上段土压力 Ea2 = 0，退化为单段斜墙");
near(cHf.Ea, 0.5*18*9*KaGenExp*12, 1e-6, "退化单段斜墙：Ea = ½γs·h填²·Ka1·B = 177.7kN");
near(cHf.xEa, 1.0 + 1.2 + (5 - 1)/3, 1e-9, "h填 减小时 EaV 作用点随墙面下移（x=3.533）");
els.chkHf.value = "";
els.chkPhi.value = "40";
const cPhi = api.calcCheck(api.readP(), api.calcQ(api.readP()));
isTrue(cPhi.Ka1 < cE.Ka1 && cPhi.Ka2 < cE.Ka2 && cPhi.Ea < cE.Ea, "φ 增至 40° 时两段 Ka、合力均下降");
/* 坡比 m1=0（竖直墙）退化为旧口径；δ=0 再退化为朗肯 */
els.chkPhi.value = "30"; els.chkDelta.value = "0"; els.m1.value = "0";
const cD0 = api.calcCheck(api.readP(), api.calcQ(api.readP()));
near(cD0.thDeg, 0, 1e-12, "m1=0 时 θ=0（竖直墙）");
near(cD0.Ka1, Math.pow(Math.tan(Math.PI/4 - r30/2),2), 1e-9, "m1=0、δ=0 退化为朗肯 Ka1=tan²(45°−φ/2)=0.3333");
near(cD0.Ka2, cD0.Ka1, 1e-12, "m1=0 时上下两段同为竖直墙，Ka1＝Ka2");
near(cD0.Ea, 0.5*18*6.5*6.5*cD0.Ka1*12, 1e-9,
     "m1=0 时分段结果与单段公式 Σ=½γs·h填²·Ka·B 严格相等（分段算法等价性校验）");
els.m1.value = "3";
const cD0b = api.calcCheck(api.readP(), api.calcQ(api.readP()));
near(cD0b.Ka, kaGen(90 + thD, 30, 0), 1e-12, "δ=0 但保留背坡时 Ka=0.2211（≠朗肯，因墙背倾斜）");
els.chkDelta.value = "20";
/* δ 须 ≤ φ：超出时按 φ 取用，且表中显示生效值（不是手填值） */
els.chkDelta.value = "40";
const cDov = api.calcCheck(api.readP(), api.calcQ(api.readP()));
near(cDov.dlDeg, 30, 1e-9, "δ=40° > φ=30° 时按 φ 取用（生效 δ=30°）");
near(cDov.Ka, kaGen(90 + thD, 30, 30), 1e-12, "δ 超限后 Ka 按 δ=30° 计算（而非 40°）");
api.renderCheck(api.readP(), api.calcQ(api.readP()));
isTrue(els.checkBody.innerHTML.indexOf("δ=30°≤φ")>=0 && els.checkBody.innerHTML.indexOf("δ=40°")<0,
       "结果表显示生效 δ=30°≤φ，不显示越界的 40°");
els.chkDelta.value = "20";
/* 结果表列出 EaV 及其力臂、ΣV 合计口径 */
api.renderCheck(api.readP(), api.calcQ(api.readP()));
const ckTbl2 = els.checkBody.innerHTML;
isTrue(ckTbl2.indexOf("土压力竖向分量 EaV")>=0, "竖向力段列出 EaV 分项（下段/上段分列）");
isTrue(ckTbl2.indexOf("EaV1")>=0 && ckTbl2.indexOf("EaV2")>=0, "竖向力段把 EaV 拆成下段 EaV1 与上段 EaV2");
isTrue(ckTbl2.indexOf("Ea1·cos(θ+δ)")>=0 && ckTbl2.indexOf("Ea1·sin(θ+δ)")>=0,
       "下段 EaH1/EaV1 分别标注 cos(θ+δ)、sin(θ+δ)");
isTrue(ckTbl2.indexOf("Ea2·cosδ")>=0 && ckTbl2.indexOf("Ea2·sinδ")>=0,
       "上段 EaH2/EaV2 分别标注 cosδ、sinδ（θ2=0）");
isTrue(ckTbl2.indexOf("α＝90°+θ")>=0, "下段行标注 Ka1 的墙背倾角 α＝90°+θ");
isTrue(ckTbl2.indexOf("Ka2＝")>=0 && ckTbl2.indexOf("α＝90°")>=0, "上段行标注 Ka2 与竖直墙 α＝90°");
isTrue(plainify(ckTbl2).indexOf("超载 q＝γs·h2")>=0, "下段行注明顶部等效超载 q＝γs·h2");
isTrue(ckTbl2.indexOf("已计入 ΣM稳")>=0, "K0 行注明 EaV 已计入 ΣM稳");
/* 顺桥向水平力段：Ka / Ea 上、下段计算公式紧随制动力 Hk 行（逐项可复核） */
/* 窗口 4000 字符（.mj 带 data-tex 属性，HTML 比纯文本长），返回纯文本便于字面量匹配 */
const rowOf = (html, name) => { const i = html.indexOf(name); return i<0 ? "" : plainify(html.slice(i, i+4000)); };
const iHk  = ckTbl2.indexOf("制动力 Hk</td>");
const iKa1 = ckTbl2.indexOf("Ka 下段（斜墙");
const iKa2 = ckTbl2.indexOf("Ka 上段（竖直墙");
const iEa1 = ckTbl2.indexOf("Ea 下段（梯形分布");
const iEa2 = ckTbl2.indexOf("Ea 上段（三角形分布");
const iEaH = ckTbl2.indexOf("土压力 EaH 下段（斜墙）");
isTrue(iHk>=0 && iHk<iKa1 && iKa1<iKa2 && iKa2<iEa1 && iEa1<iEa2 && iEa2<iEaH,
       "Ka/Ea 公式行紧接在制动力 Hk 行下方，顺序 Ka下→Ka上→Ea下→Ea上→EaH 分量");
const rKa1 = rowOf(ckTbl2, "Ka 下段（斜墙");
const rKa2 = rowOf(ckTbl2, "Ka 上段（竖直墙");
const rEa1 = rowOf(ckTbl2, "Ea 下段（梯形分布");
const rEa2 = rowOf(ckTbl2, "Ea 上段（三角形分布");
isTrue(rKa1.indexOf("Ka＝sin²(α+φ)／〔sin²α·sin(α−δ)·(1+√(sin(φ+δ)·sinφ／(sin(α−δ)·sinα)))²〕")>=0,
       "Ka 下段行给出库仑主动土压力系数通式（sin²(α+φ)／〔sin²α·sin(α−δ)·(1+√·)²〕）");
isTrue(rKa1.indexOf("α1＝90°+θ＝108.43°")>=0 && rKa1.indexOf("θ＝atan(1/m1)")>=0,
       "Ka 下段行标注 α1＝90°+θ、θ＝atan(1/m1) 及其数值");
isTrue(rKa1.indexOf(`＝${cE.Ka1.toFixed(4)}`)>=0,
       `Ka 下段行代入计算的 Ka1 与 calcCheck 一致（${cE.Ka1.toFixed(4)}）`);
isTrue(rKa2.indexOf("Ka＝cos²φ／〔cosδ·(1+√(sin(φ+δ)·sinφ／cosδ))²〕")>=0,
       "Ka 上段行把通式化到 α＝90° 的竖直墙形式（cos²φ／cosδ）");
isTrue(rKa2.indexOf(`＝${cE.Ka2.toFixed(4)}`)>=0,
       `Ka 上段行代入计算的 Ka2 与 calcCheck 一致（${cE.Ka2.toFixed(4)}）`);
isTrue(rEa1.indexOf("Ea1＝Ka1·(q·h1＋½γs·h1²)·B")>=0 && rEa1.indexOf("p(y)＝Ka1·(q＋γs·y)")>=0,
       "Ea 下段行给出梯形分布的合力公式（p(y)＝Ka1(q＋γs·y) 积分得 Ea1）");
isTrue(rEa1.indexOf("q＝γs·h2")>=0 && rEa1.indexOf(`×${cE.h1.toFixed(2)}²`)>=0 && rEa1.indexOf(`＝${cE.Ea1.toFixed(1)}`)>=0,
       `Ea 下段行代入 q、h1、B 与计算值（Ea1＝${cE.Ea1.toFixed(1)} kN）`);
isTrue(rEa2.indexOf("Ea2＝½·Ka2·γs·h2²·B")>=0 && rEa2.indexOf(`＝${cE.Ea2.toFixed(1)}`)>=0,
       `Ea 上段行给出三角形分布的合力公式与代入值（Ea2＝${cE.Ea2.toFixed(1)} kN）`);
isTrue(rKa1.indexOf("δ=20°≤φ")>=0, "Ka 下段行标注生效 δ≤φ");
/* ΣM稳 段：两段 EaV 的力臂也要有计算式 */
const rEaV1 = rowOf(ckTbl2, "土压力竖向分量 EaV（下段）");
const rEaV2 = rowOf(ckTbl2, "土压力竖向分量 EaV（上段）");
isTrue(rEaV1.indexOf("EaV1＝Ea1·sin(θ+δ)")>=0 && rEaV1.indexOf(`×sin(${cE.angDeg.toFixed(2)}°)`)>=0,
       "EaV 下段行给出 EaV1＝Ea1·sin(θ+δ) 及代入值");
isTrue(rEaV1.indexOf("基础前伸")>=0 && rEaV1.indexOf("＋t1")>=0 && rEaV1.indexOf("(H1−y1)/m1")>=0,
       "EaV 下段行的力臂展开为 前伸＋t1＋(H1−y1)/m1（墙背面在合力点高度的顺桥向位置）");
isTrue(rEaV1.indexOf(`＝${cE.EaV1.toFixed(1)} kN`)>=0 && rEaV2.indexOf(`＝${cE.EaV2.toFixed(1)} kN`)>=0,
       `两行 EaV 均给出代入后的数值（${cE.EaV1.toFixed(1)} / ${cE.EaV2.toFixed(1)} kN）`);
isTrue(rEaV2.indexOf("EaV2＝Ea2·sinδ")>=0 && rEaV2.indexOf("＋t1")>=0 && rEaV2.indexOf("帽梁后缘、背墙背面同面")>=0,
       "EaV 上段行的力臂展开为 前伸＋t1（竖直挡土面与帽梁后缘、背墙背面同面）");
/* 参数标签：δ 须 ≤ φ，并给出常用取值区间 */
isTrue(tpl.indexOf("须 ≤ φ")>=0 && tpl.indexOf("常取 δ=(1/2~2/3)φ")>=0,
       "参数标签注明 δ 须 ≤ φ 及常用取值 δ=(1/2~2/3)φ");
isTrue(/\.field\.wrap\s+\.hint\{/.test(tpl) && /<div class="hint">/.test(tpl),
       "长提示另起一行通栏显示（field.wrap + .hint），不被 nowrap 省略号截断");
els.chkDelta.value = "20";
/* 默认工况：自动制动力 165kN + 土压力 */
els.autoHk.checked = true;
const cAll = api.calcCheck(api.readP(), api.calcQ(api.readP()));
isTrue(cAll.Htot > 820 && cAll.Htot < 890, "默认工况 ΣH ≈ 165＋687 = 852kN（分段后比全高斜墙口径大 5%）");
isTrue(cAll.EaH > 3*cAll.Hk, "土压力水平分量约为制动力的 4 倍（默认工况）");
isTrue(cAll.okAll, "默认工况（自动制动力＋台后土压力）三项验算全部通过");
/* 基底承载力段：算式必须代入数值，且各步可逐位复算 */
api.renderCheck(api.readP(), api.calcQ(api.readP()));
const ckTbl3 = els.checkBody.innerHTML;
const d1 = x => x.toFixed(1), d2 = x => x.toFixed(2), d3 = x => x.toFixed(3), d5 = x => x.toFixed(5);
const s6All = 6*Math.abs(cAll.M)/(cAll.Wb*cAll.Lb*cAll.Lb);
/* 示意图与计算值必须一致（图注/尺寸线里的数字来自 calcCheck，不是手写常量） */
const dgAll = (els.checkBody.innerHTML.match(/<tr class="diagChk"><td colspan="5">[\s\S]*?<\/tr>/g) || []);
isTrue(dgAll.length === 6 && dgAll.every(r => r.indexOf("NaN") < 0),
       "默认工况下 6 张示意图全部生成且无 NaN 坐标");
isTrue((dgAll[0]||"").indexOf(`a合＝${d3(cAll.MsF/cAll.Vsum)}`) >= 0,
       "图 1 的合力点尺寸线数值 = ΣM稳/ΣV");
isTrue((dgAll[3]||"").indexOf(`ΣM稳＝${d1(cAll.MsF)} kN·m`) >= 0,
       "图 4 图注的 ΣM稳 与计算值一致");
isTrue((dgAll[4]||"").indexOf(`ΣM倾＝${d1(cAll.Mh)} kN·m`) >= 0 &&
       (dgAll[4]||"").indexOf(`K0＝ΣM稳/ΣM倾＝${d2(cAll.K0)}`) >= 0,
       "图 5 图注的 ΣM倾 与 K0 与计算值一致");
isTrue((dgAll[5]||"").indexOf(`p最大＝${d1(cAll.pMax)} kPa`) >= 0,
       "图 6 的 p最大 标注与计算值一致");
isTrue(ckTbl3.indexOf(`M＝M竖＋M水＝${d1(cAll.Mc)}＋${d1(cAll.Mh)}`)>=0,
       "弯矩行给出 M竖＋M水 的分项相加");
isTrue(ckTbl3.indexOf(`e＝|M|/N＝${d1(Math.abs(cAll.M))}/${d1(cAll.Vsum)}＝${d3(Math.abs(cAll.e))}`)>=0 &&
       ckTbl3.indexOf(`L/6＝${d2(cAll.Lb)}/6＝${d3(cAll.eLim)}`)>=0,
       "偏心距行代入数值：e=|M|/N 与限值 L/6");
isTrue(ckTbl3.indexOf(`p均＝N/A＝${d1(cAll.Vsum)}/(${d2(cAll.Wb)}×${d2(cAll.Lb)})＝${d1(cAll.Vsum)}/${d2(cAll.A)}`)>=0,
       "p均行代入数值：N/(B×L)");
isTrue(ckTbl3.indexOf(`＋${s6All.toFixed(4)}`)>=0 && ckTbl3.indexOf(`−${s6All.toFixed(4)}`)>=0,
       "p最大 / p最小 两行都给出偏心应力项 6|M|/(B·L²) 的数值（一加一减）");
isTrue(ckTbl3.indexOf(`${d1(cAll.Vsum)}/${d2(cAll.A)}`)>=0, "p均行把 A 展开为 14.00×8.00＝112.00 后再代入");
near(cAll.pMean + s6All, cAll.pMax, 1e-9, "所显示的 6|M|/(B·L²) 与 p最值之差一致（±" + s6All.toFixed(4) + "）");
isTrue(ckTbl3.indexOf("N/A，")<0, "承载力段不再出现 N/A 占位符");
/* 两个「合力作用点」的口径：一律按「距前趾的长度」，不依赖坐标原点 */
const SxAll = cAll.items.reduce((a,it)=>a + it.W*it.z, 0) + Number(els.Nk.value)*cAll.zN
            + cAll.EaV1*cAll.xEa1 + cAll.EaV2*cAll.xEa2;
const aBarAll = cAll.MsF/cAll.Vsum;
near(cAll.zbar, SxAll/cAll.Vsum, 1e-9, "竖向合力作用点坐标 = ΣWi·xi/ΣV（含 Nk 与 EaV 各按自身作用点）");
near(aBarAll, cAll.zbar - cAll.zF, 1e-9, "距前趾口径与坐标口径等价：ΣM稳/ΣV = zbar − zF");
isTrue(cAll.zF === 0 && Math.abs(cAll.zbar - aBarAll) < 1e-12,
       "原点＝基底前趾后两项合一：竖向合力点坐标值 3.699 就是它距前趾的距离");
near(aBarAll, 3.698861, 1e-6, "竖向合力点距前趾 = 50676.5/13700.6 = 3.699");
isTrue(ckTbl3.indexOf(`ΣVi·ai/ΣV＝${d1(cAll.MsF)}/${d1(cAll.Vsum)}`)>=0,
       "表内给出竖向合力作用点的距离口径代入值（ΣM稳/ΣV），不再用坐标");
isTrue(ckTbl3.indexOf(`距后趾 ${d3(cAll.Lb - aBarAll)}`)>=0,
       "表内给出距后趾 4.301（3.699＋4.301 = L = 8.000）");
isTrue(ckTbl3.indexOf("基底形心距前趾")>=0 &&
       ckTbl3.indexOf(`L/2＝${d2(cAll.Lb)}/2＝${d2(cAll.Lb/2)}`)>=0,
       "形心按 L/2 计：8.00/2 = 4.000（新原点下坐标 4.000 与距前趾距离完全一致）");
near(cAll.Lb/2, 4.0, 1e-12, "基底形心距前趾 = L/2 = 4.000");
isTrue(ckTbl3.indexOf("x前趾＋x后趾")<0 && ckTbl3.indexOf("x形心")<0,
       "承载力段不再出现坐标式形心算式");
isTrue(ckTbl3.indexOf(`M竖＝ΣV·L/2−ΣVi·ai＝${d1(cAll.Vsum)}×${d2(cAll.Lb/2)}−${d1(cAll.MsF)}`)>=0,
       "弯矩行按长度口径展开：ΣV·L/2 − ΣVi·ai");
near(cAll.Vsum*cAll.Lb/2 - cAll.MsF, cAll.Mc, 1e-9,
     "M竖 = ΣV·L/2 − ΣM稳 = 54802.3 − 50676.5 = 4125.8（与坐标口径 ΣV(x形心−x合力) 等价）");
isTrue(ckTbl3.indexOf(`L/2−e＝${d3(cAll.Lb/2)}−${d3(Math.abs(cAll.e))}`)>=0,
       "表内给出基底反力合力作用点 = L/2 − e");
near(cAll.Lb/2 - cAll.e, 3.451369, 1e-6,
     "基底反力合力点距前趾 = 4.000 − 0.549 = 3.451（与竖向合力点 3.699 不是同一个点）");
near(Math.abs(aBarAll - (cAll.Lb/2 - cAll.e)), cAll.Mh/cAll.Vsum, 1e-9,
     "两点之差恰为水平力折算的偏心 M水/ΣV = 0.2475");
els.autoHk.checked = false; els.Hk.value = "100";

if(process.env.DUMP){
  const k = ["Vsum","zbar","zc","Wb","Lb","A","Mc","Mh","M","e","eLim","pMean","pMax","pMin","MsF","K0","Kc"];
  console.log("DUMP " + k.map(x => x + "=" + (v => isFinite(v) ? v.toFixed(8) : "?") (cAll[x])).join(" "));
  if(process.env.DUMP === "items"){
    console.log("ITEMS  zc=" + cAll.zc.toFixed(4) + "  zF=" + cAll.zF.toFixed(4) + "  zB=" + cAll.zB.toFixed(4));
    cAll.items.forEach(it => console.log(
      "  " + String(it.n || it.name || "?").padEnd(10) +
      " W=" + it.W.toFixed(3).padStart(10) +
      " x=" + it.z.toFixed(4).padStart(8) +
      " W*x=" + (it.W*it.z).toFixed(1).padStart(11) +
      " arm=" + (it.z - cAll.zF).toFixed(4).padStart(8) +
      " M稳=" + (it.W*(it.z - cAll.zF)).toFixed(1).padStart(11)));
    console.log("  Nk        W=" + els.Nk.value + " x=" + cAll.zN.toFixed(4) +
      "  EaV1 x=" + cAll.xEa1.toFixed(4) + " EaV2 x=" + cAll.xEa2.toFixed(4));
  }
}

/* ===== 公式排版（MathJax：TeX 一份源，页面显示 SVG，导出 Word 转 OMML） ===== */
const tp = api.texPlain;
isTrue(tp("E_{a1}\\cdot\\cos(\\theta+\\delta)") === "Ea1·cos(θ+δ)", "texPlain：希腊字母/上下标/乘号还原为 Ea1·cos(θ+δ)");
isTrue(tp("p_{\\text{均}}=\\frac{N}{A}") === "p均＝N/A", "texPlain：中文下标与简单分式还原为 p均＝N/A");
isTrue(tp("\\frac{6\\left|M\\right|}{B\\cdot L^{2}}") === "6|M|/(B·L²)", "texPlain：复合分式自动加括号、^{2} 还原为上标 ²");
isTrue(tp("\\alpha=90^{\\circ}+\\theta") === "α＝90°+θ", "texPlain：度数与全角等号（+ 保持半角，与表内 sin(θ+δ) 一致）");
isTrue(tp("\\sqrt{\\frac{a}{b}}") === "√(a/b)", "texPlain：根号内分式可解析");
isTrue(tp("q=\\gamma_{s}\\cdot h_{2}") === "q＝γs·h2", "texPlain：控制词后的空格被吃掉（q＝γs·h2）");
const mjSample = api.M("K_{a1}=0.1829");
isTrue(mjSample.indexOf('<span class="mj" data-tex="K_{a1}=0.1829">') === 0 &&
       mjSample.indexOf("</span>") > 0, "M() 产出 .mj + data-tex（TeX 源）");
isTrue(mjSample.indexOf("Ka1＝0.1829") > 0, "M() 内的降级文本可直接阅读（无 MathJax 时也不露控制符）");
const ckTblMJ = els.checkBody.innerHTML;
const nMJspan = (ckTblMJ.match(/class="mj" data-tex=/g) || []).length;
isTrue(nMJspan >= 60, `验算表把计算式全部转为行内公式（.mj 数 = ${nMJspan} ≥ 60）`);
const texList = [];
ckTblMJ.replace(/data-tex="([^"]*)"/g, (m0, t) => { texList.push(t); return m0; });
isTrue(texList.length === nMJspan, "每个公式元素都带 data-tex 源（数量一致）");
let badTex = 0, badPlain = 0;
texList.forEach(t => {
  if (!t || (t.match(/\{/g)||[]).length !== (t.match(/\}/g)||[]).length) badTex++;   /* 空源或花括号不配对 */
  const p = tp(t);
  if (p.indexOf("\\") >= 0 || p.indexOf("{") >= 0 || p.indexOf("}") >= 0) badPlain++;
});
isTrue(badTex === 0, "所有 TeX 源非空且花括号配对（MathJax 解析不会因括号失衡报错）");
isTrue(badPlain === 0, "所有降级文本都不含反斜杠/花括号（无 MathJax 环境也干净）");
isTrue(ckTblMJ.indexOf("mjx-container") < 0, "无头环境不注入 MathJax 产物，仅保留降级文本（typeset 由浏览器完成）");
isTrue(typeof api.exportWord === "function" && typeof api.zipStore === "function" &&
       typeof api.texToOmml === "function", "导出 Word 链路函数齐备（exportWord / zipStore / texToOmml）");
isTrue(api.crc32(new TextEncoder().encode("123456789")) === 0xCBF43926, "CRC32 与标准测试向量一致（0xCBF43926）");
const zipProbe = api.zipStore([{name: "a.txt", data: new TextEncoder().encode("hi")}]);
isTrue(zipProbe[0] === 0x50 && zipProbe[1] === 0x4B && zipProbe[2] === 0x03 && zipProbe[3] === 0x04,
       "zipStore 输出以 PK\\x03\\x04 开头（合法 ZIP 本地文件头）");
isTrue(tpl.indexOf('id="xslMml2Omml"') > 0 && tpl.indexOf("/*__MATHJAX__*/") > 0 &&
       tpl.indexOf("/*__MML2OMML__*/") > 0, "模板保留 MathJax 与 MML2OMML 注入点");

/* ===== 可读性：公式字号 +1px、颜色转为正文色；导出按钮移到验算表标题最右侧 ===== */
const cssMJ = (tpl.match(/\.mj\{[^}]*\}/) || [""])[0];
isTrue(/font-size:\s*calc\(1em \+ 1px\)/.test(cssMJ), "行内公式字号比所在单元格大 1px（calc(1em + 1px)）");
isTrue(/color:\s*var\(--ink\)/.test(cssMJ), "行内公式改用正文色 --ink（不再继承次级灰而发虚）");
isTrue(/td\.fx\{color:#334155/.test(tpl), "计算式列灰字由 #64748b 加深到 #334155，与公式对比度接近");
const cssBtnHd = (tpl.match(/\.card h2 \.btnHd\{[^}]*\}/) || [""])[0];
isTrue(/margin-left:auto/.test(cssBtnHd), "标题栏按钮靠右（margin-left:auto，位于标题最右侧）");
const hdChk = (tpl.match(/<h2>稳定与承载力验算（标准值组合）[\s\S]{0,400}?<\/h2>/) || [""])[0];
isTrue(hdChk.indexOf("导出.docx验算书") >= 0, "导出按钮文案为「导出.docx验算书」且位于验算表标题内");
isTrue(/onclick="exportWord\(\)"/.test(hdChk), "标题栏导出按钮仍调用 exportWord()");
isTrue(hdChk.indexOf('class="btnHd no-print"') >= 0 && /\.btn,\.no-print\{display:none;\}/.test(tpl),
       "标题栏按钮带 no-print：打印时不输出按钮");
isTrue(tpl.slice(0, tpl.indexOf('id="view3d"')).indexOf("exportWord") < 0, "页头不再保留「导出Word（公式可编辑）」按钮");
isTrue(tpl.indexOf('a.download = proj + "-验算书.docx"') > 0, "下载文件名为「项目名-验算书.docx」，与按钮文案一致");

/* ===== 标高基准：与坐标原点同面（基础底面 = 0.000） ===== */
isTrue(tpl.indexOf("基础底面(标高0.000") > 0, "高程基准输入框说明：基础底面(标高0.000)，与坐标原点同面");
isTrue(tpl.indexOf("const zB = q.fdT || 0") > 0, "标高标注以基础总厚 zB 折算（场景竖坐标 → 基底基准）");
isTrue(tpl.indexOf("ft(z + zB, 3)") > 0 && tpl.indexOf("ft(z + zB + ea, 3)") > 0,
       "相对标高 = z + 基础总厚；绝对标高 = 相对 + 高程基准（基础底 ▽0.000、前墙底 = 基础总厚）");
isTrue(tpl.indexOf("zb = -(q.fdT || 0)") > 0, "标高基准十字标记落在基础底面（z = −基础总厚，与坐标原点同面）");
isTrue(tpl.indexOf("标高以基础底面") > 0 && tpl.indexOf("标高仍以前墙底") < 0, "页面说明与 CSV 表头同步为「标高以基础底面 = 0.000」，无旧口径残留");
api.rebuild();
const pEL = api.readP(), qEL = api.calcQ(pEL);
near(parseFloat(els.nbTopShow.value), qEL.nbTop + qEL.fdT, 1e-3, "牛腿顶面标高按基底基准显示（= nbTop + 基础总厚）");
console.log(`\n=== 结果: ${pass} PASS, ${fail} FAIL ===`);
process.exit(fail?1:0);
