import { inject } from '../lib/injector'
import { v4 as uuid } from 'uuid'
import { parseCookies } from 'nookies'
import { ParsedUrlQuery } from 'querystring'
import { IncomingHttpHeaders } from 'http'
import { hstr } from '../lib/util'
import { Auth } from '../types/auth'
import { User } from '../types/user'
import createHttpError from 'http-errors'
import { transaction } from './transaction'
import { NextApiRequestCookies } from 'next/dist/server/api-utils'
import { NextApiRequest } from 'next'

const authenticate = async (
  context: { req: { cookies: NextApiRequestCookies; headers: IncomingHttpHeaders }; query: ParsedUrlQuery },
  tokenUpdate = false
): Promise<Auth | null> => {
  const { db, mapper } = await inject()
  let token = hstr(context.query.token) || hstr(context.req.headers.token)
  const ses = await db.get<{ userId: string }>(
    mapper.getStatement('db', 'findSession', {
      sessionId: hstr(parseCookies({ req: context.req as NextApiRequest }).sessionId),
      token: token
    })
  )
  const res = ses ? await db.get<User>(mapper.getStatement('db', 'findUser', { userId: ses.userId })) : null
  if (res) {
    token = tokenUpdate ? uuid() : token
    transaction(async () => {
      await db.exec(mapper.getStatement('db', 'modifySession', { userId: res.userId, token }))
    })
    return { userId: res.userId, permissions: res.permissions, token }
  } else {
    return null
  }
}

export const getAuth = async (
  context: { req: { cookies: NextApiRequestCookies; headers: IncomingHttpHeaders }; query: ParsedUrlQuery },
  permissions = 0,
  tokenUpdate = false
): Promise<Auth> => {
  const auth = await authenticate(context, tokenUpdate)
  if (auth) {
    if (permissions && !(auth.permissions & permissions)) {
      throw new createHttpError.Forbidden()
    }
    return auth
  } else {
    throw new createHttpError.Unauthorized()
  }
}

export const getAuthProps = async (
  context: {
    req: { url?: string; cookies: NextApiRequestCookies; headers: IncomingHttpHeaders }
    query: ParsedUrlQuery
  },
  permissions = 0,
  callback?: (auth: Auth) => Promise<{ auth: Auth }>
): Promise<{ auth: Auth }> => {
  const { logger } = await inject()
  const sms = Date.now()
  try {
    logger.info(`BEGIN_AUTH ${context.req.url}`)
    const auth = await authenticate(context, true)
    if (auth) {
      if (permissions && !(auth.permissions & permissions)) {
        return { auth: { error: 'have not permissions.' } }
      }
      return callback ? await callback(auth) : { auth }
    } else {
      return { auth: { error: 'authentication failed.' } }
    }
  } catch (err) {
    return { auth: { error: 'system error occurred.' } }
  } finally {
    logger.info(`END_AUTH ${context.req.url} lap:${Date.now() - sms}ms`)
  }
}
