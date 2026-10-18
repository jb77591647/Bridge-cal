/* 提取桥墩页工程量表开挖行计算式（复用 pier_harness 桩，截断到 renderTable 后） */
const fs = require("fs"), path = require("path");
let src = fs.readFileSync(path.join(__dirname, "pier_harness.js"), "utf8");
const cut = src.indexOf("/* ===== 工况A");
src = src.slice(0, cut) + `
api.renderTable(api.readP(), api.calcQ(api.readP()));
const t = els.resultBody.innerHTML;
t.split("<tr").filter(r=>r.indexOf("开挖")>=0).forEach(r=>{
  const m = r.match(/class="fx">([\\s\\S]*?)<\\/td>/);
  if(m) console.log(m[1]);
});
`;
eval(src);
