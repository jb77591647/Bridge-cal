/* 验证桥墩页相对/绝对标高双开关的标签生成（数量、位置、外移、part 归属） */
const fs = require("fs");
const path = require("path");
let src = fs.readFileSync(path.join(__dirname, "pier_harness.js"), "utf8");
src = src.replace(
  'global.__api={readP,calcQ,calcCheck,buildModel,renderTable,renderCheck,rebuild,setScene:(s)=>{scene=s;},groupRef:()=>group};',
  'global.__api={readP,calcQ,calcCheck,buildModel,renderTable,renderCheck,rebuild,setScene:(s)=>{scene=s;},groupRef:()=>group,labelSpritesRef:()=>labelSprites};');
src = src.split("/* ===== 工况A")[0];   /* 保留桩与工具函数，去掉工况测试 */

src += `
let p0 = api.readP(), q0 = api.calcQ(p0);

/* 场景1：单层基础+盖梁，仅相对标高 → 基础底/墩底/墩顶/盖梁顶 共4个 */
els.showEL.checked = true; els.showELa.checked = false;
api.buildModel(p0, q0);
let sp = api.labelSpritesRef();
isTrue(sp.length===4, "单层基础+盖梁 仅相对: 标签数=4 实际=" + sp.length);
isTrue(sp.every(s=>s.userData.part), "标签均带 part 归属");
isTrue(sp.some(s=>s.userData.part==="fd1") && sp.filter(s=>s.userData.part==="pier").length===2 &&
  sp.filter(s=>s.userData.part==="cap").length===1,
  "part 归属：基础底=fd1，墩底/墩顶=pier，盖梁顶=cap");

/* 场景2：仅绝对标高 → 4个，y 不外移 */
els.showEL.checked = false; els.showELa.checked = true;
api.buildModel(p0, q0);
sp = api.labelSpritesRef();
isTrue(sp.length===4, "单层基础+盖梁 仅绝对: 标签数=4 实际=" + sp.length);
let ys = sp.map(s=>s.position.y);
isTrue(Math.min(...ys) === Math.max(...ys), "仅绝对时同一列(y无外移)");

/* 场景3：双开 → 8个，绝对列 y=相对列+2.4，z 相同 */
els.showEL.checked = true; els.showELa.checked = true;
api.buildModel(p0, q0);
sp = api.labelSpritesRef();
isTrue(sp.length===8, "双开: 标签数=8 实际=" + sp.length);
const zc = {};
sp.forEach(s=>{ const k=s.position.z.toFixed(6); (zc[k]=zc[k]||[]).push(s.position.y); });
let pairsOk = true, nPairs = 0;
for(const k in zc){
  const ys2 = zc[k].sort((a,b)=>a-b);
  if(ys2.length!==2) continue;
  nPairs++;
  if(Math.abs((ys2[1]-ys2[0]) - 2.4) > 1e-6) pairsOk = false;
}
isTrue(nPairs===4 && pairsOk, "双开时绝对列相对列外移2.4（z成对，共4对）");
const zs = Object.keys(zc).map(Number).sort((a,b)=>a-b);
isTrue(zs.length===4 && Math.abs(zs[0]-(-q0.fdT+0.3))<1e-6 && Math.abs(zs[1]-0.3)<1e-6 &&
  Math.abs(zs[2]-(p0.H+0.3))<1e-6 && Math.abs(zs[3]-(p0.H+p0.caph+0.3))<1e-6,
  "标签 z 位置：基础底/墩底/墩顶/盖梁顶 各+0.3");

/* 场景4：两层基础，双开 → 一层顶加入，共 5项×2=10个 */
els.useFd2.checked = true;
p0 = api.readP(); q0 = api.calcQ(p0);
api.buildModel(p0, q0);
sp = api.labelSpritesRef();
isTrue(sp.length===10, "两层基础 双开: 标签数=10 实际=" + sp.length);
isTrue(sp.filter(s=>s.userData.part==="fd1").length===2 && sp.filter(s=>s.userData.part==="fd2").length===2,
  "part 归属：基础底=fd2，一层顶=fd1");
els.useFd2.checked = false;

/* 场景5：勾掉盖梁 → 回到 3 个（基础底/墩底/墩顶），无 cap 标签 */
els.useCap.checked = false;
p0 = api.readP(); q0 = api.calcQ(p0);
api.buildModel(p0, q0);
sp = api.labelSpritesRef();
isTrue(sp.length===6 && sp.filter(s=>s.userData.part==="cap").length===0,
  "不设盖梁时双开标签数=3项×2=6 且无 cap 归属 实际=" + sp.length);
els.useCap.checked = true;

console.log("=== 标高验证: " + pass + " PASS, " + fail + " FAIL ===");
if(fail) process.exit(1);
`;
eval(src);
