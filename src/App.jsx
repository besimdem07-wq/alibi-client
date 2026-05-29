// =============================================================
// L'ALIBI — Client React v5 (multijoueur Socket.IO)
// =============================================================
import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

// =============================================================
// CONFIG
// =============================================================
const SERVER_URL = typeof import.meta !== "undefined" && import.meta.env?.VITE_SERVER_URL
  ? import.meta.env.VITE_SERVER_URL
  : "http://localhost:3001";

const PREP_DURATION = 90;
const TEAM_COLORS = {
  1: { main:"var(--team1)", light:"var(--team1-light)", bg:"rgba(58,123,213,0.1)", border:"rgba(58,123,213,0.3)" },
  2: { main:"var(--team2)", light:"var(--team2-light)", bg:"rgba(155,89,182,0.1)", border:"rgba(155,89,182,0.3)" },
};
export const PHASES = {
  LOBBY:"LOBBY", BRIEFING:"BRIEFING", PREP_TIMER:"PREP_TIMER",
  INTERROGATION_A:"INTERROGATION_A", ISOLATION_B:"ISOLATION_B",
  INTERROGATION_B:"INTERROGATION_B", CONFRONTATION:"CONFRONTATION",
  BETWEEN_TEAMS:"BETWEEN_TEAMS", VERDICT:"VERDICT",
};

// =============================================================
// GLOBAL STYLES
// =============================================================
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&family=Crimson+Pro:ital,wght@0,400;0,600;1,400&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --ink:#0a0a0f;--paper:#f0ece2;--red:#c0392b;--red-light:#e74c3c;
      --green:#27ae60;--green-light:#2ecc71;--gold:#d4a017;--gold-light:#f0c040;
      --muted:#7a7060;--team1:#3a7bd5;--team1-light:#5b9cf6;
      --team2:#9b59b6;--team2-light:#c084fc;
    }
    html,body,#root{height:100%}
    body{background:var(--ink);font-family:'DM Mono',monospace;color:var(--paper);overflow:hidden}
    .screen{height:100vh;width:100vw;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden}
    .screen::before{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");pointer-events:none;z-index:100}
    .title-display{font-family:'Bebas Neue',sans-serif;letter-spacing:0.05em;line-height:0.9}
    .serif{font-family:'Crimson Pro',serif}
    .dossier{background:var(--paper);color:var(--ink);border-radius:2px;position:relative;box-shadow:0 2px 4px rgba(0,0,0,0.3),0 8px 32px rgba(0,0,0,0.5),inset 0 0 0 1px rgba(0,0,0,0.08)}
    .dossier::after{content:'';position:absolute;inset:0;border-radius:2px;background:repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(0,0,0,0.05) 27px,rgba(0,0,0,0.05) 28px);pointer-events:none}
    .stamp{display:inline-block;font-family:'Bebas Neue',sans-serif;font-size:2rem;letter-spacing:0.15em;padding:0.2em 0.6em;border:4px solid currentColor;border-radius:4px;transform:rotate(-8deg);opacity:0.85}
    .stamp-red{color:var(--red)}.stamp-green{color:var(--green)}
    .btn{font-family:'DM Mono',monospace;font-size:0.75rem;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;border:none;cursor:pointer;transition:all 0.15s ease;display:inline-flex;align-items:center;gap:0.5rem}
    .btn-primary{background:var(--paper);color:var(--ink);padding:0.9em 2.4em;clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)}
    .btn-primary:hover:not(:disabled){background:var(--gold-light);transform:translateY(-1px)}
    .btn-primary:disabled{opacity:0.4;cursor:not-allowed}
    .btn-ghost{background:transparent;color:var(--paper);padding:0.7em 1.6em;border:1px solid rgba(240,236,226,0.3)}
    .btn-ghost:hover{border-color:var(--paper)}
    .btn-danger{background:var(--red);color:white;padding:0.9em 2.4em;clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)}
    .ptt-btn{width:130px;height:130px;border-radius:50%;border:3px solid var(--paper);background:transparent;color:var(--paper);font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:0.1em;cursor:pointer;transition:all 0.1s ease;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;user-select:none;-webkit-user-select:none}
    .ptt-btn.recording{border-color:var(--red-light);color:var(--red-light);animation:ptt-pulse 1s ease-in-out infinite}
    @keyframes ptt-pulse{0%,100%{box-shadow:0 0 0 8px rgba(231,76,60,0.15),0 0 0 16px rgba(231,76,60,0.08)}50%{box-shadow:0 0 0 14px rgba(231,76,60,0.2),0 0 0 28px rgba(231,76,60,0.05)}}
    .verdict-light{width:48px;height:48px;border-radius:50%;border:2px solid;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .verdict-light.green{border-color:var(--green);background:rgba(39,174,96,0.15);color:var(--green-light);box-shadow:0 0 12px rgba(46,204,113,0.4)}
    .verdict-light.red{border-color:var(--red);background:rgba(192,57,43,0.15);color:var(--red-light);box-shadow:0 0 12px rgba(231,76,60,0.4)}
    .verdict-light.pending{border-color:var(--muted);color:var(--muted)}
    .q-card{background:rgba(240,236,226,0.05);border:1px solid rgba(240,236,226,0.15);border-radius:2px;padding:1.2rem 1.6rem}
    .q-card.active{background:rgba(240,236,226,0.1);border-color:rgba(240,236,226,0.4)}
    @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes slideIn{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
    @keyframes gyro{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
    @keyframes waveformBar{0%,100%{transform:scaleY(0.3)}50%{transform:scaleY(1)}}
    @keyframes sttBar{0%,100%{transform:scaleY(0.2)}50%{transform:scaleY(1)}}
    @keyframes scoreReveal{from{opacity:0;transform:scaleX(0)}to{opacity:1;transform:scaleX(1)}}
    @keyframes dots{0%{content:''}33%{content:'.'}66%{content:'..'}100%{content:'...'}}
    ::-webkit-scrollbar{width:4px}
    ::-webkit-scrollbar-thumb{background:rgba(240,236,226,0.2);border-radius:2px}
    .field{background:transparent;border:none;border-bottom:1px solid rgba(240,236,226,0.3);color:var(--paper);font-family:'DM Mono',monospace;font-size:1rem;padding:0.6em 0;outline:none;width:100%;transition:border-color 0.2s}
    .field:focus{border-bottom-color:var(--paper)}.field::placeholder{color:var(--muted)}
    .field-label{font-size:0.6rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--muted);margin-bottom:0.4rem}
    .room-code{font-family:'Bebas Neue',sans-serif;font-size:4rem;letter-spacing:0.3em;color:var(--gold-light)}
    .divider{height:1px;background:linear-gradient(90deg,transparent,rgba(240,236,226,0.2),transparent)}
    .player-chip{display:inline-flex;align-items:center;gap:0.5rem;background:rgba(240,236,226,0.08);border:1px solid rgba(240,236,226,0.2);border-radius:2px;padding:0.4rem 0.8rem;font-size:0.75rem}
    .player-chip .role-badge{background:var(--gold);color:var(--ink);font-family:'Bebas Neue',sans-serif;font-size:0.8rem;padding:0 0.4rem;border-radius:1px}
    .progress-dots{display:flex;gap:8px;align-items:center}
    .progress-dot{width:8px;height:8px;border-radius:50%;background:rgba(240,236,226,0.2);transition:all 0.3s}
    .progress-dot.done{background:var(--green)}.progress-dot.active{background:var(--paper);box-shadow:0 0 6px rgba(240,236,226,0.6)}
    .timer-ring{transform:rotate(-90deg)}.timer-ring circle{transition:stroke-dashoffset 1s linear}
    .loading-dots::after{content:'';animation:dots 1.5s infinite}
    .tts-indicator{display:flex;align-items:flex-end;gap:3px;height:20px;padding:0 4px}
    .tts-bar{width:3px;border-radius:2px;background:var(--gold-light);animation:waveformBar 0.5s ease-in-out infinite}
    .tts-bar:nth-child(1){animation-delay:0s;height:60%}.tts-bar:nth-child(2){animation-delay:0.1s;height:100%}
    .tts-bar:nth-child(3){animation-delay:0.2s;height:70%}.tts-bar:nth-child(4){animation-delay:0.15s;height:90%}
    .tts-bar:nth-child(5){animation-delay:0.05s;height:50%}
    .tts-speak-btn{background:transparent;border:1px solid rgba(240,236,226,0.25);border-radius:2px;color:var(--muted);font-family:'DM Mono',monospace;font-size:0.6rem;letter-spacing:0.15em;padding:0.35em 0.8em;cursor:pointer;display:inline-flex;align-items:center;gap:0.4rem;transition:all 0.15s}
    .tts-speak-btn:hover,.tts-speak-btn.speaking{border-color:var(--gold-light);color:var(--gold-light)}
    .stt-wave{display:flex;align-items:flex-end;gap:4px;height:28px}
    .stt-wave-bar{width:4px;border-radius:3px;background:var(--red-light);animation:sttBar 0.45s ease-in-out infinite}
    .stt-wave-bar:nth-child(1){height:100%;animation-delay:0s}.stt-wave-bar:nth-child(2){height:70%;animation-delay:0.07s}
    .stt-wave-bar:nth-child(3){height:90%;animation-delay:0.14s}.stt-wave-bar:nth-child(4){height:55%;animation-delay:0.21s}
    .stt-wave-bar:nth-child(5){height:80%;animation-delay:0.28s}.stt-wave-bar:nth-child(6){height:40%;animation-delay:0.35s}
    .stt-wave-bar:nth-child(7){height:75%;animation-delay:0.42s}
    .interim-text{font-family:'Crimson Pro',serif;font-size:0.95rem;color:rgba(240,236,226,0.35);font-style:italic;min-height:1.4em;line-height:1.4}
    .manual-textarea{background:rgba(240,236,226,0.05);border:1px solid rgba(240,236,226,0.25);border-radius:2px;color:var(--paper);font-family:'Crimson Pro',serif;font-size:1rem;line-height:1.5;padding:0.8rem 1rem;width:100%;resize:none;outline:none;transition:border-color 0.2s}
    .manual-textarea:focus{border-color:rgba(240,236,226,0.5)}.manual-textarea::placeholder{color:var(--muted);font-style:italic}
    .stt-error{background:rgba(192,57,43,0.08);border:1px solid rgba(192,57,43,0.3);border-radius:2px;padding:0.8rem 1rem;font-size:0.7rem;color:var(--red-light);line-height:1.5}
    .score-bar-track{height:8px;border-radius:4px;background:rgba(240,236,226,0.1);overflow:hidden}
    .score-bar-fill{height:100%;border-radius:4px;transform-origin:left;animation:scoreReveal 0.8s ease forwards}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
    .scroll-content{overflow-y:auto;max-height:calc(100vh - 4rem);width:100%;padding:2rem;display:flex;flex-direction:column;align-items:center}
    /* CONNEXION STATUS */
    .conn-badge{position:fixed;top:12px;right:12px;font-size:0.55rem;letter-spacing:0.15em;padding:0.3em 0.7em;border-radius:2px;z-index:200;border:1px solid}
    .conn-badge.online{color:var(--green-light);border-color:rgba(46,204,113,0.3);background:rgba(39,174,96,0.1)}
    .conn-badge.offline{color:var(--red-light);border-color:rgba(231,76,60,0.3);background:rgba(192,57,43,0.1)}
    .conn-badge.connecting{color:var(--gold-light);border-color:rgba(212,160,23,0.3);background:rgba(212,160,23,0.1)}
  `}</style>
);

// =============================================================
// HOOK useSpeech — TTS
// =============================================================
function useSpeech() {
  const synthRef = useRef(window.speechSynthesis);
  const [speaking, setSpeaking] = useState(false);
  const [supported] = useState(() => "speechSynthesis" in window);
  useEffect(() => () => synthRef.current?.cancel(), []);
  const getBestVoice = useCallback(() => {
    const v = synthRef.current.getVoices();
    const frM = v.filter(x => x.lang.startsWith("fr") &&
      (x.name.toLowerCase().includes("thomas")||x.name.toLowerCase().includes("nicolas")||
       x.name.toLowerCase().includes("male")||x.name.toLowerCase().includes("homme")));
    return frM[0] || v.find(x=>x.lang.startsWith("fr")) || v[0] || null;
  }, []);
  const speak = useCallback((text, opts={}) => {
    if (!supported) return Promise.resolve();
    synthRef.current.cancel();
    // Améliore la naturalité : ajoute des micro-pauses aux virgules et points
    const naturalText = text
      .replace(/\.\.\./g, "… ")
      .replace(/([!?])\s/g, "$1  ");
    return new Promise(res => {
      setTimeout(() => {
        const u = new SpeechSynthesisUtterance(naturalText);
        const voices = synthRef.current.getVoices();
        // Priorité aux voix FR de haute qualité (Google FR, Apple Thomas)
        const preferred = voices.find(v =>
          v.lang.startsWith("fr") && (
            v.name.includes("Google") ||
            v.name.includes("Thomas") ||
            v.name.includes("Amelie") ||
            v.name.includes("Marie")
          )
        ) || voices.find(v => v.lang.startsWith("fr")) || voices[0];
        if (preferred) u.voice = preferred;
        u.lang = "fr-FR";
        // Paramètres optimisés pour plus de naturel
        u.rate   = opts.rate  ?? 0.88;  // légèrement plus rapide = plus naturel
        u.pitch  = opts.pitch ?? 0.92;  // moins grave = moins robotique
        u.volume = opts.volume ?? 1;
        u.onstart = () => setSpeaking(true);
        u.onend   = () => { setSpeaking(false); res(); };
        u.onerror = () => { setSpeaking(false); res(); };
        synthRef.current.speak(u);
      }, 80);
    });
  }, [supported]);
  const stop = useCallback(() => { synthRef.current?.cancel(); setSpeaking(false); }, []);
  useEffect(() => {
    if (!supported) return;
    const load = () => synthRef.current.getVoices();
    load(); window.speechSynthesis.onvoiceschanged = load;
  }, [supported]);
  return { speak, stop, speaking, supported };
}

function SpeakButton({ text, speech, label="ÉCOUTER", options={} }) {
  return (
    <button className={`tts-speak-btn ${speech.speaking?"speaking":""}`}
      onClick={() => speech.speaking ? speech.stop() : speech.speak(text, options)}>
      {speech.speaking
        ? <><div className="tts-indicator">{[1,2,3,4,5].map(i=><div key={i} className="tts-bar"/>)}</div>STOPPER</>
        : <>{label} 🔊</>}
    </button>
  );
}

// =============================================================
// HOOK useSpeechRecognition — STT
// =============================================================
function useSpeechRecognition() {
  const [status, setStatus] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const recRef = useRef(null);
  const finalRef = useRef("");
  const supported = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  useEffect(() => () => recRef.current?.abort(), []);
  const startListening = useCallback(() => {
    if (!supported) { setStatus("manual"); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang="fr-FR"; rec.continuous=true; rec.interimResults=true; rec.maxAlternatives=1;
    finalRef.current=""; setTranscript(""); setInterimTranscript(""); setErrorMsg("");
    rec.onstart=()=>setStatus("listening");
    rec.onresult=(e)=>{
      let interim=""; let final=finalRef.current;
      for (let i=e.resultIndex;i<e.results.length;i++){
        if (e.results[i].isFinal) final+=(final?" ":"")+e.results[i][0].transcript.trim();
        else interim+=e.results[i][0].transcript;
      }
      finalRef.current=final; setInterimTranscript(interim);
      if (final) setTranscript(final);
    };
    rec.onerror=(e)=>{
      if (e.error==="no-speech") return;
      if (e.error==="not-allowed"||e.error==="permission-denied"){
        setErrorMsg("Accès au microphone refusé. Autorisez le micro dans votre navigateur.");
        setStatus("error");
      } else setStatus("manual");
    };
    rec.onend=()=>setStatus(prev=>prev==="listening"?"done":prev);
    recRef.current=rec;
    try { rec.start(); } catch { setStatus("error"); setErrorMsg("Impossible de démarrer l'enregistrement."); }
  }, [supported]);
  const stopListening = useCallback(() => {
    recRef.current?.stop();
    setTimeout(() => setStatus(prev => prev==="listening"&&!finalRef.current?"manual":prev), 400);
  }, []);
  const reset = useCallback(() => {
    recRef.current?.abort(); setStatus("idle"); setTranscript(""); setInterimTranscript(""); setErrorMsg(""); finalRef.current="";
  }, []);
  const setManualTranscript = useCallback(t => { setTranscript(t); finalRef.current=t; }, []);
  const confirmManual = useCallback(() => { if (finalRef.current.trim()) setStatus("done"); }, []);
  return { status, transcript, interimTranscript, errorMsg, supported, startListening, stopListening, reset, setManualTranscript, confirmManual };
}

// =============================================================
// HOOK useGameSocket — cerveau multijoueur
// =============================================================
function useGameSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connError, setConnError] = useState(null);

  // State de jeu — miroir du serveur
  const [gameState, setGameState] = useState({
    phase: PHASES.LOBBY,
    mode: "2P",
    players: [],
    activeTeam: 1,
    rounds: [],
    roomId: null,
    prepSeconds: PREP_DURATION,
    judging: {},
    speechLoading: false,
    speechText: null,
    tiebreak: null,
  });

  const patch = useCallback((updates) =>
    setGameState(prev => ({ ...prev, ...updates })), []);

  // ── CONNEXION ──────────────────────────────────────────────
  useEffect(() => {
    setConnecting(true);
    const socket = io(SERVER_URL, {
      transports: ["websocket", "polling"],
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on("connect", () => { setConnected(true); setConnecting(false); setConnError(null); });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (e) => { setConnecting(false); setConnError(e.message); });

    // State complet (sync ou reset)
    socket.on("state:sync",   (s) => patch(s));
    socket.on("state:update", (s) => patch(s));

    // Scénario
    socket.on("scenario:loading", ({ teamId }) =>
      setGameState(prev => ({
        ...prev,
        rounds: prev.rounds.map(r => r.teamId===teamId ? {...r, scenarioLoading:true} : r)
      })));
    socket.on("scenario:ready", ({ teamId, scenario }) =>
      setGameState(prev => ({
        ...prev,
        rounds: prev.rounds.map(r => r.teamId===teamId ? {...r, scenario, scenarioLoading:false} : r)
      })));
    socket.on("scenario:error", ({ message }) => patch({ connError: message }));

    // Timer
    socket.on("timer:tick", ({ seconds }) => patch({ prepSeconds: seconds }));
    socket.on("timer:warning", () => {}); // le front TTS gère le "10 secondes"

    // Notifications joueurs
    socket.on("player:joined", ({ name, role }) =>
      setGameState(prev => ({ ...prev, toast: { msg:`${name} (Suspect ${role}) a rejoint`, type:"info", ts:Date.now() } })));
    socket.on("player:disconnected", ({ name }) =>
      setGameState(prev => ({ ...prev, toast: { msg:`${name} s'est déconnecté·e`, type:"warn", ts:Date.now() } })));

    // Lobby temps réel — liste joueurs connectés
    socket.on("lobby:update", ({ players, mode }) => {
      // Filtrer les joueurs temporaires/internes
      const real = players.filter(p =>
        p.name && p.name !== "HOST" && p.name !== "__OBSERVER__" && p.name !== "__PENDING__"
      );
      setGameState(prev => ({ ...prev, lobbyPlayers: real, mode }));
    });

    // Jugements
    socket.on("judge:thinking", ({ questionId }) =>
      setGameState(prev => ({ ...prev, judging: { ...prev.judging, [questionId]: true } })));
    socket.on("judge:verdict", ({ questionId, judgment }) =>
      setGameState(prev => ({
        ...prev,
        judging: { ...prev.judging, [questionId]: false },
        rounds: prev.rounds.map(r =>
          r.teamId === prev.activeTeam
            ? { ...r, judgments: { ...r.judgments, [questionId]: judgment } }
            : r
        )
      })));

    // Discours
    socket.on("verdict:speech_loading", () => patch({ speechLoading: true }));
    socket.on("verdict:speech_ready", ({ speech, tiebreak }) =>
      patch({ speechLoading: false, speechText: speech, tiebreak: tiebreak||null }));

    return () => socket.disconnect();
  }, []);

  // ── HELPERS ────────────────────────────────────────────────
  const emit = useCallback((event, payload) =>
    new Promise((res, rej) => {
      if (!socketRef.current?.connected) return rej(new Error("Non connecté"));
      socketRef.current.emit(event, payload, (ack) => {
        if (ack?.error) rej(new Error(ack.error)); else res(ack);
      });
    }), []);

  const activeRound = useCallback(() =>
    gameState.rounds.find(r => r.teamId === gameState.activeTeam) || null,
    [gameState.rounds, gameState.activeTeam]);

  // ── ACTIONS ────────────────────────────────────────────────

  // Crée la room sur le serveur et récupère le roomId
  const createRoom = useCallback(async (mode="2P") => {
    const res = await fetch(`${SERVER_URL}/rooms`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ mode }),
    });
    const { roomId } = await res.json();
    patch({ roomId, mode });
    return roomId;
  }, []);

  const joinRoom = useCallback((payload) => emit("room:join", payload), [emit]);
  const startGame = useCallback((payload) => emit("game:start", payload), [emit]);
  const startPrep = useCallback((roomId) => emit("prep:start", { roomId }), [emit]);
  const skipPrep = useCallback((roomId) => emit("prep:skip", { roomId }), [emit]);

  const submitAnswer = useCallback((payload) => emit("answer:submit", payload), [emit]);
  const confirmIsolation = useCallback((roomId) => emit("isolation:confirm", { roomId }), [emit]);

  const requestJudgment = useCallback(({ roomId, questionId }) =>
    emit("judge:request", { roomId, questionId })
      .then(ack => ack?.judgment), [emit]);

  const endConfrontation = useCallback((roomId) => emit("confrontation:end", { roomId }), [emit]);
  const startTeam2 = useCallback((roomId) => emit("team2:start", { roomId }), [emit]);
  const requestSpeech = useCallback((roomId) => emit("verdict:speech", { roomId }), [emit]);

  const resetGame = useCallback((roomId) => {
    patch({
      phase:PHASES.LOBBY, rounds:[], players:[], speechText:null,
      tiebreak:null, prepSeconds:PREP_DURATION, judging:{},
    });
    emit("game:reset", { roomId }).catch(() => {});
  }, [emit]);

  return {
    // état
    ...gameState,
    connected, connecting, connError,
    activeRound,
    // actions
    createRoom, joinRoom, startGame,
    startPrep, skipPrep,
    submitAnswer, confirmIsolation,
    requestJudgment,
    endConfrontation, startTeam2,
    requestSpeech, resetGame,
    patch,
  };
}

// =============================================================
// COMPOSANTS UI
// =============================================================
function ConnBadge({ connected, connecting }) {
  if (connecting) return <div className="conn-badge connecting">CONNEXION<span className="loading-dots"/></div>;
  return <div className={`conn-badge ${connected?"online":"offline"}`}>{connected?"● EN LIGNE":"● HORS LIGNE"}</div>;
}


// Toast notification (player:joined / player:disconnected)
function Toast({ toast }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2800);
    return () => clearTimeout(t);
  }, [toast?.ts]);
  if (!visible || !toast) return null;
  const isWarn = toast.type === "warn";
  return (
    <div style={{
      position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)",
      background: isWarn ? "rgba(192,57,43,0.9)" : "rgba(39,174,96,0.9)",
      color:"white", fontFamily:"DM Mono,monospace", fontSize:"0.65rem",
      letterSpacing:"0.1em", padding:"0.5em 1.2em", borderRadius:"2px",
      zIndex:300, animation:"fadeUp 0.3s ease", whiteSpace:"nowrap",
      boxShadow:"0 4px 16px rgba(0,0,0,0.4)"
    }}>
      {isWarn ? "⚠ " : "● "}{toast.msg}
    </div>
  );
}

function TeamBadge({ team, size="md" }) {
  const c = TEAM_COLORS[team];
  return <span style={{ background:c.main, color:"white", fontFamily:"Bebas Neue", fontSize:size==="sm"?"0.65rem":"0.9rem", padding:"0.1em 0.5em", borderRadius:"1px", letterSpacing:"0.1em" }}>ÉQUIPE {team}</span>;
}
function Logo({ size="lg" }) {
  return (
    <div style={{ textAlign:"center" }}>
      <div className="title-display" style={{ fontSize:size==="sm"?"2.5rem":"5rem" }}>L'ALIBI</div>
      {size!=="sm" && <div style={{ fontSize:"0.6rem", letterSpacing:"0.4em", color:"var(--muted)", marginTop:"0.2rem" }}>LE JEU DES SUSPECTS</div>}
    </div>
  );
}
function Timer({ seconds, total, size=80 }) {
  const r=(size-8)/2, circ=2*Math.PI*r, pct=seconds/total;
  const color=pct>0.5?"var(--green)":pct>0.25?"var(--gold)":"var(--red-light)";
  return (
    <div style={{ position:"relative", width:size, height:size }}>
      <svg width={size} height={size} className="timer-ring">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(240,236,226,0.1)" strokeWidth="4"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round"/>
      </svg>
      <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
        <span className="title-display" style={{ fontSize:size*0.28, color }}>{seconds}</span>
        <span style={{ fontSize:"0.45rem",letterSpacing:"0.15em",color:"var(--muted)" }}>SEC</span>
      </div>
    </div>
  );
}
function VerdictLight({ status, size=48 }) {
  const cls=status===true?"green":status===false?"red":"pending";
  const icon=status===true?"✓":status===false?"✕":"?";
  return <div className={`verdict-light ${cls}`} style={{ width:size, height:size }}><span style={{ fontSize:size*0.35 }}>{icon}</span></div>;
}
function ProgressDots({ total, current, done }) {
  return <div className="progress-dots">{Array.from({length:total}).map((_,i)=><div key={i} className={`progress-dot ${i<done?"done":i===current?"active":""}`}/>)}</div>;
}
function PlayerChip({ player }) {
  return <div className="player-chip"><span className="role-badge">{player.role}</span><span>{player.name}</span></div>;
}
function ScoreBar({ penalties, total, color }) {
  const pct=total>0?Math.min((penalties/total)*100,100):0;
  return <div className="score-bar-track" style={{ flex:1 }}><div className="score-bar-fill" style={{ width:`${pct}%`, background:color }}/></div>;
}

// =============================================================
// SCREENS
// =============================================================

// ── LOBBY ────────────────────────────────────────────────────
// Nouveau flux : nom seulement → rôles attribués automatiquement
// HOST : crée + voit les gens arriver + mélange les équipes
// JOUEUR : code + prénom → attente
// ─────────────────────────────────────────────────────────────

// Utilitaire : mélanger un tableau (Fisher-Yates)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Attribution des rôles : N noms → joueurs avec role + team
function assignRoles(names, mode) {
  const shuffled = shuffle(names);
  if (mode === "2P") {
    return [
      { name: shuffled[0], role: "A", team: 1 },
      { name: shuffled[1], role: "B", team: 1 },
    ];
  } else {
    // 4P : équipes aléatoires
    return [
      { name: shuffled[0], role: "A", team: 1 },
      { name: shuffled[1], role: "B", team: 1 },
      { name: shuffled[2], role: "A", team: 2 },
      { name: shuffled[3], role: "B", team: 2 },
    ];
  }
}

// Accueil
function LobbyHome({ game, onHost, onJoin }) {
  return (
    <div className="screen">
      <ConnBadge connected={game.connected} connecting={game.connecting}/>
      <div style={{ width:"100%", maxWidth:420, padding:"2rem", animation:"fadeUp 0.6s ease", textAlign:"center" }}>
        <Logo/>
        <div style={{ marginTop:"3rem", display:"flex", flexDirection:"column", gap:"1rem" }}>
          <button className="btn btn-primary" style={{ width:"100%", justifyContent:"center" }}
            disabled={!game.connected} onClick={onHost}>
            🎙 CRÉER UNE SALLE
          </button>
          <button className="btn btn-ghost" style={{ width:"100%", justifyContent:"center" }}
            disabled={!game.connected} onClick={onJoin}>
            🔑 REJOINDRE AVEC UN CODE
          </button>
        </div>
        {!game.connected && <div style={{ marginTop:"2rem", fontSize:"0.65rem", color:"var(--muted)" }}>Connexion au serveur<span className="loading-dots"/></div>}
        <div style={{ marginTop:"3rem", fontSize:"0.6rem", color:"var(--muted)", letterSpacing:"0.1em" }}>
          Inventez votre alibi. Espérez que l'autre en fasse autant.
        </div>
      </div>
    </div>
  );
}

// HOST — attend les noms, mélange, lance
function LobbyHost({ game, onBack }) {
  const [mode, setMode]       = useState("2P");
  const [roomId, setRoomId]   = useState(null);
  const [error, setError]     = useState("");
  const [launched, setLaunched] = useState(false);
  const [assignment, setAssignment] = useState(null); // après mélange

  const count = mode === "4P" ? 4 : 2;
  // Tous les joueurs connectés (sauf HOST/OBSERVER internes)
  const arrivedNames = (game.lobbyPlayers || [])
    .filter(p => p.name !== "HOST" && p.name !== "__OBSERVER__" && p.name !== "__PENDING__" && p.name)
    .map(p => p.name)
    .filter((n, i, arr) => arr.indexOf(n) === i); // dédupliquer
  const ready = arrivedNames.length === count;

  // Créer la room au montage
  useEffect(() => {
    (async () => {
      try {
        const id = await game.createRoom(mode);
        setRoomId(id);
        await game.joinRoom({ roomId: id, playerName:"HOST", role:"A", team:1, clientRole:"HOST" });
      } catch(e) { setError(e.message); }
    })();
  }, []);

  // Recréer la room si mode change (sans joueurs)
  const changeMode = async (m) => {
    if (arrivedNames.length > 0) return;
    setMode(m);
    setAssignment(null);
    try {
      const id = await game.createRoom(m);
      setRoomId(id);
      await game.joinRoom({ roomId: id, playerName:"HOST", role:"A", team:1, clientRole:"HOST" });
    } catch(e) { setError(e.message); }
  };

  // Mélanger les équipes
  const shuffle_teams = () => {
    if (!ready) return;
    setAssignment(assignRoles(arrivedNames, mode));
  };

  // Lancer la partie
  const launch = async () => {
    if (!roomId || !ready) return;
    setLaunched(true);
    // Utiliser l'attribution actuelle ou en créer une au hasard
    const finalAssignment = assignment || assignRoles(arrivedNames, mode);
    try {
      // Re-joindre chaque joueur avec son rôle assigné
      for (const p of finalAssignment) {
        await game.joinRoom({ roomId, playerName: p.name, role: p.role, team: p.team, clientRole: `PLAYER_${p.role}` });
      }
      await game.startGame({ roomId, mode });
    } catch(e) { setError(e.message); setLaunched(false); }
  };

  const TEAM_C = { 1:"var(--team1)", 2:"var(--team2)" };

  return (
    <div className="screen" style={{ padding:"2rem" }}>
      <ConnBadge connected={game.connected} connecting={game.connecting}/>
      <div style={{ width:"100%", maxWidth:460, animation:"fadeUp 0.6s ease" }}>

        <div style={{ display:"flex", alignItems:"center", gap:"1rem", marginBottom:"2rem" }}>
          <button className="btn btn-ghost" style={{ padding:"0.4em 0.8em", fontSize:"0.65rem" }} onClick={onBack}>←</button>
          <Logo size="sm"/>
        </div>

        {/* Code */}
        <div className="dossier" style={{ padding:"1.5rem 2rem", marginBottom:"1.5rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div className="field-label" style={{ color:"var(--muted)" }}>Code à partager</div>
              {roomId
                ? <div className="room-code">{roomId}</div>
                : <div style={{ fontSize:"2.5rem", color:"var(--muted)", fontFamily:"Bebas Neue", letterSpacing:"0.3em" }}>····<span className="loading-dots"/></div>}
              <div style={{ fontSize:"0.65rem", color:"var(--muted)", marginTop:"0.4rem" }}>
                Chaque joueur ouvre l'app et entre ce code
              </div>
            </div>
            <div className="stamp stamp-red" style={{ fontSize:"0.9rem" }}>HOST</div>
          </div>
        </div>

        {/* Mode */}
        <div style={{ marginBottom:"1.5rem" }}>
          <div className="field-label" style={{ color:"var(--muted)" }}>Mode de jeu</div>
          <div style={{ display:"flex", gap:"0.5rem", marginTop:"0.5rem" }}>
            {[["2P","👥 Duo"],["4P","⚔️ 2v2"]].map(([m,label]) => (
              <button key={m} onClick={()=>changeMode(m)} className="btn" style={{
                flex:1, padding:"0.6rem",
                background:mode===m?"var(--ink)":"transparent",
                color:mode===m?"var(--paper)":"var(--muted)",
                border:`1px solid ${mode===m?"var(--ink)":"rgba(240,236,226,0.15)"}`,
                fontSize:"0.7rem", letterSpacing:"0.1em",
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Joueurs qui arrivent */}
        <div style={{ marginBottom:"1.5rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.8rem" }}>
            <div className="field-label" style={{ color:"var(--muted)" }}>Joueurs connectés</div>
            <div style={{ fontSize:"0.65rem", color:ready?"var(--green-light)":"var(--muted)" }}>
              {arrivedNames.length}/{count} {ready?"✓ PRÊTS":"en attente..."}
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.4rem" }}>
            {Array.from({length:count}).map((_,i) => {
              const name = arrivedNames[i];
              return (
                <div key={i} style={{
                  display:"flex", alignItems:"center", gap:"0.8rem",
                  padding:"0.7rem 1rem",
                  background:name?"rgba(39,174,96,0.08)":"rgba(240,236,226,0.03)",
                  border:`1px solid ${name?"rgba(39,174,96,0.3)":"rgba(240,236,226,0.08)"}`,
                  borderRadius:"2px", transition:"all 0.3s",
                }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0,
                    background:name?"var(--green-light)":"rgba(240,236,226,0.2)",
                    boxShadow:name?"0 0 6px rgba(46,204,113,0.6)":"none", transition:"all 0.3s" }}/>
                  <div style={{ flex:1 }}>
                    {name
                      ? <span style={{ fontFamily:"Bebas Neue", fontSize:"0.95rem" }}>{name}</span>
                      : <span style={{ fontSize:"0.6rem", color:"var(--muted)", letterSpacing:"0.1em", animation:"blink 1.4s ease infinite" }}>EN ATTENTE</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attribution des rôles — visible quand tout le monde est là */}
        {ready && (
          <div style={{ marginBottom:"1.5rem", animation:"fadeUp 0.4s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.8rem" }}>
              <div className="field-label" style={{ color:"var(--muted)" }}>Attribution des rôles</div>
              <button className="tts-speak-btn" onClick={shuffle_teams} style={{ fontSize:"0.6rem" }}>
                🔀 MÉLANGER
              </button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"0.3rem" }}>
              {(assignment || assignRoles(arrivedNames, mode)).map((p,i) => (
                <div key={i} style={{
                  display:"flex", alignItems:"center", gap:"0.6rem",
                  padding:"0.5rem 0.8rem",
                  background:"rgba(240,236,226,0.05)",
                  border:"1px solid rgba(240,236,226,0.1)",
                  borderRadius:"2px",
                }}>
                  {mode==="4P" && <span style={{ background:TEAM_C[p.team], color:"white", fontFamily:"Bebas Neue", fontSize:"0.6rem", padding:"0 0.3rem", borderRadius:"1px" }}>E{p.team}</span>}
                  <span style={{ fontFamily:"Bebas Neue", fontSize:"0.85rem", letterSpacing:"0.05em" }}>Suspect {p.role}</span>
                  <span style={{ flex:1, textAlign:"right", fontSize:"0.8rem", color:"var(--gold-light)" }}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <div style={{ marginBottom:"1rem", color:"var(--red-light)", fontSize:"0.7rem" }}>⚠ {error}</div>}

        <button className="btn btn-primary" style={{ width:"100%" }}
          disabled={!ready || launched || !roomId}
          onClick={launch}>
          {launched
            ? <span className="loading-dots">DÉMARRAGE</span>
            : ready ? "LANCER L'ENQUÊTE →" : `EN ATTENTE (${arrivedNames.length}/${count})`}
        </button>
      </div>
    </div>
  );
}

// JOUEUR — entre le code + son prénom, c'est tout
function LobbyJoin({ game, onBack }) {
  const [step, setStep]   = useState("code"); // "code" | "name" | "waiting"
  const [code, setCode]   = useState("");
  const [name, setName]   = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [roomInfo, setRoomInfo] = useState(null);

  const lobbyPlayers = (game.lobbyPlayers || []);

  // Vérifier le code
  const checkCode = async () => {
    if (code.trim().length < 4) return;
    setError("");
    try {
      const res = await fetch(`${SERVER_URL}/rooms/${code.trim().toUpperCase()}`);
      if (!res.ok) { setError("Code invalide ou salle introuvable."); return; }
      const info = await res.json();
      setRoomInfo(info);
      // Rejoindre en spectateur pour recevoir les lobby:update
      // Rejoindre sans slot fixe — juste pour recevoir les lobby:update
      // On utilise team:99 pour signaler un joueur "en attente de rôle"
      const tmpRole = Math.random() > 0.5 ? "A" : "B";
      await game.joinRoom({ roomId:code.trim().toUpperCase(), playerName:"__PENDING__", role:tmpRole, team:99, clientRole:"SPECTATOR" });
      setStep("name");
    } catch { setError("Impossible de vérifier le code."); }
  };

  // Confirmer le nom — pas de choix de rôle, le HOST attribue
  const confirmName = async () => {
    if (!name.trim() || joining) return;
    setJoining(true);
    setError("");
    try {
      const roomId = code.trim().toUpperCase();
      // Rejoindre avec un rôle temporaire "B" — le HOST réassignera les rôles au lancement
      // Rejoindre avec le nom mais toujours en attente de rôle (team:99)
      // Le HOST réassignera les rôles au lancement
      await game.joinRoom({ roomId, playerName:name.trim(), role:"B", team:99, clientRole:"PLAYER_B" });
      game.patch({ roomId });
      setStep("waiting");
    } catch(e) { setError(e.message); }
    finally { setJoining(false); }
  };

  return (
    <div className="screen" style={{ padding:"2rem" }}>
      <ConnBadge connected={game.connected} connecting={game.connecting}/>
      <div style={{ width:"100%", maxWidth:420, animation:"fadeUp 0.6s ease" }}>

        <div style={{ display:"flex", alignItems:"center", gap:"1rem", marginBottom:"2rem" }}>
          <button className="btn btn-ghost" style={{ padding:"0.4em 0.8em", fontSize:"0.65rem" }} onClick={onBack}>←</button>
          <Logo size="sm"/>
        </div>

        {/* ÉTAPE 1 : Code */}
        {step === "code" && (
          <div style={{ animation:"fadeUp 0.4s ease" }}>
            <div style={{ marginBottom:"1.5rem" }}>
              <div className="field-label" style={{ marginBottom:"0.6rem" }}>Code de la salle</div>
              <input className="field"
                style={{ fontSize:"2rem", letterSpacing:"0.4em", fontFamily:"Bebas Neue", textTransform:"uppercase" }}
                placeholder="A3F2" maxLength={4}
                value={code}
                onChange={e=>setCode(e.target.value.toUpperCase())}
                onKeyDown={e=>e.key==="Enter"&&checkCode()}
                autoFocus/>
            </div>
            {error && <div style={{ marginBottom:"1rem", color:"var(--red-light)", fontSize:"0.7rem" }}>⚠ {error}</div>}
            <button className="btn btn-primary" style={{ width:"100%" }}
              disabled={code.trim().length<4||!game.connected} onClick={checkCode}>
              VÉRIFIER →
            </button>
          </div>
        )}

        {/* ÉTAPE 2 : Prénom seulement */}
        {step === "name" && (
          <div style={{ animation:"fadeUp 0.4s ease" }}>
            <div style={{ marginBottom:"0.8rem" }}>
              <div style={{ fontSize:"0.6rem", letterSpacing:"0.2em", color:"var(--muted)", marginBottom:"0.3rem" }}>SALLE</div>
              <div className="room-code" style={{ fontSize:"2rem" }}>{code.toUpperCase()}</div>
            </div>
            <div style={{ marginBottom:"2rem", marginTop:"1.5rem" }}>
              <div className="field-label" style={{ marginBottom:"0.6rem" }}>Votre prénom</div>
              <input className="field"
                placeholder="Entrez votre prénom..."
                value={name}
                onChange={e=>setName(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&confirmName()}
                autoFocus/>
              <div style={{ marginTop:"0.5rem", fontSize:"0.6rem", color:"var(--muted)" }}>
                Le HOST attribuera les rôles au hasard avant de lancer.
              </div>
            </div>
            {error && <div style={{ marginBottom:"1rem", color:"var(--red-light)", fontSize:"0.7rem" }}>⚠ {error}</div>}
            <button className="btn btn-primary" style={{ width:"100%" }}
              disabled={!name.trim()||joining} onClick={confirmName}>
              {joining ? <span className="loading-dots">CONNEXION</span> : "REJOINDRE →"}
            </button>
          </div>
        )}

        {/* ÉTAPE 3 : Attente */}
        {step === "waiting" && (
          <div style={{ textAlign:"center", animation:"fadeUp 0.4s ease" }}>
            <div style={{ fontSize:"4rem", marginBottom:"1rem" }}>⏳</div>
            <div className="title-display" style={{ fontSize:"2rem", marginBottom:"0.5rem" }}>EN ATTENTE</div>
            <div style={{ fontFamily:"Bebas Neue", fontSize:"1.4rem", color:"var(--gold-light)", marginBottom:"0.5rem" }}>{name}</div>
            <div style={{ fontSize:"0.7rem", color:"var(--muted)", marginBottom:"2rem" }}>
              Salle {code.toUpperCase()} · Le HOST attribue les rôles
            </div>
            <div style={{ background:"rgba(240,236,226,0.05)", border:"1px solid rgba(240,236,226,0.1)", borderRadius:"2px", padding:"1rem", marginBottom:"1rem" }}>
              <div style={{ fontSize:"0.55rem", letterSpacing:"0.2em", color:"var(--muted)", marginBottom:"0.8rem" }}>DANS LA SALLE</div>
              {lobbyPlayers.length === 0
                ? <div style={{ fontSize:"0.65rem", color:"var(--muted)" }}>Chargement<span className="loading-dots"/></div>
                : lobbyPlayers.map((p,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:"0.6rem", padding:"0.3rem 0", fontSize:"0.75rem" }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--green-light)", boxShadow:"0 0 4px rgba(46,204,113,0.6)" }}/>
                    <span>{p.name}</span>
                  </div>
                ))}
            </div>
            <div className="serif" style={{ fontSize:"0.9rem", color:"rgba(240,236,226,0.5)" }}>
              Le HOST lance la partie depuis son écran.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Routeur lobby
function LobbyScreen({ game }) {
  const [view, setView] = useState("home");
  if (view === "host") return <LobbyHost game={game} onBack={()=>setView("home")}/>;
  if (view === "join") return <LobbyJoin game={game} onBack={()=>setView("home")}/>;
  return <LobbyHome game={game} onHost={()=>setView("host")} onJoin={()=>setView("join")}/>;
}

// ── BRIEFING ─────────────────────────────────────────────────
function BriefingScreen({ game }) {
  const [spoken, setSpoken] = useState(false);
  const speech = useSpeech();
  const round = game.activeRound();
  const teamColor = TEAM_COLORS[game.activeTeam];
  const teamPlayers = game.players.filter(p => p.team===game.activeTeam);
  const loading = !round?.scenario;
  const error = game.connError;

  // Pas d'auto-lecture — le joueur choisit quand écouter
  useEffect(() => { setSpoken(false); }, [round?.scenario?.accusation]); // reset si nouveau scénario

  if (loading) return (
    <div className="screen">
      <div style={{ textAlign:"center", animation:"fadeUp 0.5s ease" }}>
        <Logo size="sm"/>
        {game.mode==="4P" && <div style={{ marginTop:"0.8rem" }}><TeamBadge team={game.activeTeam}/></div>}
        <div style={{ marginTop:"2rem", color:"var(--muted)", fontSize:"0.8rem", letterSpacing:"0.1em" }}>
          Le Commissaire prépare le dossier<span className="loading-dots"/>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="screen">
      <div style={{ textAlign:"center", padding:"2rem" }}>
        <div style={{ color:"var(--red-light)", marginBottom:"1rem" }}>⚠ {error}</div>
        <button className="btn btn-ghost" onClick={()=>game.resetGame(game.roomId)}>Retour au lobby</button>
      </div>
    </div>
  );

  const scenario = round.scenario;
  return (
    <div className="screen" style={{ padding:"2rem" }}>
      <div style={{ width:"100%", maxWidth:520, animation:"fadeUp 0.6s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"2rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"1rem" }}>
            <Logo size="sm"/>
            {game.mode==="4P" && <TeamBadge team={game.activeTeam}/>}
          </div>
          <div style={{ display:"flex", gap:"0.5rem" }}>
            {teamPlayers.map(p=><PlayerChip key={p.id} player={p}/>)}
          </div>
        </div>

        <div style={{ background:teamColor.bg, border:`1px solid ${teamColor.border}`, borderRadius:"2px", padding:"1.5rem 2rem", marginBottom:"2rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.8rem" }}>
            <div style={{ fontSize:"0.6rem", letterSpacing:"0.25em", color:teamColor.light }}>⬛ ACCUSATION OFFICIELLE</div>
            {speech.supported && <SpeakButton text={`Attention ! ${scenario.accusation_dramatique}`} speech={speech} label="RÉÉCOUTER" options={{ rate:0.75, pitch:0.8 }}/>}
          </div>
          <div className="serif" style={{ fontSize:"1.1rem", lineHeight:1.5 }}>{scenario.accusation_dramatique}</div>
          <div style={{ marginTop:"1rem" }}><span className="stamp stamp-red" style={{ fontSize:"0.9rem" }}>COUPABLES PRÉSUMÉS</span></div>
        </div>

        <div style={{ marginBottom:"2rem" }}>
          <div style={{ fontSize:"0.65rem", letterSpacing:"0.15em", color:"var(--muted)", marginBottom:"0.8rem" }}>INSTRUCTIONS</div>
          <div className="serif" style={{ fontSize:"0.95rem", lineHeight:1.6, color:"rgba(240,236,226,0.8)" }}>
            Vous avez <strong style={{ color:"var(--gold-light)" }}>{PREP_DURATION} secondes</strong> pour construire votre alibi commun. Coordonnez chaque détail : lieu, personnes, nourriture, trajet...
          </div>
        </div>

        <div style={{ display:"flex", gap:"0.4rem", marginBottom:"2rem" }}>
          {Array.from({length:5}).map((_,i)=><div key={i} style={{ flex:1, height:"4px", borderRadius:"2px", background:"rgba(240,236,226,0.2)" }}/>)}
        </div>

        <button className="btn btn-primary" style={{ width:"100%" }}
          onClick={()=>{ speech.stop(); game.startPrep(game.roomId); }}>
          DÉMARRER LE DÉCOMPTE →
        </button>
      </div>
    </div>
  );
}

// ── PREP TIMER ───────────────────────────────────────────────
function PrepTimerScreen({ game }) {
  const speech = useSpeech();
  const warned = useRef(false);
  const seconds = game.prepSeconds;
  const round = game.activeRound();

  // TTS alerte 10s
  useEffect(() => {
    if (seconds===10 && !warned.current) { warned.current=true; speech.speak("Dix secondes !", { rate:1.0, pitch:0.9 }); }
  }, [seconds]);

  return (
    <div className="screen">
      <div style={{ textAlign:"center", animation:"fadeUp 0.5s ease" }}>
        {game.mode==="4P" && <div style={{ marginBottom:"1rem" }}><TeamBadge team={game.activeTeam}/></div>}
        <div style={{ fontSize:"0.65rem", letterSpacing:"0.3em", color:"var(--muted)", marginBottom:"2rem" }}>CONCERTATION EN COURS</div>
        <Timer seconds={seconds} total={PREP_DURATION} size={160}/>
        <div className="serif" style={{ marginTop:"2rem", fontSize:"1.1rem", color:"rgba(240,236,226,0.6)" }}>Construisez votre histoire ensemble</div>
        <div style={{ marginTop:"0.5rem", fontSize:"0.7rem", color:"var(--muted)" }}>
          Délit : <span style={{ color:"var(--paper)" }}>{round?.scenario?.accusation}</span>
        </div>
        {seconds > 10 && (
          <button className="btn btn-ghost" style={{ marginTop:"2rem", fontSize:"0.65rem" }}
            onClick={()=>game.skipPrep(game.roomId)}>
            On est prêts →
          </button>
        )}
      </div>
    </div>
  );
}

// ── INTERROGATOIRE ───────────────────────────────────────────
function InterrogationScreen({ game, role }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [questionSpoken, setQuestionSpoken] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const speech = useSpeech();
  const stt = useSpeechRecognition();
  const round = game.activeRound();

  const teamPlayers = game.players.filter(p=>p.team===game.activeTeam);
  const player = teamPlayers.find(p=>p.role===role);
  const questions = round?.scenario?.questions || [];
  const question = questions[currentQ];
  const isLast = currentQ === questions.length - 1;

  useEffect(() => { setQuestionSpoken(false); stt.reset(); }, [currentQ]);

  // Lecture manuelle — bouton ÉCOUTER dans la question card

  const handleNext = async () => {
    const answer = stt.transcript.trim() || "(pas de réponse)";
    setSubmitting(true);
    await game.submitAnswer({ roomId:game.roomId, role, questionId:question.id, transcript:answer });
    setSubmitting(false);
    if (!isLast) setCurrentQ(q => q+1);
    // Si isLast, le serveur va changer de phase → le composant sera remplacé automatiquement
  };

  const canAdvance = (stt.status==="done" && stt.transcript.trim().length>0) ||
                     (stt.status==="manual" && stt.transcript.trim().length>2 && stt.transcript!=="__SWITCH__");

  return (
    <div className="screen" style={{ padding:"2rem" }}>
      <div style={{ width:"100%", maxWidth:480, animation:"fadeUp 0.5s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"2rem" }}>
          <div>
            <div style={{ display:"flex", gap:"0.5rem", alignItems:"center", marginBottom:"0.2rem" }}>
              {game.mode==="4P" && <TeamBadge team={game.activeTeam} size="sm"/>}
              <div style={{ fontSize:"0.6rem", letterSpacing:"0.2em", color:"var(--muted)" }}>INTERROGATOIRE</div>
            </div>
            <div className="title-display" style={{ fontSize:"1.8rem" }}>
              SUSPECT {role}
              {player && <span style={{ color:"var(--gold-light)", marginLeft:"0.3em" }}>{player.name}</span>}
            </div>
          </div>
          <ProgressDots total={questions.length} current={currentQ} done={currentQ}/>
        </div>

        {role==="A" && currentQ===0 && (
          <div style={{ background:"rgba(212,160,23,0.1)", border:"1px solid rgba(212,160,23,0.3)", borderRadius:"2px", padding:"0.8rem 1rem", marginBottom:"1.5rem", fontSize:"0.7rem", color:"var(--gold-light)" }}>
            ⚠ Suspect B : isolez-vous maintenant. Casque sur les oreilles.
          </div>
        )}

        <div className="q-card active" style={{ marginBottom:"1.5rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.6rem" }}>
            <div style={{ fontSize:"0.6rem", letterSpacing:"0.2em", color:"var(--muted)" }}>QUESTION {currentQ+1} / {questions.length}</div>
            {speech.supported && question && !speech.speaking &&
              <SpeakButton text={question.text} speech={speech} label="RÉÉCOUTER" options={{ rate:0.85, pitch:0.82 }}/>}
          </div>
          <div className="serif" style={{ fontSize:"1.2rem", lineHeight:1.5 }}>{question?.text}</div>
          {speech.speaking && (
            <div style={{ marginTop:"0.8rem", display:"flex", alignItems:"center", gap:"0.5rem" }}>
              <div className="tts-indicator">{[1,2,3,4,5].map(i=><div key={i} className="tts-bar"/>)}</div>
              <span style={{ fontSize:"0.6rem", color:"var(--gold-light)", letterSpacing:"0.1em" }}>LE COMMISSAIRE PARLE</span>
            </div>
          )}
        </div>

        {/* Zone STT */}
        {stt.supported && stt.status!=="manual" && stt.status!=="error" && (
          <div style={{ marginBottom:"1.5rem" }}>
            {(stt.status==="idle"||stt.status==="listening") && !speech.speaking && (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"1rem" }}>
                <button className={`ptt-btn ${stt.status==="listening"?"recording":""}`}
                  onMouseDown={()=>{speech.stop();stt.startListening();}}
                  onMouseUp={()=>stt.stopListening()}
                  onTouchStart={e=>{e.preventDefault();speech.stop();stt.startListening();}}
                  onTouchEnd={e=>{e.preventDefault();stt.stopListening();}}>
                  {stt.status==="listening"
                    ? <><div className="stt-wave">{[1,2,3,4,5,6,7].map(i=><div key={i} className="stt-wave-bar"/>)}</div><span style={{fontSize:"0.6rem",marginTop:"4px"}}>RELÂCHER</span></>
                    : <><span style={{fontSize:"2rem"}}>🎙</span><span style={{fontSize:"0.65rem"}}>MAINTENIR</span></>}
                </button>
                <div style={{ fontSize:"0.6rem", color:"var(--muted)", letterSpacing:"0.1em" }}>
                  {stt.status==="listening" ? "Parlez maintenant..." : "Appuyez et maintenez pour parler"}
                </div>
                {stt.status==="listening" && stt.interimTranscript && (
                  <div className="interim-text" style={{ textAlign:"center", maxWidth:320 }}>{stt.interimTranscript}…</div>
                )}
              </div>
            )}
            {speech.speaking && (
              <div style={{ textAlign:"center" }}>
                <button className="btn btn-ghost" style={{ fontSize:"0.65rem" }} onClick={()=>speech.stop()}>Passer la lecture →</button>
              </div>
            )}
            {stt.status==="done" && stt.transcript && (
              <div style={{ animation:"slideIn 0.3s ease" }}>
                <div style={{ background:"rgba(240,236,226,0.05)", border:"1px solid rgba(240,236,226,0.15)", borderRadius:"2px", padding:"1rem", marginBottom:"1rem" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.4rem" }}>
                    <div style={{ fontSize:"0.55rem", letterSpacing:"0.2em", color:"var(--muted)" }}>RÉPONSE ENREGISTRÉE</div>
                    <button className="tts-speak-btn" onClick={()=>stt.reset()} style={{ fontSize:"0.55rem", color:"var(--red-light)", borderColor:"rgba(192,57,43,0.3)" }}>✕ RECOMMENCER</button>
                  </div>
                  <div className="serif" style={{ fontSize:"0.95rem", color:"rgba(240,236,226,0.85)" }}>"{stt.transcript}"</div>
                </div>
                <button className="btn btn-primary" style={{ width:"100%" }} disabled={submitting} onClick={handleNext}>
                  {submitting ? <span className="loading-dots">ENVOI</span> : isLast ? "TERMINER L'INTERROGATOIRE →" : "QUESTION SUIVANTE →"}
                </button>
              </div>
            )}
            {stt.status==="done" && !stt.transcript && (
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:"0.7rem", color:"var(--muted)", marginBottom:"1rem" }}>Rien enregistré. Réessayez ou tapez.</div>
                <div style={{ display:"flex", gap:"0.5rem", justifyContent:"center" }}>
                  <button className="btn btn-ghost" style={{ fontSize:"0.65rem" }} onClick={()=>stt.reset()}>Réessayer →</button>
                  <button className="btn btn-ghost" style={{ fontSize:"0.65rem" }} onClick={()=>stt.setManualTranscript("__SWITCH__")}>Taper →</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mode manuel */}
        {(stt.status==="manual"||!stt.supported) && (
          <div style={{ marginBottom:"1.5rem", animation:"fadeUp 0.3s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.8rem" }}>
              <div style={{ fontSize:"0.6rem", color:"var(--muted)" }}>⌨ {stt.supported ? "Saisie manuelle" : "Micro non disponible"}</div>
              {stt.supported && <button className="tts-speak-btn" onClick={()=>stt.reset()} style={{ fontSize:"0.55rem" }}>← Micro</button>}
            </div>
            <textarea className="manual-textarea" rows={3} placeholder="Tapez votre réponse ici..."
              value={stt.transcript==="__SWITCH__"?"":stt.transcript}
              onChange={e=>stt.setManualTranscript(e.target.value)} autoFocus/>
            <button className="btn btn-primary" style={{ width:"100%", marginTop:"0.8rem" }}
              disabled={!canAdvance||submitting} onClick={handleNext}>
              {submitting ? <span className="loading-dots">ENVOI</span> : isLast ? "TERMINER L'INTERROGATOIRE →" : "QUESTION SUIVANTE →"}
            </button>
          </div>
        )}

        {/* Erreur micro */}
        {stt.status==="error" && (
          <div style={{ marginBottom:"1.5rem" }}>
            <div className="stt-error" style={{ marginBottom:"1rem" }}>⚠ {stt.errorMsg}</div>
            <div style={{ display:"flex", gap:"0.5rem" }}>
              <button className="btn btn-ghost" style={{ flex:1, fontSize:"0.65rem" }} onClick={()=>stt.reset()}>Réessayer →</button>
              <button className="btn btn-ghost" style={{ flex:1, fontSize:"0.65rem" }} onClick={()=>{stt.reset();setTimeout(()=>stt.setManualTranscript(""),50);}}>Taper →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ISOLATION B ──────────────────────────────────────────────
function IsolationScreen({ game }) {
  const speech = useSpeech();
  const teamPlayers = game.players.filter(p=>p.team===game.activeTeam);
  const playerA = teamPlayers.find(p=>p.role==="A");
  const playerB = teamPlayers.find(p=>p.role==="B");

  // Lecture manuelle via bouton RÉPÉTER ci-dessous

  return (
    <div className="screen">
      <div style={{ textAlign:"center", padding:"2rem", maxWidth:420, animation:"fadeUp 0.5s ease" }}>
        {game.mode==="4P" && <div style={{ marginBottom:"1rem" }}><TeamBadge team={game.activeTeam}/></div>}
        <div style={{ fontSize:"4rem", marginBottom:"1rem" }}>🎧</div>
        <div className="title-display" style={{ fontSize:"2.5rem", marginBottom:"1rem" }}>{playerB?.name}, ISOLEZ-VOUS</div>
        <div className="serif" style={{ fontSize:"1rem", color:"rgba(240,236,226,0.6)", lineHeight:1.6, marginBottom:"2rem" }}>
          Mettez votre casque avec de la musique.<br/>Ne regardez pas l'écran.<br/>Attendez qu'on vous appelle.
        </div>
        {speech.supported && <SpeakButton text={`${playerB?.name}, veuillez vous isoler.`} speech={speech} label="RÉPÉTER" options={{ rate:0.82, pitch:0.8 }}/>}
        <div style={{ marginTop:"2rem" }}>
          <button className="btn btn-primary" onClick={()=>{ speech.stop(); game.confirmIsolation(game.roomId); }}>
            B EST ISOLÉ·E — COMMENCER →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CONFRONTATION ────────────────────────────────────────────
function ConfrontationScreen({ game }) {
  const [step, setStep] = useState(0);
  const speech = useSpeech();
  const round = game.activeRound();
  const questions = round?.scenario?.questions || [];
  const totalQ = questions.length;
  const teamColor = TEAM_COLORS[game.activeTeam];
  const teamPlayers = game.players.filter(p=>p.team===game.activeTeam);

  const currentQ = step>0 ? questions[step-1] : null;
  const qId = currentQ?.id;
  const answerA = qId ? round?.answers[`A-${qId}`] : null;
  const answerB = qId ? round?.answers[`B-${qId}`] : null;
  const judgment = qId ? round?.judgments?.[qId] : null;
  const judging = qId ? !!game.judging?.[qId] : false;
  const allDone = step > totalQ;
  const penalties = Object.values(round?.judgments||{}).filter(j=>!j.isMatching).length;

  // Lectures manuelles via boutons — pas d'auto-lecture

  const readAnswer = (role, text) => {
    speech.stop();
    const p = teamPlayers.find(pl=>pl.role===role);
    speech.speak(`${p?.name} a répondu : ${text}`, { rate:0.88, pitch:role==="A"?1.0:0.75 });
  };

  const judgeQuestion = async () => {
    speech.stop();
    await game.requestJudgment({ roomId:game.roomId, questionId:qId });
    // Le serveur broadcast judge:verdict → gameState.rounds se met à jour automatiquement
  };

  const handleFinish = () => {
    speech.stop();
    game.endConfrontation(game.roomId);
  };

  if (step===0) return (
    <div className="screen">
      <div style={{ textAlign:"center", padding:"2rem", animation:"fadeUp 0.5s ease" }}>
        {game.mode==="4P" && <div style={{ marginBottom:"1rem" }}><TeamBadge team={game.activeTeam}/></div>}
        <div style={{ fontSize:"0.65rem", letterSpacing:"0.3em", color:"var(--muted)", marginBottom:"1rem" }}>PHASE DE</div>
        <div className="title-display" style={{ fontSize:"5rem" }}>CONFRONTATION</div>
        <div className="serif" style={{ marginTop:"1rem", color:"rgba(240,236,226,0.6)" }}>Les suspects sont réunis. Le Juge entre en scène.</div>
        {speech.speaking && <div style={{ marginTop:"1.5rem", display:"flex", justifyContent:"center" }}><div className="tts-indicator">{[1,2,3,4,5].map(i=><div key={i} className="tts-bar"/>)}</div></div>}
        <button className="btn btn-primary" style={{ marginTop:"3rem" }} onClick={()=>{speech.stop();setStep(1);}}>COMMENCER →</button>
      </div>
    </div>
  );

  if (allDone) return (
    <div className="screen">
      <div style={{ textAlign:"center", padding:"2rem", animation:"fadeUp 0.5s ease" }}>
        {game.mode==="4P" && <div style={{ marginBottom:"1rem" }}><TeamBadge team={game.activeTeam}/></div>}
        <div className="title-display" style={{ fontSize:"2.5rem", marginBottom:"1.5rem" }}>RÉSULTAT ÉQUIPE {game.activeTeam}</div>
        <div style={{ fontSize:"4rem", marginBottom:"0.5rem" }}>{penalties===0?"🏆":penalties<3?"😬":"🚨"}</div>
        <div className="title-display" style={{ fontSize:"2.5rem", color:penalties<3?"var(--green)":"var(--red-light)" }}>
          {penalties} INCOHÉRENCE{penalties!==1?"S":""}
        </div>
        <div style={{ display:"flex", justifyContent:"center", gap:"0.5rem", margin:"1.5rem 0", flexWrap:"wrap" }}>
          {questions.map(q=>{const j=round?.judgments?.[q.id];return j?<VerdictLight key={q.id} status={j.isMatching} size={36}/>:null;})}
        </div>
        <button className="btn btn-primary" onClick={handleFinish}>
          {game.mode==="4P" && game.activeTeam===1 ? "ÉQUIPE 2, À VOUS →" : "VERDICT FINAL →"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="screen" style={{ padding:"2rem" }}>
      <div style={{ width:"100%", maxWidth:500, animation:"fadeUp 0.4s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
          <div style={{ display:"flex", gap:"0.5rem", alignItems:"center" }}>
            {game.mode==="4P" && <TeamBadge team={game.activeTeam} size="sm"/>}
            <div style={{ fontSize:"0.6rem", letterSpacing:"0.2em", color:"var(--muted)" }}>QUESTION {step} / {totalQ}</div>
          </div>
          <ProgressDots total={totalQ} current={step-1} done={Object.keys(round?.judgments||{}).length}/>
        </div>

        <div className="q-card active" style={{ marginBottom:"1.5rem" }}>
          <div style={{ fontSize:"0.55rem", letterSpacing:"0.2em", color:"var(--muted)", marginBottom:"0.5rem" }}>QUESTION POSÉE</div>
          <div className="serif" style={{ fontSize:"1.1rem", lineHeight:1.5 }}>{currentQ?.text}</div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:"0.8rem", marginBottom:"1.5rem" }}>
          {[{role:"A",answer:answerA},{role:"B",answer:answerB}].map(({role,answer})=>{
            const p=teamPlayers.find(pl=>pl.role===role);
            return (
              <div key={role} style={{ background:"rgba(240,236,226,0.04)", border:"1px solid rgba(240,236,226,0.12)", borderRadius:"2px", padding:"1rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.4rem" }}>
                  <div style={{ display:"flex", gap:"0.5rem", alignItems:"center" }}>
                    <span style={{ background:"var(--muted)", color:"var(--ink)", fontFamily:"Bebas Neue", fontSize:"0.75rem", padding:"0 0.4rem", borderRadius:"1px" }}>{role}</span>
                    <span style={{ fontSize:"0.7rem", color:"var(--muted)" }}>{p?.name}</span>
                  </div>
                  {answer && speech.supported && <button className="tts-speak-btn" onClick={()=>readAnswer(role,answer)}>▶ LIRE</button>}
                </div>
                <div className="serif" style={{ fontSize:"0.95rem", color:"rgba(240,236,226,0.75)" }}>"{answer||"…"}"</div>
              </div>
            );
          })}
        </div>

        {speech.speaking && (
          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"1rem" }}>
            <div className="tts-indicator">{[1,2,3,4,5].map(i=><div key={i} className="tts-bar"/>)}</div>
            <span style={{ fontSize:"0.6rem", color:"var(--gold-light)", letterSpacing:"0.1em" }}>LECTURE EN COURS</span>
          </div>
        )}

        {judgment && (
          <div style={{ display:"flex", gap:"1rem", alignItems:"center", marginBottom:"1.5rem", animation:"gyro 0.6s ease" }}>
            <VerdictLight status={judgment.isMatching} size={56}/>
            <div>
              <div style={{ fontSize:"0.7rem", letterSpacing:"0.1em", color:judgment.isMatching?"var(--green-light)":"var(--red-light)", marginBottom:"0.2rem" }}>
                {judgment.isMatching?"✓ CONCORDENT":"✕ CONTRADICTION"}
              </div>
              <div className="serif" style={{ fontSize:"0.9rem", color:"rgba(240,236,226,0.6)", fontStyle:"italic" }}>"{judgment.reason}"</div>
              {speech.supported && <SpeakButton text={`${judgment.isMatching?"Concordant.":"Contradiction !"} ${judgment.reason}`} speech={speech} label="RÉÉCOUTER" options={{ rate:0.8, pitch:judgment.isMatching?1.0:0.7 }}/>}
            </div>
          </div>
        )}

        {!judgment && !judging && <button className="btn btn-primary" style={{ width:"100%" }} onClick={judgeQuestion}>🔍 DEMANDER L'AVIS DU JUGE →</button>}
        {judging && <div style={{ textAlign:"center", padding:"1rem", color:"var(--muted)", fontSize:"0.75rem" }}>Le Juge délibère<span className="loading-dots"/></div>}
        {judgment && (
          <button className="btn btn-ghost" style={{ width:"100%" }} onClick={()=>{speech.stop();setStep(s=>s+1);}}>
            QUESTION SUIVANTE →
          </button>
        )}
      </div>
    </div>
  );
}

// ── BETWEEN TEAMS ────────────────────────────────────────────
function BetweenTeamsScreen({ game }) {
  const speech = useSpeech();
  const round1 = game.rounds.find(r=>r.teamId===1);
  const p1 = Object.values(round1?.judgments||{}).filter(j=>!j.isMatching).length;
  const team2Players = game.players.filter(p=>p.team===2);

  useEffect(() => {
    speech.speak(`L'équipe un a terminé avec ${p1} incohérence${p1!==1?"s":""}. À l'équipe deux de prouver son innocence.`, { rate:0.82, pitch:0.8 });
  }, []);

  return (
    <div className="screen">
      <div style={{ textAlign:"center", padding:"2rem", maxWidth:460, animation:"fadeUp 0.6s ease" }}>
        <div style={{ fontSize:"0.6rem", letterSpacing:"0.3em", color:"var(--muted)", marginBottom:"1rem" }}>ÉQUIPE 1 TERMINÉE</div>
        <div className="title-display" style={{ fontSize:"3rem", marginBottom:"1.5rem" }}>RÉSULTAT PROVISOIRE</div>
        <div style={{ background:"rgba(58,123,213,0.1)", border:"1px solid rgba(58,123,213,0.3)", borderRadius:"2px", padding:"1.2rem", marginBottom:"2rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <TeamBadge team={1}/>
            <div className="title-display" style={{ fontSize:"2rem", color:p1<3?"var(--green-light)":"var(--red-light)" }}>{p1} ✕</div>
          </div>
          <div style={{ marginTop:"0.8rem", display:"flex", gap:"0.4rem", justifyContent:"center" }}>
            {(round1?.scenario?.questions||[]).map(q=>{const j=round1?.judgments?.[q.id];return j?<VerdictLight key={q.id} status={j.isMatching} size={28}/>:null;})}
          </div>
        </div>
        <div style={{ marginBottom:"2rem" }}>
          <div style={{ fontSize:"0.65rem", letterSpacing:"0.2em", color:"var(--muted)", marginBottom:"0.8rem" }}>OBJECTIF</div>
          <div className="serif" style={{ fontSize:"1rem", color:"rgba(240,236,226,0.7)", lineHeight:1.5 }}>
            L'équipe 2 doit faire <strong style={{ color:"var(--gold-light)" }}>moins de {p1} incohérence{p1!==1?"s":""}</strong> pour gagner.
          </div>
        </div>
        <div style={{ display:"flex", gap:"0.5rem", marginBottom:"2rem", justifyContent:"center" }}>
          {team2Players.map(p=><PlayerChip key={p.id} player={p}/>)}
        </div>
        <button className="btn btn-primary" style={{ width:"100%" }}
          onClick={()=>{speech.stop();game.startTeam2(game.roomId);}}>
          ÉQUIPE 2, PRÉPAREZ-VOUS →
        </button>
      </div>
    </div>
  );
}

// ── VERDICT ──────────────────────────────────────────────────
function VerdictScreen({ game }) {
  const speech = useSpeech();
  const round1 = game.rounds.find(r=>r.teamId===1);
  const round2 = game.rounds.find(r=>r.teamId===2);
  const p1 = Object.values(round1?.judgments||{}).filter(j=>!j.isMatching).length;
  const p2 = round2 ? Object.values(round2.judgments||{}).filter(j=>!j.isMatching).length : null;
  const total = round1?.scenario?.questions?.length||5;
  const innocent2P = p1<3;
  const isTie = game.mode==="4P" && p1===p2;
  const winner4P = !isTie ? (p1<p2?1:2) : (game.tiebreak ? (game.tiebreak.loser===1?2:1) : null);

  // Lire le discours automatiquement quand il arrive
  useEffect(() => {
    if (game.speechText && speech.supported) {
      setTimeout(()=>speech.speak(game.speechText, { rate:0.78, pitch:0.75 }), 300);
    }
  }, [game.speechText]);

  return (
    <div className="scroll-content">
      <div style={{ width:"100%", maxWidth:520, textAlign:"center", animation:"fadeUp 0.6s ease", paddingBottom:"2rem" }}>
        <div style={{ fontSize:"0.6rem", letterSpacing:"0.4em", color:"var(--muted)", marginBottom:"1rem" }}>LE JURY A DÉLIBÉRÉ</div>
        <div className="title-display" style={{ fontSize:"4rem", marginBottom:"2rem" }}>VERDICT</div>

        {/* Mode 2J */}
        {game.mode==="2P" && (
          <div style={{ marginBottom:"2rem", padding:"2rem", background:innocent2P?"rgba(39,174,96,0.08)":"rgba(192,57,43,0.08)", border:`1px solid ${innocent2P?"rgba(39,174,96,0.3)":"rgba(192,57,43,0.3)"}`, borderRadius:"2px" }}>
            <div style={{ fontSize:"4rem", marginBottom:"0.5rem" }}>{innocent2P?"🔓":"⛓"}</div>
            <div className="stamp" style={{ color:innocent2P?"var(--green)":"var(--red-light)" }}>{innocent2P?"INNOCENTÉS":"COUPABLES"}</div>
            <div style={{ marginTop:"1rem", fontSize:"0.8rem", color:"var(--muted)" }}>{p1} incohérence{p1!==1?"s":""} sur {total} questions</div>
            <div style={{ display:"flex", justifyContent:"center", gap:"0.4rem", marginTop:"1rem", flexWrap:"wrap" }}>
              {round1?.scenario?.questions?.map(q=>{const j=round1?.judgments?.[q.id];return j?<VerdictLight key={q.id} status={j.isMatching} size={32}/>:null;})}
            </div>
          </div>
        )}

        {/* Mode 4J */}
        {game.mode==="4P" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"1rem", marginBottom:"2rem" }}>
            {[1,2].map(team=>{
              const round=team===1?round1:round2;
              const pen=team===1?p1:p2;
              const c=TEAM_COLORS[team];
              const isWinner=winner4P===team, isLoser=winner4P&&winner4P!==team;
              return (
                <div key={team} style={{ padding:"1.2rem 1.5rem", background:isWinner?"rgba(39,174,96,0.08)":isLoser?"rgba(192,57,43,0.05)":c.bg, border:`1px solid ${isWinner?"rgba(39,174,96,0.4)":isLoser?"rgba(192,57,43,0.3)":c.border}`, borderRadius:"2px", position:"relative" }}>
                  {isWinner && <div style={{ position:"absolute", top:-12, right:16 }}><span className="stamp stamp-green" style={{ fontSize:"0.8rem" }}>GAGNANTS</span></div>}
                  {isLoser && <div style={{ position:"absolute", top:-12, right:16 }}><span className="stamp stamp-red" style={{ fontSize:"0.8rem" }}>PERDANTS</span></div>}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.8rem" }}>
                    <div style={{ display:"flex", gap:"0.5rem", alignItems:"center" }}>
                      <TeamBadge team={team}/>
                      <span style={{ fontSize:"0.7rem", color:"var(--muted)" }}>{game.players.filter(p=>p.team===team).map(p=>p.name).join(" & ")}</span>
                    </div>
                    <div className="title-display" style={{ fontSize:"1.8rem", color:pen<3?"var(--green-light)":"var(--red-light)" }}>{pen} ✕</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"0.8rem" }}>
                    <ScoreBar penalties={pen} total={total} color={pen<3?"var(--green)":"var(--red)"}/>
                    <span style={{ fontSize:"0.6rem", color:"var(--muted)", whiteSpace:"nowrap" }}>{pen}/{total}</span>
                  </div>
                  <div style={{ display:"flex", gap:"0.3rem", flexWrap:"wrap" }}>
                    {round?.scenario?.questions?.map(q=>{const j=round?.judgments?.[q.id];return j?<VerdictLight key={q.id} status={j.isMatching} size={28}/>:null;})}
                  </div>
                </div>
              );
            })}
            {isTie && !game.tiebreak && !game.speechLoading && (
              <div style={{ padding:"1rem", background:"rgba(212,160,23,0.1)", border:"1px solid rgba(212,160,23,0.3)", borderRadius:"2px" }}>
                <div style={{ fontSize:"0.6rem", letterSpacing:"0.2em", color:"var(--gold-light)", marginBottom:"0.4rem" }}>ÉGALITÉ PARFAITE</div>
                <div className="serif" style={{ fontSize:"0.9rem", color:"rgba(240,236,226,0.7)" }}>
                  {p1} incohérence{p1!==1?"s":""} de chaque côté. Le Grand Juge tranchera par la gravité des mensonges.
                </div>
              </div>
            )}
            {game.tiebreak && (
              <div style={{ padding:"1rem", background:"rgba(240,236,226,0.05)", border:"1px solid rgba(240,236,226,0.15)", borderRadius:"2px", animation:"fadeUp 0.4s ease" }}>
                <div style={{ fontSize:"0.55rem", letterSpacing:"0.2em", color:"var(--muted)", marginBottom:"0.4rem" }}>DÉCISION DU GRAND JUGE</div>
                <div className="serif" style={{ fontSize:"0.95rem", fontStyle:"italic", color:"rgba(240,236,226,0.8)" }}>"{game.tiebreak.verdict}"</div>
              </div>
            )}
          </div>
        )}

        {/* Discours */}
        {!game.speechText && !game.speechLoading && (
          <button className="btn btn-primary" style={{ marginBottom:"1rem" }} onClick={()=>game.requestSpeech(game.roomId)}>
            {isTie && !game.tiebreak ? "⚖️ DÉPARTAGER PAR LE GRAND JUGE →" : "🎙 DISCOURS DU COMMISSAIRE →"}
          </button>
        )}
        {game.speechLoading && <div style={{ padding:"1rem", color:"var(--muted)", fontSize:"0.75rem" }}>Le Commissaire rédige son discours<span className="loading-dots"/></div>}
        {game.speechText && (
          <div style={{ background:"rgba(240,236,226,0.05)", border:"1px solid rgba(240,236,226,0.15)", borderRadius:"2px", padding:"1.5rem", marginBottom:"1.5rem", animation:"fadeUp 0.5s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.8rem" }}>
              <div style={{ fontSize:"0.55rem", letterSpacing:"0.2em", color:"var(--muted)" }}>ALLOCUTION DU COMMISSAIRE</div>
              {speech.supported && <SpeakButton text={game.speechText} speech={speech} label="RÉÉCOUTER" options={{ rate:0.78, pitch:0.75 }}/>}
            </div>
            {speech.speaking && <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"0.8rem" }}><div className="tts-indicator">{[1,2,3,4,5].map(i=><div key={i} className="tts-bar"/>)}</div></div>}
            <div className="serif" style={{ fontSize:"0.95rem", lineHeight:1.6, color:"rgba(240,236,226,0.85)", fontStyle:"italic" }}>"{game.speechText}"</div>
          </div>
        )}

        <button className="btn btn-ghost" style={{ width:"100%" }}
          onClick={()=>{ speech.stop(); game.resetGame(game.roomId); }}>
          NOUVELLE AFFAIRE →
        </button>
      </div>
    </div>
  );
}

// =============================================================
// APP ROOT
// =============================================================
export default function App() {
  const game = useGameSocket();

  const screen = () => {
    switch (game.phase) {
      case PHASES.LOBBY:            return <LobbyScreen game={game}/>;
      case PHASES.BRIEFING:         return <BriefingScreen game={game}/>;
      case PHASES.PREP_TIMER:       return <PrepTimerScreen game={game}/>;
      case PHASES.INTERROGATION_A:  return <InterrogationScreen game={game} role="A"/>;
      case PHASES.ISOLATION_B:      return <IsolationScreen game={game}/>;
      case PHASES.INTERROGATION_B:  return <InterrogationScreen game={game} role="B"/>;
      case PHASES.CONFRONTATION:    return <ConfrontationScreen game={game}/>;
      case PHASES.BETWEEN_TEAMS:    return <BetweenTeamsScreen game={game}/>;
      case PHASES.VERDICT:          return <VerdictScreen game={game}/>;
      default:                      return <LobbyScreen game={game}/>;
    }
  };

  return <><GlobalStyle/>{screen()}<Toast toast={game.toast}/></>;
}
