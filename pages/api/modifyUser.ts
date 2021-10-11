import { api } from '../../lib/api'
import * as yup from 'yup'
import { User } from '../../types/user'
import { Auth } from '../../types/auth'
import { NextApiRequest, NextApiResponse } from 'next'
import { hashSync } from 'bcrypt'
import { inject } from '../../lib/injector'
import createHttpError from 'http-errors'
import { hstr } from '../../lib/util'

export default api(
  {
    method: 'PUT',
    permissions: 0,
    transactional: true,
    schema: yup.object().shape({
      userId: yup.string().required().max(128),
      name: yup.string().required().max(128),
      pass: yup.string(),
      passConfirm: yup.string(),
      githubUserName: yup.string().max(128),
      secret: yup
        .string()
        .max(16)
        .transform((v) => v || ''),
      permissions: yup.number().transform((v) => (v ? 0x1 : 0x0))
    })
  },
  async (req: NextApiRequest, res: NextApiResponse, json: User & { passConfirm: string }, auth: Auth) => {
    const { db, mapper } = await inject()
    const user: User = await db.get(mapper.getStatement('db', 'findUser', { userId: json.userId }))
    if (!user) {
      throw new createHttpError.NotFound('not registered.')
    }
    if (json.githubUserName) {
      const git: User = await db.get(
        mapper.getStatement('db', 'findGithubUser', { githubUserName: json.githubUserName })
      )
      if (git && git.userId !== user.userId) {
        throw new createHttpError.Conflict('github user name already registered.')
      }
    }
    json.permissions = json.permissions === undefined ? null : json.permissions
    if (user.userId === auth.userId) {
      if (json.permissions != null && !json.permissions && auth.permissions) {
        throw new createHttpError.Forbidden('cannot deprive authority.')
      }
    } else if (!auth.permissions) {
      throw new createHttpError.Forbidden('have not permissions.')
    }
    if (json.pass && json.pass !== json.passConfirm) {
      throw new createHttpError.BadRequest('confirmation pass do not match.')
    }
    await db.exec(
      mapper.getStatement('db', 'modifyUser', {
        userId: user.userId,
        name: json.name,
        permissions: json.permissions,
        githubUserName: json.githubUserName,
        secret: hstr(json.secret),
        pass: json.pass ? hashSync(json.pass, 12) : null
      })
    )
    res.status(200).send(json.userId)
  }
)
