import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const notifications: { user_id: string; type: string; title: string; message: string; link?: string }[] = []

    // 1. Competition starting in ~1 hour
    const oneHourLater = new Date(now.getTime() + 65 * 60 * 1000) // 65 min window
    const fiftyMinLater = new Date(now.getTime() + 55 * 60 * 1000) // 55 min window
    
    const { data: upcomingComps } = await supabase
      .from('competitions')
      .select('id, name, start_time')
      .gte('start_time', fiftyMinLater.toISOString())
      .lte('start_time', oneHourLater.toISOString())

    if (upcomingComps && upcomingComps.length > 0) {
      for (const comp of upcomingComps) {
        const { data: members } = await supabase
          .from('competition_memberships')
          .select('user_id')
          .eq('competition_id', comp.id)

        for (const m of (members || [])) {
          notifications.push({
            user_id: m.user_id,
            type: 'competition',
            title: '⏰ Tävlingen startar snart!',
            message: `${comp.name} startar om ca 1 timme. Gör dig redo!`,
            link: '/tavlingar',
          })
        }
      }
    }

    // 2. Daily claim reminder (for users who haven't claimed today)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, last_claim_date, streak_count')

    for (const p of (profiles || [])) {
      if (p.last_claim_date !== today) {
        // Remind to claim
        notifications.push({
          user_id: p.user_id,
          type: 'diamond',
          title: '💎 Glöm inte dina dagliga diamanter!',
          message: 'Claima dina gratis diamanter idag.',
          link: '/profil',
        })

        // Streak warning if they have an active streak
        if (p.streak_count > 0) {
          notifications.push({
            user_id: p.user_id,
            type: 'streak',
            title: '🔥 Din hot streak är i fara!',
            message: `Du är på väg att förlora din streak på ${p.streak_count} dagar. Gå in i appen och claima diamanter nu!`,
            link: '/profil',
          })
        }
      }
    }

    // 3. Pending team invitations reminder
    const { data: pendingInvites } = await supabase
      .from('team_invitations')
      .select('invited_user_id, team_id')
      .eq('status', 'pending')

    if (pendingInvites && pendingInvites.length > 0) {
      const teamIds = [...new Set(pendingInvites.map(i => i.team_id))]
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name')
        .in('id', teamIds)
      const teamMap = Object.fromEntries((teams || []).map(t => [t.id, t.name]))

      for (const inv of pendingInvites) {
        notifications.push({
          user_id: inv.invited_user_id,
          type: 'team',
          title: '👥 Du har en laginbjudan!',
          message: `${teamMap[inv.team_id] || 'Ett lag'} har bjudit in dig. Svara på inbjudan!`,
          link: '/lag',
        })
      }
    }

    // Insert all notifications
    if (notifications.length > 0) {
      const { error } = await supabase
        .from('notifications')
        .insert(notifications)

      if (error) {
        console.error('Failed to insert notifications:', error)
        return new Response(JSON.stringify({ error: 'Kunde inte skapa notiser' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    console.log(`Created ${notifications.length} notifications`)

    return new Response(JSON.stringify({ success: true, count: notifications.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Serverfel' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
