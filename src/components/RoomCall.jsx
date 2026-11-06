import { useEffect, useRef, useState } from "react";
import { COMMUNITY_API_BASE, communityApi } from "../api/community.js";

// Live room (Audio / Video / Focus) for Community > Rooms.
//
// Talks to the Cloudflare Worker:
//   GET    /rooms/ice            -> { iceServers }      (STUN + TURN)
//   WS     /rooms/:id/ws?token=  -> signalling + chat + mute/hand/share flags
//   DELETE /rooms/:id            -> host ends the room for everyone
//
// Worker messages  : welcome {id, peers[]} | join {id,name} | leave {id} | signal {from,data}
//                    state {from,state} | chat {from,name,text,ts} | ended | full
// We send          : signal {to,data} | state {state:{mu,hand,shr,cam}} | chat {text} | "ping"
//
// Media is peer to peer (mesh, up to 8 people). Each pair gets one RTCPeerConnection with fixed
// audio (+ video in Video rooms) transceivers, so mute / camera / screen share are just
// track.enabled or replaceTrack(): no renegotiation. The person who joins later makes the offer.
//
// Props (from LedgerCommunity): room {id, kind, title, startedAt, isHost}, token (account session),
//   me {username, avatar}, onLeave({notes, rule}), toast(msg)

const FOCUS_MIN = 45;
const FALLBACK_ICE = [{ urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] }];
const DEFAULT_ST = { mu: true, hand: false, shr: false, cam: false };

const clock = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return `${h ? `${h}:${String(m).padStart(2, "0")}` : m}:${String(x).padStart(2, "0")}`;
};
const initials = (n) =>
  String(n || "?").replace(/^@/, "").split(/[\s._-]+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

const ICONS = {
  mic: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v4 M8 23h8",
  micoff: "M1 1l22 22 M9 9v3a3 3 0 0 0 5.12 2.12 M15 9.34V4a3 3 0 0 0-5.94-.6 M17 16.95A7 7 0 0 1 5 12v-2 M19 10v2a7 7 0 0 1-.11 1.23 M12 19v4 M8 23h8",
  video: "M23 7l-7 5 7 5V7z M3 5h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
  videooff: "M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10 M1 1l22 22",
  screen: "M20 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z M8 21h8 M12 17v4",
  hand: "M18 11V6a2 2 0 0 0-4 0 M14 10V4a2 2 0 0 0-4 0v2 M10 10.5V6a2 2 0 0 0-4 0v8 M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",
  chat: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  send: "M22 2L11 13 M22 2l-7 20-4-9-9-4 22-7z",
  leave: "M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91 M23 1L1 23",
};
const Icon = ({ n, s = 22 }) => (
  <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={ICONS[n]} />
  </svg>
);

// One person's tile: video (or avatar), name, mute / hand badges, speaking ring.
// The <video> element is always mounted because it is also what plays the person's audio.
function Tile({ name, stream, local, showVideo, mirror, muted, hand, speaking, photo, big, status, resumeKey, onBlocked }) {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (v.srcObject !== (stream || null)) v.srcObject = stream || null;
    if (stream && !local) {
      const p = v.play();
      if (p && p.catch) p.catch(() => onBlocked && onBlocked());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, resumeKey]);
  return (
    <div
      style={{
        position: "relative", borderRadius: 14, overflow: "hidden", background: "var(--s1)",
        border: `2px solid ${speaking ? "var(--g)" : "var(--ln)"}`, transition: "border-color .15s",
        aspectRatio: big ? "16 / 9" : "4 / 3", minHeight: big ? 0 : 110,
      }}
    >
      <video
        ref={ref} autoPlay playsInline muted={!!local}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%", background: "#000",
          objectFit: big ? "contain" : "cover", transform: mirror ? "scaleX(-1)" : "none", display: showVideo ? "block" : "none",
        }}
      />
      {!showVideo && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--s2)", color: "var(--am)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 18, overflow: "hidden" }}>
            {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(name)}
          </div>
        </div>
      )}
      <div style={{ position: "absolute", left: 6, right: 6, bottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 12, padding: "3px 8px", borderRadius: 8, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}{status ? ` · ${status}` : ""}
        </span>
        {muted && <span style={{ background: "rgba(0,0,0,.6)", color: "var(--r)", borderRadius: 8, padding: "2px 5px", display: "flex" }}><Icon n="micoff" s={13} /></span>}
      </div>
      {hand && <div style={{ position: "absolute", top: 6, right: 6, background: "var(--am)", color: "var(--on)", borderRadius: 8, padding: "3px 6px", display: "flex" }}><Icon n="hand" s={15} /></div>}
    </div>
  );
}

export default function RoomSheet({ room, token, me, onLeave, toast }) {
  const isFocus = room.kind === "Focus";
  const withVideo = room.kind === "Video";

  const [peers, setPeers] = useState([]);
  const [my, setMy] = useState(DEFAULT_ST);
  const [localStream, setLocalStream] = useState(null);
  const [status, setStatus] = useState("connecting"); // connecting | live | reconnecting
  const [speaking, setSpeaking] = useState({});
  const [chat, setChat] = useState([]);
  const [unread, setUnread] = useState(0);
  const [tab, setTab] = useState("room");
  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState("");
  const [rule, setRule] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [resumeKey, setResumeKey] = useState(0);
  const [endConfirm, setEndConfirm] = useState(false);
  const [now, setNow] = useState(Date.now());

  const S = useRef(null);
  const P = useRef({});
  const tabRef = useRef(tab);
  const notesRef = useRef({ notes: "", rule: "" });
  const chatEnd = useRef(null);
  P.current = { toast, onLeave, me, room };
  tabRef.current = tab;
  notesRef.current = { notes, rule };

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { if (tab === "chat") { setUnread(0); if (chatEnd.current) chatEnd.current.scrollIntoView({ block: "end" }); } }, [tab, chat.length]);

  useEffect(() => {
    const s = {
      stop: false, left: false, ws: null, myId: "", retries: 0, ice: FALLBACK_ICE,
      peers: new Map(), audio: null, cam: null, screen: null, ctx: null, an: new Map(),
      st: { ...DEFAULT_ST }, timers: [], wake: null, api: {},
    };
    S.current = s;
    const say = (m) => { try { P.current.toast && P.current.toast(m); } catch (e) { /* ignore */ } };
    const auth = { Authorization: `Bearer ${token}` };
    const alive = () => S.current === s && !s.stop;

    // ---------- my state ----------
    const setSt = (patch) => {
      Object.assign(s.st, patch);
      setMy({ ...s.st });
      if (s.ws && s.ws.readyState === 1) s.ws.send(JSON.stringify({ t: "state", state: s.st }));
    };
    const send = (obj) => { if (s.ws && s.ws.readyState === 1) s.ws.send(JSON.stringify(obj)); };
    const sendSignal = (to, data) => send({ t: "signal", to, data });

    // ---------- speaking detection ----------
    const ensureCtx = () => {
      if (s.ctx) return s.ctx;
      try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) s.ctx = new AC(); } catch (e) { /* no analyser, rings just won't show */ }
      return s.ctx;
    };
    const watch = (key, stream) => {
      const ctx = ensureCtx();
      if (!ctx || !stream.getAudioTracks().length) return;
      try {
        if (ctx.state === "suspended") ctx.resume();
        const src = ctx.createMediaStreamSource(stream);
        const an = ctx.createAnalyser();
        an.fftSize = 512;
        src.connect(an);
        s.an.set(key, { an, src, buf: new Uint8Array(an.fftSize) });
      } catch (e) { /* ignore */ }
    };
    let lastSpeak = "";
    s.timers.push(setInterval(() => {
      const next = {};
      s.an.forEach((x, key) => {
        x.an.getByteTimeDomainData(x.buf);
        let sum = 0;
        for (let i = 0; i < x.buf.length; i++) { const v = (x.buf[i] - 128) / 128; sum += v * v; }
        next[key] = Math.sqrt(sum / x.buf.length) > 0.04;
      });
      if (s.st.mu) next.me = false;
      const j = JSON.stringify(next);
      if (j !== lastSpeak) { lastSpeak = j; setSpeaking(next); }
    }, 200));

    // ---------- local media ----------
    const currentVideo = () => s.screen || s.cam || null;
    const applyVideo = () => {
      const t = currentVideo();
      s.peers.forEach((e) => { if (e.v) e.v.replaceTrack(t).catch(() => {}); });
      setLocalStream(t ? new MediaStream([t]) : null);
    };
    const applyAudio = () => { s.peers.forEach((e) => { if (e.a) e.a.replaceTrack(s.audio).catch(() => {}); }); };

    const acquireMic = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        say("Calls need a secure (https) connection and a supported browser.");
        return false;
      }
      try {
        const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        const track = st.getAudioTracks()[0];
        if (!alive()) { st.getTracks().forEach((t) => t.stop()); return false; }
        s.audio = track;
        track.onended = () => { s.audio = null; applyAudio(); s.an.delete("me"); setSt({ mu: true }); };
        watch("me", new MediaStream([track]));
        applyAudio();
        setSt({ mu: false });
        return true;
      } catch (e) {
        say("Microphone blocked. Allow it in your browser settings to talk. You can still listen.");
        return false;
      }
    };
    const startCam = async () => {
      if (!withVideo) return;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
      try {
        const st = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24 }, facingMode: "user" } });
        const track = st.getVideoTracks()[0];
        if (!alive()) { st.getTracks().forEach((t) => t.stop()); return; }
        s.cam = track;
        track.onended = () => { if (s.cam === track) { s.cam = null; applyVideo(); setSt({ cam: false }); } };
        applyVideo();
        setSt({ cam: true });
      } catch (e) {
        say("Camera blocked. Allow it in your browser settings to share video.");
      }
    };
    const stopCam = () => {
      if (s.cam) { try { s.cam.onended = null; s.cam.stop(); } catch (e) { /* ignore */ } }
      s.cam = null;
      applyVideo();
      setSt({ cam: false });
    };
    const stopShare = () => {
      if (s.screen) { try { s.screen.onended = null; s.screen.stop(); } catch (e) { /* ignore */ } }
      s.screen = null;
      applyVideo();
      setSt({ shr: false });
    };
    const startShare = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) { say("Screen sharing isn't supported on this device."); return; }
      try {
        const st = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 15 } }, audio: false });
        const track = st.getVideoTracks()[0];
        if (!alive()) { st.getTracks().forEach((t) => t.stop()); return; }
        s.screen = track;
        track.onended = stopShare;
        applyVideo();
        setSt({ shr: true });
      } catch (e) { /* person cancelled the picker */ }
    };

    // ---------- peers ----------
    const syncPeers = () => {
      setPeers(Array.from(s.peers.values()).map((e) => ({ id: e.id, name: e.name, state: e.state, stream: e.stream, conn: e.conn })));
    };
    const negotiate = async (e, iceRestart) => {
      const pc = e.pc;
      if (!pc || pc.signalingState === "closed") return;
      const offer = await pc.createOffer(iceRestart ? { iceRestart: true } : undefined);
      await pc.setLocalDescription(offer);
      sendSignal(e.id, { sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } });
    };
    const recover = (e) => {
      if (!alive() || !s.peers.has(e.id)) return;
      if (e.initiator) e.q = e.q.then(() => negotiate(e, true)).catch(() => {});
      else sendSignal(e.id, { restart: true });
    };
    const flush = async (e) => {
      const list = e.pending.splice(0);
      for (const c of list) { try { await e.pc.addIceCandidate(c); } catch (err) { /* stale candidate */ } }
    };
    const createPc = (e) => {
      const pc = new RTCPeerConnection({ iceServers: s.ice, bundlePolicy: "max-bundle" });
      e.pc = pc;
      e.a = pc.addTransceiver(s.audio || "audio", { direction: "sendrecv" }).sender;
      if (withVideo) e.v = pc.addTransceiver(currentVideo() || "video", { direction: "sendrecv" }).sender;
      pc.onicecandidate = (ev) => { if (ev.candidate) sendSignal(e.id, { ice: ev.candidate.toJSON() }); };
      pc.ontrack = (ev) => {
        if (!e.stream.getTracks().includes(ev.track)) e.stream.addTrack(ev.track);
        if (ev.track.kind === "audio" && !s.an.has(e.id)) watch(e.id, new MediaStream([ev.track]));
        syncPeers();
      };
      pc.onconnectionstatechange = () => {
        e.conn = pc.connectionState;
        syncPeers();
        if (pc.connectionState === "failed") recover(e);
        else if (pc.connectionState === "disconnected") {
          clearTimeout(e.t);
          e.t = setTimeout(() => { if (e.pc === pc && pc.connectionState === "disconnected") recover(e); }, 4000);
        }
      };
    };
    const addPeer = (id, name, state, initiator) => {
      let e = s.peers.get(id);
      if (e) { if (name) e.name = name; if (state) e.state = state; syncPeers(); return e; }
      e = { id, name: name || "@guest", state: state || { ...DEFAULT_ST }, stream: new MediaStream(), pc: null, a: null, v: null, pending: [], q: Promise.resolve(), initiator, conn: "connecting", t: null };
      s.peers.set(id, e);
      if (!isFocus) {
        createPc(e);
        if (initiator) e.q = e.q.then(() => negotiate(e, false)).catch(() => {});
      }
      syncPeers();
      return e;
    };
    const removePeer = (id) => {
      const e = s.peers.get(id);
      if (!e) return;
      clearTimeout(e.t);
      if (e.pc) { try { e.pc.onicecandidate = null; e.pc.ontrack = null; e.pc.onconnectionstatechange = null; e.pc.close(); } catch (err) { /* ignore */ } }
      const w = s.an.get(id);
      if (w) { try { w.src.disconnect(); } catch (err) { /* ignore */ } s.an.delete(id); }
      s.peers.delete(id);
      syncPeers();
    };
    const processSignal = async (e, data) => {
      if (data.restart) { if (e.initiator) await negotiate(e, true); return; }
      const pc = e.pc;
      if (!pc || pc.signalingState === "closed") return;
      if (data.sdp) {
        if (data.sdp.type === "offer") {
          if (pc.signalingState !== "stable") { try { await pc.setLocalDescription({ type: "rollback" }); } catch (err) { /* ignore */ } }
          await pc.setRemoteDescription(data.sdp);
          await flush(e);
          const ans = await pc.createAnswer();
          await pc.setLocalDescription(ans);
          sendSignal(e.id, { sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } });
        } else {
          await pc.setRemoteDescription(data.sdp);
          await flush(e);
        }
      } else if (data.ice) {
        if (pc.remoteDescription) { try { await pc.addIceCandidate(data.ice); } catch (err) { /* ignore */ } } else e.pending.push(data.ice);
      }
    };

    // ---------- leaving ----------
    const cleanup = () => {
      s.stop = true;
      s.timers.forEach((t) => clearInterval(t));
      s.timers = [];
      if (s.ws) { try { s.ws.onclose = null; s.ws.close(1000, "bye"); } catch (e) { /* ignore */ } s.ws = null; }
      Array.from(s.peers.keys()).forEach(removePeer);
      [s.audio, s.cam, s.screen].forEach((t) => { if (t) { try { t.onended = null; t.stop(); } catch (e) { /* ignore */ } } });
      s.audio = s.cam = s.screen = null;
      s.an.forEach((x) => { try { x.src.disconnect(); } catch (e) { /* ignore */ } });
      s.an.clear();
      if (s.ctx) { try { s.ctx.close(); } catch (e) { /* ignore */ } s.ctx = null; }
      if (s.wake) { try { s.wake.release(); } catch (e) { /* ignore */ } s.wake = null; }
    };
    const leave = () => {
      if (s.left) return;
      s.left = true;
      cleanup();
      const { notes: n, rule: r } = notesRef.current;
      P.current.onLeave && P.current.onLeave({ notes: n, rule: r });
    };

    // ---------- signalling socket ----------
    const onMsg = (raw) => {
      let m;
      try { m = JSON.parse(raw); } catch (e) { return; } // "pong"
      if (!m || !m.t) return;
      if (m.t === "welcome") {
        s.myId = m.id;
        setStatus("live");
        send({ t: "state", state: s.st });
        (m.peers || []).forEach((p) => addPeer(p.id, p.name, p.state, true));
      } else if (m.t === "join") {
        addPeer(m.id, m.name, null, false);
      } else if (m.t === "leave") {
        removePeer(m.id);
      } else if (m.t === "signal") {
        const e = s.peers.get(m.from) || addPeer(m.from, "@guest", null, false);
        if (m.data) e.q = e.q.then(() => processSignal(e, m.data)).catch(() => {});
      } else if (m.t === "state") {
        const e = s.peers.get(m.from);
        if (e && m.state) { e.state = m.state; syncPeers(); }
      } else if (m.t === "chat") {
        setChat((c) => [...c.slice(-99), { id: `${m.ts}-${m.from}`, name: m.name, text: m.text, ts: m.ts }]);
        if (tabRef.current !== "chat") setUnread((u) => u + 1);
      } else if (m.t === "ended") {
        s.stop = true;
        say("The host ended this room.");
        leave();
      } else if (m.t === "full") {
        s.stop = true;
        say("This room is full (8 people max).");
        leave();
      }
    };
    const connect = () => {
      if (!alive()) return;
      let ws;
      try {
        ws = new WebSocket(`${COMMUNITY_API_BASE.replace(/^http/, "ws")}/rooms/${encodeURIComponent(room.id)}/ws?token=${encodeURIComponent(token)}`);
      } catch (e) { say("Couldn't connect to the room."); leave(); return; }
      s.ws = ws;
      let ping = null;
      ws.onopen = () => {
        s.retries = 0;
        ping = setInterval(() => { try { ws.send("ping"); } catch (e) { /* ignore */ } }, 25000);
      };
      ws.onmessage = (ev) => { if (typeof ev.data === "string") onMsg(ev.data); };
      ws.onclose = () => {
        clearInterval(ping);
        if (!alive() || s.ws !== ws) return;
        Array.from(s.peers.keys()).forEach(removePeer); // new connection = new id, everyone re-negotiates
        if (s.retries < 6) {
          setStatus("reconnecting");
          s.retries += 1;
          setTimeout(connect, 1000 * Math.min(8, s.retries));
        } else {
          say("Lost connection to the room.");
          leave();
        }
      };
    };

    // ---------- start ----------
    s.api = {
      leave,
      toggleMic: async () => {
        if (!s.audio) { await acquireMic(); return; }
        s.audio.enabled = !s.audio.enabled;
        setSt({ mu: !s.audio.enabled });
      },
      toggleCam: () => (s.cam ? stopCam() : startCam()),
      toggleShare: () => (s.screen ? stopShare() : startShare()),
      toggleHand: () => setSt({ hand: !s.st.hand }),
      sendChat: (text) => {
        const t = String(text || "").trim().slice(0, 300);
        if (!t) return;
        send({ t: "chat", text: t });
        setChat((c) => [...c.slice(-99), { id: `me-${Date.now()}`, name: (P.current.me && P.current.me.username) || "You", text: t, ts: Date.now(), mine: true }]);
      },
    };

    (async () => {
      if (!isFocus) {
        ensureCtx();
        await acquireMic();
        if (withVideo) await startCam();
        if (!alive()) return;
        try {
          const j = await communityApi("/rooms/ice", { headers: auth });
          if (j && Array.isArray(j.iceServers) && j.iceServers.length) s.ice = j.iceServers;
        } catch (e) { /* STUN fallback */ }
        try { if (navigator.wakeLock) s.wake = await navigator.wakeLock.request("screen"); } catch (e) { /* optional */ }
      }
      connect();
    })();

    return () => { if (!s.left) { s.left = true; cleanup(); } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, token]);

  // ---------- derived ----------
  const api = () => (S.current && S.current.api) || {};
  const canShare = withVideo && typeof navigator !== "undefined" && !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
  const elapsed = (now - (room.startedAt || now)) / 1000;
  const focusLeft = FOCUS_MIN * 60 - elapsed;
  const sharer = peers.find((p) => p.state && p.state.shr);
  const gridPeers = peers.filter((p) => p !== sharer);
  const here = peers.length + 1;
  const meName = (me && me.username) || "You";
  const statusText = (p) => (isFocus || p.conn === "connected" ? "" : p.conn === "failed" ? "no connection" : "connecting");

  const doEnd = async () => {
    if (!endConfirm) { setEndConfirm(true); setTimeout(() => setEndConfirm(false), 3000); return; }
    try {
      await communityApi(`/rooms/${encodeURIComponent(room.id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      api().leave && api().leave();
    } catch (e) { toast && toast((e && e.message) || "Couldn't end the room."); }
  };

  const ctl = (on, danger) => ({
    width: 48, height: 48, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
    border: "1px solid var(--ln)", background: danger ? "var(--r)" : on ? "var(--am)" : "var(--s1)", color: danger ? "#fff" : on ? "var(--on)" : "var(--tx)",
  });
  const tabBtn = (id, label, badge) => (
    <button type="button" onClick={() => setTab(id)} className={`chip${tab === id ? " on" : ""}`} style={{ margin: "0 8px 0 0", minHeight: 36, padding: "6px 14px" }}>
      {label}{badge > 0 ? ` · ${badge}` : ""}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px 10px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{room.title}</div>
          <div className="t2" style={{ fontSize: 12, color: "var(--t2)" }}>
            {room.kind} room · {here} here{status !== "live" ? ` · ${status === "reconnecting" ? "reconnecting…" : "connecting…"}` : ""}
          </div>
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: isFocus && focusLeft <= 0 ? "var(--g)" : "var(--tx)" }}>
          {isFocus ? (focusLeft > 0 ? clock(focusLeft) : "Done") : clock(elapsed)}
        </div>
      </div>

      <div style={{ padding: "0 16px 10px", display: "flex" }}>
        {tabBtn("room", "Room", 0)}
        {tabBtn("chat", "Chat", tab === "chat" ? 0 : unread)}
        {tabBtn("notes", "Notes", 0)}
      </div>

      {/* body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 16px 12px", display: "flex", flexDirection: "column" }}>
        {tab === "room" && (
          <>
            {blocked && (
              <button type="button" className="btn o" style={{ marginBottom: 10, height: 44 }} onClick={() => { setBlocked(false); setResumeKey((k) => k + 1); }}>
                Tap to turn on sound
              </button>
            )}
            {isFocus && (
              <div className="card" style={{ textAlign: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 40, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{focusLeft > 0 ? clock(focusLeft) : "Block done"}</div>
                <div className="t2" style={{ fontSize: 13, color: "var(--t2)", marginTop: 4 }}>Silent focus. No mics here. Use chat only if you need to, and jot a rule in Notes.</div>
              </div>
            )}
            {my.shr && (
              <div className="card" style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 13 }}>You're sharing your screen</span>
                <button type="button" className="btn o" style={{ width: "auto", height: 36, padding: "0 14px" }} onClick={() => api().toggleShare()}>Stop</button>
              </div>
            )}
            {sharer && (
              <div style={{ marginBottom: 10 }}>
                <Tile big name={`${sharer.name} is sharing`} stream={sharer.stream} showVideo muted={sharer.state.mu} hand={sharer.state.hand}
                  speaking={!!speaking[sharer.id]} status={statusText(sharer)} resumeKey={resumeKey} onBlocked={() => setBlocked(true)} />
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
              <Tile local name={`${meName} (you)`} stream={localStream} showVideo={!!localStream && (my.cam || my.shr)} mirror={my.cam && !my.shr}
                muted={!isFocus && my.mu} hand={my.hand} speaking={!!speaking.me} photo={me && me.avatar} resumeKey={resumeKey} />
              {gridPeers.map((p) => (
                <Tile key={p.id} name={p.name} stream={p.stream} showVideo={withVideo && !!(p.state.cam || p.state.shr)}
                  muted={!isFocus && p.state.mu} hand={p.state.hand} speaking={!!speaking[p.id]} status={statusText(p)}
                  resumeKey={resumeKey} onBlocked={() => setBlocked(true)} />
              ))}
            </div>
            {peers.length === 0 && status === "live" && (
              <div className="t2" style={{ color: "var(--t2)", fontSize: 13, textAlign: "center", marginTop: 16 }}>
                You're the first one here. Others can join from the Rooms list.
              </div>
            )}
          </>
        )}

        {tab === "chat" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {chat.length === 0 && <div className="t2" style={{ color: "var(--t2)", fontSize: 13 }}>No messages yet. Chat is only for people in this room and disappears when it ends.</div>}
              {chat.map((c) => (
                <div key={c.id} style={{ margin: "8px 0", textAlign: c.mine ? "right" : "left" }}>
                  <div style={{ fontSize: 11, color: "var(--t2)" }}>{c.mine ? "You" : c.name}</div>
                  <div style={{ display: "inline-block", maxWidth: "85%", padding: "8px 12px", borderRadius: 12, background: c.mine ? "var(--am)" : "var(--s1)", color: c.mine ? "var(--on)" : "var(--tx)", border: c.mine ? "none" : "1px solid var(--ln)", textAlign: "left", wordBreak: "break-word" }}>{c.text}</div>
                </div>
              ))}
              <div ref={chatEnd} />
            </div>
            <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
              <input
                className="in" style={{ marginTop: 0 }} placeholder="Message the room" maxLength={300} value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { api().sendChat(draft); setDraft(""); } }}
              />
              <button type="button" aria-label="Send" style={{ ...ctl(true), width: 44, height: 44 }} disabled={!draft.trim()} onClick={() => { api().sendChat(draft); setDraft(""); }}><Icon n="send" s={18} /></button>
            </div>
          </div>
        )}

        {tab === "notes" && (
          <div>
            <label className="f" style={{ display: "block", fontSize: 12, color: "var(--t2)" }}>
              Notes from this room
              <textarea className="in" rows={6} maxLength={200} placeholder="Levels, ideas, what you took from it" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ resize: "none" }} />
            </label>
            <label className="f" style={{ display: "block", fontSize: 12, color: "var(--t2)", marginTop: 12 }}>
              One rule for your next trade
              <input className="in" maxLength={120} placeholder="Wait for the close before entering" value={rule} onChange={(e) => setRule(e.target.value)} />
            </label>
            <div className="t2" style={{ color: "var(--t2)", fontSize: 12, marginTop: 10 }}>Saved on this device when you leave the room.</div>
          </div>
        )}
      </div>

      {/* controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "10px 12px calc(12px + env(safe-area-inset-bottom, 0px))", borderTop: "1px solid var(--ln)", flexWrap: "wrap" }}>
        {!isFocus && (
          <button type="button" aria-label={my.mu ? "Unmute" : "Mute"} aria-pressed={!my.mu} style={ctl(!my.mu)} onClick={() => api().toggleMic()}>
            <Icon n={my.mu ? "micoff" : "mic"} />
          </button>
        )}
        {withVideo && (
          <button type="button" aria-label={my.cam ? "Turn camera off" : "Turn camera on"} aria-pressed={my.cam} style={ctl(my.cam)} onClick={() => api().toggleCam()}>
            <Icon n={my.cam ? "video" : "videooff"} />
          </button>
        )}
        {canShare && (
          <button type="button" aria-label={my.shr ? "Stop sharing" : "Share screen"} aria-pressed={my.shr} style={ctl(my.shr)} onClick={() => api().toggleShare()}>
            <Icon n="screen" />
          </button>
        )}
        <button type="button" aria-label={my.hand ? "Lower hand" : "Raise hand"} aria-pressed={my.hand} style={ctl(my.hand)} onClick={() => api().toggleHand()}>
          <Icon n="hand" />
        </button>
        <button type="button" aria-label="Chat" style={ctl(tab === "chat")} onClick={() => setTab(tab === "chat" ? "room" : "chat")}>
          <Icon n="chat" />
          {unread > 0 && tab !== "chat" && (
            <span style={{ position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, background: "var(--r)", color: "#fff", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{unread}</span>
          )}
        </button>
        <button type="button" aria-label="Leave room" style={ctl(false, true)} onClick={() => api().leave()}>
          <Icon n="leave" />
        </button>
        {room.isHost && (
          <button type="button" className="btn o" style={{ width: "auto", height: 40, padding: "0 14px", fontSize: 13 }} onClick={doEnd}>
            {endConfirm ? "Tap again to end for all" : "End room"}
          </button>
        )}
      </div>
    </div>
  );
}
