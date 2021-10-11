import { NextApiRequest, NextApiResponse } from 'next'
import { api } from '../../lib/api'
import { inject } from '../../lib/injector'
import * as yup from 'yup'
import { Auth } from '../../types/auth'
import { User } from '../../types/user'
import createHttpError from 'http-errors'
import { hashSync } from 'bcrypt'

export default api(
  {
    method: 'POST',
    permissions: 0x1,
    transactional: true,
    schema: yup.object().shape({
      userId: yup
        .string()
        .required()
        .matches(/^[a-zA-Z0-9][-a-zA-Z0-9_@.]{0,127}$/),
      name: yup.string().required().max(128),
      pass: yup
        .string()
        .required()
        .transform((v) => (v != null && v.length <= 128 ? hashSync(v, 12) : null)),
      githubUserName: yup.string().max(128),
      secret: yup
        .string()
        .max(16)
        .transform((v) => v || ''),
      permissions: yup.number().transform((v) => (v ? 0x1 : 0x0))
    })
  },
  async (req: NextApiRequest, res: NextApiResponse, json: User, auth: Auth) => {
    const { db, mapper } = await inject()
    const user: User = await db.get(mapper.getStatement('db', 'findUser', { userId: json.userId }))
    if (user) {
      throw new createHttpError.Conflict('already registered.')
    }
    if (json.githubUserName) {
      const git: User = await db.get(
        mapper.getStatement('db', 'findGithubUser', { githubUserName: json.githubUserName })
      )
      if (git) {
        throw new createHttpError.Conflict('github user name already registered.')
      }
    }
    await db.exec(mapper.getStatement('db', 'addUser', { ...json }))
    res.status(201).end(json.userId)
  }
)
