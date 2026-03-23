import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTeams, TeamMember } from '@/hooks/useTeams';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { AlertDialog as PermDialog, AlertDialogAction as PermAction, AlertDialogCancel as PermCancel, AlertDialogContent as PermContent, AlertDialogDescription as PermDesc, AlertDialogFooter as PermFooter, AlertDialogHeader as PermHeader, AlertDialogTitle as PermTitle } from '@/components/ui/alert-dialog';
import { Users, Plus, UserPlus, Crown, LogOut, Check, X, Mail, Loader2, Trash2, UserCheck, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';

export default function TeamPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { myTeams, invitations, joinRequests, loading, createTeam, inviteMember, respondToInvitation, getTeamMembers, leaveTeam, removeMember, deleteTeam } = useTeams();
  const [createOpen, setCreateOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [teamAvatar, setTeamAvatar] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteTeamId, setInviteTeamId] = useState<string | null>(null);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showCameraDialog, setShowCameraDialog] = useState(false);

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user]);

  useEffect(() => {
    if (expandedTeam) {
      getTeamMembers(expandedTeam).then(setMembers);
    }
  }, [expandedTeam]);

  const handleCreateTeam = async () => {
    if (!teamName.trim()) { toast.error('Ange ett lagnamn'); return; }
    setCreating(true);
    const result = await createTeam(teamName, teamDesc, teamAvatar || undefined);
    if (result) {
      setCreateOpen(false);
      setTeamName('');
      setTeamDesc('');
      setTeamAvatar(null);
    }
    setCreating(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const path = `teams/${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) { toast.error('Kunde inte ladda upp bild'); return; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    setTeamAvatar(data.publicUrl);
    toast.success('Lagbild uppladdad!');
  };

  const handleInvite = async () => {
    if (!inviteTeamId || !inviteUsername.trim()) return;
    await inviteMember(inviteTeamId, inviteUsername.trim());
    setInviteUsername('');
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold flex items-center gap-2">
          <Users className="h-7 w-7 text-sweden-gold" /> Mina lag
        </h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-gold text-accent-foreground font-semibold">
              <Plus className="h-4 w-4 mr-2" /> Skapa lag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Skapa nytt lag</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 cursor-pointer" onClick={() => fileRef.current?.click()}>
                  <AvatarImage src={teamAvatar || undefined} />
                  <AvatarFallback className="gradient-sweden text-primary-foreground">{teamName?.slice(0, 2).toUpperCase() || '🏅'}</AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>Välj lagbild</Button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <div className="space-y-2">
                <Label>Lagnamn</Label>
                <Input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="T.ex. Team Viking" />
              </div>
              <div className="space-y-2">
                <Label>Beskrivning</Label>
                <Textarea value={teamDesc} onChange={e => setTeamDesc(e.target.value)} placeholder="Beskriv ert lag..." />
              </div>
              <Button onClick={handleCreateTeam} disabled={creating} className="w-full gradient-gold text-accent-foreground font-semibold">
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Skapa lag
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Invitations */}
      {invitations.length > 0 && (
        <Card className="mb-6 border-sweden-gold/40">
          <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Inbjudningar</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {invitations.map(inv => (
              <div key={inv.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-semibold">{inv.team_name || 'Okänt lag'}</p>
                  <p className="text-sm text-muted-foreground">Inbjuden av {inv.inviter_name || 'Okänd'}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => respondToInvitation(inv.id, true)} className="gradient-gold text-accent-foreground">
                    <Check className="h-4 w-4 mr-1" /> Acceptera
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => respondToInvitation(inv.id, false)}>
                    <X className="h-4 w-4 mr-1" /> Neka
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Join requests (for leaders) */}
      {joinRequests.length > 0 && (
        <Card className="mb-6 border-primary/40">
          <CardHeader><CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5" /> Förfrågningar att gå med</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {joinRequests.map(req => (
              <div key={req.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-semibold">{req.inviter_name || 'Okänd spelare'}</p>
                  <p className="text-sm text-muted-foreground">Vill gå med i {req.team_name || 'ditt lag'}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => respondToInvitation(req.id, true)} className="gradient-gold text-accent-foreground">
                    <Check className="h-4 w-4 mr-1" /> Godkänn
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => respondToInvitation(req.id, false)}>
                    <X className="h-4 w-4 mr-1" /> Neka
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* My teams */}
      {loading ? (
        <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : myTeams.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Du har inga lag ännu. Skapa ett lag eller vänta på en inbjudan!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {myTeams.map(team => (
            <Card key={team.id}>
              <CardContent className="py-4">
                <div className="flex items-center gap-4 mb-3 cursor-pointer" onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}>
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={team.avatar_url || undefined} />
                    <AvatarFallback className="gradient-sweden text-primary-foreground">{team.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold">{team.name}</h3>
                    {team.description && <p className="text-sm text-muted-foreground line-clamp-1">{team.description}</p>}
                  </div>
                  {team.created_by === user.id && <Badge variant="outline"><Crown className="h-3 w-3 mr-1" /> Ledare</Badge>}
                </div>

                {expandedTeam === team.id && (
                  <div className="border-t pt-3 mt-3 space-y-3">
                    <p className="text-sm font-semibold">Medlemmar</p>
                    <div className="space-y-2">
                      {members.map(m => (
                        <div key={m.id} className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={m.avatar_url || undefined} />
                            <AvatarFallback>{m.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm flex-1">{m.username}</span>
                          {m.role === 'leader' && <Badge variant="secondary" className="text-xs"><Crown className="h-3 w-3 mr-1" /> Ledare</Badge>}
                          {team.created_by === user.id && m.user_id !== user.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={async () => {
                                await removeMember(team.id, m.user_id);
                                const updated = await getTeamMembers(team.id);
                                setMembers(updated);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {team.created_by === user.id && (
                      <div className="flex gap-2 pt-2">
                        <Input
                          placeholder="Bjud in (användarnamn)"
                          value={inviteTeamId === team.id ? inviteUsername : ''}
                          onFocus={() => setInviteTeamId(team.id)}
                          onChange={e => { setInviteTeamId(team.id); setInviteUsername(e.target.value); }}
                          className="flex-1"
                        />
                        <Button size="sm" onClick={handleInvite} disabled={!inviteUsername.trim()}>
                          <UserPlus className="h-4 w-4 mr-1" /> Bjud in
                        </Button>
                      </div>
                    )}

                    {team.created_by !== user.id && (
                      <Button size="sm" variant="outline" onClick={() => leaveTeam(team.id)} className="text-destructive">
                        <LogOut className="h-4 w-4 mr-1" /> Lämna lag
                      </Button>
                    )}

                    {team.created_by === user.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive" className="mt-2">
                            <Trash2 className="h-4 w-4 mr-1" /> Ta bort lag
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Ta bort lag?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Är du säker? Laget "{team.name}" och alla medlemskap kommer att raderas permanent.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Avbryt</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteTeam(team.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Ta bort
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
