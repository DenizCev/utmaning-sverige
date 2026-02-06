import { useAppSettings } from '@/hooks/useAppSettings';
import { Badge } from '@/components/ui/badge';

interface RankBadgeProps {
  points: number;
  size?: 'sm' | 'md' | 'lg';
}

export function RankBadge({ points, size = 'md' }: RankBadgeProps) {
  const { getRank } = useAppSettings();
  const rank = getRank(points);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  return (
    <Badge variant="outline" className={`${sizeClasses[size]} font-semibold border-sweden-gold/50`}>
      {rank.emoji} {rank.name}
    </Badge>
  );
}
