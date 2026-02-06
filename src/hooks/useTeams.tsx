import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Team {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  username?: string;
  avatar_url?: string;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  invited_user_id: string;
  invited_by: string;
  status: string;
  created_at: string;
  team_name?: string;
  inviter_name?: string;
}

export function useTeams() {
  const { user } = useAuth();
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyTeams = useCallback(async () => {
    if (!user) return;
    const { data: memberships } = await (supabase.from('team_members') as any)
      .select('team_id')
      .eq('user_id', user.id);
    if (memberships && memberships.length > 0) {
      const teamIds = memberships.map((m: any) => m.team_id);
      const { data: teams } = await (supabase.from('teams') as any)
        .select('*')
        .in('id', teamIds);
      setMyTeams(teams || []);
    } else {
      setMyTeams([]);
    }
    setLoading(false);
  }, [user]);

  const fetchInvitations = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase.from('team_invitations') as any)
      .select('*')
      .eq('invited_user_id', user.id)
      .eq('status', 'pending');
    if (data && data.length > 0) {
      // Get team names and inviter names
      const teamIds = [...new Set(data.map((i: any) => i.team_id))] as string[];
      const inviterIds = [...new Set(data.map((i: any) => i.invited_by))] as string[];
      const { data: teams } = await (supabase.from('teams') as any).select('id, name').in('id', teamIds);
      const { data: profiles } = await supabase.from('profiles').select('user_id, username').in('user_id', inviterIds);
      const teamMap = Object.fromEntries((teams || []).map((t: any) => [t.id, t.name]));
      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.username]));
      setInvitations(data.map((i: any) => ({ ...i, team_name: teamMap[i.team_id], inviter_name: profileMap[i.invited_by] })));
    } else {
      setInvitations([]);
    }
  }, [user]);

  useEffect(() => { fetchMyTeams(); fetchInvitations(); }, [fetchMyTeams, fetchInvitations]);

  // Realtime invitations
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('team-invitations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_invitations', filter: `invited_user_id=eq.${user.id}` },
        () => fetchInvitations()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchInvitations]);

  const createTeam = async (name: string, description: string, avatarUrl?: string) => {
    if (!user) return null;
    const { data, error } = await (supabase.from('teams') as any)
      .insert({ name, description, avatar_url: avatarUrl || null, created_by: user.id })
      .select()
      .single();
    if (error) { toast.error('Kunde inte skapa lag'); return null; }
    // Add creator as leader
    await (supabase.from('team_members') as any)
      .insert({ team_id: data.id, user_id: user.id, role: 'leader' });
    toast.success('Lag skapat! 🏅');
    fetchMyTeams();
    return data;
  };

  const inviteMember = async (teamId: string, username: string) => {
    if (!user) return false;
    const { data: profile } = await supabase.from('profiles').select('user_id').eq('username', username).maybeSingle();
    if (!profile) { toast.error(`Användaren "${username}" hittades inte`); return false; }
    if (profile.user_id === user.id) { toast.error('Du kan inte bjuda in dig själv'); return false; }
    // Check already member
    const { data: existing } = await (supabase.from('team_members') as any).select('id').eq('team_id', teamId).eq('user_id', profile.user_id).maybeSingle();
    if (existing) { toast.info('Redan medlem i laget'); return false; }
    const { error } = await (supabase.from('team_invitations') as any)
      .insert({ team_id: teamId, invited_user_id: profile.user_id, invited_by: user.id });
    if (error) {
      if (error.code === '23505') toast.info('Inbjudan redan skickad');
      else toast.error('Kunde inte skicka inbjudan');
      return false;
    }
    toast.success(`Inbjudan skickad till ${username}! 📩`);
    return true;
  };

  const respondToInvitation = async (invitationId: string, accept: boolean) => {
    if (!user) return;
    const invitation = invitations.find(i => i.id === invitationId);
    const { error } = await (supabase.from('team_invitations') as any)
      .update({ status: accept ? 'accepted' : 'declined' })
      .eq('id', invitationId);
    if (error) { toast.error('Kunde inte svara på inbjudan'); return; }
    if (accept && invitation) {
      await (supabase.from('team_members') as any)
        .insert({ team_id: invitation.team_id, user_id: user.id, role: 'member' });
      toast.success('Du gick med i laget! 🎉');
      fetchMyTeams();
    } else {
      toast.info('Inbjudan nekad');
    }
    fetchInvitations();
  };

  const getTeamMembers = async (teamId: string): Promise<TeamMember[]> => {
    const { data: members } = await (supabase.from('team_members') as any)
      .select('*')
      .eq('team_id', teamId);
    if (!members || members.length === 0) return [];
    const userIds = members.map((m: any) => m.user_id);
    const { data: profiles } = await supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', userIds);
    const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));
    return members.map((m: any) => ({
      ...m,
      username: profileMap[m.user_id]?.username || 'Okänd',
      avatar_url: profileMap[m.user_id]?.avatar_url,
    }));
  };

  const leaveTeam = async (teamId: string) => {
    if (!user) return;
    await (supabase.from('team_members') as any).delete().eq('team_id', teamId).eq('user_id', user.id);
    toast.success('Du lämnade laget');
    fetchMyTeams();
  };

  return { myTeams, invitations, loading, createTeam, inviteMember, respondToInvitation, getTeamMembers, leaveTeam, refetch: fetchMyTeams };
}
