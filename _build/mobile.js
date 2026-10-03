const path=require("path"),fs=require("fs");const {chromium}=require("playwright-core");
const CHROME="C:/Users/oscar/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe";
const PAGE="file:///"+path.resolve(__dirname,"../index.html").replace(/\\/g,"/")+"?l=hant";
const OUT=path.resolve(__dirname,"shots");
(async()=>{const b=await chromium.launch({executablePath:CHROME});
for(const [name,w,h] of [["m1-390",390,844],["m2-360",360,740]]){
  const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errs=[];p.on("pageerror",e=>errs.push(e.message));
  await p.goto(PAGE);await p.waitForTimeout(800);
  await p.screenshot({path:path.join(OUT,name+"-a.png"),fullPage:true});
  // scroll horizontally? check nothing overflows
  const over=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,
    hdr:getComputedStyle(document.querySelector("header.top")).gridTemplateColumns,
    trish:document.getElementById("trishbtn").getBoundingClientRect().x}));
  console.log(name,"scrollW",over.sw,"clientW",over.cw,over.sw>over.cw+1?"OVERFLOW":"ok","| header grid:",over.hdr,"| share x:",Math.round(over.trish));
  if(errs.length)console.log("  ERRORS",errs);
  await p.close();
}
await b.close();})();
