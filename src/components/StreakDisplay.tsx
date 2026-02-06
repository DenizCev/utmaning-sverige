import { Flame } from 'lucide-react';

interface StreakDisplayProps {
  count: number;
  size?: 'sm' | 'lg';
}

export function StreakDisplay({ count, size = 'sm' }: StreakDisplayProps) {
  if (count === 0) return null;

  return (
    <div className={`flex items-center gap-1 font-semibold ${size === 'lg' ? 'text-lg' : 'text-sm'}`}>
      <Flame className={`text-destructive ${size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'}`} />
      <span>Hot streak: {count} dagar 🔥</span>
    </div>
  );
}
