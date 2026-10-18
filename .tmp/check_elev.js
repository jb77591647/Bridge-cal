/* 验证相对/绝对标高双开关的标签生成 */
const fs = require("fs");
let src = fs.readFileSync(__dirname + "/check_exdims.js", "utf8");
src = src.replace("els.showLabels.checked = true; els.exGround.checked = true; els.exSoil.checked = true; els.exRock.checked = true;",
  "els.showLabels.checked = false; els.exGround.checked = false; els.exSoil.checked = false; els.exRock.checked = false;");
src = src.replace('app += ";global.__api={readP,calcQ,renderTable,buildModel};global.__get=()=>({g:group,labelGroup});";',
  'app += ";global.__api={readP,calcQ,renderTable,buildModel};global.__get=()=>({g:group,labelGroup,labelSprites});";');
src = src.replace(/run\("[^"]+"[^;]*;/gs, "");
src += `
els.showEL.checked = true; els.showELa.checked = false;
api.buildModel(api.readP(), api.calcQ(api.readP()));
console.log("仅相对:", global.__get().labelSprites.length, "个(期望6)");
els.showEL.checked = false; els.showELa.checked = true;
api.buildModel(api.readP(), api.calcQ(api.readP()));
console.log("仅绝对:", global.__get().labelSprites.length, "个(期望6)");
els.showEL.checked = true;
api.buildModel(api.readP(), api.calcQ(api.readP()));
console.log("双开:", global.__get().labelSprites.length, "个(期望12)");
console.log("标高开关验证完成");
`;
eval(src);
