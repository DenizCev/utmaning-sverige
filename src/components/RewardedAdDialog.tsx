import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Diamond, Play, X } from 'lucide-react';
import { isAdMobAvailable, showRewardedAd } from '@/utils/admob';

interface RewardedAdDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  adDuration?: number; // seconds (used for web fallback)
}

const AD_MESSAGES = [
  '🏆 Sweden Challenge Race – Sveriges största utmaning!',
  '🇸🇪 Tävla mot hela Sverige!',
  '💎 Samla diamanter och lås upp skins!',
  '🔥 Bygg din streak – claima daglig bonus!',
  '👥 Skapa lag och tävla tillsammans!',
];

export function RewardedAdDialog({ open, onClose, onComplete, adDuration = 15 }: RewardedAdDialogProps) {
  const [secondsLeft, setSecondsLeft] = useState(adDuration);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showingNativeAd, setShowingNativeAd] = useState(false);
  const [messageIndex] = useState(() => Math.floor(Math.random() * AD_MESSAGES.length));

  useEffect(() => {
    if (!open) {
      setSecondsLeft(adDuration);
      setStarted(false);
      setCompleted(false);
      setShowingNativeAd(false);
    }
  }, [open, adDuration]);

  useEffect(() => {
    if (!started || completed || showingNativeAd) return;
    if (secondsLeft <= 0) {
      setCompleted(true);
      return;
    }
    const timer = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [started, secondsLeft, completed, showingNativeAd]);

  const handleStart = async () => {
    // Try native AdMob first
    if (isAdMobAvailable()) {
      setShowingNativeAd(true);
      setStarted(true);
      const watched = await showRewardedAd();
      setShowingNativeAd(false);
      if (watched) {
        setCompleted(true);
      } else {
        // Ad failed/cancelled, fall back to timer
        setSecondsLeft(adDuration);
      }
    } else {
      // No ad provider available on this platform
      onClose();
      return;
    }
  };

  const progress = ((adDuration - secondsLeft) / adDuration) * 100;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm [&>button]:hidden" onPointerDownOutside={e => e.preventDefault()}>
        {!started ? (
          <div className="text-center space-y-4 py-4">
            <div className="text-5xl">📺</div>
            <h3 className="font-display font-bold text-lg">Titta på annons</h3>
            <p className="text-sm text-muted-foreground">
              Se en kort annons ({adDuration} sek) och tjäna 1 diamant!
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleStart} className="gradient-gold text-accent-foreground font-bold">
                <Play className="h-4 w-4 mr-1" /> Starta
              </Button>
              <Button variant="ghost" onClick={onClose}>
                <X className="h-4 w-4 mr-1" /> Avbryt
              </Button>
            </div>
          </div>
        ) : showingNativeAd ? (
          <div className="text-center space-y-4 py-4">
            <div className="text-4xl animate-pulse">📢</div>
            <p className="text-muted-foreground">Visar annons...</p>
          </div>
        ) : !completed ? (
          <div className="text-center space-y-4 py-4">
            <div className="text-4xl animate-pulse">📢</div>
            <div className="bg-muted rounded-lg p-6 min-h-[120px] flex items-center justify-center">
              <p className="text-lg font-display font-bold">{AD_MESSAGES[messageIndex]}</p>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground">
              Vänta {secondsLeft} sekunder...
            </p>
          </div>
        ) : (
          <div className="text-center space-y-4 py-4">
            <div className="text-5xl">🎉</div>
            <h3 className="font-display font-bold text-lg">Annons klar!</h3>
            <p className="text-muted-foreground">Du har tjänat en diamant!</p>
            <Button onClick={onComplete} className="gradient-gold text-accent-foreground font-bold">
              <Diamond className="h-4 w-4 mr-1" /> Hämta +1 💎
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
