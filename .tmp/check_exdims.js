/* 无头验证：开挖尺寸标注在多种工况下构建不报错，并统计 exR/exS 标注数量 */
const fs = require("fs"), path = require("path");
const dir = __dirname;
const tpl = fs.readFileSync(dir + "/app_template.html", "utf8");
const lib = fs.readFileSync(dir + "/three_clean.js", "utf8");
let app = tpl.match(/<script>\s*\/\*__THREE__\*\/<\/script>\s*<script>([\s\S]*?)<\/script>/)[1];
const vals0 = {Wf:"24",H1:"5",t1:"1.2",m1:"3",W:"12",Hs:"6.5",t2:"0.5",L2:"6",m2:"0",m3:"3",elAbs:"146",
  capH:"0.6",capCant:"0.1",capWid:"1.3",bwT:"0.5",bwH:"0.9",
  fd1H:"1",fd1X:"1",fd1Zf:"1",fd1Zb:"1",fd2H:"1",fd2X:"1",fd2Zf:"1",fd2Zb:"1",
  capLshow:"",bwLshow:"",t1bshow:"",swUpHshow:"",swTopWshow:"",swBotWshow:"",swLowTopWshow:"",swLowTopTshow:"",swLowHshow:"",swBotTshow:"",swLowBotWshow:""};
const els = {};
for(const k in vals0) els[k]={value:vals0[k],checked:true,innerHTML:"",style:{},addEventListener(){},appendChild(){},clientWidth:800,clientHeight:560};
for(const k of ["excMs","excMr","excW","excH","excHs","excHr","excHst","excB"]) els[k]={value:"",checked:true,innerHTML:"",style:{},addEventListener(){},appendChild(){},clientWidth:800,clientHeight:560};
els.excMs.value="1"; els.excMr.value="1"; els.excW.value="0.5"; els.excH.value="3"; els.excHs.value="1"; els.excHr.value=""; els.excHst.value="5"; els.excB.value="1";
const mk = (id,checked)=>{ els[id]={value:"",checked,innerHTML:"",style:{},addEventListener(){},appendChild(){},clientWidth:800,clientHeight:560}; };
["useFd2","showLabels","showAxes","showEL","showELa","wireOnly","pFw","pSw","pCap","pBw","pFd","pFill","exGround","exSoil","exRock"].forEach(id=>mk(id,false));
els.showLabels.checked = true; els.exGround.checked = true; els.exSoil.checked = true; els.exRock.checked = true;
els.projName={value:"t",innerHTML:""};els.view3d={innerHTML:""};els.resultBody={innerHTML:""};els.assumpNote={innerHTML:""};
for(const k in els){els[k].style={};els[k].addEventListener=()=>{};els[k].appendChild=()=>{};}
const ctx2d = new Proxy({}, { get:(t,k)=>{
  if(k==="measureText") return ()=>({width:100});
  if(k==="canvas") return {};
  return typeof k==="string" ? function(){} : undefined;
}, set:()=>true });
const canvasStub = () => { const cv = { getContext:()=>ctx2d, style:{}, addEventListener(){}, width:0, height:0 }; return cv; };
global.document={getElementById:id=>{if(!(id in els))throw new Error(id);return els[id];},
  querySelectorAll:()=>[],createElement:canvasStub,
  createElementNS:canvasStub};
global.window={addEventListener(){}};global.requestAnimationFrame=()=>{};global.Blob=class{};
app += ";global.__api={readP,calcQ,renderTable,buildModel};global.__get=()=>({g:group,labelGroup});";
global.THREE = require(dir + "/three_clean.js");
eval(app);
const api = global.__api;

function run(name, exc){
  for(const k in exc){ els[k].value = exc[k]; }
  api.buildModel(api.readP(), api.calcQ(api.readP()));
  const {g, labelGroup:lg} = global.__get();
  let nR=0, nS=0;
  lg.children.forEach(o=>{ if(o.userData && o.userData.part==="exR") nR++; if(o.userData && o.userData.part==="exS") nS++; });
  let bandsR=0, bandsS=0;
  g.children.forEach(o=>{ if(o.userData && o.userData.part==="exR") bandsR++; if(o.userData && o.userData.part==="exS") bandsS++; });
  console.log(`${name}: 棱台带 石${bandsR}/土${bandsS}, 标注 石${nR}/土${nS} → OK`);
}

run("默认 H=3 不分级   ", {excMs:"1",excMr:"1",excW:"0.5",excH:"3",excHs:"1",excHr:"",excHst:"5",excB:"1"});
run("H=12 分级2道平台 ", {excMs:"1",excMr:"1",excW:"0.5",excH:"12",excHs:"4",excHr:"",excHst:"5",excB:"1"});
run("H=6 平台@4土层内  ", {excMs:"1",excMr:"1",excW:"0.5",excH:"6",excHs:"4",excHr:"",excHst:"4",excB:"1.5"});
run("m石=0 竖直 H=4    ", {excMs:"1",excMr:"0",excW:"0.5",excH:"4",excHs:"2",excHr:"",excHst:"3",excB:"1"});
run("全土方 h石=0      ", {excMs:"1",excMr:"1",excW:"0.5",excH:"3",excHs:"3",excHr:"",excHst:"5",excB:"1"});
console.log("开挖标注无头验证全部通过");
