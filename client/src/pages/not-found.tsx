import { useEffect, useRef } from "react";

export default function NotFound() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    /* CANVAS / FIREFLIES LOGIC */
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0;
    const rsz = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    rsz();
    window.addEventListener("resize", rsz);

    class Fly {
      type: number = 0;
      h: number = 0;
      s: number = 0;
      r: number = 0;
      pp: number = 0;
      ps: number = 0;
      onDur: number = 0;
      offDur: number = 0;
      blinkT: number = 0;
      lit: boolean = false;
      x: number = 0;
      y: number = 0;
      vx: number = 0;
      vy: number = 0;
      wobX: number = 0;
      wobSpd: number = 0;
      sineAmp: number = 0;
      sineSpd: number = 0;
      sineT: number = 0;
      baseY: number = 0;
      baseX: number = 0;
      bobT: number = 0;
      bobSpd: number = 0;
      bobAmpY: number = 0;
      bobAmpX: number = 0;
      bobT2: number = 0;
      cx: number = 0;
      cy: number = 0;
      angle: number = 0;
      radius: number = 0;
      angSpd: number = 0;
      driftVy: number = 0;
      zapT: number = 0;
      zapPause: number = 0;
      zapMove: number = 0;
      zapDir: number = 0;
      zapSpd: number = 0;
      mode: string = "pause";
      dead: boolean = false;

      constructor() {
        this.init();
      }

      init() {
        this.type = Math.floor(Math.random() * 6);
        const palette = [
          { h: 58, s: 95 }, { h: 72, s: 85 }, { h: 48, s: 90 }, { h: 80, s: 70 }, { h: 55, s: 100 }
        ];
        const col = palette[Math.floor(Math.random() * palette.length)];
        this.h = col.h;
        this.s = col.s;
        this.r = Math.random() * 1.2 + 0.8;
        this.pp = Math.random() * Math.PI * 2;
        this.ps = Math.random() * 0.022 + 0.006;
        this.onDur = Math.random() * 80 + 40;
        this.offDur = Math.random() * 180 + 80;
        this.blinkT = 0;
        this.lit = Math.random() > 0.4;

        if (this.type === 0) {
          this.x = Math.random() * W;
          this.y = H + Math.random() * 60;
          this.vx = (Math.random() - 0.5) * 0.5;
          this.vy = -(Math.random() * 0.6 + 0.25);
          this.wobX = Math.random() * Math.PI * 2;
          this.wobSpd = Math.random() * 0.02 + 0.005;
        } else if (this.type === 1) {
          this.x = Math.random() < 0.5 ? -10 : W + 10;
          this.y = Math.random() * H * 0.8 + H * 0.1;
          this.vx = (this.x < 0 ? 1 : -1) * (Math.random() * 0.35 + 0.1);
          this.vy = 0;
          this.sineAmp = Math.random() * 18 + 6;
          this.sineSpd = Math.random() * 0.012 + 0.004;
          this.sineT = Math.random() * Math.PI * 2;
          this.baseY = this.y;
        } else if (this.type === 2) {
          this.x = Math.random() * W;
          this.y = Math.random() * H * 0.7 + H * 0.1;
          this.baseX = this.x;
          this.baseY = this.y;
          this.bobT = Math.random() * Math.PI * 2;
          this.bobSpd = Math.random() * 0.008 + 0.003;
          this.bobAmpY = Math.random() * 22 + 8;
          this.bobAmpX = Math.random() * 12 + 4;
          this.bobT2 = Math.random() * Math.PI * 2;
        } else if (this.type === 3) {
          this.cx = Math.random() * W;
          this.cy = Math.random() * H * 0.8 + H * 0.1;
          this.angle = Math.random() * Math.PI * 2;
          this.radius = Math.random() * 30 + 12;
          this.angSpd = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.012 + 0.004);
          this.x = this.cx + Math.cos(this.angle) * this.radius;
          this.y = this.cy + Math.sin(this.angle) * this.radius;
          this.driftVy = -(Math.random() * 0.08 + 0.01);
        } else if (this.type === 4) {
          this.x = Math.random() * W;
          this.y = Math.random() * H * 0.85 + H * 0.05;
          this.vx = 0; this.vy = 0;
          this.zapT = 0;
          this.zapPause = Math.floor(Math.random() * 120 + 60);
          this.zapMove = Math.floor(Math.random() * 20 + 8);
          this.zapDir = Math.random() * Math.PI * 2;
          this.zapSpd = Math.random() * 1.8 + 0.8;
          this.mode = "pause";
        } else {
          this.x = Math.random() * W;
          this.y = -10 - Math.random() * 40;
          this.vx = (Math.random() - 0.5) * 0.3;
          this.vy = Math.random() * 0.4 + 0.15;
        }
        this.dead = false;
      }

      update() {
        this.blinkT++;
        const dur = this.lit ? this.onDur : this.offDur;
        if (this.blinkT > dur) {
          this.lit = !this.lit;
          this.blinkT = 0;
        }

        if (this.type === 0) {
          this.wobX += this.wobSpd;
          this.x += this.vx + Math.sin(this.wobX) * 0.4;
          this.y += this.vy;
          if (this.y < -20) this.dead = true;
        } else if (this.type === 1) {
          this.sineT += this.sineSpd;
          this.x += this.vx;
          this.y = this.baseY + Math.sin(this.sineT) * this.sineAmp;
          if (this.x < -30 || this.x > W + 30) this.dead = true;
        } else if (this.type === 2) {
          this.bobT += this.bobSpd;
          this.bobT2 += this.bobSpd * 0.7;
          this.x = this.baseX + Math.cos(this.bobT2) * this.bobAmpX;
          this.y = this.baseY + Math.sin(this.bobT) * this.bobAmpY;
        } else if (this.type === 3) {
          this.angle += this.angSpd;
          this.cy += this.driftVy;
          this.x = this.cx + Math.cos(this.angle) * this.radius;
          this.y = this.cy + Math.sin(this.angle) * this.radius;
          if (this.cy < -40) this.dead = true;
        } else if (this.type === 4) {
          this.zapT++;
          if (this.mode === "pause") {
            if (this.zapT > this.zapPause) {
              this.mode = "move";
              this.zapT = 0;
              this.zapDir = Math.random() * Math.PI * 2;
              this.zapSpd = Math.random() * 2.2 + 0.9;
              this.lit = true; this.blinkT = 0;
            }
          } else {
            this.x += Math.cos(this.zapDir) * this.zapSpd;
            this.y += Math.sin(this.zapDir) * this.zapSpd;
            if (this.zapT > this.zapMove) {
              this.mode = "pause";
              this.zapT = 0;
              this.zapPause = Math.floor(Math.random() * 130 + 50);
              this.lit = false; this.blinkT = 0;
            }
          }
          if (this.x < 0) this.x = 0;
          if (this.x > W) this.x = W;
          if (this.y < 0) this.y = 0;
          if (this.y > H) this.y = H;
        } else {
          this.x += this.vx;
          this.y += this.vy;
          if (this.y > H + 20) this.dead = true;
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        if (!this.lit) return;
        const tNorm = this.blinkT / this.onDur;
        const fade = tNorm < 0.12 ? tNorm / 0.12 : tNorm > 0.82 ? (1 - tNorm) / 0.18 : 1.0;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.h},${this.s}%,96%,${fade * 0.92})`;
        ctx.fill();

        const gr = this.r * 7;
        const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, gr);
        g.addColorStop(0, `hsla(${this.h},${this.s}%,90%,${fade * 0.30})`);
        g.addColorStop(0.45, `hsla(${this.h},${this.s}%,75%,${fade * 0.10})`);
        g.addColorStop(1, `hsla(${this.h},${this.s}%,60%,0)`);
        ctx.beginPath();
        ctx.arc(this.x, this.y, gr, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }
    }

    const flies: Fly[] = [];
    const TARGET = Math.min(70, Math.floor(W * H / 12000) + 28);
    for (let i = 0; i < TARGET; i++) flies.push(new Fly());

    let animationId: number;
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(200,169,109,0.018)";
      ctx.lineWidth = 0.5;
      for (let gx = 0; gx < W; gx += 80) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
      for (let gy = 0; gy < H; gy += 80) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

      for (let i = flies.length - 1; i >= 0; i--) {
        flies[i].update();
        flies[i].draw(ctx);
        if (flies[i].dead) {
          flies.splice(i, 1);
          flies.push(new Fly());
        }
      }
      animationId = requestAnimationFrame(tick);
    };
    tick();

    /* SHOOTING STARS */
    const starInterval = setInterval(() => {
      const s = document.createElement("div");
      s.className = "star";
      s.style.cssText = `left:${Math.random() * window.innerWidth}px;top:0;height:${Math.random() * 90 + 40}px;animation-duration:${Math.random() * 0.8 + 0.5}s;`;
      const container = document.getElementById("loader-container");
      if (container) {
        container.appendChild(s);
        setTimeout(() => s.remove(), 2000);
      }
    }, 1400);

    return () => {
      window.removeEventListener("resize", rsz);
      cancelAnimationFrame(animationId);
      clearInterval(starInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-[#07060a] overflow-hidden z-[9999]" id="loader-container">
      {/* Premium Styles */}
      <style>{`
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        
        canvas#canvas-bg { position:fixed; inset:0; pointer-events:none; z-index:1; }

        .grain { position:fixed; inset:-100%; width:300%; height:300%;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E");
          background-size:180px; animation:grain .35s steps(4) infinite; pointer-events:none; z-index:3; opacity:.55; }
        @keyframes grain { 0%{transform:translate(0,0)} 25%{transform:translate(-3%,2%)} 50%{transform:translate(2%,-3%)} 75%{transform:translate(-1%,3%)} 100%{transform:translate(3%,-1%)} }

        .vignette { position:fixed; inset:0; z-index:4; pointer-events:none;
          background:radial-gradient(ellipse 80% 70% at 50% 50%, transparent 25%, rgba(7,6,10,0.9) 100%); }

        .stage { position:relative; z-index:20; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; width:100%; padding:0 20px; }

        .mono-wrap { position:relative; width:clamp(96px,16vw,132px); height:clamp(96px,16vw,132px); margin-bottom:28px; }
        .mono-ring { width:100%; height:100%; animation:spinSlow 20s linear infinite; }
        @keyframes spinSlow { to{transform:rotate(360deg)} }
        .mono-inner { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
        .mono-letter { font-family:'Cinzel',serif; font-size:clamp(1.8rem,5vw,2.8rem); font-weight:600; color:#c8a96d; text-shadow:0 0 28px rgba(200,169,109,.55); letter-spacing:.04em; }

        .brand-rare { font-family:'Cormorant Garamond',serif; font-style:italic; font-weight:300; font-size:clamp(4rem,13vw,8.5rem); color:#f2efe8; line-height:.9; letter-spacing:.04em; text-align:center; }
        .brand-atelier { font-family:'DM Mono',monospace; font-size:clamp(.48rem,1.6vw,.72rem); font-weight:400; letter-spacing:.72em; text-transform:uppercase; color:#c8a96d; padding-left:.72em; margin-top:7px; }

        .tagline { font-family:'Cormorant Garamond',serif; font-style:italic; font-weight:300; font-size:clamp(.68rem,1.8vw,.92rem); color:rgba(242,239,232,0.8); letter-spacing:.22em; text-align:center; margin-top:20px; }
        .not-found-msg { font-family:'DM Mono',monospace; font-size:clamp(.55rem,1.2vw,.8rem); letter-spacing:.32em; text-transform:uppercase; color:rgba(200,169,109,.5); margin-top:15px; }

        .star { position:absolute; width:1px; pointer-events:none; z-index:15; background:linear-gradient(180deg,transparent,rgba(255,255,255,.85),transparent); animation:starFall linear forwards; opacity:0; }
        @keyframes starFall { 0%{opacity:0;transform:translateY(-50px) scaleY(0)} 10%{opacity:1} 85%{opacity:.7} 100%{opacity:0;transform:translateY(80px) scaleY(1)} }

        .back-link { position:relative; margin-top:40px; padding:12px 30px; border:1px solid rgba(200,169,109,0.3); font-family:'DM Mono',monospace; color:#c8a96d; text-transform:uppercase; letter-spacing:0.3em; font-size:0.7rem; cursor:pointer; transition:all 0.3s; z-index:30; pointer-events: auto; }
        .back-link:hover { background: rgba(200,169,109,0.1); border-color: #c8a96d; }
      `}</style>
      
      <canvas id="canvas-bg" ref={canvasRef}></canvas>
      <div className="grain"></div>
      <div className="vignette"></div>

      <div className="stage">
        {/* Monogram ring */}
        <div className="mono-wrap">
          <svg className="mono-ring" viewBox="0 0 132 132">
            <circle cx="66" cy="66" r="62" stroke="rgba(200,169,109,0.12)" strokeWidth=".5" fill="none"/>
            <circle cx="66" cy="66" r="55" stroke="rgba(200,169,109,0.22)" strokeWidth=".5" fill="none" strokeDasharray="3 6"/>
            <g stroke="rgba(200,169,109,0.45)" strokeWidth="1">
              <line x1="66" y1="5" x2="66" y2="14"/>
              <line x1="66" y1="5" x2="66" y2="14" transform="rotate(30 66 66)"/>
              <line x1="66" y1="5" x2="66" y2="14" transform="rotate(60 66 66)"/>
              <line x1="66" y1="5" x2="66" y2="14" transform="rotate(90 66 66)"/>
              <line x1="66" y1="5" x2="66" y2="14" transform="rotate(120 66 66)"/>
              <line x1="66" y1="5" x2="66" y2="14" transform="rotate(150 66 66)"/>
              <line x1="66" y1="5" x2="66" y2="14" transform="rotate(180 66 66)"/>
              <line x1="66" y1="5" x2="66" y2="14" transform="rotate(210 66 66)"/>
              <line x1="66" y1="5" x2="66" y2="14" transform="rotate(240 66 66)"/>
              <line x1="66" y1="5" x2="66" y2="14" transform="rotate(270 66 66)"/>
              <line x1="66" y1="5" x2="66" y2="14" transform="rotate(300 66 66)"/>
              <line x1="66" y1="5" x2="66" y2="14" transform="rotate(330 66 66)"/>
            </g>
            <rect x="64" y="2" width="4" height="4" fill="rgba(200,169,109,0.7)" transform="rotate(45 66 4)"/>
            <rect x="64" y="126" width="4" height="4" fill="rgba(200,169,109,0.7)" transform="rotate(45 66 128)"/>
            <rect x="2" y="64" width="4" height="4" fill="rgba(200,169,109,0.7)" transform="rotate(45 4 66)"/>
            <rect x="126" y="64" width="4" height="4" fill="rgba(200,169,109,0.7)" transform="rotate(45 128 66)"/>
            <circle cx="66" cy="66" r="42" stroke="rgba(200,169,109,0.06)" strokeWidth="8" fill="none"/>
          </svg>
          <div className="mono-inner">
            <div className="mono-letter">404</div>
          </div>
        </div>

        <div className="brand-rare">Lost in Atelier</div>
        <div className="brand-atelier">Page Not Found</div>

        <div className="tagline">&nbsp;</div>
        <div className="not-found-msg">&nbsp;</div>

        <button 
          className="back-link pointer-events-auto" 
          onClick={() => window.location.href = "/"}
        >
          Return to Collections
        </button>
      </div>

      <div className="fixed bottom-8 left-0 right-0 flex justify-between px-10 z-20 pointer-events-none opacity-40">
        <div className="font-mono text-[0.45rem] tracking-[0.3em] uppercase text-[#c8a96d]">Est. MMXXIV</div>
        <div className="font-mono text-[0.45rem] tracking-[0.3em] uppercase text-[#c8a96d]">Paris · Tokyo · NYC</div>
      </div>
    </div>
  );
}
