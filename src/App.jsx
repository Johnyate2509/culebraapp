import { useEffect, useRef, useState } from "react";

/**
 * 🎮 Culebrita (Snake) en React - Componente único
 * - Render con <canvas>
 * - Controles: Flechas / WASD / Botones táctiles
 * - Pausa/Resume, Reiniciar, Puntuación e Historia (localStorage)
 * - Velocidad aumenta al comer
 */
export default function SnakeGame() {
  // --- Configuración ---
  const CELL_SIZE = 22; // px
  const COLS = 20;
  const ROWS = 24;
  const INITIAL_SPEED_MS = 160; // menor = más rápido
  const MIN_SPEED_MS = 70;
  const SPEED_STEP = 6; // reduce ms por comida

  // --- Estado ---
  const [snake, setSnake] = useState(() => [
    { x: 5, y: 10 },
    { x: 4, y: 10 },
    { x: 3, y: 10 },
  ]);
  const [dir, setDir] = useState({ x: 1, y: 0 });
  const [nextDir, setNextDir] = useState({ x: 1, y: 0 });
  const [food, setFood] = useState(spawnFood([
    { x: 5, y: 10 },
    { x: 4, y: 10 },
    { x: 3, y: 10 },
  ]));
  const [score, setScore] = useState(0);
  const [high, setHigh] = useState(() => Number(localStorage.getItem("snake:best") || 0));
  const [speed, setSpeed] = useState(INITIAL_SPEED_MS);
  const [running, setRunning] = useState(true);
  const [gameOver, setGameOver] = useState(false);

  // Refs
  const canvasRef = useRef(null);
  const lastTick = useRef(0);
  const rafId = useRef(null);

  // --- Utilidades ---
  function spawnFood(currentSnake) {
    while (true) {
      const x = Math.floor(Math.random() * COLS);
      const y = Math.floor(Math.random() * ROWS);
      if (!currentSnake.some((p) => p.x === x && p.y === y)) {
        return { x, y };
      }
    }
  }

  function isOpposite(a, b) {
    return a.x === -b.x && a.y === -b.y;
  }

  // --- Controles teclado ---
  useEffect(() => {
    function onKey(e) {
      const key = e.key.toLowerCase();
      let d = null;
      if (key === "arrowup" || key === "w") d = { x: 0, y: -1 };
      else if (key === "arrowdown" || key === "s") d = { x: 0, y: 1 };
      else if (key === "arrowleft" || key === "a") d = { x: -1, y: 0 };
      else if (key === "arrowright" || key === "d") d = { x: 1, y: 0 };
      else if (key === " " || key === "enter") {
        setRunning((r) => !r);
      }
      if (d) {
        setNextDir((prev) => (isOpposite(prev, d) ? prev : d));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // --- Bucle de juego (basado en time delta) ---
  useEffect(() => {
    if (!running || gameOver) return;

    function loop(ts) {
      if (!lastTick.current) lastTick.current = ts;
      const elapsed = ts - lastTick.current;
      if (elapsed >= speed) {
        lastTick.current = ts;
        tick();
      }
      rafId.current = requestAnimationFrame(loop);
    }

    rafId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, speed, snake, nextDir, gameOver]);

  // --- Un paso de simulación ---
  function tick() {
    setDir(nextDir); // confirmar dirección elegida
    setSnake((prev) => {
      const head = prev[0];
      const newHead = { x: head.x + nextDir.x, y: head.y + nextDir.y };

      // Colisiones con bordes
      if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
        endGame();
        return prev;
      }

      // Colisión con cuerpo
      if (prev.some((p) => p.x === newHead.x && p.y === newHead.y)) {
        endGame();
        return prev;
      }

      const ate = newHead.x === food.x && newHead.y === food.y;
      const grown = [newHead, ...prev];
      const nextSnake = ate ? grown : grown.slice(0, -1);

      if (ate) {
        setScore((s) => s + 1);
        setFood(spawnFood(nextSnake));
        setSpeed((v) => Math.max(MIN_SPEED_MS, v - SPEED_STEP));
      }

      return nextSnake;
    });
  }

  function endGame() {
    setGameOver(true);
    setRunning(false);
    setHigh((h) => {
      const best = Math.max(h, score);
      localStorage.setItem("snake:best", String(best));
      return best;
    });
  }

  function resetGame() {
    setSnake([
      { x: 5, y: 10 },
      { x: 4, y: 10 },
      { x: 3, y: 10 },
    ]);
    setDir({ x: 1, y: 0 });
    setNextDir({ x: 1, y: 0 });
    setFood(spawnFood([
      { x: 5, y: 10 },
      { x: 4, y: 10 },
      { x: 3, y: 10 },
    ]));
    setScore(0);
    setSpeed(INITIAL_SPEED_MS);
    setRunning(true);
    setGameOver(false);
    lastTick.current = 0;
  }

  // --- Render canvas ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Fondo
    ctx.fillStyle = "#0f172a"; // slate-950
    ctx.fillRect(0, 0, COLS * CELL_SIZE, ROWS * CELL_SIZE);

    // Cuadrícula sutil
    ctx.strokeStyle = "#1f2937"; // gray-800
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL_SIZE + 0.5, 0);
      ctx.lineTo(x * CELL_SIZE + 0.5, ROWS * CELL_SIZE);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL_SIZE + 0.5);
      ctx.lineTo(COLS * CELL_SIZE, y * CELL_SIZE + 0.5);
      ctx.stroke();
    }

    // Comida favorita
    drawCell(ctx, food.x, food.y, "#f59e0b"); // amber-500
    // Sombra comida
    drawRounded(ctx, food.x * CELL_SIZE + CELL_SIZE/2, food.y * CELL_SIZE + CELL_SIZE/2, CELL_SIZE/3, "#fbbf24");

    // Serpiente
    snake.forEach((seg, i) => {
      const isHead = i === 0;
      drawCell(ctx, seg.x, seg.y, isHead ? "#22c55e" : "#10b981"); // green-500/emerald-500
      if (isHead) {
        // ojitos :)
        const cx = seg.x * CELL_SIZE + CELL_SIZE / 2;
        const cy = seg.y * CELL_SIZE + CELL_SIZE / 2;
        ctx.fillStyle = "#064e3b"; // emerald-900
        const r = 2;
        ctx.beginPath();
        ctx.arc(cx - 4, cy - 4, r, 0, Math.PI * 2);
        ctx.arc(cx + 4, cy - 4, r, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }, [snake, food]);

  function drawCell(ctx, x, y, color) {
    ctx.fillStyle = color;
    const px = x * CELL_SIZE;
    const py = y * CELL_SIZE;
    const r = 6; // esquinas redondeadas
    roundRect(ctx, px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4, r, true, false);
  }

  function drawRounded(ctx, x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof radius === "number") {
      radius = { tl: radius, tr: radius, br: radius, bl: radius };
    } else {
      radius = { tl: 0, tr: 0, br: 0, bl: 0, ...radius };
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  // --- Controles táctiles (D-pad simple) ---
  function tapDir(dx, dy) {
    const d = { x: dx, y: dy };
    setNextDir((prev) => (isOpposite(prev, d) ? prev : d));
    if (!running && !gameOver) setRunning(true);
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <header className="mb-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">🐍 Culebrita React</h1>
          <div className="flex items-center gap-3 text-sm">
            <span>Puntos: <strong>{score}</strong></span>
            <span>Mejor: <strong>{Math.max(high, score)}</strong></span>
          </div>
        </header>

        <div className="relative rounded-2xl overflow-hidden shadow-lg border border-slate-700">
          <canvas
            ref={canvasRef}
            width={COLS * CELL_SIZE}
            height={ROWS * CELL_SIZE}
            className="block w-full h-auto bg-slate-950"
          />

          {/* Overlay de Game Over / Pausa */}
          {(gameOver || !running) && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center space-y-3">
                {gameOver ? (
                  <>
                    <p className="text-2xl font-bold">💀 Game Over</p>
                    <p className="opacity-80">Puntuación: {score}</p>
                    <div className="flex gap-2 justify-center">
                      <button onClick={resetGame} className="px-4 py-2 rounded-2xl bg-emerald-500 text-black font-semibold shadow">
                        Jugar de nuevo
                      </button>
                      <button onClick={() => { setRunning(true); setGameOver(false); }} className="px-4 py-2 rounded-2xl bg-white text-slate-900 font-semibold shadow">
                        Continuar (👻)
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-semibold">⏸️ Pausa</p>
                    <button onClick={() => setRunning(true)} className="px-4 py-2 rounded-2xl bg-white text-slate-900 font-semibold shadow">
                      Reanudar
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Controles */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRunning((r) => !r)}
              className="px-4 py-2 rounded-2xl bg-white text-slate-900 font-semibold shadow"
            >
              {running ? "Pausar" : "Reanudar"}
            </button>
            <button
              onClick={resetGame}
              className="px-4 py-2 rounded-2xl bg-emerald-500 text-black font-semibold shadow"
            >
              Reiniciar
            </button>
          </div>
          <p className="text-xs opacity-70">Flechas/WASD · Espacio: Pausa</p>
        </div>

        {/* D-Pad táctil */}
        <div className="mt-5 grid grid-cols-3 gap-2 w-48 mx-auto select-none">
          <div />
          <button onClick={() => tapDir(0, -1)} className="py-2 rounded-xl bg-slate-800 active:scale-95">▲</button>
          <div />
          <button onClick={() => tapDir(-1, 0)} className="py-2 rounded-xl bg-slate-800 active:scale-95">◀</button>
          <div className="py-2 rounded-xl bg-slate-900 text-center border border-slate-700">D-Pad</div>
          <button onClick={() => tapDir(1, 0)} className="py-2 rounded-xl bg-slate-800 active:scale-95">▶</button>
          <div />
          <button onClick={() => tapDir(0, 1)} className="py-2 rounded-xl bg-slate-800 active:scale-95">▼</button>
          <div />
        </div>
      </div>
    </div>
  );
}