import { Gem } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function DiamondBalance({ count }: { count: number }) {
  return (
    <Badge variant="outline" className="gap-1 px-3 py-1.5 border-sweden-gold/50">
      <Gem className="h-4 w-4 text-sweden-gold fill-sweden-gold/30" />
      <span className="font-bold">{count}</span>
      <span className="text-xs text-muted-foreground">diamanter</span>
    </Badge>
  );
}
