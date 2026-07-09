export const API_BASE = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8001'

export async function checkBackend() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 4000)
  try {
    const res = await fetch(`${API_BASE}/api/health`, { signal: controller.signal })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export async function uploadAndSeparate(file) {
  const form = new FormData()
  form.append('file', file)

  let res
  try {
    res = await fetch(`${API_BASE}/api/separate`, {
      method: 'POST',
      body: form,
    })
  } catch {
    throw new Error(`Cannot reach the stem separation server at ${API_BASE}. Run the backend and make sure CORS is enabled.`)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const detail = body.detail
    const message = Array.isArray(detail) ? detail.map((d) => d.msg || d).join(', ') : detail || `Upload failed (${res.status})`
    throw new Error(message)
  }

  return res.json()
}

export async function separateFromSoundCloud(url) {
  let res
  try {
    res = await fetch(`${API_BASE}/api/separate-soundcloud`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
  } catch {
    throw new Error(`Cannot reach the stem separation server at ${API_BASE}.`)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const detail = body.detail
    let message = Array.isArray(detail) ? detail.map((d) => d.msg || d).join(', ') : detail || `SoundCloud request failed (${res.status})`
    if (res.status === 404 && detail === 'Not Found') {
      message = 'SoundCloud endpoint is unavailable. Stop the app and run npm start again.'
    }
    throw new Error(message)
  }

  return res.json()
}

export async function getJob(jobId) {
  let res
  try {
    res = await fetch(`${API_BASE}/api/jobs/${jobId}`)
  } catch {
    throw new Error('Lost connection to the stem separation server.')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Job lookup failed (${res.status})`)
  }

  return res.json()
}

export function stemUrl(stems, name) {
  const path = stems?.[name]
  if (!path) throw new Error(`Missing stem URL for ${name}`)
  return path.startsWith('http') ? path : `${API_BASE}${path}`
}

export function waitForJob(jobId, { intervalMs = 1500, onProgress, timeoutMs = 30 * 60 * 1000 } = {}) {
  const started = Date.now()

  return new Promise((resolve, reject) => {
    const poll = async () => {
      if (Date.now() - started > timeoutMs) {
        reject(new Error('Stem separation timed out. Try a shorter clip or check the server logs.'))
        return
      }

      try {
        const job = await getJob(jobId)
        onProgress?.(job)

        if (job.status === 'done') {
          resolve(job)
          return
        }

        if (job.status === 'error') {
          reject(new Error(job.error || 'Stem separation failed'))
          return
        }

        setTimeout(poll, intervalMs)
      } catch (err) {
        reject(err)
      }
    }

    poll()
  })
}