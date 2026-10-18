/* 提取 renderTable 中土方/石方行的计算式文本 */
const fs = require("fs"), path = require("path");
const dir = __dirname;
const tpl = fs.readFileSync(dir + "/app_template.html", "utf8");
const lib = fs.readFileSync(dir + "/three_clean.js", "utf8");
let app = tpl.match(/<script>\s*\/\*__THREE__\*\/<\/script>\s*<script>([\s\S]*?)<\/script>/)[1];
const vals = {Wf:"24",H1:"5",t1:"1.2",m1:"3",W:"12",Hs:"6.5",t2:"0.5",L2:"6",m2:"0",m3:"3",elAbs:"146",
  capH:"0.6",capCant:"0.1",capWid:"1.3",bwT:"0.5",bwH:"0.9",
  fd1H:"1",fd1X:"1",fd1Zf:"1",fd1Zb:"1",fd2H:"1",fd2X:"1",fd2Zf:"1",fd2Zb:"1",
  capLshow:"",bwLshow:"",t1bshow:"",swUpHshow:"",swTopWshow:"",swBotWshow:"",swLowTopWshow:"",swLowTopTshow:"",swLowHshow:"",swBotTshow:"",swLowBotWshow:"",
  excMs:"1",excMr:"1",excW:"0.5",excH:"3",excHs:"1",excHr:"",excHst:"5",excB:"1"};
const checks = {useFd2:false,showLabels:false,showAxes:false,showEL:false,showELa:false,wireOnly:false,
  pFw:true,pSw:true,pCap:true,pBw:true,pFd:true,pFill:true,exGround:false,exSoil:false,exRock:false};
const els = {};
for(const k in vals) els[k]={value:vals[k],checked:true,innerHTML:"",style:{},addEventListener(){},appendChild(){},clientWidth:800,clientHeight:560};
for(const k in checks) els[k]={value:"",checked:checks[k],innerHTML:"",style:{},addEventListener(){},appendChild(){},clientWidth:800,clientHeight:560};
els.projName={value:"t",innerHTML:""};els.view3d={innerHTML:""};els.resultBody={innerHTML:""};els.assumpNote={innerHTML:""};
for(const k in els){els[k].style={};els[k].addEventListener=()=>{};els[k].appendChild=()=>{};}
global.document={getElementById:id=>{if(!(id in els))throw new Error(id);return els[id];},
  querySelectorAll:()=>[],createElement:()=>({getContext:()=>null,width:0,style:{}}),
  createElementNS:()=>({getContext:()=>null,width:0,style:{}})};
global.window={addEventListener(){}};global.requestAnimationFrame=()=>{};global.Blob=class{};
app += ";global.__api={readP,calcQ,renderTable};";
global.THREE = require(dir + "/three_clean.js");
eval(app);
const api = global.__api;
api.renderTable(api.readP(), api.calcQ(api.readP()));
const t = els.resultBody.innerHTML;
for(const row of t.split("<tr").slice(1)){
  if((row.indexOf("开挖")>=0 || row.indexOf("侧墙")>=0 || row.indexOf("回填")>=0) && row.indexOf("合计")<0){
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g).map(c=>c.replace(/<[^>]+>/g,""));
    console.log(cells[0], "||", cells[1]);
  }
}
