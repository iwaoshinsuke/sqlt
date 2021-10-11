import express from 'express'
import next from 'next'
import { addRouters } from './routers'

;(async () => {
  try {
    const dev = process.env.NODE_ENV !== 'production'
    const app = next({ dev })
    const handle = app.getRequestHandler()
    const port = process.env.PORT || 3000
    await app.prepare()
    const server = express()
    addRouters(server)
    server.all('*', (req, res) => handle(req, res))
    server.listen(port, (err?: any) => {
      if (err) {
        throw err
      }
      console.log(`server start on port ${port} - env ${process.env.NODE_ENV}`)
    })
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
})()
