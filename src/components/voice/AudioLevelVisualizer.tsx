import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface AudioLevelVisualizerProps {
  stream: MediaStream | null;
  isActive: boolean;
}

const BAR_COUNT = 5;

const AudioLevelVisualizer = ({ stream, isActive }: AudioLevelVisualizerProps) => {
  const [levels, setLevels] = useState<number[]>(Array(BAR_COUNT).fill(0.1));
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!stream || !isActive) {
      setLevels(Array(BAR_COUNT).fill(0.1));
      return;
    }

    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 32;
    source.connect(analyser);
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);
      const newLevels: number[] = [];
      const step = Math.floor(dataArray.length / BAR_COUNT);
      for (let i = 0; i < BAR_COUNT; i++) {
        const val = dataArray[i * step] / 255;
        newLevels.push(Math.max(0.1, val));
      }
      setLevels(newLevels);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(rafRef.current);
      ctx.close();
    };
  }, [stream, isActive]);

  if (!isActive) return null;

  return (
    <div className="flex items-center gap-[3px] h-8">
      {levels.map((level, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-primary"
          animate={{ height: `${level * 28}px` }}
          transition={{ duration: 0.08 }}
        />
      ))}
    </div>
  );
};

export default AudioLevelVisualizer;
