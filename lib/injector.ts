import Config from 'config'
import * as path from 'path'
import fs from 'fs'
import * as Log4js from 'log4js'
import { DB } from './db'
import MyBatisMapper from 'mybatis-mapper'

class Depends {
  config: any
  logger: Log4js.Logger
  db: DB
  mapper = MyBatisMapper
}
let depends: Depends

export async function inject(): Promise<Depends> {
  if (depends) {
    return depends
  }
  depends = new Depends()

  const dir = process.cwd()

  const config = (depends.config = Config.util.loadFileConfigs(path.join(dir, 'config')))

  const logger = (depends.logger = Log4js.configure(config.log4js as Log4js.Configuration).getLogger('default'))

  const db = (depends.db = await new DB().connect(path.join(dir, 'db', config.db.name)))

  const mapperDir = path.join(dir, 'mapper')
  depends.mapper.createMapper(
    (await fs.promises.readdir(mapperDir)).filter((v) => v.endsWith('.xml')).map((v) => path.join(mapperDir, v))
  )
  const mapper = depends.mapper

  if (config.mapper?.init?.sql) {
    let ignoreInit = false
    if (config.mapper.ignoreInit?.sql) {
      ignoreInit = await db.get(
        mapper.getStatement(
          config.mapper.ignoreInit.namespace,
          config.mapper.ignoreInit.sql,
          config.mapper.ignoreInit.param,
          config.mapper.ignoreInit.format
        )
      )
    }
    if (!ignoreInit) {
      await db.exec(
        mapper.getStatement(
          config.mapper.init.namespace,
          config.mapper.init.sql,
          config.mapper.init.param,
          config.mapper.init.format
        )
      )
    }
  }

  logger.info('initialized')

  return depends
}
