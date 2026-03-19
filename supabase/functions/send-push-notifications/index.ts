import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const cronSecret = Deno.env.get('CRON_SECRET')!

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const BATCH_SIZE = 100

interface ExpoPushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: string
  channelId?: string
  priority?: 'default' | 'normal' | 'high'
}

interface ExpoPushTicket {
  id?: string
  status: 'ok' | 'error'
  message?: string
  details?: { error?: string }
}

serve(async (req) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Authenticate via cron secret (server-to-server, no user JWT)
  const secret = req.headers.get('x-cron-secret')
  if (secret !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 1. Get all active push tokens
    const { data: tokenRows, error: tokenError } = await adminClient
      .from('push_tokens')
      .select('token, user_id')
      .eq('is_active', true)

    if (tokenError) {
      console.error('Error fetching tokens:', tokenError)
      return new Response(JSON.stringify({ error: 'Failed to fetch tokens' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!tokenRows || tokenRows.length === 0) {
      return new Response(JSON.stringify({ message: 'No active tokens', sent: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Group tokens by user_id
    const tokensByUser = new Map<string, string[]>()
    for (const row of tokenRows) {
      const existing = tokensByUser.get(row.user_id)
      if (existing) {
        existing.push(row.token)
      } else {
        tokensByUser.set(row.user_id, [row.token])
      }
    }

    // 2. Get notification preferences for these users
    const userIds = Array.from(tokensByUser.keys())
    const { data: prefsRows } = await adminClient
      .from('notification_preferences')
      .select('user_id, enabled, daily_reminder, days_before_expiration, re_engagement_enabled, weekly_recap_enabled, timezone')
      .in('user_id', userIds)
      .eq('enabled', true)

    const prefsMap = new Map<string, any>()
    for (const pref of (prefsRows || [])) {
      prefsMap.set(pref.user_id, pref)
    }

    // Merge: only keep users who have both tokens AND enabled preferences
    const userTokens = new Map<string, { tokens: string[]; prefs: any }>()
    for (const [userId, tokens] of tokensByUser) {
      const prefs = prefsMap.get(userId)
      if (prefs) {
        userTokens.set(userId, { tokens, prefs })
      }
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const allMessages: ExpoPushMessage[] = []
    const allLogEntries: Array<{ user_id: string; notification_type: string; payload: any }> = []

    for (const [userId, { tokens, prefs }] of userTokens) {
      // Check notification_log to avoid duplicates today
      const { data: todayLogs } = await adminClient
        .from('notification_log')
        .select('notification_type')
        .eq('user_id', userId)
        .gte('sent_at', todayStart)

      const sentTypes = new Set((todayLogs || []).map((l: any) => l.notification_type))

      // 2. Query expiring food items for this user
      const maxDays = prefs.days_before_expiration || 3
      const futureDate = new Date(now)
      futureDate.setDate(futureDate.getDate() + maxDays)

      const { data: foodItems } = await adminClient
        .from('food_items')
        .select('name, expiration_date, list_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .eq('is_deleted', false)
        .lte('expiration_date', futureDate.toISOString().split('T')[0])
        .gte('expiration_date', todayStart.split('T')[0])

      // Categorize items by urgency
      const todayStr = now.toISOString().split('T')[0]
      const tomorrowDate = new Date(now)
      tomorrowDate.setDate(tomorrowDate.getDate() + 1)
      const tomorrowStr = tomorrowDate.toISOString().split('T')[0]

      const expiringToday = (foodItems || []).filter(
        (item: any) => item.expiration_date === todayStr
      )
      const expiringTomorrow = (foodItems || []).filter(
        (item: any) => item.expiration_date === tomorrowStr
      )
      const expiringLater = (foodItems || []).filter(
        (item: any) => item.expiration_date > tomorrowStr
      )

      // 3a. Urgent individual notifications (today/tomorrow) — max 3 per user
      if (!sentTypes.has('expiration_urgent')) {
        const urgentItems = [...expiringToday, ...expiringTomorrow].slice(0, 3)
        for (const item of urgentItems) {
          const isToday = item.expiration_date === todayStr
          const title = isToday
            ? `⚠️ ${item.name} expire aujourd'hui !`
            : `⏰ ${item.name} expire demain !`
          const body = isToday
            ? `Cuisine-le ce soir pour ne pas le gaspiller`
            : `Pense à le cuisiner rapidement`

          for (const token of tokens) {
            allMessages.push({
              to: token,
              title,
              body,
              sound: 'default',
              channelId: 'expiration',
              priority: 'high',
              data: { type: 'expiration_urgent', foodName: item.name },
            })
          }
        }

        if (urgentItems.length > 0) {
          allLogEntries.push({
            user_id: userId,
            notification_type: 'expiration_urgent',
            payload: { count: urgentItems.length, items: urgentItems.map((i: any) => i.name) },
          })
        }
      }

      // 3b. Weekly summary (2-7 days) — 1 notification if no urgent items sent
      const totalExpiringSoon = expiringToday.length + expiringTomorrow.length + expiringLater.length
      if (
        !sentTypes.has('daily_summary') &&
        prefs.daily_reminder &&
        totalExpiringSoon > 0 &&
        expiringToday.length === 0 &&
        expiringTomorrow.length === 0
      ) {
        const title = '🥗 Rappel ZeroGaspy'
        const body =
          totalExpiringSoon === 1
            ? `1 aliment expire cette semaine`
            : `${totalExpiringSoon} aliments expirent cette semaine`

        for (const token of tokens) {
          allMessages.push({
            to: token,
            title,
            body,
            sound: 'default',
            channelId: 'daily',
            priority: 'default',
            data: { type: 'daily_summary', count: totalExpiringSoon },
          })
        }

        allLogEntries.push({
          user_id: userId,
          notification_type: 'daily_summary',
          payload: { count: totalExpiringSoon },
        })
      }

      // 3c. Re-engagement notification
      if (!sentTypes.has('re_engagement') && prefs.re_engagement_enabled) {
        const { data: profile } = await adminClient
          .from('profiles')
          .select('last_opened_at')
          .eq('id', userId)
          .single()

        if (profile?.last_opened_at) {
          const lastOpened = new Date(profile.last_opened_at)
          const daysSinceOpen = Math.floor(
            (now.getTime() - lastOpened.getTime()) / (1000 * 60 * 60 * 24)
          )

          if (daysSinceOpen >= 3) {
            for (const token of tokens) {
              allMessages.push({
                to: token,
                title: '👋 Tu nous manques !',
                body: `Tu n'as pas ouvert ZeroGaspy depuis ${daysSinceOpen} jours. Vérifie tes aliments !`,
                sound: 'default',
                channelId: 'daily',
                priority: 'default',
                data: { type: 're_engagement', daysSinceOpen },
              })
            }

            allLogEntries.push({
              user_id: userId,
              notification_type: 're_engagement',
              payload: { daysSinceOpen },
            })
          }
        }
      }
    }

    // 3d. Weekly recap — only on Sundays
    const isSunday = now.getDay() === 0
    if (isSunday) {
      const sevenDaysAgo = new Date(now)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

      for (const [userId, { tokens, prefs }] of userTokens) {
        if (prefs.weekly_recap_enabled === false) continue

        const sentTypes = new Set<string>()
        const { data: todayLogs } = await adminClient
          .from('notification_log')
          .select('notification_type')
          .eq('user_id', userId)
          .gte('sent_at', todayStart)
        for (const l of (todayLogs || [])) sentTypes.add(l.notification_type)

        if (sentTypes.has('weekly_recap')) continue

        const { data: weekItems } = await adminClient
          .from('food_items')
          .select('status, price')
          .eq('user_id', userId)
          .eq('is_deleted', false)
          .in('status', ['consumed', 'thrown'])
          .gte('updated_at', sevenDaysAgoStr)

        const itemsSaved = (weekItems || []).filter((i: any) => i.status === 'consumed').length
        const itemsThrown = (weekItems || []).filter((i: any) => i.status === 'thrown').length
        const eurosSaved = (weekItems || [])
          .filter((i: any) => i.status === 'consumed' && i.price)
          .reduce((sum: number, i: any) => sum + (parseFloat(i.price) || 0), 0)
        const eurosSavedStr = eurosSaved.toFixed(2)

        if (itemsSaved === 0 && itemsThrown === 0) continue

        const title = '📊 Ton récap hebdo est prêt !'
        const body = `${itemsSaved} aliment${itemsSaved > 1 ? 's' : ''} sauvé${itemsSaved > 1 ? 's' : ''}, ${eurosSavedStr}€ économisés cette semaine`

        for (const token of tokens) {
          allMessages.push({
            to: token,
            title,
            body,
            sound: 'default',
            channelId: 'daily',
            priority: 'default',
            data: { type: 'weekly_recap', itemsSaved, itemsThrown, eurosSaved: eurosSavedStr },
          })
        }

        allLogEntries.push({
          user_id: userId,
          notification_type: 'weekly_recap',
          payload: { itemsSaved, itemsThrown, eurosSaved: eurosSavedStr },
        })
      }
    }

    // 4. Send messages to Expo Push API in batches
    let totalSent = 0
    const invalidTokens: string[] = []

    for (let i = 0; i < allMessages.length; i += BATCH_SIZE) {
      const batch = allMessages.slice(i, i + BATCH_SIZE)

      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      })

      const result = await response.json()
      const tickets: ExpoPushTicket[] = result.data || []

      for (let j = 0; j < tickets.length; j++) {
        const ticket = tickets[j]
        if (ticket.status === 'ok') {
          totalSent++
        } else if (ticket.details?.error === 'DeviceNotRegistered') {
          invalidTokens.push(batch[j].to)
        } else {
          console.warn('Push ticket error:', ticket.message, ticket.details)
        }
      }
    }

    // 5. Log sent notifications
    if (allLogEntries.length > 0) {
      const { error: logError } = await adminClient
        .from('notification_log')
        .insert(allLogEntries)

      if (logError) {
        console.warn('Error inserting notification logs:', logError)
      }
    }

    // 6. Deactivate invalid tokens
    if (invalidTokens.length > 0) {
      const { error: deactivateError } = await adminClient
        .from('push_tokens')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('token', invalidTokens)

      if (deactivateError) {
        console.warn('Error deactivating tokens:', deactivateError)
      } else {
        console.log(`Deactivated ${invalidTokens.length} invalid tokens`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: totalSent,
        users: userTokens.size,
        invalidTokensRemoved: invalidTokens.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
