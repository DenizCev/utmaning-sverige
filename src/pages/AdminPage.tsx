import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Plus, Trash2, CheckCircle, XCircle, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Tab state
  const [activeTab, setActiveTab] = useState('competitions');

  // Competition state
  const [compName, setCompName] = useState('');
  const [compDesc, setCompDesc] = useState('');
  const [compStart, setCompStart] = useState('');
  const [compIsActive, setCompIsActive] = useState(false);
  const [entryDiamonds, setEntryDiamonds] = useState(15);
  const [prize1, setPrize1] = useState('');
  const [prize2, setPrize2] = useState('');
  const [prize3, setPrize3] = useState('');
  const [prizeOther, setPrizeOther] = useState('');
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);

  // Challenge state
  const [chTitle, setChTitle] = useState('');
  const [chDesc, setChDesc] = useState('');
  const [chProof, setChProof] = useState('photo');
  const [chPoints, setChPoints] = useState(100);
  const [challenges, setChallenges] = useState<any[]>([]);

  // Submissions state
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [subLoading, setSubLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !isAdmin) { navigate('/'); return; }
    fetchCompetitions();
  }, [user, isAdmin]);

  useEffect(() => {
    if (selectedCompId) {
      fetchChallenges();
      fetchSubmissions();
    }
  }, [selectedCompId]);

  const fetchCompetitions = async () => {
    const { data } = await supabase.from('competitions').select('*').order('created_at', { ascending: false });
    setCompetitions(data || []);
    if (data && data.length > 0 && !selectedCompId) setSelectedCompId(data[0].id);
  };

  const fetchChallenges = async () => {
    if (!selectedCompId) return;
    const { data } = await supabase.from('challenges').select('*').eq('competition_id', selectedCompId).order('order_index');
    setChallenges(data || []);
  };

  const fetchSubmissions = async () => {
    if (!selectedCompId) return;
    setSubLoading(true);
    const { data: chs } = await supabase.from('challenges').select('id').eq('competition_id', selectedCompId);
    if (!chs || chs.length === 0) { setSubmissions([]); setSubLoading(false); return; }

    const { data } = await supabase
      .from('submissions')
      .select('*')
      .in('challenge_id', chs.map(c => c.id))
      .order('submitted_at', { ascending: false });
    
    // Enrich with profile data
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, username').in('user_id', userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.username]));
      
      const challengeMap = Object.fromEntries((chs || []).map(c => [c.id, c]));
      // Get full challenge data for mapping
      const { data: fullChs } = await supabase.from('challenges').select('*').eq('competition_id', selectedCompId);
      const fullChallengeMap = Object.fromEntries((fullChs || []).map(c => [c.id, c]));

      setSubmissions(data.map(s => ({
        ...s,
        username: profileMap[s.user_id] || 'Okänd',
        challenge_title: fullChallengeMap[s.challenge_id]?.title || 'Okänd',
      })));
    } else {
      setSubmissions([]);
    }
    setSubLoading(false);
  };

  const createCompetition = async () => {
    if (!compName || !compStart) { toast.error('Fyll i namn och starttid'); return; }
    setSaving(true);
    const { error } = await (supabase.from('competitions') as any).insert({
      name: compName,
      description: compDesc || null,
      start_time: new Date(compStart).toISOString(),
      is_active: compIsActive,
      entry_diamonds: entryDiamonds,
      prizes: { first: prize1, second: prize2, third: prize3, other: prizeOther },
    });
    if (error) toast.error('Kunde inte skapa tävling');
    else { toast.success('Tävling skapad!'); setCompName(''); setCompDesc(''); setCompStart(''); setEntryDiamonds(15); setPrize1(''); setPrize2(''); setPrize3(''); setPrizeOther(''); fetchCompetitions(); }
    setSaving(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('competitions').update({ is_active: !current }).eq('id', id);
    fetchCompetitions();
    toast.success(!current ? 'Tävling aktiverad' : 'Tävling inaktiverad');
  };

  const addChallenge = async () => {
    if (!selectedCompId || !chTitle || !chDesc) { toast.error('Fyll i alla fält'); return; }
    const nextOrder = challenges.length + 1;
    const { error } = await supabase.from('challenges').insert({
      competition_id: selectedCompId,
      title: chTitle,
      description: chDesc,
      proof_type: chProof,
      order_index: nextOrder,
      points: chPoints,
    });
    if (error) toast.error('Kunde inte lägga till utmaning');
    else { toast.success('Utmaning tillagd!'); setChTitle(''); setChDesc(''); fetchChallenges(); }
  };

  const deleteChallenge = async (id: string) => {
    await supabase.from('challenges').delete().eq('id', id);
    toast.success('Utmaning borttagen');
    fetchChallenges();
  };

  const reviewSubmission = async (id: string, status: 'approved' | 'rejected', challengePoints: number) => {
    const updates: any = { status, reviewed_at: new Date().toISOString(), reviewed_by: user!.id };
    if (status === 'approved') updates.points_awarded = challengePoints;
    
    const { error } = await supabase.from('submissions').update(updates).eq('id', id);
    if (error) toast.error('Kunde inte uppdatera');
    else {
      toast.success(status === 'approved' ? 'Utmaning godkänd! ✅' : 'Utmaning avvisad ❌');
      fetchSubmissions();
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6 text-sweden-gold" />
        <h1 className="text-3xl font-display font-bold">Admin-panel</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="competitions">Tävlingar</TabsTrigger>
          <TabsTrigger value="challenges">Utmaningar {selectedCompId && `(${competitions.find(c => c.id === selectedCompId)?.name || ''})`}</TabsTrigger>
          <TabsTrigger value="submissions">Inlämningar</TabsTrigger>
        </TabsList>

        {/* COMPETITIONS TAB */}
        <TabsContent value="competitions">
          <Card className="mb-6">
            <CardHeader><CardTitle>Skapa ny tävling</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Namn</Label>
                <Input value={compName} onChange={e => setCompName(e.target.value)} placeholder="T.ex. Februari-utmaningen 2026" />
              </div>
              <div className="space-y-2">
                <Label>Beskrivning</Label>
                <Textarea value={compDesc} onChange={e => setCompDesc(e.target.value)} placeholder="Beskriv tävlingen..." />
              </div>
              <div className="space-y-2">
                <Label>Starttid</Label>
                <Input type="datetime-local" value={compStart} onChange={e => setCompStart(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={compIsActive} onChange={e => setCompIsActive(e.target.checked)} id="active" />
                <Label htmlFor="active">Aktiv direkt</Label>
              </div>
              <div className="space-y-2">
                <Label>Antal diamanter för anmälan</Label>
                <Input type="number" min={0} value={entryDiamonds} onChange={e => setEntryDiamonds(Number(e.target.value))} placeholder="0 = gratis" />
                <p className="text-xs text-muted-foreground">Sätt till 0 för gratis anmälan</p>
              </div>
              <div className="space-y-2">
                <Label>Priser</Label>
                <Input value={prize1} onChange={e => setPrize1(e.target.value)} placeholder="1:a plats (t.ex. Presentkort 500kr)" />
                <Input value={prize2} onChange={e => setPrize2(e.target.value)} placeholder="2:a plats" />
                <Input value={prize3} onChange={e => setPrize3(e.target.value)} placeholder="3:e plats" />
                <Input value={prizeOther} onChange={e => setPrizeOther(e.target.value)} placeholder="Övrigt (valfritt)" />
              </div>
              <Button onClick={createCompetition} disabled={saving} className="gradient-gold text-accent-foreground font-semibold">
                <Plus className="h-4 w-4 mr-2" /> Skapa tävling
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {competitions.map(c => (
              <Card key={c.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-sm text-muted-foreground">Start: {new Date(c.start_time).toLocaleString('sv-SE')} · {c.entry_diamonds || 0} 💎</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={c.is_active ? 'default' : 'secondary'}>{c.is_active ? 'Aktiv' : 'Inaktiv'}</Badge>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(c.id, c.is_active)}>
                      {c.is_active ? 'Inaktivera' : 'Aktivera'}
                    </Button>
                    <Button size="sm" variant={selectedCompId === c.id ? 'default' : 'outline'} onClick={() => { setSelectedCompId(c.id); setActiveTab('challenges'); }}>
                      {selectedCompId === c.id ? 'Vald' : 'Välj'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* CHALLENGES TAB */}
        <TabsContent value="challenges">
          {selectedCompId ? (
            <>
              <Card className="mb-6">
                <CardHeader><CardTitle>Lägg till utmaning</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Titel</Label>
                    <Input value={chTitle} onChange={e => setChTitle(e.target.value)} placeholder="T.ex. Hitta en röd brevlåda" />
                  </div>
                  <div className="space-y-2">
                    <Label>Beskrivning</Label>
                    <Textarea value={chDesc} onChange={e => setChDesc(e.target.value)} placeholder="Beskriv utmaningen i detalj..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Bevistyp</Label>
                      <Select value={chProof} onValueChange={setChProof}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="photo">Foto</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="text">Text</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Poäng</Label>
                      <Input type="number" value={chPoints} onChange={e => setChPoints(Number(e.target.value))} />
                    </div>
                  </div>
                  <Button onClick={addChallenge} className="gradient-gold text-accent-foreground font-semibold">
                    <Plus className="h-4 w-4 mr-2" /> Lägg till utmaning
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-3">
                {challenges.map(ch => (
                  <Card key={ch.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full gradient-gold flex items-center justify-center text-accent-foreground font-bold text-sm">
                          {ch.order_index}
                        </div>
                        <div>
                          <p className="font-semibold">{ch.title}</p>
                          <p className="text-sm text-muted-foreground">{ch.proof_type} · {ch.points}p</p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => deleteChallenge(ch.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Välj en tävling i fliken "Tävlingar" först.</p>
          )}
        </TabsContent>

        {/* SUBMISSIONS TAB */}
        <TabsContent value="submissions">
          {subLoading ? (
            <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          ) : submissions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Inga inlämningar att granska.</p>
          ) : (
            <div className="space-y-3">
              {submissions.map(sub => (
                <Card key={sub.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{sub.username}</p>
                          <Badge variant="outline" className="text-xs">{sub.challenge_title}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Inskickad: {new Date(sub.submitted_at).toLocaleString('sv-SE')}
                        </p>
                        {sub.file_url && (
                          <a href={sub.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary flex items-center gap-1 mt-1 hover:underline">
                            <Eye className="h-3 w-3" /> Visa bevis
                          </a>
                        )}
                        {sub.text_content && <p className="text-sm mt-1 bg-muted rounded p-2">{sub.text_content}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={
                          sub.status === 'approved' ? 'bg-success text-success-foreground' :
                          sub.status === 'rejected' ? 'bg-destructive text-destructive-foreground' :
                          'bg-muted text-muted-foreground'
                        }>
                          {sub.status === 'pending' ? 'Väntande' : sub.status === 'approved' ? 'Godkänd' : 'Avvisad'}
                        </Badge>
                        {sub.status === 'pending' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => reviewSubmission(sub.id, 'approved', sub.points || 100)} className="text-success border-success">
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => reviewSubmission(sub.id, 'rejected', 0)} className="text-destructive border-destructive">
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
