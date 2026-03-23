import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDiamonds } from '@/hooks/useDiamonds';
import { useStreak } from '@/hooks/useStreak';
import { useAppSettings } from '@/hooks/useAppSettings';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { CharacterAvatar, EquippedSkinBadge } from '@/components/CharacterAvatar';
import { DiamondBalance } from '@/components/DiamondBalance';
import { ShareButton } from '@/components/ShareButton';
import { DailyClaimButton } from '@/components/DailyClaimButton';
import { StreakDisplay } from '@/components/StreakDisplay';
import { RankBadge } from '@/components/RankBadge';
import { SkinShop } from '@/components/SkinShop';
import { RewardedAdDialog } from '@/components/RewardedAdDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { AlertDialog as PermDialog, AlertDialogAction as PermAction, AlertDialogCancel as PermCancel, AlertDialogContent as PermContent, AlertDialogDescription as PermDesc, AlertDialogFooter as PermFooter, AlertDialogHeader as PermHeader, AlertDialogTitle as PermTitle } from '@/components/ui/alert-dialog';
import { Camera, Save, Trophy, Loader2, Diamond, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { diamonds, dailyAds, watchAd } = useDiamonds();
  const { streakCount } = useStreak();
  const { getRank } = useAppSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ competitions: 0, challenges: 0, points: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [adDialogOpen, setAdDialogOpen] = useState(false);
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  const { signOut } = useAuth();

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    fetchProfile();
    fetchStats();
    fetchHistory();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await (supabase.from('profiles') as any).select('*').eq('user_id', user.id).maybeSingle();
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
      .select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
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

  const rank = getRank(stats.points);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-display font-bold mb-6">Min profil</h1>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6 mb-4">
            <div className="relative">
              <CharacterAvatar
                username={username}
                avatarUrl={avatarUrl}
                equippedSkin={profile?.equipped_skin}
                size="xl"
              />
              <button onClick={() => setShowCameraDialog(true)} className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full gradient-gold flex items-center justify-center shadow-md">
                <Camera className="h-4 w-4 text-accent-foreground" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-lg">{username}</span>
                <EquippedSkinBadge skin={profile?.equipped_skin} size="lg" />
              </div>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <RankBadge points={stats.points} />
                <StreakDisplay count={streakCount} />
              </div>
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

      {/* Daily Claim */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <h2 className="text-xl font-display font-bold mb-4">Daglig bonus</h2>
          <DailyClaimButton />
        </CardContent>
      </Card>

      {/* Diamonds */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <Diamond className="h-5 w-5 text-sweden-gold" /> Diamanter
          </h2>
          <div className="flex items-center gap-4 mb-4">
            <DiamondBalance count={diamonds} />
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button size="sm" variant="outline" onClick={() => setAdDialogOpen(true)} disabled={dailyAds >= 10}>
              <Eye className="h-4 w-4 mr-1" /> Titta på annons ({dailyAds}/10)
            </Button>
            <ShareButton text="Kolla in Sweden Challenge Race! 🏆🇸🇪" />
          </div>
          <RewardedAdDialog open={adDialogOpen} onClose={() => setAdDialogOpen(false)} onComplete={async () => { await watchAd(); setAdDialogOpen(false); }} />
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

      {/* Skins */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <SkinShop />
        </CardContent>
      </Card>

      <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-sweden-gold" /> Statistik
      </h2>
      <div className="grid grid-cols-3 gap-4 mb-8">
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

      {/* Radera konto */}
      <Card className="mb-6 border-destructive/30">
        <CardContent className="pt-6">
          <h2 className="text-xl font-display font-bold mb-2 text-destructive">Radera konto</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Om du raderar ditt konto försvinner all din data permanent. Detta kan inte ångras.
          </p>
          <AlertDialog onOpenChange={(open) => { if (!open) setDeleteEmail(''); }}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Radera mitt konto
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Är du säker?</AlertDialogTitle>
                <AlertDialogDescription>
                  Detta kommer att permanent radera ditt konto och all tillhörande data. Skriv in din e-postadress för att bekräfta.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
                placeholder="Skriv din e-postadress"
                value={deleteEmail}
                onChange={(e) => setDeleteEmail(e.target.value)}
              />
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={deleteEmail.toLowerCase() !== (user.email?.toLowerCase() || '') || deleting}
                  onClick={async () => {
                    setDeleting(true);
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      const res = await supabase.functions.invoke('delete-account', {
                        body: { email: deleteEmail },
                      });
                      if (res.error || res.data?.error) {
                        toast.error(res.data?.error || 'Kunde inte radera kontot');
                        setDeleting(false);
                        return;
                      }
                      toast.success('Ditt konto har raderats');
                      await signOut();
                      navigate('/auth');
                    } catch {
                      toast.error('Något gick fel');
                      setDeleting(false);
                    }
                  }}
                >
                  {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Radera permanent
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
      <PermDialog open={showCameraDialog} onOpenChange={setShowCameraDialog}>
        <PermContent className="max-w-md">
          <PermHeader className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Camera className="h-7 w-7 text-primary" />
            </div>
            <PermTitle className="text-center text-xl">
              Kampen vill ha tillgång till kameran
            </PermTitle>
            <PermDesc asChild>
              <div className="space-y-3 text-center">
                <p className="text-sm text-muted-foreground">
                  För att kunna ta eller välja en profilbild behöver appen tillgång till din kamera eller ditt fotobibliotek.
                </p>
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1.5">
                  <p className="font-semibold text-foreground">Varför behövs detta?</p>
                  <ul className="list-disc list-inside space-y-1 text-left">
                    <li>Kameran eller galleriet används för att välja en profilbild</li>
                    <li>Bilden laddas upp och visas som din avatar i appen</li>
                    <li>Inga bilder sparas eller delas utan ditt godkännande</li>
                  </ul>
                </div>
              </div>
            </PermDesc>
          </PermHeader>
          <PermFooter className="sm:flex-col gap-2 sm:space-x-0">
            <PermAction onClick={() => fileRef.current?.click()} className="w-full gradient-gold text-accent-foreground font-bold">
              Tillåt kamera
            </PermAction>
            <PermCancel className="w-full">Avbryt</PermCancel>
          </PermFooter>
        </PermContent>
      </PermDialog>
    </div>
  );
}
