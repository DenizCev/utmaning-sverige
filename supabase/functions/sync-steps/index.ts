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

    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Ej autentiserad' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Ogiltig token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { steps, date } = await req.json()

    if (typeof steps !== 'number' || steps < 0) {
      return new Response(JSON.stringify({ error: 'Ogiltigt stegantal' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const targetDate = date || new Date().toISOString().split('T')[0]

    console.log(`Syncing ${steps} steps for user ${user.id} on ${targetDate}`)

    // Upsert: update if exists, insert if not
    const { data: existing } = await supabase
      .from('step_entries')
      .select('id, step_count')
      .eq('user_id', user.id)
      .eq('date', targetDate)
      .maybeSingle()

    let result
    if (existing) {
      // Only update if the new count is higher (health data is cumulative)
      if (steps > existing.step_count) {
        result = await supabase
          .from('step_entries')
          .update({ step_count: steps, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single()
      } else {
        result = { data: existing, error: null }
      }
    } else {
      result = await supabase
        .from('step_entries')
        .insert({ user_id: user.id, step_count: steps, date: targetDate })
        .select()
        .single()
    }

    if (result.error) {
      console.error('DB error:', result.error)
      return new Response(JSON.stringify({ error: 'Kunde inte spara steg' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, data: result.data }), {
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
