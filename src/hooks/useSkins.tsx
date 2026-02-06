import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Skin {
  id: string;
  name: string;
  emoji: string;
  category: string;
  price: number;
}

export interface UserSkin {
  id: string;
  skin_id: string;
  equipped: boolean;
  skin?: Skin;
}

export function useSkins() {
  const { user } = useAuth();
  const [allSkins, setAllSkins] = useState<Skin[]>([]);
  const [ownedSkins, setOwnedSkins] = useState<UserSkin[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSkins = useCallback(async () => {
    const { data } = await (supabase.from('skins') as any).select('*').order('price');
    setAllSkins(data || []);
  }, []);

  const fetchOwned = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase.from('user_skins') as any)
      .select('*').eq('user_id', user.id);
    setOwnedSkins(data || []);
  }, [user]);

  useEffect(() => {
    Promise.all([fetchSkins(), fetchOwned()]).then(() => setLoading(false));
  }, [fetchSkins, fetchOwned]);

  const buySkin = async (skinId: string, price: number) => {
    if (!user) return false;
    // Check diamonds
    const { data: profile } = await supabase.from('profiles')
      .select('diamonds').eq('user_id', user.id).maybeSingle();
    if (!profile || profile.diamonds < price) {
      toast.error(`Du behöver ${price} diamanter`);
      return false;
    }
    // Deduct diamonds
    const { error: updateErr } = await supabase.from('profiles')
      .update({ diamonds: profile.diamonds - price }).eq('user_id', user.id);
    if (updateErr) { toast.error('Kunde inte dra diamanter'); return false; }
    // Add skin
    const { error } = await (supabase.from('user_skins') as any)
      .insert({ user_id: user.id, skin_id: skinId });
    if (error) {
      // Refund
      await supabase.from('profiles').update({ diamonds: profile.diamonds }).eq('user_id', user.id);
      toast.error('Kunde inte köpa skin');
      return false;
    }
    await (supabase.from('diamond_history') as any).insert({
      user_id: user.id, amount: -price, reason: 'Köpte skin',
    });
    toast.success('Skin köpt! 🎨');
    fetchOwned();
    return true;
  };

  const toggleEquip = async (userSkinId: string, currentlyEquipped: boolean) => {
    if (!user) return;
    await (supabase.from('user_skins') as any)
      .update({ equipped: !currentlyEquipped }).eq('id', userSkinId);
    // Update profile equipped_skin
    const { data: equipped } = await (supabase.from('user_skins') as any)
      .select('skin_id').eq('user_id', user.id).eq('equipped', true);
    if (equipped && equipped.length > 0) {
      const skinIds = equipped.map((s: any) => s.skin_id);
      const { data: skins } = await (supabase.from('skins') as any)
        .select('emoji').in('id', skinIds);
      const emojis = (skins || []).map((s: any) => s.emoji).join('');
      await supabase.from('profiles').update({ equipped_skin: emojis }).eq('user_id', user.id);
    } else {
      await supabase.from('profiles').update({ equipped_skin: null }).eq('user_id', user.id);
    }
    fetchOwned();
    toast.success(!currentlyEquipped ? 'Skin utrustad!' : 'Skin avrustad');
  };

  return { allSkins, ownedSkins, loading, buySkin, toggleEquip, refetch: () => { fetchSkins(); fetchOwned(); } };
}
