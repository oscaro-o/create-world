const path=require("path");const {chromium}=require("playwright-core");
const CHROME="C:/Users/oscar/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe";
const PAGE="file:///"+path.resolve(__dirname,"../index.html").replace(/\\/g,"/")+"?l=hant";
(async()=>{const b=await chromium.launch({executablePath:CHROME});
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
await p.goto(PAGE);await p.waitForTimeout(800);
console.log("world:",await p.evaluate(()=>[COLS,ROWS,CW,CH,document.getElementById("cv").getBoundingClientRect().height]));
await p.screenshot({path:path.resolve(__dirname,"shots/m3-open.png"),fullPage:true});
// paint a bit and screenshot day 1
await p.locator("#actrow button").first().click();await p.waitForTimeout(1900);
const r=await p.evaluate(()=>{const q=document.getElementById("cv").getBoundingClientRect();return{x:q.x,y:q.y,w:q.width,h:q.height};});
for(let i=0;i<8;i++){const x=r.x+r.w*(0.12+i*0.11);
  await p.mouse.move(x,r.y+r.h*0.15);await p.mouse.down();
  for(let k=1;k<=8;k++)await p.mouse.move(x,r.y+r.h*(0.15+0.7*k/8));
  await p.mouse.up();await p.waitForTimeout(50);}
await p.waitForTimeout(800);
await p.screenshot({path:path.resolve(__dirname,"shots/m4-day1.png"),fullPage:true});
await b.close();})();
