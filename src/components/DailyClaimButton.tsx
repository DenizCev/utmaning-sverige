import { useState, useEffect } from 'react';
import { useStreak } from '@/hooks/useStreak';
import { Button } from '@/components/ui/button';
import { Flame, Gift, Clock } from 'lucide-react';

export function DailyClaimButton() {
  const { streakCount, canClaim, claimDaily, getTimeUntilReset } = useStreak();
  const [claiming, setClaiming] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (canClaim) return;
    const update = () => {
      const ms = getTimeUntilReset();
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [canClaim, getTimeUntilReset]);

  const handleClaim = async () => {
    setClaiming(true);
    await claimDaily();
    setClaiming(false);
  };

  return (
    <div className="flex items-center gap-3">
      {canClaim ? (
        <Button onClick={handleClaim} disabled={claiming} className="gradient-gold text-accent-foreground font-semibold animate-pulse">
          <Gift className="h-4 w-4 mr-2" />
          Claima daglig bonus
        </Button>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Nästa bonus om {timeLeft}</span>
        </div>
      )}
      {streakCount > 0 && (
        <div className="flex items-center gap-1 text-sm font-semibold">
          <Flame className="h-4 w-4 text-destructive" />
          <span>{streakCount} dagar 🔥</span>
        </div>
      )}
    </div>
  );
}
