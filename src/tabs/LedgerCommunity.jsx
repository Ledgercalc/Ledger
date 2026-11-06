import { useEffect, useRef, useState } from "react";
import { palette, sans } from "../lib/theme.js";

// Ledger-style Community (Feed / Rooms / Ranks / Mentor), ported from the tredzi2.html reference.
// Feed, Rooms and Mentor run on the same demo data as the reference; "You" in Ranks uses your real discipline score.

const DEMO = {"T":[{"id":1,"day":"Today","t":"09:20","sym":"EUR/USD","side":1,"setup":"Breakout","e":1.085,"s":1.0812,"tp":1.093,"x":null,"c":1.0871,"z":50000,"emo":"Calm","rules":[1,1,0],"mist":[],"note":"","rate":0,"j":0},{"id":2,"day":"Today","t":"10:05","sym":"XAU/USD","side":-1,"setup":"Reversal","e":2412,"s":2420,"tp":2392,"x":null,"c":2415.5,"z":10,"emo":"Focused","rules":[1,1,1],"mist":[],"note":"","rate":0,"j":0},{"id":12,"day":"Sun 1 Nov","t":"11:40","sym":"BTC/USD","side":1,"setup":"Pullback","e":67200,"s":66800,"tp":68400,"x":68050,"z":0.5,"emo":"Calm","rules":[1,1,1],"mist":[],"note":"Weekend liquidity was thin, so I kept size small.","rate":4,"j":1},{"id":10,"day":"Sat 31 Oct","t":"16:10","sym":"ETH/USD","side":-1,"setup":"Reversal","e":2480,"s":2510,"tp":2400,"x":2512,"z":4,"emo":"Rushed","rules":[0,1,0],"mist":["Early entry"],"note":"","rate":0,"j":0},{"id":11,"day":"Sat 31 Oct","t":"10:25","sym":"BTC/USD","side":1,"setup":"Breakout","e":67600,"s":67300,"tp":68500,"x":68200,"z":0.5,"emo":"Focused","rules":[1,1,1],"mist":[],"note":"Broke the Friday high on volume and took profit at the first target.","rate":4,"j":1},{"id":3,"day":"Fri 30 Oct","t":"09:45","sym":"EUR/USD","side":1,"setup":"Breakout","e":1.085,"s":1.0812,"tp":1.093,"x":1.0928,"z":60000,"emo":"Calm","rules":[1,1,0],"mist":[],"note":"Clean break above the Asian range. I nudged the stop to breakeven too early.","rate":3,"j":1},{"id":4,"day":"Fri 30 Oct","t":"14:20","sym":"GBP/JPY","side":-1,"setup":"Reversal","e":191.4,"s":191.9,"tp":190.4,"x":191.15,"z":1000,"emo":"Focused","rules":[1,1,1],"mist":[],"note":"Took profit early. Fine, but left R on the table.","rate":4,"j":1},{"id":5,"day":"Fri 30 Oct","t":"15:05","sym":"NAS100","side":1,"setup":"Pullback","e":20120,"s":20090,"tp":20200,"x":20082,"z":10,"emo":"Rushed","rules":[0,1,0],"mist":["Moved stop"],"note":"","rate":0,"j":0},{"id":6,"day":"Thu 29 Oct","t":"10:10","sym":"XAU/USD","side":1,"setup":"Breakout","e":2395,"s":2388,"tp":2409,"x":2409,"z":20,"emo":"Calm","rules":[1,1,1],"mist":[],"note":"Textbook. Waited for the close, held to target.","rate":5,"j":1},{"id":7,"day":"Thu 29 Oct","t":"11:30","sym":"EUR/USD","side":-1,"setup":"Pullback","e":1.089,"s":1.0915,"tp":1.083,"x":1.092,"z":40000,"emo":"Anxious","rules":[0,1,1],"mist":["Early entry"],"note":"","rate":0,"j":0},{"id":8,"day":"Wed 28 Oct","t":"09:30","sym":"NAS100","side":1,"setup":"Breakout","e":20010,"s":19985,"tp":20060,"x":20060,"z":10,"emo":"Focused","rules":[1,1,1],"mist":[],"note":"Volume confirmed the break.","rate":4,"j":1},{"id":9,"day":"Wed 28 Oct","t":"13:15","sym":"GBP/JPY","side":1,"setup":"Reversal","e":190.8,"s":190.4,"tp":191.6,"x":190.6,"z":1000,"emo":"Tilted","rules":[1,0,1],"mist":["Oversized"],"note":"Size was too big after the morning win.","rate":2,"j":1}],"F":[{"h":"@nightowl_fx","board":"Setups","title":"GBP/JPY short, +1.8R","sym":"GBP/JPY","su":"Retest","side":-1,"e":191.4,"s":191.9,"tp":190.4,"x":190.5,"z":1,"r":1.8,"rules":[1,1,1],"age":120,"ago":"2h","hc":42,"note":"Waited for the retest, no chasing. Rules 3 of 3.","cmts":[{"h":"@quietbreakout","t":"Did you scale out at 1R?"},{"h":"@maya_r","t":"Clean. The retest is where most people chase."},{"h":"@tape_reader","t":"What was your invalidation?"}]},{"h":"@maya_r","board":"Reviews","title":"XAU/USD long, +0.6R. Should I have held through the news?","sym":"XAU/USD","su":"Pullback","side":1,"e":2395,"s":2388,"tp":2409,"x":2399.2,"z":1,"r":0.6,"rules":[1,1,0],"age":300,"ago":"5h","hc":18,"note":"My stop was fine, but I held through the data release and got lucky. Would you have flattened?","cmts":[{"h":"@nightowl_fx","t":"I flatten before high-impact news. Less stress."},{"h":"@quietbreakout","t":"Your stop was fine. The hold was the risk."}]},{"h":"@quietbreakout","board":"Psychology","title":"How I stopped revenge trading after a stop-out","age":600,"ago":"10h","hc":67,"note":"I write one line in my journal before I touch the next trade. It takes 30 seconds and it works.","cmts":[{"h":"@maya_r","t":"This is the loss I want to see more of."},{"h":"@tape_reader","t":"Stealing this rule."}]},{"h":"@tape_reader","board":"Risk","title":"Do you cut size after a big win?","age":1440,"ago":"1d","hc":11,"note":"I keep oversizing after a good morning. What rule do you use to stay level?","cmts":[{"h":"@nightowl_fx","t":"Fixed risk per trade, always 1%."}]}],"PF":{"@nightowl_fx":{"n":"Night Owl","role":"London session reversals","bio":"Journaling since 2024. I trade less than I used to, and it shows.","joined":"Joined Jan 2025","ds":83,"st":21,"fo":412,"fg":96,"tc":214,"pf":"1.9","aw":"+1.7R","al":"−0.9R","bs":9,"badges":["7-day streak","30-day streak","Process first"],"su":[["Retest",68],["Reversal",54]],"ex":"+0.5R","wr":"54%","risk":"0.5%","mk":["FX"],"sty":["Day trader"],"ses":"London"},"@maya_r":{"n":"Maya R.","role":"Gold and FX pullbacks","bio":"Gold and FX pullback trader. I review trades every Sunday.","joined":"Joined Mar 2025","ds":92,"st":34,"fo":268,"fg":121,"tc":342,"pf":"2.3","aw":"+1.9R","al":"−0.8R","bs":14,"badges":["7-day streak","30-day streak","No revenge week","Strict stops"],"su":[["Pullback",61],["Breakout",48]],"ex":"+0.7R","wr":"58%","risk":"0.75%","mk":["Gold","FX"],"sty":["Swing","Day trader"],"ses":"New York"},"@quietbreakout":{"n":"Quiet Breakout","role":"Index breakouts","bio":"Small size, strict stops, one trade at a time.","joined":"Joined Jun 2025","ds":79,"st":12,"fo":951,"fg":58,"tc":167,"pf":"1.6","aw":"+2.1R","al":"−1.0R","bs":7,"badges":["7-day streak","Strict stops","First 100 trades"],"su":[["Breakout",52]],"ex":"+0.4R","wr":"47%","risk":"0.5%","mk":["Indices"],"sty":["Day trader"],"ses":"New York"},"@tape_reader":{"n":"Tape Reader","role":"Volume and tape reading","bio":"I watch volume and trade less.","joined":"Joined Oct 2026","ds":71,"st":5,"fo":137,"fg":203,"tc":48,"pf":"1.2","aw":"+1.4R","al":"−1.0R","bs":5,"badges":["7-day streak"],"su":[["Retest",51]],"ex":"+0.2R","wr":"51%","risk":"1%","mk":["Stocks","Indices"],"sty":["Scalper"],"ses":"New York"}},"RO":[{"t":"London open: levels and plans","k":"Audio","h":"@nightowl_fx","n":14,"min":23,"live":1},{"t":"Chart review: my worst trade","k":"Video","h":"@maya_r","n":6,"min":9,"live":1},{"t":"Silent focus, 45 minutes","k":"Focus","h":"@quietbreakout","n":23,"min":12,"live":1},{"t":"Sunday week review","k":"Audio","h":"@tape_reader","n":0,"at":"Sun 8 Nov, 18:00","live":0},{"t":"Journal night: weekly recap","k":"Video","h":"@nightowl_fx","n":0,"at":"Wed 4 Nov, 20:00","live":0}]};
const CSS = `.lc button,.lc input,.lc textarea{font:inherit;color:inherit}
.lc button{cursor:pointer;background:none;border:0;padding:0;text-align:left}
.lc button:focus-visible,.lc input:focus-visible,.lc textarea:focus-visible{outline:2px solid var(--am);outline-offset:2px}
.lc .sf,.lc h1{font-family:inherit;font-style:normal!important}
.lc h1{font-size:22px;font-weight:600;line-height:1.2;margin:0;flex:1;letter-spacing:-.01em}
.lc .t2{color:var(--t2)}
.lc .g{color:var(--g)}
.lc .r{color:var(--r)}
.lc .am{color:var(--am)}
.lc .big{font-size:44px;font-weight:600;line-height:1.1;letter-spacing:-.02em}
.lc .big2{font-size:24px;font-weight:600;line-height:1.15;letter-spacing:-.01em}
.lc .top{display:flex;align-items:center;gap:12px;margin-bottom:16px}
.lc .ib{width:44px;height:44px;border-radius:12px;background:var(--s1);border:1px solid var(--ln);display:flex;align-items:center;justify-content:center;flex:none;text-align:center}
.lc .lb{font-size:12px;color:var(--t2);margin:22px 0 8px;display:flex;justify-content:space-between;align-items:center}
.lc .rw{display:flex;justify-content:space-between;align-items:center;gap:8px}
.lc .s12{font-size:12px}
.lc .row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 0;border-bottom:1px solid var(--ln);min-height:44px;width:100%}
.lc .chips{display:flex;flex-wrap:wrap}
.lc .chip{padding:8px 14px;border-radius:10px;border:1px solid var(--ln);font-size:13px;font-weight:500;color:var(--t2);background:var(--s1);margin:0 8px 8px 0;min-height:40px;display:flex;align-items:center}
.lc .chip{transition:background .15s,border-color .15s,color .15s}
.lc .chip:hover{border-color:var(--am);color:var(--tx)}
.lc .chip.on,.lc .chip.on:hover{background:var(--am);color:var(--on);border-color:var(--am)}
.lc .card{background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:16px}
.lc .btn{height:48px;border-radius:12px;background:var(--am);color:var(--on);font-weight:600;width:100%;display:flex;align-items:center;justify-content:center;gap:8px;text-align:center}
.lc .btn{transition:filter .15s,transform .1s}
.lc .btn:hover{filter:brightness(1.08)}
.lc .btn.o{background:color-mix(in srgb,var(--am) 12%,var(--s1));border:1px solid color-mix(in srgb,var(--am) 45%,var(--ln));color:var(--am)}
.lc .btn.o:hover{filter:none;background:color-mix(in srgb,var(--am) 20%,var(--s1))}
.lc .btn:active{transform:scale(.98)}
.lc .in{width:100%;min-height:44px;border:1px solid var(--ln);background:var(--s1);border-radius:12px;padding:10px 12px;display:block;margin-top:4px}
.lc label.f{display:block;font-size:12px;color:var(--t2);margin-top:12px}
.lc .g2{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}
.lc .tg{display:flex;background:var(--s1);border:1px solid var(--ln);border-radius:12px;padding:3px}
.lc .tg button{flex:1;height:40px;border-radius:9px;font-weight:500;text-align:center;color:var(--t2)}
.lc .tg button{transition:background .15s,color .15s}
.lc .tg button:not(.on):hover{color:var(--tx);background:color-mix(in srgb,var(--am) 10%,transparent)}
.lc .tg button.on{background:var(--am);color:var(--on);font-weight:600;box-shadow:0 2px 8px color-mix(in srgb,var(--am) 35%,transparent)}
.lc .ck{width:24px;height:24px;border-radius:50%;border:1.5px solid var(--ln);display:flex;align-items:center;justify-content:center;flex:none}
.lc .ck.d{background:var(--am);border-color:var(--am);color:var(--on)}
.lc .rail{position:relative;height:6px;background:var(--s2);border-radius:3px;margin:16px 6px 8px}
.lc .rail i{position:absolute;top:0}
.lc .rf{height:6px;border-radius:3px}
.lc .re{top:-4px!important;width:2px;height:14px;background:var(--tx);margin-left:-1px}
.lc .rd{top:-3px!important;width:12px;height:12px;border-radius:50%;border:2px solid var(--bg);margin-left:-6px}
.lc .rl{display:flex;justify-content:space-between;font-size:11px;color:var(--t2)}
.lc .rb{position:relative;height:6px;background:var(--s2);border-radius:3px;margin:9px 0 6px}
.lc .rb i{position:absolute;top:0;height:6px;border-radius:3px}
.lc .rb:after{content:"";position:absolute;left:50%;top:-3px;width:1px;height:12px;background:var(--t2)}
.lc .tr{display:block;width:100%;padding:13px 0;border-bottom:1px solid var(--ln)}
.lc .tag{font-size:11px;padding:2px 8px;border-radius:6px;font-weight:500;border:1px solid var(--ln);color:var(--t2);margin-left:4px}
.lc .ticks{display:grid;grid-template-columns:repeat(10,1fr);gap:4px}
.lc .ticks i{height:10px;border-radius:3px;background:var(--s2)}
.lc .ticks i.u{background:var(--am)}
.lc .dots{display:flex;justify-content:space-between}
.lc .dots i{width:20px;height:20px;border-radius:50%;border:1.5px solid var(--ln)}
.lc .sp{display:block;width:100%;height:90px}
.lc .cg{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
.lc .c{position:relative;height:56px;border-radius:12px;border:1.5px solid transparent;background:var(--s1);padding:6px 0 7px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;text-align:center;min-width:0}
.lc .c b{font-weight:400;font-size:11px;line-height:1}
.lc .c small{font-size:13px;font-weight:500;line-height:1}
.lc .c.off{background:none;border:1px dashed var(--ln);color:var(--t2)}
.lc .c.sel{border-color:var(--am)}
.lc .hb{display:grid;grid-template-columns:90px 1fr 78px;gap:10px;align-items:center;padding:7px 0;font-size:13px}
.lc .hb i{display:block;height:10px;border-radius:5px}
.lc .strip{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px}
.lc .strip button{flex:1;min-width:44px;height:62px;border-radius:14px;border:1px solid var(--ln);background:var(--s1);text-align:center;font-size:12px;color:var(--t2);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
.lc .strip button.on{background:var(--am);color:var(--on);border-color:var(--am)}
.lc .strip b{font-size:16px;font-weight:500}
.lc .strip i{width:5px;height:5px;border-radius:50%;background:var(--am)}
.lc .shd{display:flex;align-items:center;gap:12px;padding:0 16px}
.lc .shb{flex:1;overflow-y:auto;padding:0 16px 16px}
.lc .shf{display:flex;gap:10px;padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--ln)}
.lc .av{width:36px;height:36px;border-radius:50%;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--am);flex:none;overflow:hidden}
.lc .av img{width:100%;height:100%;object-fit:cover;display:block}
.lc .post{padding:16px 0;border-bottom:1px solid var(--ln)}
.lc .bar{height:10px;border-radius:5px;background:var(--s2);overflow:hidden}
.lc .bar i{display:block;height:100%;border-radius:5px;background:var(--am)}
.lc .pst{display:flex;gap:12px;padding:14px 0;border-bottom:1px solid var(--ln)}
.lc .vt{display:flex;flex-direction:column;align-items:center;width:36px;flex:none;font-size:13px}
.lc .vb{width:36px;height:34px;display:flex;align-items:center;justify-content:center;color:var(--t2);border-radius:8px}
.lc .vb.on{color:var(--am)}
.lc .pb{flex:1;min-width:0}
.lc .lk{color:var(--tx);font-weight:600;min-height:24px}
.lc .ttl{display:block;width:100%;font-size:16px;font-weight:600;line-height:1.3;margin:4px 0 6px}
.lc .nt{color:var(--t2);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.lc .ft{display:flex;gap:16px;margin-top:6px;font-size:12px;color:var(--t2)}
.lc .ft button{display:flex;gap:6px;align-items:center;min-height:36px}
.lc .cmp{display:flex;align-items:center;gap:12px;width:100%;min-height:52px;padding:0 12px;border:1px solid var(--ln);border-radius:12px;background:var(--s1);margin-top:14px}
.lc .pr{padding:14px 0;border-bottom:1px solid var(--ln)}
.lc .bn{height:76px;border-radius:14px;border:1px solid var(--ln);background:color-mix(in srgb,var(--am) 16%,var(--s1))}
.lc .hmw{display:grid;grid-template-columns:30px 1fr;gap:3px 6px;font-size:11px;color:var(--t2)}
.lc .hmm{display:grid;grid-template-columns:repeat(12,1fr);gap:3px;height:16px}
.lc .hmm span{white-space:nowrap}
.lc .hmd{display:grid;grid-template-rows:repeat(7,24px);gap:3px;align-items:center}
.lc .hm{display:grid;grid-template-columns:repeat(12,1fr);gap:3px}
.lc .hm button{height:24px;border-radius:6px;background:var(--s2);padding:0;border:1.5px solid transparent}
.lc .hm button.sel{border-color:var(--am)}
.lc .pc{background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:14px;margin-top:12px}
.lc .bt{display:flex;align-items:center;font-size:12px;font-weight:500;color:var(--t2);padding:4px 10px;border:1px solid var(--ln);border-radius:8px;flex:none}
.lc .dotc{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px;flex:none}
.lc .act{display:flex;gap:6px;align-items:center;min-height:36px;padding:0 12px;border:1px solid var(--ln);border-radius:10px;font-weight:500;font-size:12px;color:var(--t2)}
.lc .act.on{background:var(--am);color:var(--on);border-color:var(--am)}
.lc .live{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--r);margin-right:6px}
.lc .db{width:56px;text-align:center;border:1px solid var(--ln);border-radius:10px;padding:6px 0;background:var(--s1);display:flex;flex-direction:column;font-size:11px;color:var(--t2);flex:none}
.lc .db b{color:var(--tx);font-size:13px}
.lc .eq{display:inline-flex;gap:2px;align-items:flex-end;height:14px}
.lc .eq i{width:3px;background:var(--g);border-radius:2px;animation:eq .8s infinite ease-in-out}
.lc .eq i:nth-child(2){animation-delay:.2s}
.lc .eq i:nth-child(3){animation-delay:.4s}
@keyframes eq{0%,100%{height:4px}50%{height:14px}}
.lc .rbn{display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;font-size:11px;color:var(--t2);text-align:center}
.lc .rbn .c{width:52px;height:52px;border-radius:50%;background:var(--s1);border:1px solid var(--ln);display:flex;align-items:center;justify-content:center;color:var(--tx)}
.lc .rbn.on .c{background:var(--am);color:var(--on);border-color:var(--am)}
.lc .rbn.lv .c{background:var(--r);border-color:var(--r);color:var(--on)}
.lc .sw{width:46px;height:28px;border-radius:14px;background:var(--s2);border:1px solid var(--ln);position:relative;flex:none}
.lc .sw i{position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:var(--t2);transition:left .15s}
.lc .sw.on{background:var(--am);border-color:var(--am)}
.lc .sw.on i{left:21px;background:var(--on)}
.lc .fbn{height:44px;padding:0 14px;border-radius:12px;border:1px solid var(--ln);background:var(--s1);display:flex;align-items:center;gap:8px;font-weight:500;flex:none}
.lc .bdg{background:var(--am);color:var(--on);border-radius:99px;min-width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;padding:0 6px}
.lc .cg6{display:grid;grid-template-columns:repeat(5,minmax(0,1fr)) 1.2fr;gap:5px}
.lc .cg6 .c{height:60px}
.lc .wk2{height:60px;border-radius:10px;border:1px solid var(--ln);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:12px;font-weight:600}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
.lc .cmp{min-height:58px;padding:0 12px;border-radius:16px;box-shadow:0 1px 2px rgba(16,24,40,.05);text-align:left}
.lc .cmp .t2{flex:1;font-size:14px}
.lc .cmp:active{background:var(--s2)}
.lc .cmpb{width:34px;height:34px;border-radius:10px;background:var(--am);color:var(--on);display:flex;align-items:center;justify-content:center;flex:none}
.lc .fht{font-size:18px;font-weight:600;letter-spacing:-.01em;display:flex;align-items:baseline;gap:8px}
.lc .fht span{font-size:12px;font-weight:400;color:var(--t2)}
.lc .pc{border-radius:16px;padding:16px;margin-top:12px;box-shadow:0 1px 2px rgba(16,24,40,.05),0 8px 20px -12px rgba(16,24,40,.18)}
.lc .ph{display:flex;align-items:center;justify-content:space-between;gap:10px}
.lc .pa{display:flex;gap:10px;align-items:center;min-height:44px;min-width:0;text-align:left}
.lc .pa .av{width:40px;height:40px;font-size:13px;font-weight:600;border:1px solid var(--ln)}
.lc .pn{display:flex;flex-direction:column;min-width:0;line-height:1.3}
.lc .pn b{font-size:14px;font-weight:600}
.lc .pn span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lc .pc .bt{border:0;border-radius:99px;padding:5px 11px;background:color-mix(in srgb,var(--bc) 14%,transparent);color:var(--tx);font-size:11.5px}
.lc .pc .ttl{font-size:17px;font-weight:600;line-height:1.3;letter-spacing:-.01em;margin:10px 0 6px;text-align:left}
.lc .pc .nt{font-size:14px;line-height:1.5;-webkit-line-clamp:5;text-align:left}
.lc .pc .nt.ex{display:block;-webkit-line-clamp:unset;overflow:visible}
.lc .rmr{display:block;color:var(--am);font-weight:600;font-size:13px;min-height:36px;text-align:left}
.lc .ts{background:var(--bg);border:1px solid var(--ln);border-radius:12px;padding:12px 14px;margin:10px 0 6px}
.lc .ts .rail{margin:14px 6px 8px}
.lc .pf{display:flex;gap:4px;align-items:center;margin-top:12px;padding-top:8px;border-top:1px solid var(--ln)}
.lc .pf .act{border:0;background:transparent;border-radius:10px;padding:0 10px;min-height:40px;font-size:13px}
.lc .pf .act:active{background:var(--s2)}
.lc .pf .act.on{background:color-mix(in srgb,var(--am) 16%,transparent);color:var(--am)}
.lc .pf .act{white-space:nowrap;flex:none}
.lc .pf .sv{width:44px;height:44px;min-height:44px;padding:0;justify-content:center;color:var(--t2)}
.lc .pf .sv.on{background:transparent;color:var(--am)}
.lc .pf .sv.on svg{animation:svpop .28s ease-out}
@keyframes svpop{0%{transform:scale(.7)}60%{transform:scale(1.25)}100%{transform:scale(1)}}
@media (prefers-reduced-motion:reduce){.pf .sv.on svg{animation:none}}
.lc .npw{position:sticky;top:8px;z-index:6;display:flex;justify-content:center}
.lc .npp{display:flex;align-items:center;gap:6px;height:36px;padding:0 16px;margin-bottom:10px;border-radius:99px;background:var(--am);color:var(--on);font-weight:600;font-size:13px;box-shadow:0 4px 14px rgba(0,0,0,.25)}
.lc .cm{display:flex;gap:10px;padding:12px 0;border-bottom:1px solid var(--ln)}
.lc .cmb{flex:1;min-width:0}
.lc .cmh{display:flex;gap:8px;align-items:baseline}
.lc .cmh b{font-weight:600}
.lc .chb{display:inline-flex;gap:5px;align-items:center;margin-top:2px;min-height:36px;font-size:12px;color:var(--t2)}
.lc .chb.on{color:var(--am);font-weight:600}
.lc .ph{display:flex;align-items:center;gap:8px}
.lc .pa{flex:1}
.lc .fwb{flex:none;height:34px;padding:0 16px;border-radius:99px;border:1px solid var(--am);background:var(--am);font-size:12px;font-weight:600;color:var(--on);transition:filter .15s}
.lc .fwb:hover{filter:brightness(1.08)}
.lc .fwb.on{background:transparent;border-color:var(--ln);color:var(--t2);font-weight:500}
.lc .fwb.on:hover{filter:none;border-color:var(--am);color:var(--am)}
.lc .pmn{flex:none;width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--t2)}
.lc .pmn:active{background:var(--s2)}
.lc .bl{display:flex;align-items:center;gap:8px;margin-top:10px}
.lc .pc .ttl{margin:8px 0 6px}
.lc .ans{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:600;color:var(--g);padding:5px 10px;border-radius:99px;background:color-mix(in srgb,var(--g) 14%,transparent)}
.lc .cma{display:flex;gap:14px;flex-wrap:wrap}
.lc .cm.best{background:color-mix(in srgb,var(--g) 8%,transparent);border:1px solid color-mix(in srgb,var(--g) 35%,transparent);border-radius:12px;padding:12px;margin:8px 0}
.lc .bba{display:inline-flex;align-items:center;gap:4px;color:var(--g);font-weight:600;font-size:12px;margin-left:auto}
.lc .cgh{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;text-align:center;margin-bottom:8px;font-size:11px;font-weight:500;color:var(--t2)}
.lc .cgh .we{opacity:.65}
.lc .cg7{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
.lc .cg7 .c{height:auto;min-height:64px;padding:11px 2px 9px;gap:8px;border-radius:12px}
.lc .cg7 .c b{font-size:12px;font-weight:600;color:var(--t2)}
.lc .cg7 .c small{font-size:12px;font-weight:600}
.lc .cg7 .c.off{justify-content:flex-start;opacity:.65}
.lc .cg7 .c.sel{border-color:var(--am);box-shadow:0 0 0 1px var(--am)}
.lc .jd,.lc .jm{display:inline-block;width:7px;height:7px;border-radius:50%;box-sizing:border-box;flex:none}
.lc .jd{background:var(--g)}
.lc .jm{border:1.5px solid var(--am)}
.lc .c .jd,.lc .c .jm{position:absolute;top:6px;right:6px}
.lc .cleg{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 16px;margin-top:14px;font-size:12px;color:var(--t2)}
.lc .cleg span{display:inline-flex;align-items:center;gap:6px}
.lc .cl2{gap:14px}
.lc .wr{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid var(--ln)}
.lc .wr:last-child{border-bottom:0}
.lc .drs{border-top:1px solid var(--ln);margin-top:14px}
.lc .drs .row:last-child{border-bottom:0}
.lc .jt{display:block;width:100%;text-align:left;background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:14px 16px;margin-top:10px}
.lc .jt:active{background:var(--s2)}
.lc .jtn{margin-top:10px;font-size:13px;color:var(--t2);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.45}
.lc .jst{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;padding:5px 11px;border-radius:99px;background:var(--s2);color:var(--t2)}
.lc .jst.ok{color:var(--g);background:color-mix(in srgb,var(--g) 14%,transparent)}
.lc .jst.need{color:var(--am);background:color-mix(in srgb,var(--am) 16%,transparent)}
.lc .cht{font-weight:600;font-size:15px}
.lc .pe{margin-top:10px}
.lc .pe .lesson{font-style:italic;margin-top:8px;line-height:1.45}
.lc .strip{gap:6px}
.lc .strip button{min-height:68px;padding:8px 2px}
.lc .mck{display:flex;gap:10px;align-items:flex-start;margin-top:12px;font-size:14px;line-height:1.4}
.lc .mck svg{color:var(--g);flex:none;margin-top:2px}
.lc .mcd{margin-top:10px}
.lc .mst{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:14px;padding-top:12px;border-top:1px solid var(--ln);font-size:12px;color:var(--t2)}
.lc .mst b{color:var(--tx);font-weight:600}
.lc .mbar{height:8px;border-radius:99px;background:var(--s2);overflow:hidden;margin:14px 0 10px}
.lc .mbar i{display:block;height:100%;background:var(--g);border-radius:99px}
.lc .mgr{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;font-size:22px;font-weight:700;background:var(--s2)}
.lc .mgr.g{color:var(--g);background:color-mix(in srgb,var(--g) 14%,transparent)}
.lc .mgr.am{color:var(--am);background:color-mix(in srgb,var(--am) 16%,transparent)}
.lc .mgr.r{color:var(--r);background:color-mix(in srgb,var(--r) 14%,transparent)}
.lc .mcm{display:flex;gap:10px;padding:12px 0;border-bottom:1px solid var(--ln)}
.lc .mcm:last-of-type{border-bottom:0}
.lc .mph{display:flex;gap:12px;align-items:center;min-width:0;flex:1;text-align:left;min-height:52px}
.lc .mbio{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.lc .mtiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px}
.lc .mtile{background:var(--s2);border-radius:12px;padding:10px 12px;min-width:0}
.lc .mtile b{display:block;font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lc .mtile span{font-size:11px;color:var(--t2)}
.lc .minv{margin-top:16px}
.lc .mic{flex:none;width:40px;height:40px;border-radius:12px;background:var(--s2);display:flex;align-items:center;justify-content:center;color:var(--am)}
.lc .mstep{display:flex;gap:12px;align-items:flex-start;margin-top:16px;font-size:14px;line-height:1.4}
.lc .mstep i{flex:none;width:24px;height:24px;border-radius:50%;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:12px;font-style:normal;font-weight:600;color:var(--t2)}
.lc .mstep i.d{background:var(--g);color:#fff}
.lc .mlink{display:flex;gap:8px;align-items:center;background:var(--s2);border-radius:12px;padding:6px 6px 6px 14px;margin-top:18px}
.lc .mlink span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}
.lc .ts{padding:16px;border-radius:14px;margin:12px 0 6px}
.lc .tsh{display:flex;justify-content:space-between;align-items:center;gap:12px}
.lc .tsl{display:flex;align-items:center;gap:10px;min-width:0}
.lc .tsy{font-size:17px;font-weight:600;letter-spacing:-.01em;white-space:nowrap}
.lc .dir{font-size:11px;font-weight:600;padding:3px 10px;border-radius:99px}
.lc .dir.l{color:var(--g);background:color-mix(in srgb,var(--g) 14%,transparent)}
.lc .dir.s{color:var(--r);background:color-mix(in srgb,var(--r) 14%,transparent)}
.lc .tsr{font-size:20px;font-weight:600;letter-spacing:-.01em;white-space:nowrap}
.lc .tss{font-size:13px;color:var(--t2);margin-top:4px}
.lc .ts .rail{height:8px;border-radius:99px;margin:20px 4px 12px}
.lc .ts .rl{font-size:11.5px}
.lc .ts .rl span{white-space:nowrap}
.lc .tsf{display:inline-flex;align-items:center;gap:6px;margin-top:14px;font-size:12px;font-weight:600;padding:5px 11px;border-radius:99px;color:var(--g);background:color-mix(in srgb,var(--g) 14%,transparent)}
.lc .tsf.w{color:var(--am);background:color-mix(in srgb,var(--am) 16%,transparent)}
.lc .pfs{display:flex;align-items:center;gap:20px;margin:8px 0}
.lc .pfi{display:inline-flex;align-items:center;gap:4px;min-height:40px;padding:0;margin:0;font:inherit;font-size:12.5px;line-height:1;color:var(--tx);background:none;border:0;text-align:left;white-space:nowrap}
.lc .pfi b{font-weight:600;font-size:inherit;line-height:1}
.lc .pfi .t2{line-height:1}
.lc .dkbar{display:flex;align-items:center;justify-content:space-between;gap:16px;position:sticky;top:0;z-index:20;background:var(--bg);padding:14px 0 14px;margin-bottom:6px;border-bottom:1px solid var(--ln)}
.lc .dkbar .tg{width:auto;min-width:420px;max-width:520px;flex:0 1 480px}
.lc .dkbar .btn{width:auto;height:42px;padding:0 20px;border-radius:12px}
.lc .dkg{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:28px;align-items:start;margin-top:18px}
.lc .dkg2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:28px;align-items:start;margin-top:6px}
.lc .dkside{position:sticky;top:78px;display:flex;flex-direction:column;gap:16px;min-width:0}
.lc .dkside .card{padding:16px 16px 6px}
.lc .dkside .lb:first-child{margin-top:0}
.lc .dkside .row:last-child{border-bottom:0}
.lc .stk{display:flex;flex-direction:column;gap:14px}
.lc .stk>.pc{margin-top:0}
.lc .dkcards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.lc .dkcards>.pc{margin-top:0}
.lc .dkcards3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:start}
.lc .dkcards3>.card{margin-top:0}
.lc .bds{display:flex;flex-direction:column;gap:2px;margin:0 -6px 10px}
.lc .bds button{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:40px;padding:0 12px;border-radius:10px;font-weight:500;color:var(--t2);transition:background .15s,color .15s}
.lc .bds button:hover{background:color-mix(in srgb,var(--am) 10%,transparent);color:var(--tx)}
.lc .bds button.on{background:var(--am);color:var(--on);font-weight:600}
.lc .bds button .n{font-size:12px;opacity:.85}
.lc .bds .dotc{margin-right:8px}
@media (hover:hover){.lc .pc{transition:border-color .15s,box-shadow .15s}.lc .pc:hover{border-color:color-mix(in srgb,var(--am) 40%,var(--ln))}.lc .jt:hover,.lc .card.mcd:hover{border-color:color-mix(in srgb,var(--am) 40%,var(--ln))}}
@media (max-width:1180px){.lc .dkg{grid-template-columns:minmax(0,1fr) 300px;gap:20px}.lc .dkcards3{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:980px){.lc .dkg,.lc .dkg2{grid-template-columns:minmax(0,1fr)}.lc .dkside{position:static}.lc .dkcards{grid-template-columns:minmax(0,1fr)}}`;

const PA = {
  plus: "M12 5v14M5 12h14", chev: "M9 6l6 6-6 6", check: "M5 12l5 5L20 7", x: "M6 6l12 12M18 6L6 18",
  chat: "M4 5h16v11H9l-5 4V5z", up: "M6 14l6-6 6 6", bm: "M7 4h10v16l-5-4-5 4V4z", flt: "M4 6h16M7 12h10M10 18h4",
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM6 11a6 6 0 0 0 12 0M12 17v4",
  micx: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM6 11a6 6 0 0 0 12 0M12 17v4M4 4l16 16",
  hand: "M9 12V5a1.5 1.5 0 0 1 3 0v6M12 11V4a1.5 1.5 0 0 1 3 0v7M15 11V6a1.5 1.5 0 0 1 3 0v7a6 6 0 0 1-6 6h-1a5 5 0 0 1-4-2l-3-5a1.5 1.5 0 0 1 2.4-1.8L9 14",
  scr: "M3 5h18v11H3zM8 20h8M12 16v4",
};
const Ic = ({ n, s = 20, fill }) => (
  <svg viewBox="0 0 24 24" width={s} height={s} fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={PA[n]} /></svg>
);
const Dots = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
);

const num = (v) => +v || 0;
const px = (v) => { v = num(v); return v >= 1000 ? v.toFixed(1) : v >= 100 ? v.toFixed(2) : v.toFixed(4); };
const rr = (v) => `${v < 0 ? "\u2212" : "+"}${Math.abs(v).toFixed(1)}R`;
const cl = (v) => (v >= 0 ? "g" : "r");
const K = (t) => {
  const d = t.side, risk = Math.abs(num(t.e) - num(t.s)) * num(t.z);
  const p = t.x != null ? num(t.x) : (t.c != null ? num(t.c) : num(t.e));
  const pnl = (p - num(t.e)) * d * num(t.z);
  return { risk, pnl, r: risk ? pnl / risk : 0 };
};
const AGO = (m) => (m < 1 ? "Just now" : m < 60 ? `${Math.round(m)}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`);
const clk = (s) => `${Math.floor(s / 60)}:${(`0${s % 60}`).slice(-2)}`;
const ini2 = (h) => String(h).replace("@", "").slice(0, 2).toUpperCase();
const BCOL = { Setups: "var(--g)", Reviews: "var(--am)", Psychology: "#8B7CF6", Risk: "var(--r)" };
const RC = { Audio: "var(--am)", Video: "var(--g)", Focus: "var(--t2)", "Check-in": "var(--am)" };
const POOL = ["@nightowl_fx", "@maya_r", "@quietbreakout", "@tape_reader"];
const MCAND = ["@maya_r", "@nightowl_fx", "@quietbreakout"];
const RL = ["Waited for candle close", "Risk under 1%", "Held the stop"];
const CHL = [["No revenge trades", "7 days, 128 joined", 3, 5], ["Journal every session", "10 days, 342 joined", 6, 10], ["Hold your stops", "5 days, 87 joined", 2, 5]];
const NPT = [
  { h: "@tape_reader", board: "Risk", title: "How do you size after three losses in a row?", note: "I keep wanting to size down hard after a bad run. What is your rule?" },
  { h: "@nightowl_fx", board: "Psychology", title: "Journaling before the open changed my first hour", note: "Two lines on my plan before the session. I stopped taking the first impulse trade." },
];
const PF = DEMO.PF, TRADES = DEMO.T;

const Kind = ({ k }) => <span className="tag" style={{ margin: "0 8px 0 0", color: RC[k], borderColor: RC[k] }}>{k}</span>;
const Av = ({ text, size, fs, photo }) => (
  <span className="av" style={{ ...(size ? { width: size, height: size } : {}), ...(fs ? { fontSize: fs } : {}) }}>
    {photo ? <img src={photo} alt="Profile" /> : text}
  </span>
);
function Rail({ t }) {
  const a = num(t.s), b = num(t.tp), w = (b - a) || 1, c01 = (x) => Math.max(0, Math.min(1, x));
  const fe = c01((num(t.e) - a) / w), k = K(t);
  const c = t.x != null ? num(t.x) : (t.c != null ? num(t.c) : num(t.e));
  const fc = c01((c - a) / w), col = `var(--${k.pnl >= 0 ? "g" : "r"})`;
  return (
    <>
      <div className="rail">
        <i className="rf" style={{ left: `${Math.min(fe, fc) * 100}%`, width: `${Math.abs(fc - fe) * 100}%`, background: col }} />
        <i className="re" style={{ left: `${fe * 100}%` }} />
        <i className="rd" style={{ left: `${fc * 100}%`, background: col }} />
      </div>
      <div className="rl"><span>Stop {px(t.s)}</span><span>Entry {px(t.e)}</span><span>Target {px(t.tp)}</span></div>
    </>
  );
}

export default function LedgerCommunity({ isDesktop, communityAvatar, openMember, openMyProfile, myDiscipline }) {
  const nid = useRef(100);
  const [tab, setTab] = useState("feed");
  const [F, setF] = useState(() => DEMO.F.map((p, i) => ({ ...p, id: i + 1, my: false, sv: false, cmts: p.cmts.map((c) => ({ ...c })) })));
  const [fol, setFol] = useState({ "@nightowl_fx": 1, "@maya_r": 1, "@zoe_swing": 1, "@tape_reader": 1, "@lena_fx": 1 });
  const [mute, setMute] = useState({});
  const [bd, setBd] = useState("All");
  const [fsort, setFsort] = useState("new");
  const [fq, setFq] = useState("");
  const [np, setNp] = useState([]);
  const [ex, setEx] = useState({});
  const [sheet, setSheet] = useState(null);
  const [ci, setCi] = useState("");
  const [ask, setAsk] = useState({ t: "", n: "", b: "Setups", edi: null });
  const [dc, setDc] = useState(false);
  const [RO, setRO] = useState(DEMO.RO);
  const [rf, setRf] = useState("All");
  const [rem, setRem] = useState({});
  const [rtitle, setRtitle] = useState("");
  const [rm, setRm] = useState(null);
  const [rc, setRc] = useState("");
  const [chj, setChj] = useState({});
  const [lp, setLp] = useState("week");
  const [mn, setMn] = useState(null);
  const [rq, setRq] = useState([]);
  const [mnn, setMnn] = useState("");
  const [mnc, setMnc] = useState("");
  const [mfi, setMfi] = useState(null);
  const [mq, setMq] = useState("");
  const [mrs, setMrs] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const tt = useRef(null), mtm = useRef(null), mnRef = useRef(null);
  mnRef.current = mn;

  const toast = (m) => { setToastMsg(m); clearTimeout(tt.current); tt.current = setTimeout(() => setToastMsg(""), 2200); };
  useEffect(() => () => { clearTimeout(tt.current); clearTimeout(mtm.current); }, []);
  useEffect(() => { const id = setTimeout(() => setNp([NPT[0]]), 20000); return () => clearTimeout(id); }, []);
  useEffect(() => {
    if (!rm) return undefined;
    const id = setInterval(() => setRm((r) => {
      if (!r) return r;
      const t2 = r.t2 + 1, f = r.k === "Focus";
      return { ...r, t2, sec: f && r.sec > 0 ? r.sec - 1 : r.sec, sp: !f && t2 % 2 === 0 ? r.sp + 1 : r.sp };
    }), 1000);
    return () => clearInterval(id);
  }, [!!rm]);

  const close = () => { setSheet(null); setDc(false); setMrs(false); };
  const goProf = (h) => { close(); if (h === "@you") openMyProfile(); else openMember(String(h).replace(/^@/, "")); };
  const patchPost = (id, fn) => setF((L) => L.map((p) => (p.id === id ? fn(p) : p)));
  const postById = (id) => F.find((p) => p.id === id);
  const mNameOf = (m) => (m ? (m.h && PF[m.h] ? PF[m.h].n : m.name) : "");

  // ---------- Feed ----------
  const FPN = () => (bd !== "All" ? 1 : 0) + (fsort !== "new" ? 1 : 0);
  const filtered = () => {
    const qq = fq.trim().toLowerCase();
    return F.filter((p) => !mute[p.h] && (bd === "All" || (bd === "Saved" ? p.sv : p.board === bd))
      && (!qq || [p.title, p.note, p.h, p.board, p.sym, p.su].join(" ").toLowerCase().indexOf(qq) > -1))
      .sort((a, b) => (fsort === "top" ? (b.hc + (b.my ? 1 : 0)) - (a.hc + (a.my ? 1 : 0)) : a.age - b.age));
  };
  const showNew = () => {
    setF((L) => [...np.map((x) => ({ ...x, id: nid.current++, age: 0, ago: "now", hc: 0, cmts: [], my: false, sv: false })), ...L]);
    setNp([]); setBd("All"); setFsort("new");
  };
  const PostCard = (p) => {
    const tr = p.e != null, pf = PF[p.h], me = p.h === "@you", bc = BCOL[p.board] || "var(--t2)";
    const nc = p.cmts.length, an = p.cmts.some((c) => c.best), nf = (p.rules || []).filter(Boolean).length;
    return (
      <article className="pc" key={p.id}>
        <div className="ph">
          <button type="button" className="pa" onClick={() => goProf(p.h)}>
            {me ? <Av size={40} fs={13} text="YO" photo={communityAvatar} /> : <span className="av">{ini2(p.h)}</span>}
            <span className="pn"><b>{p.h}</b><span className="t2 s12">{pf ? `${pf.role} · ` : ""}{p.ago === "now" ? "Just now" : `${p.ago} ago`}</span></span>
          </button>
          {!me && <button type="button" className={`fwb${fol[p.h] ? " on" : ""}`} onClick={() => setFol((f) => ({ ...f, [p.h]: f[p.h] ? 0 : 1 }))}>{fol[p.h] ? "Following" : "Follow"}</button>}
          <button type="button" className="pmn" aria-label="More options" onClick={() => { setDc(false); setSheet({ t: "pm", id: p.id }); }}><Dots /></button>
        </div>
        <div className="bl">
          <span className="bt" style={{ "--bc": bc }}><i className="dotc" style={{ background: bc }} />{p.board}</span>
          {an && <span className="ans"><Ic n="check" s={12} />Answered</span>}
        </div>
        <button type="button" className="ttl" onClick={() => setSheet({ t: "post", id: p.id })}>{p.title}</button>
        {tr && (
          <div className="ts">
            <div className="tsh">
              <span className="tsl"><b className="tsy">{p.sym}</b><span className={`dir ${p.side > 0 ? "l" : "s"}`}>{p.side > 0 ? "Long" : "Short"}</span></span>
              <b className={`tsr ${cl(p.r)}`}>{rr(p.r)}</b>
            </div>
            {p.su && <div className="tss">{p.su} setup</div>}
            <Rail t={p} />
            <span className={`tsf${nf < 3 ? " w" : ""}`}><Ic n="check" s={12} />Followed {nf} of 3 rules</span>
          </div>
        )}
        {p.note && (
          <>
            <div className={`nt${ex[p.id] ? " ex" : ""}`}>{p.note}</div>
            {p.note.length > 150 && <button type="button" className="rmr" onClick={() => setEx((e) => ({ ...e, [p.id]: !e[p.id] }))}>{ex[p.id] ? "Show less" : "Read more"}</button>}
          </>
        )}
        <div className="pf">
          <button type="button" className={`act${p.my ? " on" : ""}`} onClick={() => patchPost(p.id, (x) => ({ ...x, my: !x.my }))}><Ic n="up" s={16} />Helpful {p.hc + (p.my ? 1 : 0)}</button>
          <button type="button" className="act" onClick={() => setSheet({ t: "post", id: p.id })}><Ic n="chat" s={16} />{nc}{p.board === "Reviews" ? " feedback" : nc === 1 ? " comment" : " comments"}</button>
          <span style={{ flex: 1 }} />
          <button type="button" className={`act sv${p.sv ? " on" : ""}`} aria-pressed={!!p.sv} aria-label={p.sv ? "Remove from saved" : "Save post"} onClick={() => patchPost(p.id, (x) => ({ ...x, sv: !x.sv }))}><Ic n="bm" s={22} fill={p.sv} /></button>
        </div>
      </article>
    );
  };
  const PersonRow = (h, me) => {
    const p = PF[h];
    return (
      <div className="row" key={h}>
        <button type="button" style={{ display: "flex", gap: 12, alignItems: "center", flex: 1, minWidth: 0, textAlign: "left", minHeight: 48 }} onClick={() => goProf(h)}>
          <span className="av" style={{ width: 44, height: 44, fontSize: 14 }}>{p.n.slice(0, 2).toUpperCase()}</span>
          <span style={{ minWidth: 0 }}><b>{p.n}</b>{me ? <span className="tag">Follows you</span> : null}<div className="t2 s12">{h}, {p.role}</div></span>
        </button>
        <button type="button" className={`chip${fol[h] ? "" : " on"}`} style={{ margin: 0, flex: "none" }} onClick={() => setFol((f) => ({ ...f, [h]: f[h] ? 0 : 1 }))}>{fol[h] ? "Following" : "Follow"}</button>
      </div>
    );
  };
  const Suggest = () => {
    const l = Object.keys(PF).filter((h) => !fol[h]).sort((a, b) => PF[b].ds - PF[a].ds).slice(0, 3);
    if (!l.length) return null;
    return (
      <>
        <div className="lb"><span>Traders to follow</span><span>Ranked by discipline</span></div>
        {l.map((h) => {
          const p = PF[h];
          return (
            <div className="row" key={h}>
              <button type="button" style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: 0 }} onClick={() => goProf(h)}>
                <span className="av">{p.n.slice(0, 2).toUpperCase()}</span>
                <span><b>{p.n}</b><div className="t2 s12">{p.role}, discipline {p.ds}%</div></span>
              </button>
              <button type="button" className="chip on" style={{ margin: 0 }} onClick={() => setFol((f) => ({ ...f, [h]: 1 }))}>Follow</button>
            </div>
          );
        })}
      </>
    );
  };
  const FeedView = () => {
    const q = filtered(), sr = fq.trim(), k = sr.toLowerCase().replace(/^@/, "");
    const pe = k ? Object.keys(PF).filter((h) => h.slice(1).toLowerCase().indexOf(k) > -1 || PF[h].n.toLowerCase().indexOf(k) > -1 || PF[h].role.toLowerCase().indexOf(k) > -1) : [];
    const act = [];
    if (bd !== "All") act.push(["bd", bd]);
    if (fsort !== "new") act.push(["so", "Most helpful"]);
    const main = (
      <>
        {np.length > 0 && <div className="npw"><button type="button" className="npp" onClick={showNew}><Ic n="up" s={16} />{np.length} {np.length === 1 ? "new post" : "new posts"}</button></div>}
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <input type="search" className="in" style={{ margin: 0, flex: 1, width: "auto" }} placeholder="Search posts and people" aria-label="Search posts" value={fq} onChange={(e) => setFq(e.target.value)} />
          {!isDesktop && <button type="button" className="fbn" aria-label="Open filters" onClick={() => setSheet({ t: "filter" })}><Ic n="flt" s={18} />Filter{FPN() ? <b className="bdg">{FPN()}</b> : null}</button>}
          {isDesktop && <div className="tg" style={{ flex: "none", width: 230 }}>{[["new", "Latest"], ["top", "Most helpful"]].map(([v, l]) => <button key={v} type="button" className={fsort === v ? "on" : ""} onClick={() => setFsort(v)}>{l}</button>)}</div>}
        </div>
        {act.length > 0 && (
          <div className="chips" style={{ marginTop: 12 }}>
            {act.map((x) => <button key={x[0]} type="button" className="chip on" style={{ gap: 6 }} onClick={() => (x[0] === "bd" ? setBd("All") : setFsort("new"))}>{x[1]}<Ic n="x" s={12} /></button>)}
            <button type="button" className="am" style={{ minHeight: 40, padding: "0 8px" }} onClick={() => { setBd("All"); setFsort("new"); }}>Clear all</button>
          </div>
        )}
        <div>
          {pe.length > 0 && (
            <>
              <div className="lb"><span>People</span><span>{pe.length}</span></div>
              <div className="card" style={{ padding: "2px 16px" }}>{pe.slice(0, 6).map((h) => PersonRow(h, false))}</div>
              {q.length > 0 && <div className="lb"><span>Posts</span><span>{q.length}</span></div>}
            </>
          )}
          {q.length ? (
            <>
              {isDesktop ? (
                <div className="stk" style={{ marginTop: 14 }}>{q.map(PostCard)}</div>
              ) : (
                <>
                  {q.slice(0, 2).map(PostCard)}
                  {bd === "All" && !sr && Suggest()}
                  {q.slice(2).map(PostCard)}
                </>
              )}
            </>
          ) : (
            <div className="t2" style={{ padding: "30px 0", textAlign: "center" }}>
              {pe.length ? "" : sr ? `No posts or people match "${sr}".` : bd === "Saved" ? "Nothing saved yet. Tap the bookmark on a post." : "No posts in this board yet. Start the first one."}
            </div>
          )}
          <div className="t2 s12" style={{ marginTop: 14, textAlign: "center" }}>Trade posts show R, never dollars.</div>
        </div>
      </>
    );
    if (!isDesktop) return main;
    const cnt = { All: F.length, Saved: F.filter((x) => x.sv).length };
    F.forEach((x) => { cnt[x.board] = (cnt[x.board] || 0) + 1; });
    return (
      <div className="dkg">
        <div style={{ minWidth: 0 }}>{main}</div>
        <aside className="dkside">
          <div className="card">
            <div className="lb"><span>Boards</span><span>{F.length} posts</span></div>
            <div className="bds">
              {["All", "Saved", "Setups", "Reviews", "Psychology", "Risk"].map((b) => (
                <button key={b} type="button" className={bd === b ? "on" : ""} onClick={() => setBd(b)}>
                  <span style={{ display: "flex", alignItems: "center" }}>{BCOL[b] && <i className="dotc" style={{ background: bd === b ? "var(--on)" : BCOL[b] }} />}{b}</span>
                  <span className="n">{cnt[b] || 0}</span>
                </button>
              ))}
            </div>
          </div>
          {Object.keys(PF).some((h) => !fol[h]) && <div className="card">{Suggest()}</div>}
          <div className="t2 s12" style={{ padding: "0 4px", lineHeight: 1.5 }}>Keep posts about process. Trade posts show R multiples, never dollars or account size.</div>
        </aside>
      </div>
    );
  };

  // ---------- Rooms ----------
  const openRoom = (r) => { setRc(""); setRm(r); setSheet({ t: "room" }); };
  const mkRoom = (k, t, h, n) => ({ k, t, h, n, sp: 0, mu: true, hand: false, shr: false, sec: 2700, t2: 0, rule: "", notes: "", chat: [["@maya_r", "My line is 1.0890. I wait for the close."], ["@nightowl_fx", "Same. No entry before the close."]] });
  const leaveRoom = () => {
    const r = rm, t = r && ((r.notes || "").trim() || (r.rule ? `Rule: ${r.rule}` : ""));
    if (t) {
      try { const a = JSON.parse(localStorage.getItem("ledger-room-notes") || "[]"); a.unshift({ at: Date.now(), room: r.t, text: t.slice(0, 200) }); localStorage.setItem("ledger-room-notes", JSON.stringify(a.slice(0, 50))); } catch (e) {}
      toast("Room notes saved on this device");
    }
    setRm(null); close();
  };
  const RoomsView = () => {
    const L = RO.map((r, i) => [r, i]).filter((x) => rf === "All" || x[0].k === rf);
    const lv = L.filter((x) => x[0].live), up = L.filter((x) => !x[0].live);
    const startBtn = (
      <button type="button" className="btn" style={isDesktop ? { width: "auto", height: 42, padding: "0 20px" } : { margin: "14px 0 4px" }} onClick={() => { setRtitle(""); setSheet({ t: "mk" }); }}><Ic n="plus" s={18} />Start a room</button>
    );
    const filters = (
      <div className="chips" style={isDesktop ? { margin: 0 } : { marginTop: 12 }}>
        {["All", "Audio", "Video", "Focus"].map((k) => <button key={k} type="button" className={`chip${rf === k ? " on" : ""}`} onClick={() => setRf(k)}>{k}</button>)}
      </div>
    );
    const liveCards = () => (lv.length ? lv.map((x) => {
      const r = x[0];
      return (
        <div className="pc" style={{ marginTop: 10 }} key={x[1]}>
          <div className="rw s12"><span style={{ display: "flex", alignItems: "center" }}><Kind k={r.k} /><span className="live" /><span className="t2">Live, {r.min} min</span></span><span className="t2">{r.n} here</span></div>
          <div className="ttl" style={{ margin: "10px 0 4px" }}>{r.t}</div>
          <div className="t2 s12">Hosted by {r.h}</div>
          <div className="rw" style={{ marginTop: 12 }}>
            <span style={{ display: "flex" }}>{["NI", "MR", "QB"].map((s2, i) => <span key={s2} className="av" style={{ width: 28, height: 28, fontSize: 10, marginLeft: i ? -8 : 0, border: "2px solid var(--s1)" }}>{s2}</span>)}</span>
            <button type="button" className="btn" style={{ width: 96, height: 40 }} onClick={() => openRoom(mkRoom(r.k, r.t, r.h, r.n + 1))}>Join</button>
          </div>
        </div>
      );
    }) : <div className="t2">No live rooms of this type. Start one.</div>);
    const upRows = () => (up.length ? up.map((x) => {
      const r = x[0], i = x[1], pp = r.at.split(", "), d = pp[0].split(" ");
      return (
        <div className="row" key={i}>
          <span style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
            <span className="db"><b>{d.slice(1).join(" ")}</b><span>{pp[1]}</span></span>
            <span style={{ minWidth: 0 }}><Kind k={r.k} /><div style={{ marginTop: 4 }}><b>{r.t}</b></div><div className="t2 s12">Hosted by {r.h}</div></span>
          </span>
          <button type="button" className={`chip${rem[i] ? " on" : ""}`} style={{ margin: 0, flex: "none" }} onClick={() => { setRem((m) => ({ ...m, [i]: !m[i] })); toast(rem[i] ? "Reminder removed" : "Reminder set"); }}>{rem[i] ? "Set" : "Remind"}</button>
        </div>
      );
    }) : <div className="t2">Nothing scheduled.</div>);
    if (isDesktop) {
      return (
        <>
          <div className="rw" style={{ margin: "18px 0 0", gap: 16 }}>{filters}{startBtn}</div>
          <div className="dkg" style={{ marginTop: 6 }}>
            <div style={{ minWidth: 0 }}>
              <div className="lb"><span>Live now</span><span>{lv.length} rooms</span></div>
              <div className="dkcards">{liveCards()}</div>
            </div>
            <aside className="dkside">
              <div className="card">
                <div className="lb"><span>Upcoming</span><span>{up.length} scheduled</span></div>
                {upRows()}
              </div>
            </aside>
          </div>
        </>
      );
    }
    return (
      <>
        {startBtn}
        {filters}
        <div className="lb"><span>Live now</span><span>{lv.length} rooms</span></div>
        {liveCards()}
        <div className="lb"><span>Upcoming</span></div>
        {upRows()}
      </>
    );
  };

  // ---------- Ranks ----------
  const you = Math.round(myDiscipline != null && Number.isFinite(myDiscipline) ? myDiscipline : 86);
  const board = lp === "week"
    ? [["@maya_r", 94], ["You", you], ["@nightowl_fx", 83], ["@quietbreakout", 79], ["@tape_reader", 71]]
    : [["@maya_r", 91], ["@nightowl_fx", 85], ["You", Math.max(0, you - 2)], ["@quietbreakout", 80], ["@tape_reader", 69]];
  const RanksView = () => {
    const challenges = (
      <>
        <div className="lb" style={isDesktop ? { marginTop: 0 } : undefined}><span>Challenges</span><span>Build habits with others</span></div>
        <div className={isDesktop ? "stk" : undefined}>
          {CHL.map((c, i) => {
            const j = chj[i];
            return (
              <div className="pc" style={{ marginTop: 10 }} key={c[0]}>
                <div className="rw"><span><b>{c[0]}</b><div className="t2 s12">{c[1]}</div></span><button type="button" className={`chip${j ? " on" : ""}`} style={{ margin: 0 }} onClick={() => setChj((m) => ({ ...m, [i]: !m[i] }))}>{j ? "Joined" : "Join"}</button></div>
                {j && (<><div className="bar" style={{ marginTop: 12 }}><i style={{ width: `${(c[2] / c[3]) * 100}%` }} /></div><div className="t2 s12" style={{ marginTop: 6 }}>{c[2]} of {c[3]} days complete</div></>)}
              </div>
            );
          })}
        </div>
      </>
    );
    const rows = board.map((x, i) => {
      const y = x[0] === "You";
      return (
        <div className="row" key={x[0]} style={y ? { background: "color-mix(in srgb,var(--am) 12%,var(--s1))", borderRadius: 10, paddingLeft: 10, paddingRight: 10 } : undefined}>
          <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span className="t2" style={{ width: 16 }}>{i + 1}</span>
            {y ? <b className="am">You</b> : <button type="button" onClick={() => goProf(x[0])}><b>{x[0]}</b></button>}
          </span>
          <b>{x[1]}%</b>
        </div>
      );
    });
    const leaderboard = (
      <>
        <div className="lb" style={isDesktop ? { marginTop: 0 } : undefined}><span>Discipline leaderboard</span><span>Ranked by process, not profit</span></div>
        <div className="chips">
          <button type="button" className={`chip${lp === "week" ? " on" : ""}`} onClick={() => setLp("week")}>This week</button>
          <button type="button" className={`chip${lp === "month" ? " on" : ""}`} onClick={() => setLp("month")}>This month</button>
        </div>
        {isDesktop ? <div className="card" style={{ padding: "4px 16px" }}>{rows}</div> : rows}
      </>
    );
    if (isDesktop) {
      return (
        <div className="dkg2" style={{ marginTop: 20 }}>
          <div style={{ minWidth: 0 }}>{challenges}</div>
          <div style={{ minWidth: 0 }}>{leaderboard}</div>
        </div>
      );
    }
    return <>{challenges}{leaderboard}</>;
  };

  // ---------- Mentor ----------
  const startMentor = () => {
    clearTimeout(mtm.current);
    mtm.current = setTimeout(() => {
      const cur = mnRef.current;
      if (!cur || cur.st !== "pending") return;
      setMn({ ...cur, st: "on", since: "Today", focus: 2, note: "Hold the stop on every trade this week. No moving it, no widening it." });
      setRq([
        { id: 3, st: "done", g: "B", good: "You waited for the close and kept your risk under 1%. That is the process I want to see.", fix: "Your target was close and you exited early. Plan the exit before you enter.", th: [] },
        { id: 4, st: "done", g: "C", good: "You took a setup from your own playbook.", fix: "You moved the stop. Decide it once and leave it alone.", th: [] },
      ]);
      toast(`${mNameOf(cur)} is now your mentor`);
    }, 2500);
  };
  const reqMentor = (h) => { setMn({ h, st: "pending" }); setTimeout(startMentor, 0); toast(`Request sent to ${PF[h].n}`); };
  const MentorBtn = (h) => {
    const st = { height: 44, flex: 1 };
    if (mn && mn.h === h) return mn.st === "on" ? <button type="button" className="btn o" style={st} onClick={() => setTab("mentor")}>Your mentor</button> : <button type="button" className="btn o" style={st} onClick={() => toast("Request sent. Waiting for a reply.")}>Request sent</button>;
    if (mn) return <button type="button" className="btn o" style={st} onClick={() => toast("You already have a mentor. End it in the Mentor tab to switch.")}>Request mentor</button>;
    return <button type="button" className="btn o" style={st} onClick={() => { reqMentor(h); setTab("mentor"); }}>Request mentor</button>;
  };
  const MentorView = () => {
    const m = mn;
    if (!m) {
      return (
        <>
          <div className="card" style={{ marginTop: 12 }}>
            <div className="big2">Learn faster with a mentor</div>
            <div className="t2 s12" style={{ marginTop: 6, lineHeight: 1.5 }}>Share your journaled trades and get clear feedback from someone who trades well.</div>
            {["Send any journaled trade for review", "Get a grade, what worked and what to fix", "Work on one focus rule each week"].map((s) => <div className="mck" key={s}><Ic n="check" s={16} /><span>{s}</span></div>)}
            <div className="t2 s12" style={{ marginTop: 14 }}>Mentors see R multiples only, never dollars or account size.</div>
          </div>
          <div className="lb"><span>Mentors on Ledger</span><span>Tap one to see their profile</span></div>
          <div className={isDesktop ? "dkcards3" : undefined}>
          {MCAND.map((h) => {
            const f = PF[h];
            return (
              <div className="card mcd" key={h}>
                <button type="button" className="mph" onClick={() => goProf(h)} aria-label={`View ${f.n} profile`}>
                  <span className="av" style={{ width: 52, height: 52, fontSize: 16 }}>{h.slice(1, 3).toUpperCase()}</span>
                  <span style={{ flex: 1, minWidth: 0 }}><b>{f.n}</b><div className="t2 s12">{f.role}</div></span>
                  <span className="t2" style={{ flex: "none" }}><Ic n="chev" s={18} /></span>
                </button>
                <div className="t2 s12 mbio" style={{ marginTop: 8, lineHeight: 1.5 }}>{f.bio}</div>
                <div className="mtiles">
                  <div className="mtile"><b>{f.ds}%</b><span>Discipline</span></div>
                  <div className="mtile"><b>{f.st} days</b><span>Streak</span></div>
                  <div className="mtile"><b>{f.ses}</b><span>Session</span></div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <button type="button" className="btn o" style={{ height: 44, flex: 1 }} onClick={() => goProf(h)}>View profile</button>
                  <button type="button" className="btn" style={{ height: 44, flex: 1 }} onClick={() => reqMentor(h)}>Request</button>
                </div>
              </div>
            );
          })}
          </div>
          <div className="card minv">
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span className="mic"><Ic n="plus" s={18} /></span>
              <span><b>Already have a mentor?</b><div className="t2 s12" style={{ marginTop: 2, lineHeight: 1.4 }}>Invite them with a private link, even if they are not on Ledger.</div></span>
            </div>
            <button type="button" className="btn o" style={{ height: 44, marginTop: 14, width: "100%" }} onClick={() => { setMnn(""); setMnc(""); setSheet({ t: "mis" }); }}>Invite my mentor</button>
          </div>
        </>
      );
    }
    const n = mNameOf(m), ini = (m.h ? m.h.slice(1, 3) : (n || "?").trim().split(/\s+/).map((w) => w[0] || "").join("").slice(0, 2)).toUpperCase();
    const role = m.h && PF[m.h] ? PF[m.h].role : "Your mentor";
    if (m.st === "pending") {
      if (m.link) {
        return (
          <div className="card" style={{ marginTop: 12 }}>
            <div className="rw"><span style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}><span className="av" style={{ width: 48, height: 48, fontSize: 15 }}>{ini}</span><span style={{ minWidth: 0 }}><b>{n}</b><div className="t2 s12">Invite pending</div></span></span><span className="jst need">Not accepted yet</span></div>
            <div className="mstep"><i className="d"><Ic n="check" s={12} /></i><span>Private link created</span></div>
            <div className="mstep"><i>2</i><span>Send it to {n}<div className="t2 s12" style={{ marginTop: 2 }}>They open it to start reviewing your trades.</div></span></div>
            <div className="mstep"><i>3</i><span>They accept and leave feedback<div className="t2 s12" style={{ marginTop: 2 }}>You will see it here, in R only.</div></span></div>
            <div className="mlink"><span>{m.link}</span><button type="button" className="chip on" style={{ margin: 0, flex: "none" }} onClick={() => { try { navigator.clipboard.writeText(`https://${m.link}`).then(() => toast("Link copied"), () => toast("Could not copy")); } catch (e) { toast("Could not copy"); } }}>Copy</button></div>
            <button type="button" className="btn" style={{ marginTop: 14 }} onClick={() => { const u = `https://${m.link}`; if (navigator.share) navigator.share({ title: "Ledger mentor invite", text: "Review my trades on Ledger", url: u }).catch(() => {}); else { try { navigator.clipboard.writeText(u).then(() => toast("Link copied")); } catch (e) { toast("Could not copy"); } } }}>Share link</button>
            <button type="button" className="btn o" style={{ marginTop: 10 }} onClick={() => { clearTimeout(mtm.current); setMn(null); }}>Cancel invite</button>
            <div className="t2 s12" style={{ marginTop: 12, textAlign: "center" }}>The link is a placeholder until Ledger has accounts.</div>
          </div>
        );
      }
      return (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="rw"><span style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}><span className="av" style={{ width: 48, height: 48, fontSize: 15 }}>{ini}</span><span style={{ minWidth: 0 }}><b>{n}</b><div className="t2 s12">{role}</div></span></span><span className="jst need">Request sent</span></div>
          <div className="t2" style={{ marginTop: 14, lineHeight: 1.5 }}>Waiting for {n} to accept. You will be notified here.</div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button type="button" className="btn o" style={{ height: 44, flex: 1 }} onClick={() => goProf(m.h)}>View profile</button>
            <button type="button" className="btn o" style={{ height: 44, flex: 1 }} onClick={() => { clearTimeout(mtm.current); setMn(null); }}>Cancel</button>
          </div>
        </div>
      );
    }
    const C = TRADES.filter((t) => t.x != null), fl = m.focus, fo = C.filter((t) => t.rules[fl]).length, pc = C.length ? Math.round((fo / C.length) * 100) : 0;
    const rv = rq.filter((r) => TRADES.some((t) => t.id === r.id)), dn = rv.filter((r) => r.st === "done").length;
    return (
      <>
        <div className="card" style={{ marginTop: 12 }}>
          <div className="rw" style={{ gap: 4 }}>
            {m.h ? (
              <button type="button" className="mph" onClick={() => goProf(m.h)} aria-label={`View ${n} profile`}>
                <span className="av" style={{ width: 48, height: 48, fontSize: 15 }}>{ini}</span>
                <span style={{ flex: 1, minWidth: 0 }}><b>{n}</b><div className="t2 s12">{role}</div></span>
                <span className="t2" style={{ flex: "none" }}><Ic n="chev" s={18} /></span>
              </button>
            ) : (
              <span className="mph"><span className="av" style={{ width: 48, height: 48, fontSize: 15 }}>{ini}</span><span style={{ flex: 1, minWidth: 0 }}><b>{n}</b><div className="t2 s12">{role}</div></span></span>
            )}
            <button type="button" className="pmn" aria-label="Mentor options" onClick={() => { setMrs(false); setSheet({ t: "mmg" }); }}><Dots /></button>
          </div>
          <div className="t2 s12" style={{ marginTop: 8 }}>Mentoring you since {m.since === "Today" ? "Mon 2 Nov" : m.since}</div>
          {m.h && <button type="button" className="btn o" style={{ height: 44, marginTop: 12, width: "100%" }} onClick={() => goProf(m.h)}>View profile</button>}
        </div>
        <div className="lb"><span>This week’s focus</span><span>Set by {n.split(" ")[0]}</span></div>
        <div className="card">
          <div className="cht">{RL[fl]}</div>
          <div className="t2 s12" style={{ marginTop: 4, lineHeight: 1.5 }}>{m.note}</div>
          <div className="mbar"><i style={{ width: `${pc}%` }} /></div>
          <div className="rw s12"><span className="t2">Followed on {fo} of {C.length} trades</span><b className={pc >= 80 ? "g" : pc >= 50 ? "am" : "r"}>{pc}%</b></div>
        </div>
        <div className="lb"><span>Reviews</span><span>{rv.length ? `${dn} of ${rv.length} reviewed` : ""}</span></div>
        {rv.length ? rv.map((r) => {
          const t = TRADES.find((x) => x.id === r.id), k = K(t), d = r.st === "done";
          return (
            <button type="button" className="jt" key={r.id} onClick={() => { setMfi(r.id); setMq(""); setSheet({ t: "mfb" }); }}>
              <div className="rw"><span><b>{t.sym}</b><span className="tag">{t.side > 0 ? "Long" : "Short"}</span><div className="t2 s12" style={{ marginTop: 2 }}>{t.setup}, {t.day}</div></span><b className={cl(k.pnl)}>{rr(k.r)}</b></div>
              <div className="rw" style={{ marginTop: 12 }}><span className={`jst ${d ? "ok" : "need"}`}>{d ? <><Ic n="check" s={12} />Reviewed, grade {r.g}</> : "Waiting for feedback"}</span><span className="t2 s12">{d && r.th.length ? `${r.th.length} ${r.th.length === 1 ? "reply" : "replies"}` : ""}</span></div>
            </button>
          );
        }) : <div className="card t2" style={{ textAlign: "center", padding: "22px 16px" }}>No trades sent yet.</div>}
        <button type="button" className="btn" style={{ marginTop: 16 }} onClick={() => setSheet({ t: "mps" })}>Send a trade for review</button>
      </>
    );
  };

  // ---------- Sheets ----------
  const SheetHead = ({ title, onX }) => <div className="shd"><button type="button" className="ib" onClick={onX || close} aria-label="Close"><Ic n="x" /></button><h1>{title}</h1></div>;
  const Chip = ({ on, onClick, children }) => <button type="button" className={`chip${on ? " on" : ""}`} onClick={onClick}>{children}</button>;
  const renderSheet = () => {
    if (!sheet) return null;
    const t = sheet.t;
    if (t === "filter") {
      const n = filtered().length, ms = Object.keys(mute);
      return (<>
        <SheetHead title="Filter posts" />
        <div className="shb">
          <div className="lb"><span>Show</span></div>
          <div className="chips">{["All", "Saved", "Setups", "Reviews", "Psychology", "Risk"].map((b) => <Chip key={b} on={bd === b} onClick={() => setBd(b)}>{b}</Chip>)}</div>
          <div className="lb"><span>Sort by</span></div>
          <div className="chips">{[["new", "Latest"], ["top", "Most helpful"]].map((x) => <Chip key={x[0]} on={fsort === x[0]} onClick={() => setFsort(x[0])}>{x[1]}</Chip>)}</div>
          {ms.length > 0 && (<><div className="lb"><span>Muted authors</span><span>Tap to unmute</span></div><div className="chips">{ms.map((h) => <Chip key={h} on={false} onClick={() => setMute((m) => { const c = { ...m }; delete c[h]; return c; })}>{h}</Chip>)}</div></>)}
        </div>
        <div className="shf"><button type="button" className="btn o" style={{ width: "36%" }} onClick={() => { setBd("All"); setFsort("new"); }}>Reset</button><button type="button" className="btn" onClick={close}>Show {n} {n === 1 ? "post" : "posts"}</button></div>
      </>);
    }
    if (t === "post") {
      const p = postById(sheet.id); if (!p) return null;
      const tr = p.e != null, au = p.h === "@you";
      const order = p.cmts.map((c, j) => ({ c, j })).sort((a, b) => (b.c.best ? 1 : 0) - (a.c.best ? 1 : 0) || a.j - b.j);
      const send = () => { const v = ci.trim(); if (!v) return; patchPost(p.id, (x) => ({ ...x, cmts: [...x.cmts, { h: "@you", t: v, age: 0 }] })); setCi(""); };
      return (<>
        <SheetHead title="Post" />
        <div className="shb">
          <div className="t2 s12" style={{ marginTop: 14 }}><span className="tag" style={{ margin: "0 8px 0 0" }}>{p.board}</span><button type="button" className="lk" onClick={() => goProf(p.h)}>{p.h}</button>, {p.ago} ago</div>
          <div className="ttl" style={{ fontSize: 18, marginTop: 8 }}>{p.title}</div>
          {tr && (<><Rail t={p} /><div className="t2 s12">Result {rr(p.r)}, followed {(p.rules || []).filter(Boolean).length} of 3 rules</div></>)}
          <p style={{ margin: "12px 0" }}>{p.note || ""}</p>
          <div className="lb"><span>{p.cmts.length} comments</span></div>
          {order.map(({ c, j }) => {
            const me = c.h === "@you", ag = c.age != null ? c.age : Math.round(p.age * (1 - (j + 1) / (p.cmts.length + 1))), hc = (c.hc || 0) + (c.my ? 1 : 0);
            return (
              <div className={`cm${c.best ? " best" : ""}`} key={j}>
                {me ? <Av size={32} fs={11} text="YO" photo={communityAvatar} /> : <span className="av" style={{ width: 32, height: 32, fontSize: 11 }}>{c.h.slice(1, 3).toUpperCase()}</span>}
                <div className="cmb">
                  <div className="cmh"><b>{c.h}</b><span className="t2 s12">{AGO(ag)}</span>{c.best && <span className="bba"><Ic n="check" s={12} />Best answer</span>}</div>
                  <div>{c.t}</div>
                  <div className="cma">
                    <button type="button" className={`chb${c.my ? " on" : ""}`} onClick={() => patchPost(p.id, (x) => ({ ...x, cmts: x.cmts.map((y, k) => (k === j ? { ...y, my: !y.my } : y)) }))}><Ic n="up" s={14} />Helpful{hc ? ` ${hc}` : ""}</button>
                    {au && !me && <button type="button" className={`chb${c.best ? " on" : ""}`} onClick={() => patchPost(p.id, (x) => ({ ...x, cmts: x.cmts.map((y, k) => ({ ...y, best: k === j ? !y.best : false })) }))}><Ic n="check" s={14} />{c.best ? "Remove best answer" : "Mark best answer"}</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="shf">
          <input className="in" style={{ margin: 0, width: "auto", flex: 1 }} placeholder={p.board === "Reviews" ? "Give feedback" : "Add a comment"} aria-label="Comment" value={ci} onChange={(e) => setCi(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
          <button type="button" className="btn" style={{ width: 90 }} onClick={send}>Send</button>
        </div>
      </>);
    }
    if (t === "pm") {
      const p = postById(sheet.id); if (!p) { close(); return null; }
      const me = p.h === "@you";
      return (<>
        <SheetHead title="Post options" />
        <div className="shb">
          {me ? (<>
            <button type="button" className="row" onClick={() => { setAsk({ t: p.title, n: p.note || "", b: BCOL[p.board] ? p.board : "Setups", edi: p.id }); setSheet({ t: "ask" }); }}><span>Edit post</span><Ic n="chev" s={18} /></button>
            <button type="button" className="row" onClick={() => { if (!dc) { setDc(true); return; } setF((L) => L.filter((x) => x.id !== p.id)); close(); toast("Post deleted"); }}><span style={{ color: "var(--r)" }}>{dc ? "Tap again to delete post" : "Delete post"}</span></button>
          </>) : (<>
            <button type="button" className="row" onClick={() => { close(); toast("Thanks, we will review this post"); }}><span>Report post<div className="t2 s12">Spam, advice to risk too much, or anything unsafe</div></span><Ic n="chev" s={18} /></button>
            <button type="button" className="row" onClick={() => { setMute((m) => ({ ...m, [p.h]: 1 })); close(); toast(`Muted ${p.h}. Unmute in Filter`); }}><span>Mute {p.h}<div className="t2 s12">Hide their posts from your feed</div></span><Ic n="chev" s={18} /></button>
          </>)}
        </div>
      </>);
    }
    if (t === "mkp") {
      return (<>
        <SheetHead title="Start a post" />
        <div className="shb">
          <button type="button" className="row" onClick={() => setSheet({ t: "share" })}><span><b>Share a trade</b><div className="t2 s12">Pick a journaled trade. Posts show R only.</div></span><Ic n="chev" s={18} /></button>
          <button type="button" className="row" onClick={() => { setAsk({ t: "", n: "", b: "Setups", edi: null }); setSheet({ t: "ask" }); }}><span><b>Ask a question</b><div className="t2 s12">Setups, risk, psychology. Keep it about process.</div></span><Ic n="chev" s={18} /></button>
        </div>
      </>);
    }
    if (t === "share") {
      return (<>
        <SheetHead title="Share a trade" />
        <div className="shb">
          <div className="t2 s12" style={{ margin: "14px 0 4px" }}>Only journaled trades can be shared. Others will see R, not dollars.</div>
          {TRADES.filter((x) => x.x != null && x.j).map((x) => (
            <button type="button" className="row" key={x.id} onClick={() => {
              const r = K(x).r;
              setF((L) => [{ id: nid.current++, h: "@you", sym: x.sym, su: x.setup, r, note: x.note, ago: "now", side: x.side, e: x.e, s: x.s, tp: x.tp, x: x.x, z: 1, rules: x.rules, age: 0, hc: 0, cmts: [], my: false, sv: false, board: "Setups", title: `${x.sym} ${x.side > 0 ? "long" : "short"}, ${rr(r)}` }, ...L]);
              close(); setTab("feed"); toast("Shared as R only");
            }}><span><b>{x.sym}</b><div className="t2 s12">{x.setup}, {x.day}</div></span><span className={cl(K(x).r)}>{rr(K(x).r)}</span></button>
          ))}
        </div>
      </>);
    }
    if (t === "ask") {
      const submit = () => {
        const title = ask.t.trim(); if (!title) { toast("Add a title first"); return; }
        if (ask.edi != null) { patchPost(ask.edi, (x) => ({ ...x, title, note: ask.n.trim(), board: ask.b })); close(); toast("Post updated"); return; }
        setF((L) => [{ id: nid.current++, h: "@you", board: ask.b, title, note: ask.n.trim(), ago: "now", age: 0, hc: 0, cmts: [], my: false, sv: false }, ...L]);
        close(); setTab("feed"); setBd("All"); setFsort("new"); toast("Posted");
      };
      return (<>
        <SheetHead title={ask.edi != null ? "Edit post" : "Ask a question"} />
        <div className="shb">
          <label className="f">Title<input className="in" placeholder="Do you cut size after a big win?" value={ask.t} onChange={(e) => setAsk((a) => ({ ...a, t: e.target.value }))} /></label>
          <label className="f">Details, optional<textarea className="in" rows={4} value={ask.n} onChange={(e) => setAsk((a) => ({ ...a, n: e.target.value }))} /></label>
          <div className="lb"><span>Board</span></div>
          <div className="chips">{["Setups", "Reviews", "Psychology", "Risk"].map((b) => <Chip key={b} on={ask.b === b} onClick={() => setAsk((a) => ({ ...a, b }))}>{b}</Chip>)}</div>
        </div>
        <div className="shf"><button type="button" className="btn" onClick={submit}>{ask.edi != null ? "Save changes" : "Post"}</button></div>
      </>);
    }
    if (t === "mk") {
      const o = [["Audio", "Audio room", "Talk through levels and plans"], ["Video", "Video room", "Share a chart and review it together"], ["Focus", "Focus room", "Silent 45-minute block with a timer"]];
      return (<>
        <SheetHead title="Start a room" />
        <div className="shb">
          <label className="f">Room title, optional<input className="in" placeholder="New York open, levels and plans" value={rtitle} onChange={(e) => setRtitle(e.target.value)} /></label>
          <div className="lb"><span>Pick a type to go live</span></div>
          {o.map((x) => (
            <button type="button" className="row" key={x[0]} onClick={() => {
              const title = rtitle.trim() || (x[0] === "Focus" ? "Silent focus block" : x[0] === "Video" ? "Chart review" : "Open talk");
              setRO((L) => [{ t: title, k: x[0], h: "@you", n: 1, min: 0, live: 1 }, ...L]);
              openRoom(mkRoom(x[0], title, "@you", 1));
            }}><span><Kind k={x[0]} /><b>{x[1]}</b><div className="t2 s12">{x[2]}</div></span><Ic n="chev" s={18} /></button>
          ))}
        </div>
      </>);
    }
    if (t === "room" && rm) {
      const r = rm, f = r.k === "Focus", C2 = 2 * Math.PI * 70;
      const P = r.k === "Check-in" ? ["@maya_r", "You"] : [r.h === "@you" ? "You" : r.h].concat(POOL.filter((h) => h !== r.h).slice(0, 3), r.h === "@you" ? [] : ["You"]);
      const k = r.sp % (P.length - (P.indexOf("You") > 0 ? 1 : 0));
      const rb = (on, ic, l, fn, c) => <button type="button" className={`rbn${on ? " on" : ""}${c ? ` ${c}` : ""}`} onClick={fn}><span className="c"><Ic n={ic} s={22} /></span>{l}</button>;
      const sendChat = () => { const v = rc.trim(); if (!v) return; setRm((x) => ({ ...x, chat: [...x.chat, ["@you", v]] })); setRc(""); };
      return (<>
        <div className="shd">
          <button type="button" className="ib" onClick={leaveRoom} aria-label="Leave room"><Ic n="x" /></button>
          <span style={{ flex: 1 }}><b>{r.t}</b><div className="t2 s12" style={{ display: "flex", alignItems: "center" }}><span className="live" />Live <span style={{ margin: "0 6px 0 4px" }}>{clk(r.t2)}</span>{r.k} room</div></span>
        </div>
        <div className="shb">
          {f ? (<>
            <div style={{ textAlign: "center", margin: "16px 0 8px" }}>
              <svg viewBox="0 0 160 160" width="190" height="190" role="img" aria-label="Focus timer">
                <circle cx="80" cy="80" r="70" fill="none" stroke="var(--s2)" strokeWidth="8" />
                <circle cx="80" cy="80" r="70" fill="none" stroke="var(--am)" strokeWidth="8" strokeLinecap="round" strokeDasharray={C2} strokeDashoffset={C2 * (1 - r.sec / 2700)} transform="rotate(-90 80 80)" />
                <text x="80" y="90" textAnchor="middle" fontSize="30" fontWeight="600" fill="var(--tx)">{clk(r.sec)}</text>
              </svg>
            </div>
            <label className="f">My one rule for this block<input className="in" placeholder="Wait for the candle close" value={r.rule} onChange={(e) => setRm((x) => ({ ...x, rule: e.target.value }))} /></label>
          </>) : (r.shr || r.k === "Video") ? (
            <div className="pc" style={{ margin: "14px 0", padding: 12 }}>
              {r.shr ? (<>
                <div className="t2 s12" style={{ marginBottom: 6 }}>{r.k === "Video" ? r.h : "You"} is sharing a chart, EUR/USD 15m</div>
                <svg viewBox="0 0 330 120" width="100%" height="120" role="img" aria-label="Shared chart"><polyline points="0,90 30,80 60,86 90,60 120,66 150,44 180,52 210,30 240,38 270,24 330,20" fill="none" stroke="var(--g)" strokeWidth="2" /><line x1="0" y1="66" x2="330" y2="66" stroke="var(--t2)" strokeDasharray="4 4" /></svg>
              </>) : <div className="t2" style={{ padding: "30px 0", textAlign: "center" }}>No one is sharing yet. Tap Share to show a chart.</div>}
            </div>
          ) : null}
          <div style={{ marginTop: 14 }}>
            <div className="lb" style={{ marginTop: 0 }}><span>{f ? "Focusing together" : "In the room"}</span><span>{f ? `${r.n} people` : `${r.n} here`}</span></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              {P.map((h, i) => {
                const y = h === "You", sp = !f && ((y && !r.mu) || (!y && i === k));
                return (
                  <div key={h} style={{ textAlign: "center", width: 62 }}>
                    <div className="av" style={{ width: 54, height: 54, fontSize: 14, margin: "0 auto 4px", boxShadow: sp ? "0 0 0 3px var(--g)" : undefined }}>{y && communityAvatar ? <img src={communityAvatar} alt="You" /> : h.replace("@", "").slice(0, 2).toUpperCase()}</div>
                    <div style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.replace("@", "")}</div>
                    <div className="t2" style={{ fontSize: 11, minHeight: 16 }}>{sp ? <span className="eq"><i /><i /><i /></span> : y ? (r.hand ? "Hand up" : r.mu ? "Muted" : "Live") : (f ? "Focusing" : (i === 0 ? "Host" : ""))}</div>
                  </div>
                );
              })}
            </div>
          </div>
          {!f && (<>
            <div className="lb"><span>Chat</span></div>
            <div>{r.chat.map((c, i) => <div key={i} style={{ background: "var(--s1)", border: "1px solid var(--ln)", borderRadius: 12, padding: "8px 12px", margin: "6px 0" }}><b className="am s12">{c[0]}</b><div>{c[1]}</div></div>)}</div>
            <input className="in" placeholder="Say something about your process" aria-label="Chat message" value={rc} onChange={(e) => setRc(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }} />
          </>)}
          <div className="lb"><span>Notes, saved on this device when you leave</span></div>
          <textarea className="in" rows={2} aria-label="Room notes" placeholder="One thing worth keeping" value={r.notes} onChange={(e) => setRm((x) => ({ ...x, notes: e.target.value }))} />
        </div>
        {f ? <div className="shf"><button type="button" className="btn o" onClick={leaveRoom}>Leave block</button></div> : (
          <div className="shf" style={{ gap: 4 }}>
            {rb(!r.mu, r.mu ? "micx" : "mic", r.mu ? "Unmute" : "Mute", () => setRm((x) => ({ ...x, mu: !x.mu })))}
            {rb(r.hand, "hand", "Raise hand", () => setRm((x) => ({ ...x, hand: !x.hand })))}
            {rb(r.shr, "scr", "Share chart", () => setRm((x) => ({ ...x, shr: !x.shr })))}
            {rb(false, "x", "Leave", leaveRoom, "lv")}
          </div>
        )}
      </>);
    }
    if (t === "mis") {
      const ini = (mnn || "").trim().split(/\s+/).map((w) => w[0] || "").join("").slice(0, 2).toUpperCase() || "?";
      return (<>
        <SheetHead title="Invite your mentor" />
        <div className="shb">
          <div style={{ textAlign: "center", margin: "18px 0 6px" }}><span className="av" style={{ width: 72, height: 72, fontSize: 24, margin: "0 auto" }}>{ini}</span></div>
          <label className="f">Mentor name<input className="in" placeholder="Daniel R." autoComplete="off" value={mnn} onChange={(e) => setMnn(e.target.value)} /></label>
          <label className="f">Email or handle, optional<input className="in" placeholder="daniel@example.com" autoComplete="off" value={mnc} onChange={(e) => setMnc(e.target.value)} /></label>
          <div className="lb"><span>What they can do</span></div>
          <div className="card" style={{ padding: "4px 16px 14px" }}>
            {["See your journaled trades in R", "Grade trades and leave feedback", "Set one focus rule each week"].map((s) => <div className="mck" key={s}><Ic n="check" s={16} /><span>{s}</span></div>)}
            <div className="t2 s12" style={{ marginTop: 14, lineHeight: 1.5 }}>They never see dollar amounts or your account size. You can end this at any time.</div>
          </div>
        </div>
        <div className="shf"><button type="button" className="btn" onClick={() => {
          const nm = mnn.trim(); if (!nm) { toast("Add your mentor’s name first"); return; }
          setMn({ h: "", name: nm, contact: mnc.trim(), st: "pending", link: `ledger.app/m/${Math.random().toString(36).slice(2, 8)}` });
          close(); setTimeout(startMentor, 0); toast("Invite link ready");
        }}>Create invite link</button></div>
      </>);
    }
    if (t === "mps") {
      const sent = rq.map((r) => r.id), L = TRADES.filter((x) => x.x != null && x.j && sent.indexOf(x.id) < 0);
      return (<>
        <SheetHead title="Send a trade for review" />
        <div className="shb">
          <div className="t2 s12" style={{ margin: "14px 0 4px", lineHeight: 1.5 }}>Only journaled trades can be sent, so your mentor sees your reasoning too.</div>
          {L.length ? L.map((x) => { const k = K(x); return (
            <button type="button" className="row" key={x.id} onClick={() => { setRq((q) => [{ id: x.id, st: "wait", th: [] }, ...q]); close(); toast(`Sent to ${mNameOf(mn)}`); }}>
              <span><b>{x.sym}</b><span className="tag">{x.side > 0 ? "Long" : "Short"}</span><div className="t2 s12" style={{ marginTop: 2 }}>{x.setup}, {x.day}</div></span><b className={cl(k.pnl)}>{rr(k.r)}</b>
            </button>); }) : <div className="card t2" style={{ textAlign: "center", padding: "22px 16px", marginTop: 10 }}>All your journaled trades have been sent.</div>}
        </div>
      </>);
    }
    if (t === "mfb") {
      const r = rq.find((x) => x.id === mfi), x = TRADES.find((y) => y.id === mfi);
      if (!r || !x) return null;
      const k = K(x), nm = mNameOf(mn), d = r.st === "done", gc = { A: "g", B: "g", C: "am", D: "r" }[r.g] || "am";
      const reply = () => { const v = mq.trim(); if (!v) { toast("Write a reply first"); return; } setRq((q) => q.map((y) => (y.id === r.id ? { ...y, th: [...y.th, { t: v, ago: "Just now" }] } : y))); setMq(""); };
      return (<>
        <SheetHead title="Trade review" />
        <div className="shb">
          <div className="card rw" style={{ marginTop: 14 }}><span><b>{x.sym}</b><span className="tag">{x.side > 0 ? "Long" : "Short"}</span><div className="t2 s12" style={{ marginTop: 2 }}>{x.setup}, {x.day}</div></span><b className={cl(k.pnl)}>{rr(k.r)}</b></div>
          {d ? (<>
            <div className="lb"><span>Feedback from {nm}</span></div>
            <div className="card">
              <div className="rw"><span className="t2 s12">Grade</span><span className={`mgr ${gc}`}>{r.g}</span></div>
              <div className="cht" style={{ marginTop: 16 }}>What worked</div><div className="t2" style={{ marginTop: 4, lineHeight: 1.5 }}>{r.good}</div>
              <div className="cht" style={{ marginTop: 16 }}>Fix next time</div><div className="t2" style={{ marginTop: 4, lineHeight: 1.5 }}>{r.fix}</div>
            </div>
            {r.th.length > 0 && (<><div className="lb"><span>Your replies</span></div>{r.th.map((c, i) => <div className="mcm" key={i}><Av size={32} fs={11} text="YO" photo={communityAvatar} /><div style={{ flex: 1, minWidth: 0 }}><div className="cmh"><b>You</b><span className="t2 s12">{c.ago || "Just now"}</span></div><div>{c.t}</div></div></div>)}</>)}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <input className="in" style={{ margin: 0, flex: 1, width: "auto" }} placeholder={`Reply to ${nm.split(" ")[0]}`} aria-label="Reply to mentor" value={mq} onChange={(e) => setMq(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") reply(); }} />
              <button type="button" className="btn" style={{ width: "auto", padding: "0 18px" }} onClick={reply}>Send</button>
            </div>
          </>) : (<>
            <div className="card t2" style={{ marginTop: 14, textAlign: "center", padding: "22px 16px", lineHeight: 1.5 }}>Waiting for {nm}. Reviews usually take about a day.</div>
            <button type="button" className="row" style={{ border: 0, color: "var(--r)", marginTop: 8 }} onClick={() => { setRq((q) => q.filter((y) => y.id !== r.id)); close(); }}>Cancel this review</button>
          </>)}
        </div>
      </>);
    }
    if (t === "mmg") {
      return (<>
        <SheetHead title="Mentor options" />
        <div className="shb">
          <div className="t2 s12" style={{ margin: "14px 0 6px", lineHeight: 1.5 }}>Ending the mentorship removes the review list and weekly focus from this screen.</div>
          <button type="button" className="row" style={{ border: 0, color: "var(--r)" }} onClick={() => { if (!mrs) { setMrs(true); return; } clearTimeout(mtm.current); setMn(null); setRq([]); close(); toast("Mentorship ended"); }}>{mrs ? "Tap again to end mentorship" : "End mentorship"}</button>
        </div>
      </>);
    }
    return null;
  };

  const vars = {
    "--bg": palette.bg, "--s1": palette.surface, "--s2": palette.field, "--ln": palette.border, "--tx": palette.text,
    "--t2": palette.textMuted, "--g": palette.green, "--r": palette.red, "--am": palette.gold, "--on": palette.letterbox,
  };
  const TABS = [["feed", "Feed"], ["rooms", "Rooms"], ["ranks", "Ranks"], ["mentor", "Mentor"]];
  return (
    <div className="lc" style={{ ...vars, flex: 1, minHeight: 0, height: "100%", overflowY: "auto", color: "var(--tx)", fontFamily: sans, fontSize: 14, lineHeight: 1.45, fontVariantNumeric: "tabular-nums", background: "var(--bg)" }}>
      <style>{CSS}</style>
      <div style={{ maxWidth: isDesktop ? 1480 : "none", margin: "0 auto", padding: isDesktop ? "0 20px 48px" : "12px 16px 120px", boxSizing: "border-box" }}>
        {isDesktop ? (
          <div className="dkbar">
            <div className="tg" role="tablist" aria-label="Community sections">
              {TABS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}</button>)}
            </div>
            {tab === "feed" && <button type="button" className="btn" onClick={() => setSheet({ t: "mkp" })}><Ic n="plus" s={18} />Add post</button>}
          </div>
        ) : (
          <div className="tg" role="tablist" aria-label="Community sections" style={{ marginBottom: 6 }}>
            {TABS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}</button>)}
          </div>
        )}
        {tab === "feed" && FeedView()}
        {tab === "rooms" && RoomsView()}
        {tab === "ranks" && RanksView()}
        {tab === "mentor" && (isDesktop ? <div style={{ maxWidth: 1100, margin: "0 auto" }}>{MentorView()}</div> : MentorView())}
      </div>
      {tab === "feed" && !sheet && !isDesktop && (
        <button type="button" onClick={() => setSheet({ t: "mkp" })} style={{ position: "fixed", right: 16, bottom: isDesktop ? 24 : "calc(92px + env(safe-area-inset-bottom, 0px))", height: 52, padding: "0 20px", borderRadius: 14, background: "var(--am)", color: "var(--on)", fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 14px rgba(0,0,0,.25)", zIndex: 60 }}><Ic n="plus" />Add post</button>
      )}
      {sheet && (
        <div onClick={(e) => { if (e.target === e.currentTarget && sheet.t !== "room") close(); }} style={{ position: "fixed", inset: 0, zIndex: 130, display: "flex", justifyContent: "center", alignItems: isDesktop ? "center" : "flex-end", background: "rgba(0,0,0,.5)" }}>
          <div style={{ width: "100%", maxWidth: isDesktop ? 640 : 440, height: isDesktop ? "86vh" : "94vh", background: "var(--bg)", borderRadius: isDesktop ? 24 : "24px 24px 0 0", display: "flex", flexDirection: "column", overflow: "hidden", paddingTop: 16 }}>{renderSheet()}</div>
        </div>
      )}
      {toastMsg && <div role="status" style={{ position: "fixed", left: "50%", bottom: "calc(90px + env(safe-area-inset-bottom, 0px))", transform: "translateX(-50%)", background: "var(--tx)", color: "var(--bg)", padding: "10px 16px", borderRadius: 10, fontWeight: 500, zIndex: 140, fontSize: 13 }}>{toastMsg}</div>}
    </div>
  );
}
