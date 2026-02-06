import { useState, useEffect, useRef } from 'react';
import { useAppSettings, AppBranding, RankThresholds, StreakBonuses } from '@/hooks/useAppSettings';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Upload, Loader2, Palette, Trophy, Flame, Diamond } from 'lucide-react';
import { toast } from 'sonner';

export function AdminBranding() {
  const { branding, dailyClaimDiamonds, rankThresholds, streakBonuses, updateSetting } = useAppSettings();
  const [localBranding, setLocalBranding] = useState<AppBranding>(branding);
  const [localDailyClaim, setLocalDailyClaim] = useState(dailyClaimDiamonds);
  const [localRanks, setLocalRanks] = useState<RankThresholds>(rankThresholds);
  const [localStreaks, setLocalStreaks] = useState<StreakBonuses>(streakBonuses);
  const [saving, setSaving] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalBranding(branding);
    setLocalDailyClaim(dailyClaimDiamonds);
    setLocalRanks(rankThresholds);
    setLocalStreaks(streakBonuses);
  }, [branding, dailyClaimDiamonds, rankThresholds, streakBonuses]);

  const uploadImage = async (file: File, type: 'logo' | 'background') => {
    const path = `branding/${type}_${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) { toast.error('Kunde inte ladda upp bild'); return null; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file, 'logo');
    if (url) setLocalBranding(prev => ({ ...prev, logo_url: url }));
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file, 'background');
    if (url) setLocalBranding(prev => ({ ...prev, background_url: url }));
  };

  const saveBranding = async () => {
    setSaving(true);
    await updateSetting('app_branding', localBranding);
    toast.success('Branding sparad!');
    setSaving(false);
  };

  const saveDailyClaim = async () => {
    setSaving(true);
    await updateSetting('daily_claim_diamonds', localDailyClaim);
    toast.success('Daglig bonus uppdaterad!');
    setSaving(false);
  };

  const saveRanks = async () => {
    setSaving(true);
    await updateSetting('rank_thresholds', localRanks);
    toast.success('Rank-gränser sparade!');
    setSaving(false);
  };

  const saveStreaks = async () => {
    setSaving(true);
    await updateSetting('streak_bonuses', localStreaks);
    toast.success('Streak-bonusar sparade!');
    setSaving(false);
  };

  const rankOrder = ['Bronze', 'Silver', 'Guld', 'Diamond', 'Golden Star', 'The Legend'];
  const rankEmojis: Record<string, string> = { Bronze: '🥉', Silver: '🥈', Guld: '🥇', Diamond: '💎', 'Golden Star': '⭐', 'The Legend': '🌟' };

  return (
    <Tabs defaultValue="branding">
      <TabsList className="mb-4 flex-wrap">
        <TabsTrigger value="branding"><Palette className="h-4 w-4 mr-1" /> Utseende</TabsTrigger>
        <TabsTrigger value="diamonds"><Diamond className="h-4 w-4 mr-1" /> Diamanter</TabsTrigger>
        <TabsTrigger value="ranks"><Trophy className="h-4 w-4 mr-1" /> Ranks</TabsTrigger>
        <TabsTrigger value="streaks"><Flame className="h-4 w-4 mr-1" /> Streaks</TabsTrigger>
      </TabsList>

      <TabsContent value="branding">
        <Card>
          <CardHeader><CardTitle>Appens utseende</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Appnamn</Label>
              <Input value={localBranding.name} onChange={e => setLocalBranding(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Herotext (startsida)</Label>
              <Input value={localBranding.hero_text} onChange={e => setLocalBranding(prev => ({ ...prev, hero_text: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Logga</Label>
                {localBranding.logo_url && <img src={localBranding.logo_url} alt="Logo" className="h-16 w-auto rounded" />}
                <Button variant="outline" size="sm" onClick={() => logoRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" /> Ladda upp logga
                </Button>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>
              <div className="space-y-2">
                <Label>Bakgrundsbild</Label>
                {localBranding.background_url && <img src={localBranding.background_url} alt="Background" className="h-16 w-auto rounded" />}
                <Button variant="outline" size="sm" onClick={() => bgRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" /> Ladda upp bakgrund
                </Button>
                <input ref={bgRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Bakgrundsfärg (valfritt, CSS)</Label>
              <Input value={localBranding.background_color || ''} onChange={e => setLocalBranding(prev => ({ ...prev, background_color: e.target.value || null }))} placeholder="#1a1a2e" />
            </div>
            <div className="space-y-2">
              <Label>Temafärg (valfritt, CSS)</Label>
              <Input value={localBranding.theme_color || ''} onChange={e => setLocalBranding(prev => ({ ...prev, theme_color: e.target.value || null }))} placeholder="#FFD700" />
            </div>
            <Button onClick={saveBranding} disabled={saving} className="gradient-gold text-accent-foreground font-semibold">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Spara utseende
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="diamonds">
        <Card>
          <CardHeader><CardTitle>Daglig diamant-claim</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Diamanter per daglig claim</Label>
              <Input type="number" min={1} value={localDailyClaim} onChange={e => setLocalDailyClaim(Number(e.target.value))} />
            </div>
            <Button onClick={saveDailyClaim} disabled={saving} className="gradient-gold text-accent-foreground font-semibold">
              <Save className="h-4 w-4 mr-2" /> Spara
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="ranks">
        <Card>
          <CardHeader><CardTitle>Poänggränser per rank</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {rankOrder.map(rank => (
              <div key={rank} className="flex items-center gap-3">
                <span className="text-xl w-8">{rankEmojis[rank]}</span>
                <Label className="w-28">{rank}</Label>
                <Input type="number" min={0} value={localRanks[rank] || 0} onChange={e => setLocalRanks(prev => ({ ...prev, [rank]: Number(e.target.value) }))} className="w-32" />
                <span className="text-sm text-muted-foreground">poäng</span>
              </div>
            ))}
            <Button onClick={saveRanks} disabled={saving} className="gradient-gold text-accent-foreground font-semibold mt-2">
              <Save className="h-4 w-4 mr-2" /> Spara rank-gränser
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="streaks">
        <Card>
          <CardHeader><CardTitle>Streak-bonusar</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Extra diamanter vid milstolpar (antal dagar i rad).</p>
            {Object.entries(localStreaks).sort((a, b) => Number(a[0]) - Number(b[0])).map(([days, bonus]) => (
              <div key={days} className="flex items-center gap-3">
                <Label className="w-20">{days} dagar</Label>
                <Input type="number" min={0} value={bonus} onChange={e => setLocalStreaks(prev => ({ ...prev, [days]: Number(e.target.value) }))} className="w-24" />
                <span className="text-sm text-muted-foreground">extra 💎</span>
              </div>
            ))}
            <Button onClick={saveStreaks} disabled={saving} className="gradient-gold text-accent-foreground font-semibold mt-2">
              <Save className="h-4 w-4 mr-2" /> Spara streak-bonusar
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
