import { Gem } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function DiamondBalance({ count }: { count: number }) {
  return (
    <Badge variant="outline" className="gap-1 px-3 py-1.5 border-blue-400/50">
      <Gem className="h-4 w-4 text-blue-500 fill-blue-400/30" />
      <span className="font-bold">{count}</span>
      <span className="text-xs text-muted-foreground">💎</span>
    </Badge>
  );
}
