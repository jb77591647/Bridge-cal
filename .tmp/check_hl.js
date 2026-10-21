/* 参数高亮校验：每个参数的高亮包围盒必须落在模型附近，且关键参数尺寸与公式一致 */
const fs = require("fs");
const path = require("path");

function makeCheck(harnessFile, label, expects){
  let src = fs.readFileSync(path.join(__dirname, harnessFile), "utf8");
  src = src.replace(/global\.__api=\{/, "global.__api={hlRef:()=>hlGroup,paramHl:()=>PARAM_HL,hlSet:(id)=>{hlActive=id;showHl(id);},");
  const cutA = src.search(/\/\* =+ 工况/);
  const cutB = src.indexOf("api.renderTable(api.readP()");
  const cut = cutA > 0 ? cutA : cutB;
  if(cut > 0) src = src.slice(0, cut);
  src += `
const p0 = api.readP(), q0 = api.calcQ(p0);
api.buildModel(p0, q0);
const sceneBox = new THREE.Box3().setFromObject(api.groupRef());
const pad = 2.0;
const ids = Object.keys(api.paramHl());
let bad = [];
for(const id of ids){
  api.hlSet(id);
  const hl = api.hlRef();
  const def = api.paramHl()[id](p0, q0);
  if(!def){ continue; }                       /* 不适用（如未设二层基础） */
  if(!hl){ bad.push(id + ":无高亮"); continue; }
  const b = new THREE.Box3().setFromObject(hl);
  if(b.isEmpty()){ bad.push(id + ":空包围盒"); continue; }
  if(b.min.x < sceneBox.min.x - pad || b.max.x > sceneBox.max.x + pad ||
     b.min.y < sceneBox.min.y - pad || b.max.y > sceneBox.max.y + pad ||
     b.min.z < sceneBox.min.z - pad || b.max.z > sceneBox.max.z + pad)
    bad.push(id + ":超出模型范围 " + [b.min.x,b.max.x,b.min.y,b.max.y,b.min.z,b.max.z].map(v=>v.toFixed(2)).join("/"));
  let nCyl = 0; hl.traverse(o=>{ if(o.isMesh) nCyl++; });
  if(nCyl === 0) bad.push(id + ":无实体高亮");
  console.log("  " + (bad.some(s=>s.indexOf(id+":")===0) ? "BAD " : "OK  ") + id.padEnd(8) +
    " bbox x[" + b.min.x.toFixed(2) + "," + b.max.x.toFixed(2) +
    "] y[" + b.min.y.toFixed(2) + "," + b.max.y.toFixed(2) +
    "] z[" + b.min.z.toFixed(2) + "," + b.max.z.toFixed(2) + "] n=" + nCyl);
}
isTrue(bad.length === 0, "${label} 全部高亮均落在模型范围内且非空" + (bad.length ? "（问题:" + bad.join("; ") + "）" : ""));

/* 关键尺寸断言 */
const nearHL = (a, b, tol, name) => isTrue(Math.abs(a - b) <= tol, name + " 实际=" + a.toFixed(3) + " 期望=" + b.toFixed(3));
function bbOf(id){ api.hlSet(id); const h = api.hlRef(); return h ? new THREE.Box3().setFromObject(h) : null; }
${expects}
api.hlSet(null);
isTrue(!api.hlRef(), "失焦后高亮清空");
p0b = api.readP(); api.buildModel(p0b, api.calcQ(p0b));
isTrue(!api.hlRef(), "rebuild 后无高亮（未聚焦）");
api.hlSet("__none__");
isTrue(!api.hlRef(), "未映射 id 不产生高亮");
console.log("=== ${label} 参数高亮: " + pass + " PASS, " + fail + " FAIL ===");
if(fail) process.exit(1);
`;
  eval(src);
  var p0b;
}

const pierExpects = `
let b = bbOf("fh1");
nearHL(b.max.z - b.min.z, 1, 0.45, "桥墩 fh1 高亮竖向跨=fh1(仅竖棱)");
nearHL(b.max.x - b.min.x, 3.5, 0.45, "桥墩 fh1 高亮纵向跨=一层边长a1");
b = bbOf("Hp");
nearHL(b.max.z - b.min.z, 8, 0.45, "桥墩 Hp 高亮竖向跨=H(仅四条竖棱)");
nearHL(b.max.x - b.min.x, 2.5, 0.45, "桥墩 Hp 高亮纵向跨=Lp");
b = bbOf("Lp");
nearHL(b.max.x - b.min.x, 2.5, 0.45, "桥墩 Lp 高亮纵向跨=Lp");
nearHL(b.max.z - b.min.z, 8, 0.45, "桥墩 Lp 高亮竖向跨=H");
b = bbOf("Wp");
nearHL(b.max.y - b.min.y, 6, 0.45, "桥墩 Wp 高亮横向跨=Wp");
b = bbOf("c1");
nearHL(b.max.x - b.min.x, 3.5, 0.45, "桥墩 c1 高亮外轮廓=一层边长(纵)");
nearHL(b.max.y - b.min.y, 7, 0.45, "桥墩 c1 高亮外轮廓=一层边长(横)");
b = bbOf("excW");
nearHL(b.max.y - b.min.y, 8, 0.45, "桥墩 excW 坑底宽=基础宽+2c");
b = bbOf("excH");
nearHL(b.max.z - b.min.z, 3, 0.45, "桥墩 excH 竖向跨=H挖");
nearHL(b.max.x - b.min.x, 0, 0.2, "桥墩 excH 高亮仅一条竖直量线(无水平轮廓)");
nearHL(b.min.z, -1, 0.25, "桥墩 excH 竖线起点=坑底(基础底)");
b = bbOf("excHs");
nearHL(b.max.z - b.min.z, 1, 0.45, "桥墩 excHs 竖向跨=土方高度");
nearHL(b.max.x - b.min.x, 0, 0.2, "桥墩 excHs 高亮仅一条竖直量线");
nearHL(b.min.z, 1, 0.25, "桥墩 excHs 竖线起点=土石分界");
b = bbOf("excHr");
nearHL(b.max.z - b.min.z, 2, 0.45, "桥墩 excHr 竖向跨=石方高度");
nearHL(b.max.x - b.min.x, 0, 0.2, "桥墩 excHr 高亮仅一条竖直量线");
nearHL(b.min.z, -1, 0.25, "桥墩 excHr 竖线起点=坑底");
b = bbOf("excHst");
nearHL(b.max.z - b.min.z, 5, 0.45, "桥墩 excHst 无平台时示意高度=h分");
b = bbOf("excB");
nearHL(b.max.z - b.min.z, 0.4, 0.45, "桥墩 excB 无平台时水平示意");
b = bbOf("caph");
nearHL(b.max.z - b.min.z, 1.2, 0.45, "桥墩 caph 高亮竖向跨=盖梁高 hc");
nearHL(b.max.x - b.min.x, 2.5, 0.45, "桥墩 caph 高亮纵向跨=盖梁宽 bc");
b = bbOf("capb");
nearHL(b.max.x - b.min.x, 2.5, 0.45, "桥墩 capb 高亮纵向跨=bc");
nearHL(b.max.y - b.min.y, 7, 0.45, "桥墩 capb 高亮横向跨=Lc");
b = bbOf("cape");
nearHL(b.max.y - b.min.y, 0.5, 0.45, "桥墩 cape 高亮横向跨=悬出 ec");
b = bbOf("useCap");
nearHL(b.max.y - b.min.y, 7, 0.45, "桥墩 useCap 高亮=整个盖梁 Lc");
nearHL(b.max.z, 9.2, 0.5, "桥墩 useCap 高亮顶面=H+hc");
b = bbOf("elAbs");
nearHL(b.max.x - b.min.x, 1.2, 1e-6, "桥墩 elAbs 原点十字臂长");
/* fh2：勾选二层基础后，高亮应为二层基础四个角点的竖直棱 */
els.useFd2.checked = true;
const p2 = api.readP(), q2 = api.calcQ(p2);
api.buildModel(p2, q2);
b = bbOf("fh2");
nearHL(b.max.z - b.min.z, 1, 0.45, "桥墩 fh2 高亮竖向跨=fh2(仅竖棱)");
nearHL(b.max.x - b.min.x, 4.5, 0.45, "桥墩 fh2 高亮纵向跨=二层边长a2");
nearHL(b.min.z, -2, 0.45, "桥墩 fh2 高亮位于一层顶以下(fh1+fh2)");
els.useFd2.checked = false;
`;

const abutExpects = `
let b = bbOf("W");
nearHL(b.max.y - b.min.y, 12, 0.45, "桥台 W 高亮横向跨=W");
nearHL(b.max.z - b.min.z, 0, 0.45, "桥台 W 高亮位于前墙底边(水平单线)");
nearHL(b.max.x - b.min.x, 0, 0.45, "桥台 W 高亮位于前墙前缘(x=0 立面)");
b = bbOf("L2");
nearHL(b.max.x - b.min.x, 6, 0.45, "桥台 L2 高亮顺桥向跨=B(前墙前缘→台尾)");
b = bbOf("H1");
nearHL(b.max.z - b.min.z, 5, 0.45, "桥台 H1 高亮竖向跨=H1");
b = bbOf("fd1Zf");
nearHL(Math.abs(b.max.x - b.min.x), 0.9, 0.45, "桥台 zf1 高亮顺桥向跨=前襟边(zF1→前缘)");
b = bbOf("fd1X");
nearHL(b.max.y - b.min.y, 1.0, 0.45, "桥台 x1 高亮横向跨=横襟边");
b = bbOf("excW");
nearHL(b.max.y - b.min.y, 15, 0.45, "桥台 excW 坑底宽=fd宽+2c");
nearHL(Math.abs(b.max.z - b.min.z), 0.4, 0.45, "桥台 excW 位于基础底面水平");
b = bbOf("excH");
nearHL(b.max.z - b.min.z, 3, 0.45, "桥台 excH 竖向跨=H挖");
nearHL(b.max.x - b.min.x, 0, 0.25, "桥台 excH 高亮仅一条竖直量线");
b = bbOf("excHs");
nearHL(b.max.z - b.min.z, 1, 0.45, "桥台 excHs 竖向跨=土方高度");
nearHL(b.max.x - b.min.x, 0, 0.25, "桥台 excHs 高亮仅一条竖直量线");
b = bbOf("excHr");
nearHL(b.max.z - b.min.z, 2, 0.45, "桥台 excHr 竖向跨=石方高度");
nearHL(b.max.x - b.min.x, 0, 0.25, "桥台 excHr 高亮仅一条竖直量线");
b = bbOf("excHst");
nearHL(b.max.z - b.min.z, 5, 0.45, "桥台 excHst 竖向跨=分级高度");
nearHL(b.max.x - b.min.x, 0, 0.25, "桥台 excHst 高亮仅一条竖直量线");
b = bbOf("capCant");
nearHL(b.max.x - b.min.x, 0.1, 0.4, "桥台 ec 高亮顺桥向跨=ec(帽梁超出前墙长度)");
nearHL(b.max.z - b.min.z, 0, 0.4, "桥台 ec 高亮位于帽梁底面(前墙顶)");
b = bbOf("t2");
nearHL(b.max.y - b.min.y, 0.5, 0.45, "桥台 t2 高亮横向跨=t2");
b = bbOf("bwT");
nearHL(Math.abs(b.max.x - b.min.x), 0.5, 0.45, "桥台 tb 高亮顺桥向跨=背墙厚");
/* 一层基础：四角竖棱 */
b = bbOf("fd1H");
nearHL(b.max.z - b.min.z, 1, 0.45, "桥台 fd1H 竖向跨=一层厚度(仅竖棱)");
nearHL(b.max.x - b.min.x, 8, 0.45, "桥台 fd1H 顺桥向跨=基础总长");
nearHL(b.max.y - b.min.y, 14, 0.45, "桥台 fd1H 横向跨=基础总宽");
/* 二层基础：勾选后四角竖棱 */
els.useFd2.checked = true;
const pa = api.readP(), qa = api.calcQ(pa);
api.buildModel(pa, qa);
b = bbOf("fd2H");
nearHL(b.max.z - b.min.z, 1, 0.45, "桥台 fd2H 竖向跨=二层厚度(仅竖棱)");
nearHL(b.max.x - b.min.x, 10, 0.45, "桥台 fd2H 顺桥向跨=二层基础总长");
nearHL(b.min.z, -2, 0.25, "桥台 fd2H 竖棱下沿=二层底");
els.useFd2.checked = false;
/* 牛腿：三条量线（顶面顺桥向= b腿、外端竖面= h端、根部竖向= h腋） */
b = bbOf("nbG");
nearHL(b.max.z - b.min.z, 0.3, 0.25, "桥台 nbG 高亮竖向跨=h槽(背墙顶→牛腿顶面)");
nearHL(b.max.x - b.min.x, 0, 0.25, "桥台 nbG 位于背墙背面");
b = bbOf("nbL");
nearHL(b.max.y - b.min.y, 7, 0.25, "桥台 nbL 高亮横向跨=L腿(以帽梁中心对称)");
nearHL(b.max.x - b.min.x, 0, 0.25, "桥台 nbL 位于牛腿顶面一条横向量线");
b = bbOf("nbB");
nearHL(b.max.x - b.min.x, 0.3, 0.25, "桥台 nbB 高亮顺桥向跨=b腿");
nearHL(b.max.z - b.min.z, 0, 0.25, "桥台 nbB 位于牛腿顶面(水平量线)");
nearHL(b.max.y - b.min.y, 0, 0.25, "桥台 nbB 位于台帽端部(横向单线)");
b = bbOf("nbHt");
nearHL(b.max.z - b.min.z, 0.3, 0.25, "桥台 nbHt 高亮竖向跨=牛腿高度0.3(外端竖面)");
nearHL(b.max.x - b.min.x, 0, 0.25, "桥台 nbHt 位于牛腿外端竖面");
b = bbOf("nbA");
nearHL(b.max.z - b.min.z, 0.3, 0.25, "桥台 nbA 高亮竖向跨=h腋(根部截面变化段)");
nearHL(b.max.x - b.min.x, 0, 0.25, "桥台 nbA 位于根部下缘(贴背墙背面)");
`;

makeCheck("pier_harness.js", "桥墩", pierExpects);
console.log("---");
makeCheck("harness.js", "桥台", abutExpects);
