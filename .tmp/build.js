const fs = require("fs");
const path = require("path");
const dir = __dirname;
/* 单文件产物：把 three.js / MathJax / MML2OMML.XSL 内嵌进模板，保证离线可用 */
function stripXslComments(x){
  /* 剥离 XSL 注释：避免 <!-- 触发 HTML 的 script-data-escaped 状态 */
  return x.replace(/<!--[\s\S]*?-->/g, "");
}
function inject(tpl, marker, payload, name, required){
  if (!tpl.includes(marker)) {
    if (required) throw new Error(name + ": marker " + marker + " missing");
    return tpl;               /* 该模板不需要此资源（如桥墩页无公式排版） */
  }
  if (payload.includes("</script")) throw new Error(name + ": payload contains </script");
  return tpl.replace(marker, () => payload);
}
function build(tplName, outName){
  let tpl = fs.readFileSync(path.join(dir, tplName), "utf8");
  const lib = fs.readFileSync(path.join(dir, "three_clean.js"), "utf8");
  if (lib.includes("</script") || lib.includes("<!--")) throw new Error("lib unsafe");
  tpl = inject(tpl, "/*__THREE__*/", lib, "three", true);
  const mjPath = path.join(dir, "mathjax_tex_svg.js");
  if (fs.existsSync(mjPath)) {
    tpl = inject(tpl, "/*__MATHJAX__*/", fs.readFileSync(mjPath, "utf8").trim(), "mathjax", false);
  }
  const xslPath = path.join(dir, "mml2omml.xsl");
  if (fs.existsSync(xslPath)) {
    const xsl = stripXslComments(fs.readFileSync(xslPath, "utf8")).trim();
    /* 去掉 XML 声明，XSLTProcessor 用 DOMParser 解析时不能带前导声明外的空白 */
    const noDecl = xsl.replace(/^<\?xml[^>]*\?>\s*/, "");
    tpl = inject(tpl, "/*__MML2OMML__*/", noDecl, "xsl", false);
  }
  fs.writeFileSync(path.join(dir, "..", outName), tpl);
  console.log(outName, "OK bytes =", tpl.length);
}
build("app_template.html", "U型桥台三维参数化模型.html");
build("pier_template.html", "桥墩三维参数化模型.html");
