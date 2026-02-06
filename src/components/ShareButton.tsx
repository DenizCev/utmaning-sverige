import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDiamonds } from '@/hooks/useDiamonds';
import { toast } from 'sonner';

interface ShareButtonProps {
  text?: string;
  url?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showDiamondInfo?: boolean;
}

export function ShareButton({ 
  text = 'Jag tävlar i Sweden Challenge Race! Häng med! 🏆🇸🇪',
  url,
  variant = 'outline',
  size = 'sm',
  className = '',
  showDiamondInfo = true,
}: ShareButtonProps) {
  const { dailyShares, shareDiamond } = useDiamonds();
  const shareUrl = url || window.location.origin;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Sweden Challenge Race', text, url: shareUrl });
        await shareDiamond();
      } catch {}
    } else {
      await navigator.clipboard.writeText(`${text} ${shareUrl}`);
      await shareDiamond();
      toast.success('Länk kopierad!');
    }
  };

  return (
    <Button 
      size={size} 
      variant={variant} 
      onClick={handleShare} 
      disabled={dailyShares >= 5}
      className={className}
    >
      <Share2 className="h-4 w-4 mr-1" />
      {showDiamondInfo ? `Dela (+1💎) (${dailyShares}/5)` : 'Dela'}
    </Button>
  );
}
