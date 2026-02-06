import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDiamonds } from '@/hooks/useDiamonds';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DiamondBalance } from '@/components/DiamondBalance';
import { ShareButton } from '@/components/ShareButton';
import { Camera, Save, Trophy, Loader2, Diamond, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { diamonds, dailyAds, watchAd } = useDiamonds();
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ competitions: 0, challenges: 0, points: 0 });
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    fetchProfile();
    fetchStats();
    fetchHistory();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (data) { setProfile(data); setUsername(data.username); setAvatarUrl(data.avatar_url); }
  };

  const fetchStats = async () => {
    if (!user) return;
    const { count: compCount } = await supabase.from('competition_memberships').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    const { data: subs } = await supabase.from('submissions').select('points_awarded').eq('user_id', user.id).eq('status', 'approved');
    setStats({
      competitions: compCount || 0,
      challenges: subs?.length || 0,
      points: (subs || []).reduce((sum, s) => sum + (s.points_awarded || 0), 0),
    });
  };

  const fetchHistory = async () => {
    if (!user) return;
    const { data } = await (supabase.from('diamond_history') as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setHistory(data || []);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const path = `${user.id}/avatar.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) { toast.error('Kunde inte ladda upp avatar'); return; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    toast.success('Avatar uppladdad!');
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ username, avatar_url: avatarUrl }).eq('user_id', user.id);
    if (error) toast.error('Kunde inte spara profil');
    else toast.success('Profil uppdaterad!');
    setSaving(false);
  };

  if (!user) return null;

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-display font-bold mb-6">Min profil</h1>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6 mb-6">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="gradient-sweden text-primary-foreground text-xl">
                  {username?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full gradient-gold flex items-center justify-center shadow-md">
                <Camera className="h-4 w-4 text-accent-foreground" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Användarnamn</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <Button onClick={handleSave} disabled={saving} className="gradient-gold text-accent-foreground font-semibold">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Spara ändringar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Diamonds section */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <Diamond className="h-5 w-5 text-sweden-gold" /> Diamanter
          </h2>
          <div className="flex items-center gap-4 mb-4">
            <DiamondBalance count={diamonds} />
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button size="sm" variant="outline" onClick={watchAd} disabled={dailyAds >= 10}>
              <Eye className="h-4 w-4 mr-1" /> Titta på annons ({dailyAds}/10)
            </Button>
            <ShareButton text="Kolla in Sweden Challenge Race! 🏆🇸🇪" />
          </div>
          {history.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2">Historik</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {history.map(h => (
                  <div key={h.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{h.reason}</span>
                    <span className={h.amount > 0 ? 'text-success font-semibold' : 'text-destructive font-semibold'}>
                      {h.amount > 0 ? '+' : ''}{h.amount} 💎
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-sweden-gold" /> Statistik
      </h2>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Tävlingar', value: stats.competitions },
          { label: 'Utmaningar', value: stats.challenges },
          { label: 'Poäng', value: stats.points },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-display font-bold text-primary">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
