import { Express } from 'express'
import githubRouter from './github'

export const addRouters = (server: Express) => {
  server.use('/auth', githubRouter)
}
