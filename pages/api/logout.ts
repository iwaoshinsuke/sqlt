import { NextApiRequest, NextApiResponse } from 'next'
import { api } from '../../lib/api'
import { Auth } from '../../types/auth'
import { inject } from '../../lib/injector'
import { destroyCookie } from 'nookies'

export default api(
  { method: 'DELETE', permissions: 0, transactional: true },
  async (req: NextApiRequest, res: NextApiResponse, json: any, auth: Auth) => {
    const { db, mapper } = await inject()
    await db.exec(mapper.getStatement('db', 'removeSession', { userId: auth.userId }))
    destroyCookie({ res }, 'sessionId', { path: '/' })
    res.status(204)
  }
)
