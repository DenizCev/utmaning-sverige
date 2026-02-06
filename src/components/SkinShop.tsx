import { useSkins } from '@/hooks/useSkins';
import { useDiamonds } from '@/hooks/useDiamonds';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DiamondBalance } from '@/components/DiamondBalance';
import { Sparkles, Check, ShoppingBag, Diamond } from 'lucide-react';

export function SkinShop() {
  const { allSkins, ownedSkins, buySkin, toggleEquip } = useSkins();
  const { diamonds } = useDiamonds();

  const ownedMap = new Map(ownedSkins.map(s => [s.skin_id, s]));
  const categories = [...new Set(allSkins.map(s => s.category))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-sweden-gold" /> Skin-butik
        </h2>
        <DiamondBalance count={diamonds} />
      </div>

      {categories.map(cat => (
        <div key={cat}>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {cat === 'hatt' ? '🎩 Hattar' : cat === 'glasögon' ? '👓 Glasögon' : cat === 'effekt' ? '✨ Effekter' : '🎯 Tillbehör'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {allSkins.filter(s => s.category === cat).map(skin => {
              const owned = ownedMap.get(skin.id);
              return (
                <Card key={skin.id} className={`${owned?.equipped ? 'ring-2 ring-sweden-gold' : ''}`}>
                  <CardContent className="pt-4 text-center space-y-2">
                    <div className="text-4xl">{skin.emoji}</div>
                    <p className="font-semibold text-sm">{skin.name}</p>
                    {owned ? (
                      <Button
                        size="sm"
                        variant={owned.equipped ? 'default' : 'outline'}
                        onClick={() => toggleEquip(owned.id, owned.equipped)}
                        className="w-full"
                      >
                        {owned.equipped ? <><Check className="h-3 w-3 mr-1" /> Utrustad</> : 'Utrusta'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => buySkin(skin.id, skin.price)}
                        disabled={diamonds < skin.price}
                        className="w-full"
                      >
                        <Diamond className="h-3 w-3 mr-1" /> {skin.price} 💎
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
