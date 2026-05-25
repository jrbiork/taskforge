import type { NextApiRequest, NextApiResponse } from 'next'
import { getAllSprints, createSprint, type Sprint } from '../../../lib/sprint-db'
import { validateCreateSprint } from '../../../lib/sprint-validation'

type GetResponse = { sprints: Sprint[] }
type PostResponse = { sprint: Sprint }
type ErrorResponse = { error: string; details?: string[] }

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetResponse | PostResponse | ErrorResponse>
) {
  if (req.method === 'GET') {
    return handleGet(res)
  } else if (req.method === 'POST') {
    return handlePost(req, res)
  } else {
    res.status(405).end()
  }
}

function handleGet(res: NextApiResponse<GetResponse | ErrorResponse>) {
  try {
    const sprints = getAllSprints()
    res.status(200).json({ sprints })
  } catch {
    res.status(500).json({ error: 'Failed to retrieve sprints' })
  }
}

function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<PostResponse | ErrorResponse>
) {
  const validation = validateCreateSprint(req.body)
  if (!validation.valid) {
    return res.status(400).json({ error: 'Validation failed', details: validation.errors })
  }

  try {
    const { name, startDate, endDate, goal } = req.body as {
      name: string
      startDate: string
      endDate: string
      goal?: string
    }
    const sprint = createSprint({ name, startDate, endDate, goal })
    res.status(201).json({ sprint })
  } catch {
    res.status(500).json({ error: 'Failed to create sprint' })
  }
}
