import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Loader2, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';

interface AdminEntry {
  role_id: string;
  user_id: string;
  username: string;
}

export function AdminAdmins({ user }: { user: User | null }) {
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => { fetchAdmins(); }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    const { data: roles } = await supabase
      .from('user_roles')
      .select('id, user_id, role')
      .eq('role', 'admin');

    if (roles && roles.length > 0) {
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.username]));

      setAdmins(roles.map(r => ({
        role_id: r.id,
        user_id: r.user_id,
        username: profileMap[r.user_id] || 'Okänd',
      })));
    } else {
      setAdmins([]);
    }
    setLoading(false);
  };

  const addAdmin = async () => {
    if (!newAdminUsername.trim()) { toast.error('Ange ett användarnamn'); return; }
    setAdding(true);

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, username')
      .eq('username', newAdminUsername.trim())
      .maybeSingle();

    if (!profile) {
      toast.error(`Användare "${newAdminUsername}" hittades inte`);
      setAdding(false);
      return;
    }

    const { data: existing } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', profile.user_id)
      .eq('role', 'admin')
      .maybeSingle();

    if (existing) {
      toast.info(`${profile.username} är redan admin`);
      setAdding(false);
      return;
    }

    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: profile.user_id, role: 'admin' });

    if (error) {
      toast.error('Kunde inte lägga till admin');
    } else {
      toast.success(`${profile.username} är nu admin! 🛡️`);
      setNewAdminUsername('');
      fetchAdmins();
    }
    setAdding(false);
  };

  const removeAdmin = async (entry: AdminEntry) => {
    if (entry.user_id === user?.id) {
      toast.error('Du kan inte ta bort din egen adminbehörighet');
      return;
    }
    setRemoving(entry.role_id);
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', entry.role_id);

    if (error) {
      toast.error('Kunde inte ta bort admin');
    } else {
      toast.success(`${entry.username} är inte längre admin`);
      fetchAdmins();
    }
    setRemoving(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Lägg till admin</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ange användarnamnet på den person du vill göra till admin.
          </p>
          <div className="flex gap-2">
            <Input
              value={newAdminUsername}
              onChange={e => setNewAdminUsername(e.target.value)}
              placeholder="Användarnamn"
              onKeyDown={e => e.key === 'Enter' && addAdmin()}
            />
            <Button onClick={addAdmin} disabled={adding} className="gradient-gold text-accent-foreground font-semibold shrink-0">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4 mr-1" /> Lägg till</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-sweden-gold" />
            Nuvarande admins ({admins.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
          ) : admins.length === 0 ? (
            <p className="text-muted-foreground text-sm">Inga admins hittades.</p>
          ) : (
            <div className="space-y-2">
              {admins.map(a => (
                <div key={a.role_id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-sweden-gold" />
                    <span className="font-medium">{a.username}</span>
                    {a.user_id === user?.id && (
                      <Badge variant="secondary" className="text-xs">Du</Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeAdmin(a)}
                    disabled={a.user_id === user?.id || removing === a.role_id}
                    className="text-destructive hover:text-destructive"
                  >
                    {removing === a.role_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
