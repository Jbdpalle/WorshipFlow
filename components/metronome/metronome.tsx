"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const MIN_BPM = 30;
const MAX_BPM = 240;
const START_ANGLE = -135;
const END_ANGLE = 135;
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;

function bpmToAngle(bpm: number) {
  const ratio = (bpm - MIN_BPM) / (MAX_BPM - MIN_BPM);
  return START_ANGLE + ratio * (END_ANGLE - START_ANGLE);
}

function angleToBpm(angle: number) {
  const clamped = Math.max(START_ANGLE, Math.min(END_ANGLE, angle));
  const ratio = (clamped - START_ANGLE) / (END_ANGLE - START_ANGLE);
  return Math.round(MIN_BPM + ratio * (MAX_BPM - MIN_BPM));
}

export function Metronome({ initialBpm = 80 }: { initialBpm?: number }) {
  const [bpm, setBpm] = useState(() => Math.min(MAX_BPM, Math.max(MIN_BPM, initialBpm)));
  const [running, setRunning] = useState(false);
  const [subdivision, setSubdivision] = useState<1 | 2>(1);
  const [beatFlash, setBeatFlash] = useState(0);

  const bpmRef = useRef(bpm);
  const subdivisionRef = useRef(subdivision);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextNoteTimeRef = useRef(0);
  const beatCountRef = useRef(0);
  const beatQueueRef = useRef<{ time: number; beat: number }[]>([]);
  const rafRef = useRef<number | null>(null);
  const dialRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const tapTimesRef = useRef<number[]>([]);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);
  useEffect(() => {
    subdivisionRef.current = subdivision;
  }, [subdivision]);

  const scheduleNote = useCallback((beatNumber: number, time: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const isAccent = beatNumber % (4 * subdivisionRef.current) === 0;
    osc.frequency.value = isAccent ? 1500 : 900;
    gain.gain.value = isAccent ? 0.35 : 0.2;
    gain.gain.setValueAtTime(gain.gain.value, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.06);
    beatQueueRef.current.push({ time, beat: beatNumber });
  }, []);

  const scheduler = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    while (nextNoteTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD_S) {
      scheduleNote(beatCountRef.current, nextNoteTimeRef.current);
      const secondsPerBeat = 60.0 / bpmRef.current / subdivisionRef.current;
      nextNoteTimeRef.current += secondsPerBeat;
      beatCountRef.current += 1;
    }
  }, [scheduleNote]);

  const animate = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (ctx) {
      const now = ctx.currentTime;
      while (beatQueueRef.current.length && beatQueueRef.current[0].time <= now) {
        const next = beatQueueRef.current.shift()!;
        setBeatFlash(next.beat % (4 * subdivisionRef.current));
      }
    }
    // eslint-disable-next-line react-hooks/immutability -- intentional self-referencing rAF loop
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  const start = useCallback(() => {
    if (running) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = audioCtxRef.current ?? new AudioCtx();
    audioCtxRef.current = ctx;
    if (ctx.state === "suspended") ctx.resume();
    beatCountRef.current = 0;
    nextNoteTimeRef.current = ctx.currentTime + 0.05;
    beatQueueRef.current = [];
    timerRef.current = setInterval(scheduler, LOOKAHEAD_MS);
    rafRef.current = requestAnimationFrame(animate);
    setRunning(true);
  }, [running, scheduler, animate]);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    timerRef.current = null;
    rafRef.current = null;
    setRunning(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  function adjustBpm(delta: number) {
    setBpm((b) => Math.min(MAX_BPM, Math.max(MIN_BPM, b + delta)));
  }

  function handleTap() {
    const now = Date.now();
    const taps = tapTimesRef.current.filter((t) => now - t < 2000);
    taps.push(now);
    tapTimesRef.current = taps.slice(-6);
    if (taps.length >= 2) {
      const intervals = taps.slice(1).map((t, i) => t - taps[i]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const tappedBpm = Math.round(60000 / avg);
      setBpm(Math.min(MAX_BPM, Math.max(MIN_BPM, tappedBpm)));
    }
  }

  function angleFromPointer(clientX: number, clientY: number) {
    const el = dialRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90; // 0deg = up
    if (angle > 180) angle -= 360;
    if (angle < -180) angle += 360;
    // Map so the gap sits at the bottom (outside [-135,135] stays clamped)
    return angle;
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    const angle = angleFromPointer(e.clientX, e.clientY);
    if (angle === null) return;
    setBpm(angleToBpm(angle));
  }

  const angle = bpmToAngle(bpm);
  const knobX = 50 + 40 * Math.sin((angle * Math.PI) / 180);
  const knobY = 50 - 40 * Math.cos((angle * Math.PI) / 180);

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        ref={dialRef}
        role="slider"
        tabIndex={0}
        aria-valuemin={MIN_BPM}
        aria-valuemax={MAX_BPM}
        aria-valuenow={bpm}
        aria-label="Metronome BPM"
        className="relative h-64 w-64 touch-none select-none outline-none"
        onPointerDown={(e) => {
          draggingRef.current = true;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerUp={() => (draggingRef.current = false)}
        onPointerMove={handlePointerMove}
        onWheel={(e) => {
          e.preventDefault();
          adjustBpm(e.deltaY < 0 ? 1 : -1);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowRight") adjustBpm(1);
          if (e.key === "ArrowDown" || e.key === "ArrowLeft") adjustBpm(-1);
        }}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-0">
          <circle cx="50" cy="50" r="44" className="fill-surface" stroke="var(--border)" strokeWidth="2" />
          <path
            d={describeArc(50, 50, 40, START_ANGLE, END_ANGLE)}
            fill="none"
            stroke="var(--border)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d={describeArc(50, 50, 40, START_ANGLE, angle)}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx={knobX} cy={knobY} r="4" className="fill-primary" />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold tabular-nums">{bpm}</span>
          <span className="text-xs text-muted-foreground">BPM</span>
          <div className="mt-3 flex gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-2.5 w-2.5 rounded-full bg-border transition-colors",
                  running && beatFlash === i * subdivision && "bg-primary",
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => adjustBpm(-1)} aria-label="Decrease BPM">
          <Minus className="h-4 w-4" />
        </Button>
        <Button size="lg" onClick={running ? stop : start} className="w-32">
          {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          {running ? "Stop" : "Start"}
        </Button>
        <Button variant="outline" size="icon" onClick={() => adjustBpm(1)} aria-label="Increase BPM">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="secondary" onClick={handleTap}>
          Tap Tempo
        </Button>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={subdivision === 2}
            onChange={(e) => setSubdivision(e.target.checked ? 2 : 1)}
            className="h-4 w-4"
          />
          8th note subdivision
        </label>
      </div>
    </div>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}
