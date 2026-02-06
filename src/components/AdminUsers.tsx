import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CharacterAvatar } from '@/components/CharacterAvatar';
import { RankBadge } from '@/components/RankBadge';
import { Diamond, Save, Search, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UserEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  equipped_skin: string | null;
  diamonds: number;
  all_time_points: number;
  streak_count: number;
  created_at: string;
}

export function AdminUsers() {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [filtered, setFiltered] = useState<UserEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDiamonds, setEditDiamonds] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(users);
    } else {
      const q = search.toLowerCase();
      setFiltered(users.filter(u => u.username.toLowerCase().includes(q)));
    }
  }, [search, users]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url, equipped_skin, diamonds, all_time_points, streak_count, created_at')
      .order('created_at', { ascending: false });
    setUsers((data as UserEntry[]) || []);
    setLoading(false);
  };

  const startEdit = (user: UserEntry) => {
    setEditingId(user.user_id);
    setEditDiamonds(user.diamonds);
  };

  const saveDiamonds = async (userId: string, username: string) => {
    setSaving(true);
    const diff = editDiamonds - (users.find(u => u.user_id === userId)?.diamonds || 0);
    const { error } = await supabase
      .from('profiles')
      .update({ diamonds: editDiamonds })
      .eq('user_id', userId);

    if (error) {
      toast.error('Kunde inte uppdatera diamanter');
    } else {
      if (diff !== 0) {
        await (supabase.from('diamond_history') as any).insert({
          user_id: userId,
          amount: diff,
          reason: `Admin justerade diamanter`,
        });
      }
      toast.success(`Diamanter uppdaterade för ${username}`);
      setEditingId(null);
      fetchUsers();
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-5 w-5 text-sweden-gold" />
        <h3 className="font-display font-bold">{users.length} registrerade användare</h3>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Sök efter användarnamn..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-2 max-h-[70vh] overflow-y-auto">
        {filtered.map(u => (
          <Card key={u.user_id}>
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <CharacterAvatar
                  username={u.username}
                  avatarUrl={u.avatar_url}
                  equippedSkin={u.equipped_skin}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{u.username}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <RankBadge points={u.all_time_points} size="sm" />
                    <span className="text-xs text-muted-foreground">🔥 {u.streak_count}</span>
                    <span className="text-xs text-muted-foreground">
                      Reg: {new Date(u.created_at).toLocaleDateString('sv-SE')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {editingId === u.user_id ? (
                    <>
                      <Input
                        type="number"
                        value={editDiamonds}
                        onChange={e => setEditDiamonds(Number(e.target.value))}
                        className="w-20 h-8 text-sm"
                        min={0}
                      />
                      <Button size="sm" onClick={() => saveDiamonds(u.user_id, u.username)} disabled={saving}>
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>✕</Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(u)}
                      className="gap-1"
                    >
                      <Diamond className="h-3 w-3 text-sweden-gold" />
                      {u.diamonds}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
