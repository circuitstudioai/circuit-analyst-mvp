import { NextRequest, NextResponse } from 'next/server'
import { requireBetaUser } from '@/lib/betaAuth'
import { serviceClient } from '@/lib/supabase'

function dayKey(value: string) {
  return value.slice(0, 10)
}

export async function GET(req: NextRequest) {
  const auth = await requireBetaUser(req)
  if (auth.response) return auth.response
  const supabase = serviceClient()
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 })

  const { data: profile } = await supabase.from('profiles').select('beta_role').eq('id', auth.user.id).maybeSingle()
  if (profile?.beta_role !== 'admin') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })

  const slug = req.nextUrl.searchParams.get('cohort') || 'beta-2026-09'
  const { data: cohort } = await supabase.from('beta_cohorts').select('*').eq('slug', slug).maybeSingle()
  if (!cohort) return NextResponse.json({ error: 'Cohort not found.' }, { status: 404 })

  const { data: members } = await supabase.from('beta_cohort_members')
    .select('user_id,invited_at,activated_at,cycle_completed_at,exit_feedback_completed_at,willingness_to_pay,loss_reaction,profiles(email,display_name)')
    .eq('cohort_id', cohort.id)
  const userIds = (members || []).map((member) => member.user_id)
  if (!userIds.length) return NextResponse.json({ cohort, summary: { invited: 0 }, testers: [] })

  const [{ data: events }, { data: ratings }] = await Promise.all([
    supabase.from('product_events').select('user_id,event_name,occurred_at,properties').in('user_id', userIds)
      .gte('occurred_at', `${cohort.starts_on}T00:00:00Z`).lte('occurred_at', `${cohort.ends_on}T23:59:59Z`),
    supabase.from('feedback_events').select('user_id,helpful,created_at').in('user_id', userIds)
      .gte('created_at', `${cohort.starts_on}T00:00:00Z`).lte('created_at', `${cohort.ends_on}T23:59:59Z`),
  ])

  const startMs = new Date(`${cohort.starts_on}T00:00:00Z`).getTime()
  const testers = (members || []).map((member) => {
    const userEvents = (events || []).filter((event) => event.user_id === member.user_id)
    const activeDays = [...new Set(userEvents.filter((event) => event.event_name === 'session_started').map((event) => dayKey(event.occurred_at)))]
    const weekOneDays = activeDays.filter((day) => new Date(`${day}T00:00:00Z`).getTime() < startMs + 7 * 86400000).length
    const weekTwoDays = activeDays.length - weekOneDays
    const userRatings = (ratings || []).filter((rating) => rating.user_id === member.user_id)
    return {
      ...member,
      activeDays: activeDays.length,
      weekOneDays,
      weekTwoDays,
      usedBothWeeks: weekOneDays > 0 && weekTwoDays > 0,
      decisionBriefsUsed: userEvents.filter((event) => event.event_name === 'decision_brief_used').length,
      ratings: userRatings.length,
      helpfulRatings: userRatings.filter((rating) => rating.helpful).length,
      feedbackMessages: userEvents
        .filter((event) => event.event_name === 'beta_feedback_sent' && event.properties?.source === 'persistent_feedback')
        .map((event) => ({ occurredAt: event.occurred_at, comment: event.properties?.comment })),
    }
  })
  const totalRatings = testers.reduce((sum, tester) => sum + tester.ratings, 0)
  const helpfulRatings = testers.reduce((sum, tester) => sum + tester.helpfulRatings, 0)

  return NextResponse.json({
    cohort,
    summary: {
      invited: testers.length,
      activated: testers.filter((tester) => tester.activated_at).length,
      completedCycle: testers.filter((tester) => tester.cycle_completed_at && tester.exit_feedback_completed_at).length,
      threeDayUsers: testers.filter((tester) => tester.weekOneDays >= 3 || tester.weekTwoDays >= 3).length,
      usedBothWeeks: testers.filter((tester) => tester.usedBothWeeks).length,
      helpfulRate: totalRatings ? helpfulRatings / totalRatings : null,
      veryDisappointed: testers.filter((tester) => tester.loss_reaction === 'very_disappointed').length,
      willingToPay: testers.filter((tester) => ['yes_10_20', 'yes_20_plus'].includes(tester.willingness_to_pay || '')).length,
    },
    testers,
  })
}
