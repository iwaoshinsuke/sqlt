import { inject } from './injector'

export const transaction = (callback: () => Promise<any>): Promise<Error | null> => {
  return new Promise(async (resolve, reject) => {
    const { db, logger } = await inject()
    try {
      await db.begin()
      const ret = await callback()
      await db.commit()
      resolve(ret)
    } catch (err) {
      try {
        await db.rollback()
      } catch (frr) {
        logger.error(frr)
      }
      reject(err)
    }
  })
}
