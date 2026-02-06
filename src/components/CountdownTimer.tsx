import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: Date;
  onComplete?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(target: Date): TimeLeft {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export function CountdownTimer({ targetDate, onComplete }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calcTimeLeft(targetDate));
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const t = calcTimeLeft(targetDate);
      setTimeLeft(t);
      if (t.days === 0 && t.hours === 0 && t.minutes === 0 && t.seconds === 0 && !completed) {
        setCompleted(true);
        onComplete?.();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate, onComplete, completed]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  const units = [
    { label: 'Dagar', value: timeLeft.days },
    { label: 'Timmar', value: timeLeft.hours },
    { label: 'Minuter', value: timeLeft.minutes },
    { label: 'Sekunder', value: timeLeft.seconds },
  ];

  return (
    <div className="flex gap-3 md:gap-6 justify-center">
      {units.map((unit) => (
        <div key={unit.label} className="flex flex-col items-center">
          <div className="glass-card rounded-xl px-4 py-3 md:px-6 md:py-4 min-w-[70px] md:min-w-[100px]">
            <span className="countdown-digit text-primary">{pad(unit.value)}</span>
          </div>
          <span className="text-xs md:text-sm text-muted-foreground mt-2 font-medium uppercase tracking-wider">
            {unit.label}
          </span>
        </div>
      ))}
    </div>
  );
}
