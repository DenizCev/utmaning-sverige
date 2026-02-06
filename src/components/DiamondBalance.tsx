import { Diamond } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function DiamondBalance({ count }: { count: number }) {
  return (
    <Badge variant="outline" className="gap-1 px-3 py-1 border-sweden-gold/50">
      <Diamond className="h-4 w-4 text-sweden-gold fill-sweden-gold" />
      <span className="font-bold">{count}</span>
    </Badge>
  );
}
