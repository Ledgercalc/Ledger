import { useEffect, useRef, useState } from "react";
import { palette, sans } from "../lib/theme.js";
import { communityApi } from "../api/community.js";
import RoomSheet from "../components/RoomCall.jsx";
import PostComposer from "../components/PostComposer.jsx";
import { BOARDS, decodePost } from "../lib/ledgerPost.js";

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
@media (max-width:980px){.lc .dkg,.lc .dkg2{grid-template-columns:minmax(0,1fr)}.lc .dkside{position:static}.lc .dkcards{grid-template-columns:minmax(0,1fr)}}
/* ---- Mobile: compact bordered cards ---- */
.lc .rl span{display:flex;flex-direction:column;gap:1px;min-width:0}
.lc .rl span:nth-child(2){align-items:center}
.lc .rl span:last-child{align-items:flex-end}
.lc .rl em{font-style:normal;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--t2)}
.lc .rl b{font-size:12.5px;font-weight:600;color:var(--tx)}
.lc.lcm .npw{top:14px;margin-top:14px}
.lc.lcm .pc{padding:12px 14px 6px;margin-top:10px;border-radius:16px}
.lc.lcm .pc .pa .av{width:40px;height:40px}
.lc.lcm .pn b{font-size:15px;font-weight:700}
.lc.lcm .fwb{height:30px;padding:0 11px;font-size:12px}
.lc.lcm .pn span{font-size:12.5px}
.lc.lcm .pc .bl{margin-top:10px}
.lc.lcm .pc .ttl{font-size:16px;font-weight:700;line-height:1.3;margin:8px 0 2px}
.lc.lcm .pc .nt{font-size:14.5px;line-height:1.45;color:var(--tx);margin-top:6px}
.lc.lcm .pc .ts{margin:10px 0 2px;padding:10px 12px;border-radius:12px}
.lc.lcm .pc .ts .tss{margin-top:2px}
.lc.lcm .pc .ts .rail{margin:12px 4px 8px}
.lc.lcm .pc .tsf{margin-top:10px}
.lc.lcm .pf{margin-top:8px;padding-top:2px}
.lc.lcm .pf .act{padding:0 12px 0 8px;font-size:13px}
.lc.lcm .fbn{width:44px;padding:0;justify-content:center;position:relative;flex:none}
.lc.lcm .fbn .bdg{position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;font-size:10.5px}
`;

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

const CSS_EXTRA = `
.lc .pimg{display:block;width:100%;max-height:360px;object-fit:cover;border-radius:12px;margin-top:10px;border:1px solid var(--ln);cursor:pointer}
.lc .tsm{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px;padding:8px 12px;border:1px solid var(--ln);border-radius:12px;background:var(--s2);font-size:13px}
.lc .tsm .t2{color:var(--t2)}
.lc .jt{display:block;width:100%;text-align:left;margin-top:10px}
@media (min-width:981px){
.lc.lcd-feed{overflow:hidden!important}
.lc.lcd-feed .lcin{height:100%;display:flex;flex-direction:column;box-sizing:border-box}
.lc.lcd-feed .dkg{flex:1;min-height:0;align-items:stretch;grid-template-rows:minmax(0,1fr);margin-top:12px}
.lc.lcd-feed .dkg>div,.lc.lcd-feed .dkg>aside{min-height:0;height:100%;overflow-y:auto;position:static;padding:0 4px 48px 0;scrollbar-width:thin}
}
.lc .shf button[disabled],.lc .btn[disabled]{opacity:.55}
`;
const num = (v) => +v || 0;
const rrUnused = null; // eslint-disable-line
const AGO = (m) => (m < 1 ? "Just now" : m < 60 ? `${Math.round(m)}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`);
const ini2 = (h) => String(h).replace("@", "").slice(0, 2).toUpperCase();
const BCOL = { Setups: "var(--g)", Reviews: "var(--am)", Psychology: "#8B7CF6", Risk: "var(--r)", General: "var(--t2)" };
const RC = { Audio: "var(--am)", Video: "var(--g)", Focus: "var(--t2)" };

const authH = (t) => ({ Authorization: `Bearer ${t}` });
const postOpts = (t, body) => ({ method: "POST", headers: { ...authH(t), "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full or blocked */ } };
const nice = (s) => String(s || "").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const dshort = (ts) => { try { return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" }); } catch (e) { return ""; } };
const isLong = (d) => /^(buy|long|up)/i.test(String(d || ""));
const outcome = (pnl) => (pnl > 0 ? "Win" : pnl < 0 ? "Loss" : "BE");
const ocl = (pnl) => (pnl > 0 ? "g" : pnl < 0 ? "r" : "t2");
const GRADE_CL = { A: "g", B: "g", C: "am", D: "r" };
const MTAGS = ["good_entry", "patient", "followed_plan", "good_risk", "early_exit", "moved_stop", "oversized", "no_setup", "chased", "revenge", "held_too_long"];

const norm = (r) => {
  const d = decodePost(r.text);
  const ts = Number(r.ts) || Date.now();
  return {
    id: r.id, author: r.author, h: `@${r.author}`, avatar: r.avatar || null, board: d.board, title: d.title, note: d.note, trade: d.trade,
    image: r.image || null, hc: Number(r.likeCount) || 0, my: !!r.liked, nc: Number(r.commentCount) || 0, ts,
  };
};
const ago = (ts) => AGO((Date.now() - ts) / 60000);

const Kind = ({ k }) => <span className="tag" style={{ margin: "0 8px 0 0", color: RC[k], borderColor: RC[k] }}>{k}</span>;
const Av = ({ text, size, fs, photo }) => (
  <span className="av" style={{ ...(size ? { width: size, height: size } : {}), ...(fs ? { fontSize: fs } : {}) }}>
    {photo ? <img src={photo} alt="Profile" /> : text}
  </span>
);
const PAv = ({ u, avatar, size = 40, fs = 13 }) => <Av size={size} fs={fs} text={ini2(u || "?")} photo={avatar} />;

export default function LedgerCommunity({ isDesktop, communityAvatar, openMember, openMyProfile, myDiscipline, sessionToken, username, trades }) {
  const me = String(username || "").replace(/^@/, "");
  const meL = me.toLowerCase();
  const [tab, setTab] = useState("feed");
  const [F, setF] = useState([]);
  const [fState, setFState] = useState("idle"); // idle | loading | ok | error
  const [fNext, setFNext] = useState(null);
  const [fMore, setFMore] = useState(false);
  const [fol, setFol] = useState({});
  const [fpeople, setFpeople] = useState([]);
  const [mute, setMute] = useState(() => lsGet("ledger-muted", {}));
  const [hid, setHid] = useState(() => lsGet("ledger-hidden", {}));
  const [sv, setSv] = useState(() => lsGet("ledger-saved-v2", {}));
  const [bd, setBd] = useState("All");
  const [fsort, setFsort] = useState("new");
  const [fq, setFq] = useState("");
  const [srch, setSrch] = useState(null);
  const [np, setNp] = useState([]);
  const [ex, setEx] = useState({});
  const [sheet, setSheet] = useState(null);
  const [ci, setCi] = useState("");
  const [cm, setCm] = useState({ id: null, list: [], loading: false });
  const [dc, setDc] = useState(false);
  const [liveRooms, setLiveRooms] = useState([]);
  const [roomsState, setRoomsState] = useState("idle");
  const [startingRoom, setStartingRoom] = useState(false);
  const [rf, setRf] = useState("All");
  const [rtitle, setRtitle] = useState("");
  const [rm, setRm] = useState(null);
  const [rc, setRc] = useState("");
  const [md, setMd] = useState(null);
  const [dir, setDir] = useState([]);
  const [mdState, setMdState] = useState("idle");
  const [mdErr, setMdErr] = useState("");
  const [mt, setMt] = useState(null);
  const [mmen, setMmen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mtxt, setMtxt] = useState("");
  const [rvg, setRvg] = useState("");
  const [rvt, setRvt] = useState([]);
  const [inv, setInv] = useState("");
  const [pbio, setPbio] = useState("");
  const [ptags, setPtags] = useState("");
  const [popen, setPopen] = useState(true);
  const [mrs, setMrs] = useState(false);
  const [, setTick] = useState(0);
  const [toastMsg, setToastMsg] = useState("");
  const tt = useRef(null);

  const hdr = () => authH(sessionToken);
  const apiPost = (path, body) => communityApi(path, postOpts(sessionToken, body));
  const toast = (m) => { setToastMsg(m); clearTimeout(tt.current); tt.current = setTimeout(() => setToastMsg(""), 2400); };
  useEffect(() => () => clearTimeout(tt.current), []);
  useEffect(() => { const id = setInterval(() => setTick((x) => x + 1), 60000); return () => clearInterval(id); }, []);

  const close = () => { setSheet(null); setDc(false); setMrs(false); };
  const goProf = (h) => { close(); if (String(h).replace(/^@/, "").toLowerCase() === meL) openMyProfile(); else openMember(String(h).replace(/^@/, "")); };
  const patchPost = (id, fn) => setF((L) => L.map((p) => (p.id === id ? fn(p) : p)));
  const postById = (id) => F.find((p) => p.id === id);
  const isMe = (p) => String(p.author).toLowerCase() === meL;

  // ---------- Feed (real posts from the worker) ----------
  const loadFeed = async (more) => {
    if (!sessionToken) return;
    if (more) { if (!fNext || fMore) return; setFMore(true); } else setFState((s) => (s === "ok" ? s : "loading"));
    try {
      const j = await communityApi(`/feed?limit=30${more ? `&before=${fNext}` : ""}`, { headers: hdr() });
      const rows = (j.posts || []).map(norm);
      setF((L) => {
        const seen = new Set(L.map((x) => x.id));
        return more ? [...L, ...rows.filter((x) => !seen.has(x.id))] : [...rows, ...L.filter((x) => !rows.some((r) => r.id === x.id))];
      });
      if (more || !fNext) setFNext(j.nextCursor || null);
      setFState("ok");
    } catch (e) {
      if (more) toast((e && e.message) || "Couldn't load more");
      else setFState((s) => (s === "ok" ? s : "error"));
    }
    setFMore(false);
  };
  const loadFollowing = async () => {
    if (!sessionToken || !me) return;
    try {
      const j = await communityApi(`/follow-list/${encodeURIComponent(me)}?kind=following`, { headers: hdr() });
      const m = {};
      (j.following || []).forEach((u) => { m[String(u.username).toLowerCase()] = 1; });
      setFol(m);
      setFpeople((j.following || []).map((u) => ({ name: u.username, avatar: u.avatar || null })));
    } catch (e) { /* follow buttons still work, they just start empty */ }
  };
  useEffect(() => { if (sessionToken) { loadFeed(); loadFollowing(); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sessionToken, me]);

  // New posts from other people show as a "N new posts" pill (checked every 20 seconds).
  useEffect(() => {
    if (tab !== "feed" || !sessionToken || !F.length || sheet) return undefined;
    const id = setInterval(async () => {
      try {
        const newest = F.reduce((m, p) => Math.max(m, p.ts), 0);
        const j = await communityApi(`/feed?since=${newest}&limit=30`, { headers: hdr() });
        const rows = (j.posts || []).filter((r) => String(r.author).toLowerCase() !== meL).map(norm);
        if (rows.length) setNp((cur) => { const seen = new Set([...cur, ...F].map((x) => x.id)); return [...rows.filter((r) => !seen.has(r.id)), ...cur]; });
      } catch (e) { /* try again next tick */ }
    }, 20000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, sessionToken, F, sheet]);
  const showNew = () => { setF((L) => [...np.filter((n) => !L.some((x) => x.id === n.id)), ...L]); setNp([]); setBd("All"); setFsort("new"); };

  // Search: people and posts across the whole community, not just what's loaded.
  useEffect(() => {
    const q = fq.trim().replace(/^@/, "");
    if (q.length < 2 || !sessionToken) { setSrch(null); return undefined; }
    const id = setTimeout(async () => {
      try {
        const j = await communityApi(`/community/search?q=${encodeURIComponent(q)}`, { headers: hdr() });
        const rows = [...(j.posts || []), ...(j.relatedPosts || [])].map(norm);
        setSrch({ q: q.toLowerCase(), profile: j.profile || null });
        setF((L) => { const seen = new Set(L.map((x) => x.id)); return [...L, ...rows.filter((x) => !seen.has(x.id))]; });
      } catch (e) { setSrch(null); }
    }, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fq, sessionToken]);

  const FPN = () => (bd !== "All" ? 1 : 0) + (fsort !== "new" ? 1 : 0);
  const filtered = () => {
    const qq = fq.trim().toLowerCase().replace(/^@/, "");
    const pool = bd === "Saved" ? Object.values(sv).map((s) => F.find((x) => x.id === s.id) || s) : F;
    return pool
      .filter((p) => !hid[p.id] && !mute[String(p.author).toLowerCase()] && (bd === "All" || bd === "Saved" || p.board === bd)
        && (!qq || [p.title, p.note, p.author, p.board, p.trade && p.trade.s].join(" ").toLowerCase().indexOf(qq) > -1))
      .sort((a, b) => (fsort === "top" ? (b.hc - a.hc) || (b.ts - a.ts) : b.ts - a.ts));
  };

  const toggleLike = async (p) => {
    if (!sessionToken) { toast("Sign in to like posts"); return; }
    const on = !p.my;
    patchPost(p.id, (x) => ({ ...x, my: on, hc: Math.max(0, x.hc + (on ? 1 : -1)) }));
    try { await communityApi(`/profile/posts/${p.id}/like`, { method: on ? "POST" : "DELETE", headers: hdr() }); }
    catch (e) { patchPost(p.id, (x) => ({ ...x, my: !on, hc: Math.max(0, x.hc + (on ? -1 : 1)) })); toast((e && e.message) || "Couldn't update"); }
  };
  const isFol = (name) => !!fol[String(name).replace(/^@/, "").toLowerCase()];
  const toggleFollow = async (name) => {
    const n = String(name).replace(/^@/, ""), k = n.toLowerCase(), on = !fol[k];
    if (!sessionToken) { toast("Sign in to follow people"); return; }
    setFol((f) => ({ ...f, [k]: on ? 1 : 0 }));
    try { await communityApi(`/follow/${encodeURIComponent(n)}`, { method: on ? "POST" : "DELETE", headers: hdr() }); }
    catch (e) { setFol((f) => ({ ...f, [k]: on ? 0 : 1 })); toast((e && e.message) || "Couldn't update"); }
  };
  const toggleSave = (p) => setSv((m) => {
    const n = { ...m };
    if (n[p.id]) delete n[p.id];
    else { n[p.id] = { ...p, image: null }; const ks = Object.keys(n); if (ks.length > 60) delete n[ks[0]]; }
    lsSet("ledger-saved-v2", n);
    return n;
  });
  const muteAuthor = (name) => setMute((m) => { const n = { ...m, [String(name).toLowerCase()]: 1 }; lsSet("ledger-muted", n); return n; });
  const unmute = (k) => setMute((m) => { const n = { ...m }; delete n[k]; lsSet("ledger-muted", n); return n; });
  const hidePost = (id) => setHid((m) => { const n = { ...m, [id]: 1 }; lsSet("ledger-hidden", n); return n; });
  const deletePost = async (p) => {
    try { await communityApi(`/profile/posts/${p.id}`, { method: "DELETE", headers: hdr() }); setF((L) => L.filter((x) => x.id !== p.id)); close(); toast("Post deleted"); }
    catch (e) { toast((e && e.message) || "Couldn't delete"); }
  };
  const submitPost = async ({ text, image }) => {
    const j = await apiPost("/feed", { text, image });
    setF((L) => [norm({ id: j.id, author: me || "you", avatar: communityAvatar, text, image, likeCount: 0, commentCount: 0, liked: false, ts: j.ts }), ...L]);
    close(); setTab("feed"); setBd("All"); setFsort("new"); toast("Posted");
  };
  const openPost = async (p) => {
    setCi(""); setCm({ id: p.id, list: [], loading: true }); setSheet({ t: "post", id: p.id });
    try {
      const j = await communityApi(`/profile/posts/${p.id}/comments`, { headers: hdr() });
      const list = j.comments || [];
      setCm({ id: p.id, list, loading: false });
      patchPost(p.id, (x) => ({ ...x, nc: list.length }));
    } catch (e) { setCm({ id: p.id, list: [], loading: false }); toast((e && e.message) || "Couldn't load comments"); }
  };
  const sendComment = async (p) => {
    const v = ci.trim(); if (!v) return;
    setCi("");
    try {
      const j = await apiPost(`/profile/posts/${p.id}/comments`, { text: v });
      setCm((c) => ({ ...c, list: [...c.list, { id: j.id, author: me, text: v, ts: j.ts || Date.now() }] }));
      patchPost(p.id, (x) => ({ ...x, nc: x.nc + 1 }));
    } catch (e) { setCi(v); toast((e && e.message) || "Couldn't comment"); }
  };
  const delComment = async (p, c) => {
    try {
      await communityApi(`/profile/posts/${p.id}/comments/${c.id}`, { method: "DELETE", headers: hdr() });
      setCm((x) => ({ ...x, list: x.list.filter((y) => y.id !== c.id) }));
      patchPost(p.id, (x) => ({ ...x, nc: Math.max(0, x.nc - 1) }));
    } catch (e) { toast((e && e.message) || "Couldn't delete"); }
  };

  const TradeLine = ({ t }) => (
    <div className="tsm">
      <b>{t.s}</b><span className={`dir ${t.d > 0 ? "l" : "s"}`}>{t.d > 0 ? "Long" : "Short"}</span>
      <b className={ocl(t.o === "Win" ? 1 : t.o === "Loss" ? -1 : 0)}>{t.o}</b>
      {t.u ? <span className="t2">{t.u} setup</span> : null}{t.n ? <span className="t2">{t.n}</span> : null}
    </div>
  );
  const PostCard = (p) => {
    const mine = isMe(p), bc = BCOL[p.board] || "var(--t2)", saved = !!sv[p.id];
    const when = ago(p.ts);
    const long = p.note.length > 150;
    return (
      <article className="pc" key={p.id}>
        <div className="ph">
          <button type="button" className="pa" onClick={() => goProf(p.author)}>
            <PAv u={p.author} avatar={mine ? communityAvatar : p.avatar} />
            <span className="pn"><b style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{p.h}</b><span className="t2 s12">{when === "Just now" ? when : `${when} ago`}</span></span>
          </button>
          {!mine && <button type="button" className={`fwb${isFol(p.author) ? " on" : ""}`} onClick={() => toggleFollow(p.author)}>{isFol(p.author) ? "Following" : "Follow"}</button>}
          <button type="button" className="pmn" aria-label="More options" onClick={() => { setDc(false); setSheet({ t: "pm", id: p.id }); }}><Dots /></button>
        </div>
        <div className="bl"><span className="bt" style={{ "--bc": bc }}><i className="dotc" style={{ background: bc }} />{p.board}</span></div>
        {p.title ? <button type="button" className="ttl" onClick={() => openPost(p)}>{p.title}</button> : null}
        {p.trade ? <TradeLine t={p.trade} /> : null}
        {p.note ? (<>
          <div className={`nt${ex[p.id] || !p.title ? " ex" : ""}`} style={{ whiteSpace: "pre-wrap" }}>{p.note}</div>
          {p.title && long && <button type="button" className="rmr" onClick={() => setEx((e) => ({ ...e, [p.id]: !e[p.id] }))}>{ex[p.id] ? "Show less" : "Read more"}</button>}
        </>) : null}
        {p.image ? <img className="pimg" src={p.image} alt="" loading="lazy" onClick={() => openPost(p)} /> : null}
        <div className="pf">
          <button type="button" className={`act${p.my ? " on" : ""}`} onClick={() => toggleLike(p)}><Ic n="up" s={16} />Helpful {p.hc}</button>
          <button type="button" className="act" onClick={() => openPost(p)}><Ic n="chat" s={16} />{p.nc}{p.board === "Reviews" ? " feedback" : p.nc === 1 ? " comment" : " comments"}</button>
          <span style={{ flex: 1 }} />
          <button type="button" className={`act sv${saved ? " on" : ""}`} aria-pressed={saved} aria-label={saved ? "Remove from saved" : "Save post"} onClick={() => toggleSave(p)}><Ic n="bm" s={22} fill={saved} /></button>
        </div>
      </article>
    );
  };
  const PersonRow = (name, avatar) => (
    <div className="row" key={name}>
      <button type="button" style={{ display: "flex", gap: 12, alignItems: "center", flex: 1, minWidth: 0, textAlign: "left", minHeight: 48 }} onClick={() => goProf(name)}>
        <PAv u={name} avatar={avatar} size={44} fs={14} />
        <span style={{ minWidth: 0 }}><b>@{name}</b></span>
      </button>
      {String(name).toLowerCase() !== meL && <button type="button" className={`chip${isFol(name) ? "" : " on"}`} style={{ margin: 0, flex: "none" }} onClick={() => toggleFollow(name)}>{isFol(name) ? "Following" : "Follow"}</button>}
    </div>
  );
  const Suggest = () => {
    const seen = new Set(), l = [];
    F.forEach((p) => { const k = String(p.author).toLowerCase(); if (!seen.has(k) && k !== meL && !fol[k]) { seen.add(k); l.push(p); } });
    if (!l.length) return null;
    return (<>
      <div className="lb"><span>Traders to follow</span><span>Posting lately</span></div>
      {l.slice(0, 3).map((p) => PersonRow(p.author, p.avatar))}
    </>);
  };
  const FeedView = () => {
    const q = filtered(), sr = fq.trim();
    const act = [];
    if (bd !== "All") act.push(["bd", bd]);
    if (fsort !== "new") act.push(["so", "Most helpful"]);
    const person = srch && srch.profile && srch.q === sr.toLowerCase().replace(/^@/, "") ? srch.profile : null;
    const empty = !sessionToken ? "Sign in to your account to see the community feed."
      : fState === "loading" || fState === "idle" ? "Loading posts…"
      : fState === "error" && !F.length ? "Couldn't load the feed. Check your connection."
      : sr ? `No posts or people match "${sr}".` : bd === "Saved" ? "Nothing saved yet. Tap the bookmark on a post." : "No posts here yet. Start the first one.";
    const main = (<>
      {np.length > 0 && <div className="npw"><button type="button" className="npp" onClick={showNew}><Ic n="up" s={16} />{np.length} {np.length === 1 ? "new post" : "new posts"}</button></div>}
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <input type="search" className="in" style={{ margin: 0, flex: 1, width: "auto", minWidth: 0 }} placeholder="Search posts and people" aria-label="Search posts" value={fq} onChange={(e) => setFq(e.target.value)} />
        {<button type="button" className="fbn" aria-label="Open filters" onClick={() => setSheet({ t: "filter" })}><Ic n="flt" s={18} />{FPN() ? <b className="bdg">{FPN()}</b> : null}</button>}
      </div>
      {act.length > 0 && (
        <div className="chips" style={{ marginTop: 12 }}>
          {act.map((x) => <button key={x[0]} type="button" className="chip on" style={{ gap: 6 }} onClick={() => (x[0] === "bd" ? setBd("All") : setFsort("new"))}>{x[1]}<Ic n="x" s={12} /></button>)}
          <button type="button" className="am" style={{ minHeight: 40, padding: "0 8px" }} onClick={() => { setBd("All"); setFsort("new"); }}>Clear all</button>
        </div>
      )}
      <div>
        {person && (<>
          <div className="lb"><span>People</span><span>1</span></div>
          <div className="card" style={{ padding: "2px 16px" }}>{PersonRow(person.username, person.avatar)}</div>
          {q.length > 0 && <div className="lb"><span>Posts</span><span>{q.length}</span></div>}
        </>)}
        {q.length ? (<>
          {isDesktop ? <div className="stk" style={{ marginTop: 14 }}>{q.map(PostCard)}</div> : (<>
            {q.slice(0, 2).map(PostCard)}
            {bd === "All" && !sr && Suggest()}
            {q.slice(2).map(PostCard)}
          </>)}
          {fNext && bd === "All" && !sr && <button type="button" className="btn o" style={{ marginTop: 14 }} disabled={fMore} onClick={() => loadFeed(true)}>{fMore ? "Loading…" : "Load older posts"}</button>}
        </>) : <div className="t2" style={{ padding: "30px 0", textAlign: "center" }}>{person ? "" : empty}</div>}
        <div className="t2 s12" style={{ marginTop: 14, textAlign: "center" }}>Posts show results, never dollars or account size.</div>
      </div>
    </>);
    if (!isDesktop) return main;
    // Right column: every profile we know about (people you follow first, then everyone seen in the feed).
    const seenP = new Set([meL]), everyone = [];
    [...fpeople, ...F.map((p) => ({ name: p.author, avatar: p.avatar }))].forEach((u) => {
      const k = String(u.name).toLowerCase();
      if (!seenP.has(k)) { seenP.add(k); everyone.push(u); }
    });
    if (person && !seenP.has(String(person.username).toLowerCase())) everyone.unshift({ name: person.username, avatar: person.avatar });
    return (
      <div className="dkg">
        <div style={{ minWidth: 0 }}>{main}</div>
        <aside className="dkside">
          <div className="card" style={{ padding: "16px 16px 6px" }}>
            <div className="lb"><span>People</span><span>{everyone.length} {everyone.length === 1 ? "profile" : "profiles"}</span></div>
            {everyone.length ? everyone.map((u) => PersonRow(u.name, u.avatar)) : <div className="t2 s12" style={{ padding: "6px 0 14px" }}>{fState === "ok" ? "No other profiles yet." : "Loading…"}</div>}
          </div>
        </aside>
      </div>
    );
  };

  // ---------- Rooms ----------
  const openRoom = (r) => { setRc(""); setRm(r); setSheet({ t: "room" }); };
  const loadRooms = async () => {
    if (!sessionToken) return;
    try {
      const j = await communityApi("/rooms", { headers: { Authorization: `Bearer ${sessionToken}` } });
      setLiveRooms(Array.isArray(j && j.rooms) ? j.rooms : []);
      setRoomsState("ok");
    } catch (e) { setRoomsState((x) => (x === "ok" ? x : "error")); }
  };
  // Keep the live-room list fresh while the Rooms tab is open (and not inside a room).
  useEffect(() => {
    if (tab !== "rooms" || !sessionToken || (sheet && sheet.t === "room")) return undefined;
    setRoomsState((x) => (x === "ok" ? x : "loading"));
    loadRooms();
    const id = setInterval(loadRooms, 8000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, sessionToken, sheet && sheet.t]);
  const joinRoom = (r) => {
    if (!sessionToken) { toast("Sign in to your account to join rooms"); return; }
    openRoom({ id: r.id, kind: r.k, title: r.t, startedAt: r.startedAt, isHost: !!r.isHost });
  };
  const startRoom = async (kind, title) => {
    if (!sessionToken) { toast("Sign in to your account to start a room"); return; }
    if (startingRoom) return;
    setStartingRoom(true);
    try {
      const j = await communityApi("/rooms", {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ kind, title }),
      });
      const r = j && j.room;
      if (!r || !r.id) throw new Error("Couldn't start the room.");
      openRoom({ id: r.id, kind: r.kind, title: r.title, startedAt: r.startedAt, isHost: true });
    } catch (e) {
      toast((e && e.message) || "Couldn't start the room.");
    } finally { setStartingRoom(false); }
  };
  const leaveRoom = (extra) => {
    const r = rm, notes = ((extra && extra.notes) || "").trim(), rule = ((extra && extra.rule) || "").trim();
    const t = notes || (rule ? `Rule: ${rule}` : "");
    if (r && t) {
      try { const a = JSON.parse(localStorage.getItem("ledger-room-notes") || "[]"); a.unshift({ at: Date.now(), room: r.title, text: t.slice(0, 200) }); localStorage.setItem("ledger-room-notes", JSON.stringify(a.slice(0, 50))); } catch (e) {}
      toast("Room notes saved on this device");
    }
    setRm(null); close();
    setTimeout(loadRooms, 600);
  };
  const RoomsView = () => {
    const nowMs = Date.now();
    const lv = liveRooms.filter((r) => rf === "All" || r.kind === rf).map((r) => ({ id: r.id, k: r.kind, t: r.title, h: r.host, n: r.n, min: Math.max(0, Math.floor((nowMs - r.startedAt) / 60000)), startedAt: r.startedAt, isHost: r.isHost }));
    const startBtn = (
      <button type="button" className="btn" style={isDesktop ? { width: "auto", height: 42, padding: "0 20px" } : { margin: "14px 0 4px" }} onClick={() => { if (!sessionToken) { toast("Sign in to your account to start a room"); return; } setRtitle(""); setSheet({ t: "mk" }); }}>
        <Ic n="plus" s={18} />Start a room
      </button>
    );
    const filters = (
      <div className="chips" style={isDesktop ? { margin: 0 } : { marginTop: 12 }}>
        {["All", "Audio", "Video", "Focus"].map((k) => <button key={k} type="button" className={`chip${rf === k ? " on" : ""}`} onClick={() => setRf(k)}>{k}</button>)}
      </div>
    );
    const liveCards = () => (lv.length ? lv.map((r) => (
      <div className="pc" style={{ marginTop: 10 }} key={r.id}>
        <div className="rw s12"><span style={{ display: "flex", alignItems: "center" }}><Kind k={r.k} /><span className="live" /><span className="t2">Live, {r.min} min</span></span><span className="t2">{r.n} here</span></div>
        <div className="ttl" style={{ margin: "10px 0 4px" }}>{r.t}</div>
        <div className="t2 s12">Hosted by {r.h}</div>
        <div className="rw" style={{ marginTop: 12 }}>
          <span style={{ display: "flex" }}><span className="av" style={{ width: 28, height: 28, fontSize: 10 }}>{String(r.h || "?").replace("@", "").slice(0, 2).toUpperCase()}</span></span>
          <button type="button" className="btn" style={{ width: 96, height: 40 }} onClick={() => joinRoom(r)}>Join</button>
        </div>
      </div>
    )) : <div className="t2">{!sessionToken ? "Sign in to your account to see and join live rooms." : roomsState === "loading" ? "Looking for live rooms…" : roomsState === "error" ? "Couldn't load rooms. Check your connection." : "No live rooms of this type. Start one."}</div>);
    if (isDesktop) {
      return (<>
        <div className="rw" style={{ margin: "18px 0 0", gap: 16 }}>{filters}{startBtn}</div>
        <div className="lb" style={{ marginTop: 14 }}><span>Live now</span><span>{lv.length} rooms</span></div>
        <div className="dkcards">{liveCards()}</div>
      </>);
    }
    return (<>{startBtn}{filters}<div className="lb"><span>Live now</span><span>{lv.length} rooms</span></div>{liveCards()}</>);
  };

  // ---------- Ranks ----------
  // There is no server-side leaderboard yet, so this shows only your own real score instead of made-up rivals.
  const you = myDiscipline != null && Number.isFinite(myDiscipline) ? Math.round(myDiscipline) : null;
  const RanksView = () => (
    <>
      <div className="lb"><span>Your discipline score</span><span>From your journal</span></div>
      <div className="card" style={{ textAlign: "center", padding: "22px 16px" }}>
        {you != null ? (<><div style={{ fontSize: 44, fontWeight: 600 }} className={you >= 80 ? "g" : you >= 50 ? "am" : "r"}>{you}%</div><div className="t2 s12" style={{ marginTop: 6 }}>Ranked by process, not profit.</div></>)
          : <div className="t2">Log and review trades in your journal to get a discipline score.</div>}
      </div>
      <div className="card t2" style={{ marginTop: 12, lineHeight: 1.5 }}>Community leaderboards and challenges need a server feature that isn't switched on yet, so nobody else's scores are shown here.</div>
    </>
  );

  // ---------- Mentor (real data from the worker's /mentors routes) ----------
  const loadMentor = async (quiet) => {
    if (!sessionToken) return;
    if (!quiet) setMdState((s) => (s === "ok" ? s : "loading"));
    try {
      const [a, b] = await Promise.all([
        communityApi("/mentors", { headers: hdr() }),
        communityApi("/mentors/directory", { headers: hdr() }).catch(() => ({ mentors: [] })),
      ]);
      setMd(a); setDir(b.mentors || []); setMdState("ok"); setMdErr("");
    } catch (e) { setMdErr((e && e.message) || "Couldn't load Mentor."); setMdState((s) => (s === "ok" ? s : "error")); }
  };
  useEffect(() => {
    if (tab !== "mentor" || !sessionToken) return undefined;
    loadMentor();
    const id = setInterval(() => loadMentor(true), 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, sessionToken]);
  const mAct = async (fn, okMsg) => {
    if (busy) return false;
    setBusy(true);
    try { await fn(); if (okMsg) toast(okMsg); await loadMentor(true); setBusy(false); return true; }
    catch (e) { toast((e && e.message) || "Something went wrong"); setBusy(false); return false; }
  };
  const fetchMT = async (id) => {
    const j = await communityApi(`/mentors/trade?id=${encodeURIComponent(id)}`, { headers: hdr() });
    setMt({ id, data: j });
    return j;
  };
  const openMTrade = async (id) => {
    setMt({ id, data: null }); setMtxt(""); setRvg(""); setRvt([]); setDc(false); setSheet({ t: "mtrade" });
    try {
      const j = await fetchMT(id);
      const mine = (j.reviews || []).find((r) => r.mine);
      if (mine) { setRvg(mine.grade); setRvt(mine.tags || []); }
    } catch (e) { toast((e && e.message) || "Couldn't open that trade"); setSheet(null); }
  };
  const fetchMentee = async (linkId) => {
    const j = await communityApi(`/mentors/trades?linkId=${encodeURIComponent(linkId)}`, { headers: hdr() });
    setMmen({ linkId, data: j });
  };
  const openMentee = async (linkId) => {
    setMmen({ linkId, data: null }); setMtxt(""); setSheet({ t: "mmentee" });
    try { await fetchMentee(linkId); } catch (e) { toast((e && e.message) || "Couldn't open that trader"); setSheet(null); }
  };
  const shareTrade = (x) => mAct(async () => {
    await apiPost("/mentors/share", { trade: { id: String(x.id), pair: x.pair, direction: x.direction, pnl: Number(x.pnl) || 0, ts: x.ts, setup: x.setup || "", emotion: x.emotion || "", session: x.session || "", confidence: x.confidence == null ? "" : x.confidence, note: x.note || "" }, shots: [] });
    close();
  }, "Sent to your mentor");

  const TradeRow = (t, onClick, who, needs) => {
    const rv = t.reviews || [];
    return (
      <button type="button" className="jt" key={t.id} onClick={onClick}>
        <div className="rw"><span><b>{t.pair || "Trade"}</b><span className="tag">{isLong(t.direction) ? "Long" : "Short"}</span><div className="t2 s12" style={{ marginTop: 2 }}>{who ? `@${who}, ` : ""}{dshort(t.ts)}</div></span><b className={ocl(t.pnl)}>{outcome(t.pnl)}</b></div>
        <div className="rw" style={{ marginTop: 12 }}>
          <span className={`jst ${rv.length ? "ok" : "need"}`}>{rv.length ? <><Ic n="check" s={12} />Grade {rv[0].grade}</> : needs ? "Needs your review" : "Waiting for feedback"}</span>
          <span className="t2 s12">{t.comments ? `${t.comments} ${t.comments === 1 ? "comment" : "comments"}` : ""}</span>
        </div>
      </button>
    );
  };
  const MentorView = () => {
    if (!sessionToken) return <div className="card t2" style={{ marginTop: 12 }}>Sign in to your account to use Mentor.</div>;
    if (mdState === "idle" || (mdState === "loading" && !md)) return <div className="t2" style={{ padding: "30px 0", textAlign: "center" }}>Loading Mentor…</div>;
    if (!md) return (<div className="card" style={{ marginTop: 12 }}><div className="t2">{mdErr}</div><button type="button" className="btn o" style={{ marginTop: 12 }} onClick={() => loadMentor()}>Try again</button></div>);
    const mentors = md.mentors || [], mentees = md.mentees || [], invites = md.invites || [], pending = md.pending || [];
    const queue = md.queue || [], tasks = md.tasks || [], shared = md.shared || [], sessions = md.sessions || [];
    const canCoach = !!md.creator || mentees.length > 0;
    const maxMentors = (md.limits && md.limits.mentors) || 2;
    const list = dir.filter((d) => String(d.username).toLowerCase() !== meL);
    const mentorCards = mentors.map((x) => (
      <div className="card" style={{ marginTop: 12 }} key={x.linkId}>
        <div className="rw" style={{ gap: 4 }}>
          <button type="button" className="mph" onClick={() => goProf(x.username)} aria-label={`View ${x.username} profile`}>
            <PAv u={x.username} avatar={x.avatar} size={48} fs={15} />
            <span style={{ flex: 1, minWidth: 0 }}><b>@{x.username}</b><div className="t2 s12">Mentoring you since {dshort(x.since)}</div></span>
            <span className="t2" style={{ flex: "none" }}><Ic n="chev" s={18} /></span>
          </button>
          <button type="button" className="pmn" aria-label="Mentor options" onClick={() => { setMrs(false); setSheet({ t: "mopt", linkId: x.linkId, name: x.username }); }}><Dots /></button>
        </div>
      </div>
    ));
    return (
      <>
        {invites.map((x) => (
          <div className="card" style={{ marginTop: 12 }} key={x.linkId}>
            <div className="rw"><span style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}><PAv u={x.username} avatar={x.avatar} size={44} fs={14} /><span style={{ minWidth: 0 }}><b>@{x.username}</b><div className="t2 s12">{x.asks === "mentor" ? "Wants you to be their mentor" : "Offers to be your mentor"}</div></span></span></div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button type="button" className="btn o" style={{ height: 44, flex: 1 }} disabled={busy} onClick={() => mAct(() => apiPost("/mentors/respond", { linkId: x.linkId, accept: false }), "Declined")}>Decline</button>
              <button type="button" className="btn" style={{ height: 44, flex: 1 }} disabled={busy} onClick={() => mAct(() => apiPost("/mentors/respond", { linkId: x.linkId, accept: true }), "You're connected")}>Accept</button>
            </div>
          </div>
        ))}
        {pending.map((x) => (
          <div className="card" style={{ marginTop: 12 }} key={x.linkId}>
            <div className="rw"><span><b>@{x.username}</b><div className="t2 s12">{x.as === "mentor" ? "Mentor request sent. Waiting for a reply." : "Offer sent. Waiting for a reply."}</div></span>
              <button type="button" className="chip" style={{ margin: 0 }} disabled={busy} onClick={() => mAct(() => apiPost("/mentors/leave", { linkId: x.linkId }), "Cancelled")}>Cancel</button></div>
          </div>
        ))}

        {mentors.length > 0 && (<>
          <div className="lb"><span>{mentors.length > 1 ? "Your mentors" : "Your mentor"}</span></div>
          {mentorCards}
          {tasks.length > 0 && (<>
            <div className="lb"><span>Tasks from your mentor</span><span>{tasks.filter((t) => !t.done).length} open</span></div>
            <div className="card" style={{ padding: "2px 16px" }}>
              {tasks.map((t) => (
                <div className="row" key={t.id}>
                  <span style={{ minWidth: 0 }}><span style={{ textDecoration: t.done ? "line-through" : "none", opacity: t.done ? 0.6 : 1 }}>{t.text}</span><div className="t2 s12">From @{t.mentor}</div></span>
                  <button type="button" className={`chip${t.done ? " on" : ""}`} style={{ margin: 0, flex: "none" }} disabled={busy} onClick={() => mAct(() => apiPost("/mentors/task/done", { id: t.id, done: !t.done }))}>{t.done ? "Done" : "Mark done"}</button>
                </div>
              ))}
            </div>
          </>)}
          {sessions.length > 0 && (<>
            <div className="lb"><span>Latest session recap</span><span>{dshort(sessions[0].day)}</span></div>
            <div className="card"><div className="t2 s12">From @{sessions[0].mentor}</div><div style={{ marginTop: 6, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{sessions[0].recap || "No recap written."}</div></div>
          </>)}
          <div className="lb"><span>Trades you sent</span><span>{shared.length ? `${shared.filter((t) => (t.reviews || []).length).length} of ${shared.length} reviewed` : ""}</span></div>
          {shared.length ? shared.map((t) => TradeRow(t, () => openMTrade(t.id))) : <div className="card t2" style={{ textAlign: "center", padding: "22px 16px" }}>No trades sent yet.</div>}
          <button type="button" className="btn" style={{ marginTop: 16 }} onClick={() => setSheet({ t: "mshare" })}>Send a trade for review</button>
        </>)}

        {canCoach && (<>
          <div className="lb"><span>People you coach</span><span>{mentees.length}</span></div>
          {mentees.length ? mentees.map((x) => (
            <button type="button" className="jt" key={x.linkId} onClick={() => openMentee(x.linkId)}>
              <div className="rw"><span style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}><PAv u={x.username} avatar={x.avatar} size={40} fs={13} /><span><b>@{x.username}</b><div className="t2 s12">Since {dshort(x.since)}</div></span></span><span className="t2 s12">{x.shared || 0} shared</span></div>
            </button>
          )) : <div className="card t2" style={{ textAlign: "center", padding: "22px 16px" }}>No mentees yet. Invite someone by username below.</div>}
          {queue.length > 0 && (<>
            <div className="lb"><span>Review queue</span><span>{queue.length} waiting</span></div>
            {queue.map((t) => TradeRow(t, () => openMTrade(t.id), t.username, true))}
          </>)}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="rw"><span><b>Your mentor profile</b><div className="t2 s12" style={{ marginTop: 2 }}>{md.profile && md.profile.open ? "Listed in the mentor directory" : "Not listed yet"}</div></span>
              <button type="button" className="chip" style={{ margin: 0 }} onClick={() => { setPbio((md.profile && md.profile.bio) || ""); setPtags(((md.profile && md.profile.tags) || []).join(", ")); setPopen(md.profile ? !!md.profile.open : true); setSheet({ t: "mprof" }); }}>Edit</button></div>
          </div>
        </>)}

        {mentors.length === 0 && (
          <div className="card" style={{ marginTop: 12 }}>
            <div className="big2">Learn faster with a mentor</div>
            <div className="t2 s12" style={{ marginTop: 6, lineHeight: 1.5 }}>Send journaled trades to someone who trades well and get a grade, tags and comments back.</div>
            {["Send any journaled trade for review", "Get a grade and what to fix", "Work on tasks your mentor sets"].map((s) => <div className="mck" key={s}><Ic n="check" s={16} /><span>{s}</span></div>)}
            <div className="t2 s12" style={{ marginTop: 14 }}>Your mentor sees the trades you choose to send, with their result and your notes.</div>
          </div>
        )}
        {mentors.length < maxMentors && (<>
          <div className="lb"><span>Mentors on Tredzi</span><span>{list.length ? "Tap one to see their profile" : ""}</span></div>
          {list.length ? (
            <div className={isDesktop ? "dkcards3" : undefined}>
              {list.map((d) => (
                <div className="card mcd" key={d.username}>
                  <button type="button" className="mph" onClick={() => goProf(d.username)} aria-label={`View ${d.username} profile`}>
                    <PAv u={d.username} avatar={d.avatar} size={52} fs={16} />
                    <span style={{ flex: 1, minWidth: 0 }}><b>@{d.username}</b><div className="t2 s12">{d.coached ? `Coaching ${d.coached}` : "New mentor"}</div></span>
                    <span className="t2" style={{ flex: "none" }}><Ic n="chev" s={18} /></span>
                  </button>
                  {d.bio ? <div className="t2 s12 mbio" style={{ marginTop: 8, lineHeight: 1.5 }}>{d.bio}</div> : null}
                  {(d.tags || []).length > 0 && <div style={{ marginTop: 8 }}>{d.tags.map((g) => <span className="tag" key={g}>{g}</span>)}</div>}
                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    <button type="button" className="btn o" style={{ height: 44, flex: 1 }} onClick={() => goProf(d.username)}>View profile</button>
                    <button type="button" className="btn" style={{ height: 44, flex: 1 }} disabled={busy} onClick={() => mAct(() => apiPost("/mentors/invite", { username: d.username, role: "mentor" }), `Request sent to @${d.username}`)}>Request</button>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="card t2" style={{ textAlign: "center", padding: "22px 16px" }}>No mentors have listed themselves yet. You can invite someone by username.</div>}
        </>)}
        <div className="card minv">
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span className="mic"><Ic n="plus" s={18} /></span>
            <span><b>Invite someone by username</b><div className="t2 s12" style={{ marginTop: 2, lineHeight: 1.4 }}>Ask a trader to mentor you, or offer to coach them. Mentors need the Creator plan.</div></span>
          </div>
          <button type="button" className="btn o" style={{ height: 44, marginTop: 14, width: "100%" }} onClick={() => { setInv(""); setSheet({ t: "minvite" }); }}>Invite by username</button>
        </div>
      </>
    );
  };

  // ---------- Sheets ----------
  const SheetHead = ({ title, onX }) => <div className="shd"><button type="button" className="ib" onClick={onX || close} aria-label="Close"><Ic n="x" /></button><h1>{title}</h1></div>;
  const Chip = ({ on, onClick, children }) => <button type="button" className={`chip${on ? " on" : ""}`} onClick={onClick}>{children}</button>;
  const Loading = ({ title }) => (<><SheetHead title={title} /><div className="shb"><div className="t2" style={{ margin: "24px 0", textAlign: "center" }}>Loading…</div></div></>);
  const renderSheet = () => {
    if (!sheet) return null;
    const t = sheet.t;
    if (t === "filter") {
      const n = filtered().length, ms = Object.keys(mute);
      return (<>
        <SheetHead title="Filter posts" />
        <div className="shb">
          <div className="lb"><span>Show</span></div>
          <div className="chips">{["All", "Saved", ...BOARDS].map((b) => <Chip key={b} on={bd === b} onClick={() => setBd(b)}>{b}</Chip>)}</div>
          <div className="lb"><span>Sort by</span></div>
          <div className="chips">{[["new", "Latest"], ["top", "Most helpful"]].map((x) => <Chip key={x[0]} on={fsort === x[0]} onClick={() => setFsort(x[0])}>{x[1]}</Chip>)}</div>
          {ms.length > 0 && (<><div className="lb"><span>Muted authors</span><span>Tap to unmute</span></div><div className="chips">{ms.map((h) => <Chip key={h} on={false} onClick={() => unmute(h)}>@{h}</Chip>)}</div></>)}
        </div>
        <div className="shf"><button type="button" className="btn o" style={{ width: "36%" }} onClick={() => { setBd("All"); setFsort("new"); }}>Reset</button><button type="button" className="btn" onClick={close}>Show {n} {n === 1 ? "post" : "posts"}</button></div>
      </>);
    }
    if (t === "compose") {
      return <PostComposer username={me} avatar={communityAvatar} trades={trades} onSubmit={submitPost} onClose={close} />;
    }
    if (t === "post") {
      const p = postById(sheet.id); if (!p) return null;
      const mine = isMe(p), list = cm.id === p.id ? cm.list : [];
      return (<>
        <SheetHead title="Post" />
        <div className="shb">
          <div className="t2 s12" style={{ marginTop: 14 }}><span className="tag" style={{ margin: "0 8px 0 0" }}>{p.board}</span><button type="button" className="lk" onClick={() => goProf(p.author)}>{p.h}</button>, {ago(p.ts)}{ago(p.ts) === "Just now" ? "" : " ago"}</div>
          {p.title ? <div className="ttl" style={{ fontSize: 18, marginTop: 8 }}>{p.title}</div> : null}
          {p.trade ? <TradeLine t={p.trade} /> : null}
          {p.note ? <p style={{ margin: "12px 0", whiteSpace: "pre-wrap" }}>{p.note}</p> : null}
          {p.image ? <img className="pimg" src={p.image} alt="" /> : null}
          <div className="lb"><span>{cm.id === p.id && cm.loading ? "Loading comments…" : `${list.length} ${list.length === 1 ? "comment" : "comments"}`}</span></div>
          {list.map((c) => {
            const cme = String(c.author).toLowerCase() === meL;
            return (
              <div className="cm" key={c.id}>
                <PAv u={c.author} avatar={cme ? communityAvatar : null} size={32} fs={11} />
                <div className="cmb">
                  <div className="cmh"><b>@{c.author}</b><span className="t2 s12">{ago(c.ts)}</span></div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{c.text}</div>
                  {(cme || mine) && <div className="cma"><button type="button" className="chb" onClick={() => delComment(p, c)}>Delete</button></div>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="shf">
          <input className="in" style={{ margin: 0, width: "auto", flex: 1 }} maxLength={500} placeholder={p.board === "Reviews" ? "Give feedback" : "Add a comment"} aria-label="Comment" value={ci} onChange={(e) => setCi(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendComment(p); }} />
          <button type="button" className="btn" style={{ width: 90 }} onClick={() => sendComment(p)}>Send</button>
        </div>
      </>);
    }
    if (t === "pm") {
      const p = postById(sheet.id); if (!p) { close(); return null; }
      return (<>
        <SheetHead title="Post options" />
        <div className="shb">
          {isMe(p) ? (
            <button type="button" className="row" onClick={() => { if (!dc) { setDc(true); return; } deletePost(p); }}><span style={{ color: "var(--r)" }}>{dc ? "Tap again to delete post" : "Delete post"}</span></button>
          ) : (<>
            <button type="button" className="row" onClick={() => { hidePost(p.id); close(); toast("Post hidden on this device"); }}><span>Hide this post<div className="t2 s12">Only hides it for you</div></span><Ic n="chev" s={18} /></button>
            <button type="button" className="row" onClick={() => { muteAuthor(p.author); close(); toast(`Muted @${p.author}. Unmute in Filter`); }}><span>Mute @{p.author}<div className="t2 s12">Hide their posts from your feed</div></span><Ic n="chev" s={18} /></button>
          </>)}
        </div>
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
            <button type="button" className="row" key={x[0]} disabled={startingRoom} onClick={() => startRoom(x[0], rtitle.trim())}><span><Kind k={x[0]} /><b>{x[1]}</b><div className="t2 s12">{x[2]}</div></span><Ic n="chev" s={18} /></button>
          ))}
        </div>
      </>);
    }
    if (t === "room" && rm) {
      return <RoomSheet key={rm.id} room={rm} token={sessionToken} me={{ username: username ? `@${username}` : "You", avatar: communityAvatar }} onLeave={leaveRoom} toast={toast} />;
    }
    if (t === "mshare") {
      const done = new Set(((md && md.shared) || []).map((x) => String(x.tradeId)));
      const L = (Array.isArray(trades) ? trades : []).filter((x) => x && x.pair && !done.has(String(x.id))).slice().sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 30);
      return (<>
        <SheetHead title="Send a trade for review" />
        <div className="shb">
          <div className="t2 s12" style={{ margin: "14px 0 4px", lineHeight: 1.5 }}>Your mentor sees the pair, direction, result and your notes for the trade you pick.</div>
          {L.length ? L.map((x) => (
            <button type="button" className="row" key={x.id} disabled={busy} onClick={() => shareTrade(x)}>
              <span><b>{x.pair}</b><span className="tag">{isLong(x.direction) ? "Long" : "Short"}</span><div className="t2 s12" style={{ marginTop: 2 }}>{[x.setup, dshort(x.ts)].filter(Boolean).join(", ")}</div></span>
              <b className={ocl(x.pnl)}>{outcome(x.pnl)}</b>
            </button>
          )) : <div className="card t2" style={{ textAlign: "center", padding: "22px 16px", marginTop: 10 }}>{(trades || []).length ? "All your recent trades have been sent." : "No journaled trades yet. Log a trade in your journal first."}</div>}
        </div>
      </>);
    }
    if (t === "mtrade") {
      const d = mt && mt.data;
      if (!d) return <Loading title="Trade review" />;
      const x = d.trade || {}, pnl = Number(x.pnl) || 0;
      const reviewable = !d.mine;
      const send = () => { const v = mtxt.trim(); if (!v) return; mAct(async () => { await apiPost("/mentors/comment", { id: mt.id, text: v }); setMtxt(""); await fetchMT(mt.id); }); };
      return (<>
        <SheetHead title="Trade review" />
        <div className="shb">
          <div className="card rw" style={{ marginTop: 14 }}>
            <span><b>{x.pair || "Trade"}</b><span className="tag">{isLong(x.direction) ? "Long" : "Short"}</span><div className="t2 s12" style={{ marginTop: 2 }}>{d.mine ? "Your trade" : `@${d.owner && d.owner.username}`}, {dshort(x.ts)}</div></span>
            <b className={ocl(pnl)}>{outcome(pnl)}{pnl ? ` (${pnl > 0 ? "+" : ""}${pnl})` : ""}</b>
          </div>
          {(x.setup || x.emotion || x.session || x.confidence) ? <div className="t2 s12" style={{ marginTop: 10 }}>{[x.setup && `Setup: ${x.setup}`, x.emotion && `Feeling: ${x.emotion}`, x.session && `Session: ${x.session}`, x.confidence && `Confidence: ${x.confidence}`].filter(Boolean).join(" · ")}</div> : null}
          {x.note ? <p style={{ margin: "12px 0", whiteSpace: "pre-wrap" }}>{x.note}</p> : null}
          {(d.reviews || []).length > 0 && (<>
            <div className="lb"><span>{d.mine ? "Feedback" : "Reviews"}</span></div>
            {d.reviews.map((r) => (
              <div className="card" style={{ marginBottom: 8 }} key={`${r.username}-${r.ts}`}>
                <div className="rw"><span className="t2 s12">@{r.username}{r.mine ? " (you)" : ""}</span><span className={`mgr ${GRADE_CL[r.grade] || "am"}`}>{r.grade}</span></div>
                {(r.tags || []).length > 0 && <div style={{ marginTop: 8 }}>{r.tags.map((g) => <span className="tag" key={g}>{nice(g)}</span>)}</div>}
              </div>
            ))}
          </>)}
          {reviewable && (<>
            <div className="lb"><span>Your grade</span></div>
            <div className="chips">{["A", "B", "C", "D"].map((g) => <Chip key={g} on={rvg === g} onClick={() => setRvg(g)}>{g}</Chip>)}</div>
            <div className="lb"><span>What stood out</span></div>
            <div className="chips">{MTAGS.map((g) => <Chip key={g} on={rvt.indexOf(g) > -1} onClick={() => setRvt((a) => (a.indexOf(g) > -1 ? a.filter((y) => y !== g) : [...a, g]))}>{nice(g)}</Chip>)}</div>
            <button type="button" className="btn" style={{ marginTop: 12 }} disabled={busy || !rvg} onClick={() => mAct(async () => { await apiPost("/mentors/review", { id: mt.id, grade: rvg, tags: rvt }); await fetchMT(mt.id); }, "Review saved")}>{rvg ? "Save review" : "Pick a grade first"}</button>
          </>)}
          <div className="lb"><span>{(d.comments || []).length} {(d.comments || []).length === 1 ? "comment" : "comments"}</span></div>
          {(d.comments || []).map((c) => (
            <div className="cm" key={c.id}><PAv u={c.username} avatar={c.avatar} size={32} fs={11} /><div className="cmb"><div className="cmh"><b>{c.mine ? "You" : `@${c.username}`}</b><span className="t2 s12">{ago(c.ts)}</span></div><div style={{ whiteSpace: "pre-wrap" }}>{c.text}</div></div></div>
          ))}
          {d.mine && <button type="button" className="row" style={{ border: 0, color: "var(--r)", marginTop: 8 }} onClick={() => { if (!dc) { setDc(true); return; } mAct(() => apiPost("/mentors/unshare", { id: mt.id }), "Stopped sharing").then((ok) => { if (ok) close(); }); }}>{dc ? "Tap again to stop sharing" : "Stop sharing this trade"}</button>}
        </div>
        <div className="shf">
          <input className="in" style={{ margin: 0, width: "auto", flex: 1 }} maxLength={300} placeholder="Add a comment" aria-label="Comment" value={mtxt} onChange={(e) => setMtxt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
          <button type="button" className="btn" style={{ width: 90 }} disabled={busy} onClick={send}>Send</button>
        </div>
      </>);
    }
    if (t === "mmentee") {
      const d = mmen && mmen.data;
      if (!d) return <Loading title="Trader" />;
      const addTask = () => { const v = mtxt.trim(); if (!v) return; mAct(async () => { await apiPost("/mentors/task", { linkId: mmen.linkId, text: v }); setMtxt(""); await fetchMentee(mmen.linkId); }, "Task added"); };
      return (<>
        <SheetHead title={`@${d.mentee && d.mentee.username}`} />
        <div className="shb">
          <div className="mtiles" style={{ marginTop: 14 }}>
            <div className="mtile"><b>{d.stats.shared}</b><span>Shared</span></div>
            <div className="mtile"><b>{d.stats.wins}</b><span>Wins</span></div>
            <div className="mtile"><b>{d.stats.avgGrade ? d.stats.avgGrade.toFixed(1) : "–"}</b><span>Avg grade (of 4)</span></div>
          </div>
          <div className="lb"><span>Shared trades</span></div>
          {d.trades.length ? d.trades.map((x) => TradeRow(x, () => openMTrade(x.id), null, !(x.reviews || []).some(() => true))) : <div className="card t2" style={{ textAlign: "center", padding: "22px 16px" }}>Nothing shared yet.</div>}
          <div className="lb"><span>Tasks</span></div>
          {(d.tasks || []).map((x) => (
            <div className="row" key={x.id}><span style={{ textDecoration: x.done ? "line-through" : "none", opacity: x.done ? 0.6 : 1 }}>{x.text}</span><button type="button" className="chip" style={{ margin: 0, flex: "none" }} disabled={busy} onClick={() => mAct(async () => { await apiPost("/mentors/task/delete", { id: x.id }); await fetchMentee(mmen.linkId); })}>Remove</button></div>
          ))}
          <div className="lb"><span>Give a task</span></div>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="in" style={{ margin: 0, flex: 1, width: "auto" }} maxLength={140} placeholder="Hold the stop on every trade" value={mtxt} onChange={(e) => setMtxt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addTask(); }} />
            <button type="button" className="btn" style={{ width: "auto", padding: "0 18px" }} disabled={busy} onClick={addTask}>Add</button>
          </div>
          <button type="button" className="row" style={{ border: 0, color: "var(--r)", marginTop: 16 }} onClick={() => { if (!dc) { setDc(true); return; } mAct(() => apiPost("/mentors/leave", { linkId: mmen.linkId }), "Mentorship ended").then((ok) => { if (ok) close(); }); }}>{dc ? "Tap again to end mentorship" : "End mentorship"}</button>
        </div>
      </>);
    }
    if (t === "minvite") {
      const go = (role) => {
        const u = inv.trim().replace(/^@/, "");
        if (!u) { toast("Type a username first"); return; }
        mAct(async () => { await apiPost("/mentors/invite", { username: u, role }); close(); }, role === "mentor" ? `Request sent to @${u}` : `Offer sent to @${u}`);
      };
      return (<>
        <SheetHead title="Invite by username" />
        <div className="shb">
          <label className="f">Their username<input className="in" placeholder="@username" autoComplete="off" autoCapitalize="off" value={inv} onChange={(e) => setInv(e.target.value)} /></label>
          <div className="t2 s12" style={{ margin: "10px 0 0", lineHeight: 1.5 }}>They have to accept before anything is shared. Mentors need the Creator plan.</div>
        </div>
        <div className="shf" style={{ flexDirection: "column", gap: 8 }}>
          <button type="button" className="btn" disabled={busy} onClick={() => go("mentor")}>Ask them to be my mentor</button>
          <button type="button" className="btn o" disabled={busy} onClick={() => go("mentee")}>Offer to coach them</button>
        </div>
      </>);
    }
    if (t === "mprof") {
      return (<>
        <SheetHead title="Your mentor profile" />
        <div className="shb">
          <label className="f">About you<textarea className="in" rows={4} maxLength={160} placeholder="What you trade and how you coach" value={pbio} onChange={(e) => setPbio(e.target.value)} /></label>
          <label className="f">Tags, up to 4, separated by commas<input className="in" placeholder="Gold, Pullbacks, Risk" value={ptags} onChange={(e) => setPtags(e.target.value)} /></label>
          <div className="chips" style={{ marginTop: 12 }}><Chip on={popen} onClick={() => setPopen(true)}>Listed in directory</Chip><Chip on={!popen} onClick={() => setPopen(false)}>Hidden</Chip></div>
        </div>
        <div className="shf"><button type="button" className="btn" disabled={busy} onClick={() => mAct(async () => { await apiPost("/mentors/profile", { bio: pbio, tags: ptags.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4), open: popen }); close(); }, "Profile saved")}>Save</button></div>
      </>);
    }
    if (t === "mopt") {
      return (<>
        <SheetHead title="Mentor options" />
        <div className="shb">
          <div className="t2 s12" style={{ margin: "14px 0 6px", lineHeight: 1.5 }}>Ending the mentorship removes shared trades, tasks and feedback with @{sheet.name}.</div>
          <button type="button" className="row" style={{ border: 0, color: "var(--r)" }} onClick={() => { if (!mrs) { setMrs(true); return; } mAct(() => apiPost("/mentors/leave", { linkId: sheet.linkId }), "Mentorship ended").then((ok) => { if (ok) close(); }); }}>{mrs ? "Tap again to end mentorship" : "End mentorship"}</button>
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
  const addPost = () => { if (!sessionToken) { toast("Sign in to your account to post"); return; } setSheet({ t: "compose" }); };
  return (
    <div className={isDesktop ? (tab === "feed" ? "lc lcd-feed" : "lc") : "lc lcm"} style={{ ...vars, flex: 1, minHeight: 0, height: "100%", overflowY: "auto", color: "var(--tx)", fontFamily: sans, fontSize: 14, lineHeight: 1.45, fontVariantNumeric: "tabular-nums", background: "var(--bg)" }}>
      <style>{CSS + CSS_EXTRA}</style>
      <div className="lcin" style={{ maxWidth: isDesktop ? 1480 : "none", margin: "0 auto", padding: isDesktop ? "0 20px 48px" : "10px 2px 110px", boxSizing: "border-box" }}>
        {isDesktop ? (
          <div className="dkbar">
            <div className="tg" role="tablist" aria-label="Community sections">
              {TABS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}</button>)}
            </div>
            {tab === "feed" && <button type="button" className="btn" onClick={addPost}><Ic n="plus" s={18} />Add post</button>}
          </div>
        ) : (
          <div className="tg" role="tablist" aria-label="Community sections" style={{ marginBottom: 6 }}>
            {TABS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}</button>)}
          </div>
        )}
        {tab === "feed" && FeedView()}
        {tab === "rooms" && RoomsView()}
        {tab === "ranks" && RanksView()}
        {tab === "mentor" && MentorView()}
      </div>
      {tab === "feed" && !sheet && !isDesktop && (
        <button type="button" onClick={addPost} aria-label="Add post" style={{ position: "fixed", right: 16, bottom: "calc(88px + env(safe-area-inset-bottom, 0px))", width: 52, height: 52, padding: 0, borderRadius: 99, background: "var(--am)", color: "var(--on)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(0,0,0,.28)", zIndex: 60 }}><Ic n="plus" s={26} /></button>
      )}
      {sheet && (
        <div onClick={(e) => { if (e.target === e.currentTarget && sheet.t !== "room" && sheet.t !== "compose") close(); }} style={{ position: "fixed", inset: 0, zIndex: 130, display: "flex", justifyContent: "center", alignItems: isDesktop ? "center" : "flex-end", background: "rgba(0,0,0,.5)" }}>
          <div style={{ width: "100%", maxWidth: isDesktop ? 640 : 440, height: isDesktop ? "86vh" : "94vh", background: "var(--bg)", borderRadius: isDesktop ? 24 : "24px 24px 0 0", display: "flex", flexDirection: "column", overflow: "hidden", paddingTop: 16 }}>{renderSheet()}</div>
        </div>
      )}
      {toastMsg && <div role="status" style={{ position: "fixed", left: "50%", bottom: "calc(90px + env(safe-area-inset-bottom, 0px))", transform: "translateX(-50%)", background: "var(--tx)", color: "var(--bg)", padding: "10px 16px", borderRadius: 10, fontWeight: 500, zIndex: 140, fontSize: 13 }}>{toastMsg}</div>}
    </div>
  );
}
