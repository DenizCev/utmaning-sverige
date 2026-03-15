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
import { Shield, Plus, Trash2, CheckCircle, XCircle, Eye, Loader2, UserPlus, Flag, Palette, Users as UsersIcon, UsersRound, ScrollText, Clock, Trophy } from 'lucide-react';
import { AdminParticipants } from '@/components/AdminParticipants';
import { AdminBranding } from '@/components/AdminBranding';
import { AdminUsers } from '@/components/AdminUsers';
import { AdminTeams } from '@/components/AdminTeams';
import { AdminRules } from '@/components/AdminRules';
import { AdminAdmins } from '@/components/AdminAdmins';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

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
  const [pointsInput, setPointsInput] = useState<Record<string, number>>({});

  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});

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

    // Fetch member counts for all competitions
    if (data && data.length > 0) {
      const { data: memberships } = await supabase
        .from('competition_memberships')
        .select('competition_id')
        .in('competition_id', data.map(c => c.id));
      const counts: Record<string, number> = {};
      (memberships || []).forEach(m => {
        counts[m.competition_id] = (counts[m.competition_id] || 0) + 1;
      });
      setMemberCounts(counts);
    }
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

    // Get competition start_time
    const comp = competitions.find(c => c.id === selectedCompId);
    const compStartTime = comp?.start_time ? new Date(comp.start_time).getTime() : null;

    const { data } = await supabase
      .from('submissions')
      .select('*')
      .in('challenge_id', chs.map(c => c.id))
      .order('submitted_at', { ascending: false });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, username').in('user_id', userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.username]));

      const { data: fullChs } = await supabase.from('challenges').select('*').eq('competition_id', selectedCompId);
      const fullChallengeMap = Object.fromEntries((fullChs || []).map(c => [c.id, c]));

      const defaultPoints: Record<string, number> = {};
      setSubmissions(data.map(s => {
        const elapsedMs = compStartTime && s.submitted_at ? new Date(s.submitted_at).getTime() - compStartTime : null;
        const ch = fullChallengeMap[s.challenge_id];
        if (s.status === 'pending') defaultPoints[s.id] = ch?.points || 100;
        return {
          ...s,
          username: profileMap[s.user_id] || 'Okänd',
          challenge_title: ch?.title || 'Okänd',
          challenge_points: ch?.points || 100,
          elapsed_minutes: elapsedMs !== null && elapsedMs > 0 ? Math.round(elapsedMs / 60000) : null,
        };
      }));
      setPointsInput(prev => ({ ...prev, ...defaultPoints }));
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

  const endCompetition = async (id: string) => {
    await (supabase.from('competitions') as any)
      .update({ is_active: false, end_time: new Date().toISOString() })
      .eq('id', id);
    fetchCompetitions();
    toast.success('Tävlingen är nu avslutad! 🏁');
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

    // Find the submission to get user_id
    const { data: sub } = await supabase.from('submissions').select('user_id, challenge_id').eq('id', id).maybeSingle();

    const { error } = await supabase.from('submissions').update(updates).eq('id', id);
    if (error) toast.error('Kunde inte uppdatera');
    else {
      toast.success(status === 'approved' ? 'Utmaning godkänd! ✅' : 'Utmaning avvisad ❌');

      // Create notification for the user
      if (sub) {
        const notifData: any = {
          user_id: sub.user_id,
          type: 'challenge',
          title: status === 'approved' ? '✅ Din utmaning är godkänd!' : '❌ Din utmaning avvisades',
          message: status === 'approved'
            ? 'Bra jobbat! Nästa utmaning är nu upplåst.'
            : 'Din inlämning avvisades. Försök igen!',
          link: '/',
        };
        await (supabase.from('notifications') as any).insert(notifData);
      }

      fetchSubmissions();
    }
  };


  if (!isAdmin) return null;

  const getCompStatus = (c: any) => {
    if (c.end_time) return 'ended';
    if (c.is_active) return 'active';
    return 'inactive';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6 text-sweden-gold" />
        <h1 className="text-3xl font-display font-bold">Admin-panel</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="competitions">Tävlingar</TabsTrigger>
          <TabsTrigger value="challenges">Utmaningar {selectedCompId && `(${competitions.find(c => c.id === selectedCompId)?.name || ''})`}</TabsTrigger>
          <TabsTrigger value="participants">Deltagare</TabsTrigger>
          <TabsTrigger value="submissions">Inlämningar</TabsTrigger>
          <TabsTrigger value="users"><UsersIcon className="h-4 w-4 mr-1" /> Alla användare</TabsTrigger>
          <TabsTrigger value="teams"><UsersRound className="h-4 w-4 mr-1" /> Alla lag</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
          <TabsTrigger value="rules"><ScrollText className="h-4 w-4 mr-1" /> Regler</TabsTrigger>
          <TabsTrigger value="settings"><Palette className="h-4 w-4 mr-1" /> Inställningar</TabsTrigger>
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
            {competitions.map(c => {
              const status = getCompStatus(c);
              return (
                <Card key={c.id} className={status === 'ended' ? 'opacity-70' : ''}>
                  <CardContent className="flex items-center justify-between py-4 gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{c.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Start: {new Date(c.start_time).toLocaleString('sv-SE')} · {c.entry_diamonds || 0} 💎 · <Users className="inline h-3.5 w-3.5" /> {memberCounts[c.id] || 0} anmälda
                        {c.end_time && ` · Avslutad: ${new Date(c.end_time).toLocaleDateString('sv-SE')}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      <Badge variant={status === 'active' ? 'default' : status === 'ended' ? 'destructive' : 'secondary'}>
                        {status === 'active' ? 'Aktiv' : status === 'ended' ? 'Avslutad' : 'Inaktiv'}
                      </Badge>
                      {status !== 'ended' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => toggleActive(c.id, c.is_active)}>
                            {c.is_active ? 'Inaktivera' : 'Aktivera'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => endCompetition(c.id)} className="text-destructive border-destructive">
                            <Flag className="h-4 w-4 mr-1" /> Avsluta
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant={selectedCompId === c.id ? 'default' : 'outline'} onClick={() => { setSelectedCompId(c.id); setActiveTab('challenges'); }}>
                        {selectedCompId === c.id ? 'Vald' : 'Välj'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* CHALLENGES TAB */}
        <TabsContent value="challenges">
          {selectedCompId ? (
            <>
              <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-sweden-gold" />
                <span className="font-semibold">Tävling:</span>
                <span>{competitions.find(c => c.id === selectedCompId)?.name || '—'}</span>
              </div>
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

        {/* PARTICIPANTS TAB */}
        <TabsContent value="participants">
          <AdminParticipants competitionId={selectedCompId} />
        </TabsContent>

        {/* SUBMISSIONS TAB */}
        <TabsContent value="submissions">
          {selectedCompId && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-sweden-gold" />
              <span className="font-semibold">Tävling:</span>
              <span>{competitions.find(c => c.id === selectedCompId)?.name || '—'}</span>
            </div>
          )}
          {subLoading ? (
            <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          ) : submissions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Inga inlämningar att granska.</p>
          ) : (
            <div className="space-y-3">
              {submissions.map(sub => {
                const elapsedH = sub.elapsed_minutes !== null ? Math.floor(sub.elapsed_minutes / 60) : null;
                const elapsedM = sub.elapsed_minutes !== null ? sub.elapsed_minutes % 60 : null;
                const elapsedStr = sub.elapsed_minutes !== null
                  ? (elapsedH! > 0 ? `${elapsedH}h ${elapsedM}min` : `${elapsedM}min`)
                  : '—';

                return (
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
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Tid från start: <span className="font-mono font-semibold text-foreground">{elapsedStr}</span>
                        </p>
                        {sub.points_awarded != null && sub.status !== 'pending' && (
                          <p className="text-sm text-muted-foreground">Poäng: <span className="font-semibold text-foreground">{sub.points_awarded}p</span></p>
                        )}
                        {sub.file_url && (
                          <a href={sub.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary flex items-center gap-1 mt-1 hover:underline">
                            <Eye className="h-3 w-3" /> Visa bevis
                          </a>
                        )}
                        {sub.text_content && <p className="text-sm mt-1 bg-muted rounded p-2">{sub.text_content}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge className={
                          sub.status === 'approved' ? 'bg-success text-success-foreground' :
                          sub.status === 'rejected' ? 'bg-destructive text-destructive-foreground' :
                          'bg-muted text-muted-foreground'
                        }>
                          {sub.status === 'pending' ? 'Väntande' : sub.status === 'approved' ? 'Godkänd' : 'Avvisad'}
                        </Badge>
                        {sub.status === 'pending' && (
                          <>
                            <div className="flex items-center gap-1">
                              <Label className="text-xs">Poäng:</Label>
                              <Input
                                type="number"
                                min={0}
                                className="w-20 h-8 text-sm"
                                value={pointsInput[sub.id] ?? sub.challenge_points}
                                onChange={e => setPointsInput(prev => ({ ...prev, [sub.id]: Number(e.target.value) }))}
                              />
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => reviewSubmission(sub.id, 'approved', pointsInput[sub.id] ?? sub.challenge_points)} className="text-success border-success">
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => reviewSubmission(sub.id, 'rejected', 0)} className="text-destructive border-destructive">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ALL USERS TAB */}
        <TabsContent value="users">
          <AdminUsers />
        </TabsContent>

        {/* ADMINS TAB */}
        <TabsContent value="teams">
          <AdminTeams />
        </TabsContent>

        <TabsContent value="admins">
          <AdminAdmins user={user} />
        </TabsContent>

        {/* RULES TAB */}
        <TabsContent value="rules">
          <AdminRules />
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings">
          <AdminBranding />
        </TabsContent>
      </Tabs>
    </div>
  );
}