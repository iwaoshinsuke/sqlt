import { NextApiResponse, NextApiRequest } from 'next'
import { inject } from '../../lib/injector'
import { User } from '../../types/user'
import { v4 as uuid } from 'uuid'
import { setCookie } from 'nookies'
import { compareSync } from 'bcrypt'
import { api } from '../../lib/api'
import createHttpError from 'http-errors'
import * as yup from 'yup'
import * as OTPAuth from 'otpauth'

export default api(
  {
    method: 'POST',
    transactional: true,
    schema: yup.object().shape({
      userId: yup.string().required(),
      pass: yup.string().required(),
      otp: yup.string()
    })
  },
  async (req: NextApiRequest, res: NextApiResponse, json: { userId: string; pass: string; otp: string }) => {
    const { db, mapper } = await inject()
    const user: User = await db.get(mapper.getStatement('db', 'findUser', { userId: json.userId }))
    const otp = new OTPAuth.TOTP({ secret: user?.secret || 'ASECRETKEY234567' })
    let isValidOtp = true
    if (user?.secret) {
      isValidOtp = otp.validate({ token: json.otp, window: 3 }) != null
    } else {
      otp.validate({ token: '012345', window: 3 })
    }
    if (user && isValidOtp && compareSync(json.pass, user.pass)) {
      const sessionId: string = uuid()
      const token: string = uuid()
      await db.exec(mapper.getStatement('db', 'addSession', { userId: user.userId, sessionId, token }))
      setCookie({ res }, 'sessionId', sessionId, { path: '/' })
      return res.end(JSON.stringify({ token }))
    }
    console.log(user, isValidOtp)
    throw new createHttpError.NotFound(json.userId)
  }
)
