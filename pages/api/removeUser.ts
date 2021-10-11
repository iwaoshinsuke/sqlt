import { NextApiRequest, NextApiResponse } from 'next'
import { api } from '../../lib/api'
import { Auth } from '../../types/auth'
import * as yup from 'yup'
import { inject } from '../../lib/injector'
import { User } from '../../types/user'
import createHttpError from 'http-errors'

export default api(
  {
    method: 'DELETE',
    transactional: true,
    permissions: 0x1,
    schema: yup.object().shape({
      userId: yup.string().required()
    })
  },
  async (req: NextApiRequest, res: NextApiResponse, json: { userId: string }, auth: Auth) => {
    const { db, mapper } = await inject()
    const user: User = await db.get(mapper.getStatement('db', 'findUser', { userId: json.userId }))
    if (!user) {
      throw new createHttpError.NotFound('user does not exist.')
    } else if (user.userId === auth.userId) {
      throw new createHttpError.Forbidden('cannot delete myself.')
    }
    await db.exec(mapper.getStatement('db', 'removeUser', { userId: json.userId }))
    res.status(204).end()
  }
)
