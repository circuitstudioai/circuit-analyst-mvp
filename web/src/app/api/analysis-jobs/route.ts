import { after, NextRequest, NextResponse } from 'next/server'
import { requireBetaUser } from '@/lib/betaAuth'
import { analysisJobForUser, createAnalysisJob, updateAnalysisJob } from '@/lib/analysisJobs'
import { resolveQuestionCompanies } from '@/lib/companyResolution'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const auth = await requireBetaUser(req)
  if (auth.response) return auth.response
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const question = String(body.question || '').replace(/\s+/g, ' ').trim().slice(0, 500)
  if (!question) return NextResponse.json({ error: 'Ask a question to start research.' }, { status: 400 })

  let requestPayload: Record<string, unknown> = { ...body, question }
  const suppliedSymbols = Array.isArray(body.watchlist)
    ? body.watchlist.map((item) => String(item).trim().toUpperCase()).filter(Boolean).slice(0, 2)
    : []
  if (!suppliedSymbols.length && !body.resumeRunId) {
    const resolution = await resolveQuestionCompanies(question)
    if (resolution.status === 'ambiguous') {
      return NextResponse.json({
        error: `Which ${resolution.phrase} did you mean?`,
        resolution,
      }, { status: 409 })
    }
    if (resolution.status === 'not_found') {
      return NextResponse.json({
        error: 'I could not identify a supported public company. Add its ticker or full company name and try again.',
        resolution,
      }, { status: 422 })
    }
    requestPayload = { ...requestPayload, watchlist: resolution.symbols }
  } else if (suppliedSymbols.length) {
    requestPayload = { ...requestPayload, watchlist: suppliedSymbols }
  }

  const jobId = await createAnalysisJob(auth.user.id, requestPayload)
  const authorization = req.headers.get('authorization') || ''
  const analyzeUrl = new URL('/api/analyze', req.url)

  after(async () => {
    try {
      await updateAnalysisJob(jobId, auth.user.id, { status: 'running', currentStage: 'market_data' })
      const response = await fetch(analyzeUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization },
        body: JSON.stringify({ ...requestPayload, jobId }),
      })
      const result = await response.json()
      if (!response.ok) {
        await updateAnalysisJob(jobId, auth.user.id, {
          status: 'failed', currentStage: 'complete', error: result?.error || 'Analysis failed', result,
        })
        return
      }
      const status = result?.outcome?.status === 'completed' ? 'completed'
        : result?.outcome?.status === 'partial' ? 'partial' : 'failed'
      await updateAnalysisJob(jobId, auth.user.id, {
        status, currentStage: 'complete', runId: Number(result?.saved?.runId) || undefined,
        error: result?.outcome?.error || '', result,
      })
    } catch (error) {
      await updateAnalysisJob(jobId, auth.user.id, {
        status: 'failed', currentStage: 'complete',
        error: error instanceof Error ? error.message : 'Analysis failed',
      })
    }
  })

  return NextResponse.json({ jobId, status: 'queued', symbols: requestPayload.watchlist || [] }, { status: 202 })
}

export async function GET(req: NextRequest) {
  const auth = await requireBetaUser(req)
  if (auth.response) return auth.response
  const jobId = req.nextUrl.searchParams.get('id')
  if (!jobId) return NextResponse.json({ error: 'Job id is required.' }, { status: 400 })
  const job = await analysisJobForUser(auth.user.id, jobId)
  if (!job) return NextResponse.json({ error: 'Analysis job not found.' }, { status: 404 })
  return NextResponse.json({ job }, { headers: { 'cache-control': 'no-store' } })
}
