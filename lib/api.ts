import createHttpError, { HttpError } from 'http-errors'
import { NextApiRequest, NextApiResponse } from 'next'
import { ObjectSchema, ValidationError } from 'yup'
import { Auth } from '../types/auth'
import { getAuth } from './auth'
import { inject } from './injector'
import { transaction } from './transaction'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

type ApiOption = {
  method?: HttpMethod
  schema?: ObjectSchema<any>
  transactional?: boolean
  permissions?: number
  tokenUpdate?: boolean
}

export const getJson: <T>(req: NextApiRequest, schema?: ObjectSchema<any>) => Promise<T> = async (req, schema) => {
  const json = req.body ? (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) : {}
  for (let key in req.query) {
    json[key] = req.query[key]
  }
  return schema ? await schema.validate(json) : json
}

export const api = (
  opt: ApiOption | HttpMethod,
  callback: (req: NextApiRequest, res: NextApiResponse, json?: any, auth?: Auth) => Promise<any>
) => async (req: NextApiRequest, res: NextApiResponse) => {
  const sms = Date.now()
  const { logger } = await inject()
  logger.info(`BEGIN ${req.url}`)
  let method = 'GET'
  let schema: ObjectSchema<any> = null
  let transactional = false
  let permissions: number = null
  let tokenUpdate = false
  if (typeof opt !== 'string') {
    method = opt.method || method
    schema = opt.schema || schema
    transactional = opt.transactional || transactional
    permissions = opt.permissions != null ? opt.permissions : opt.tokenUpdate != null ? 0 : permissions
    tokenUpdate = opt.tokenUpdate != null ? opt.tokenUpdate : tokenUpdate
  }
  res.setHeader('Content-type', 'application/json')
  try {
    if (req.method !== method) {
      throw new createHttpError.MethodNotAllowed()
    }
    const auth = permissions != null ? await getAuth({ req, query: req.query }, permissions, tokenUpdate) : null
    if (transactional) {
      await transaction(async () => {
        await callback(req, res, await getJson(req, schema), auth)
      })
    } else {
      await callback(req, res, await getJson(req, schema), auth)
    }
    if (!res.writableEnded) {
      res.end()
    }
  } catch (err) {
    if (err instanceof HttpError) {
      if (err.status < 500) {
        logger.warn(err.status, err.name, err.message)
      } else {
        logger.error(err)
      }
      res.status(err.status).end(JSON.stringify({ status: err.status, message: err.message }))
    } else if (err instanceof ValidationError) {
      logger.warn(400, err.name, err.message)
      res.status(400).end(JSON.stringify({ status: 400, message: err.message }))
    } else {
      logger.error(err)
      res.status(500).end(JSON.stringify({ status: 500, message: 'system error occurred.' }))
    }
  }
  logger.info(`END ${res.statusCode} ${req.url} lap:${Date.now() - sms}ms`)
}
