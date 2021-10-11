import Config from 'config'
import * as path from 'path'

import { Strategy } from 'passport-github2'
import passport from 'passport'
import { VerifyCallback } from 'passport-oauth2'
import { Router } from 'express'
import session from 'express-session'
import { inject } from '../lib/injector'
import { User } from '../types/user'

import { v4 as uuid } from 'uuid'
import { setCookie } from 'nookies'
import { Logger } from 'log4js'

const config = Config.util.loadFileConfigs(path.join(process.cwd(), 'config'))

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((id, done) => {
  done(null, { u: id })
})

passport.use(
  new Strategy(
    {
      clientID: config.github.clientId,
      clientSecret: config.github.clientSecret,
      callbackURL: config.github.callbackUrl
    },
    (accessToken: string, refreshToken: string, profile: any, verified: VerifyCallback) => {
      verified(null, { username: profile.username })
    }
  )
)

const router = Router()

const ses = session({ secret: 'Qjf8JGC0Nb99n9sJE00FyCCdRCabjg6T', resave: false, saveUninitialized: false })
router
  .get(
    '/github_login',
    ses,
    passport.initialize(),
    passport.session(),
    (req, res, next) => {
      req.session['github_login'] = Date.now()
      next()
    },
    passport.authenticate('github', { scope: ['user:email'] })
  )
  .get(
    '/github_callback',
    ses,
    passport.initialize(),
    passport.session(),
    (req, res, next) => {
      if (req.session['github_login']) {
        delete req.session['github_login']
        next()
      } else {
        res.status(400)
        next('bad request.')
      }
    },
    passport.authenticate('github', { failureRedirect: '/?failed=error' }),
    async (req, res, next) => {
      let ologger: Logger
      const sms = Date.now()
      try {
        const { db, mapper, logger } = await inject()
        ologger = logger
        ologger.info(`BEGIN_OAUTH ${req.url}`)
        const user: User = await db.get(
          mapper.getStatement('db', 'findGithubUser', { githubUserName: req.session['passport']?.user?.username })
        )
        if (!user) {
          res.redirect('/?failed=auth')
          next()
          return
        }
        const sessionId: string = uuid()
        const token: string = uuid()
        await db.exec(mapper.getStatement('db', 'addSession', { userId: user.userId, sessionId, token }))
        setCookie({ res }, 'sessionId', sessionId, { path: '/' })
        res.redirect(`/?token=${token}`)
        next()
      } catch (err) {
        if (ologger) {
          ologger.error(err)
        }
        next('system error occurred.')
      }
      if (ologger) {
        ologger.info(`END_OAUTH ${req.url} lap:${Date.now() - sms}ms`)
      }
    }
  )

export default router
