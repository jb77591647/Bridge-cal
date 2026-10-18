const fs = require("fs");
const path = require("path");
const dir = __dirname;
function build(tplName, outName){
  const tpl = fs.readFileSync(path.join(dir, tplName), "utf8");
  if (!tpl.includes("/*__THREE__*/")) throw new Error(tplName + ": marker missing");
  const lib = fs.readFileSync(path.join(dir, "three_clean.js"), "utf8");
  if (lib.includes("</script") || lib.includes("<!--")) throw new Error("lib unsafe");
  const out = tpl.replace("/*__THREE__*/", () => lib);
  fs.writeFileSync(path.join(dir, "..", outName), out);
  console.log(outName, "OK bytes =", out.length);
}
build("app_template.html", "U型桥台三维参数化模型.html");
build("pier_template.html", "桥墩三维参数化模型.html");
