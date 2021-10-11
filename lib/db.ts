import sqlite3 from 'sqlite3'

class DBError extends Error {
    sql?:string
    method?:string
    params?:any[]
    cause?:any
}

function dbError(err:DBError, method:string, sql?:string, params?:any[], stack?:any){
    const drr = new DBError()
    drr.message = err.message
    drr.stack = stack
    drr.method = method
    drr.sql = sql
    drr.params = params
    drr.cause = err
    return drr
}

function getStack(){
    try {
        throw new Error()
    } catch (ignore) {
        return ignore.stack
    }
}


export class Statement<T> {
    constructor(private statement:sqlite3.Statement | undefined, private sql:string){
    }

    get<T>(params:any[] = []):Promise<T> {
        const stack = getStack()
        return new Promise((resolve, reject) => {
            this.statement?.get(params, (err:Error | null, row:T) => {
                if (err) {
                    reject(dbError(err, 'Statement#get', this.sql, params, stack))
                } else {
                    resolve(row)
                }
            })
        })
    }

    all<T>(params:any[] = []):Promise<T[]> {
        const stack = getStack()
        return new Promise((resolve, reject) => {
            this.statement?.all(params, (err:Error | null, rows:T[]) => {
                if (err) {
                    reject(dbError(err, 'Statement#all', this.sql, params, stack))
                } else {
                    resolve(rows)
                }
            })
        })
    }

    run(params:any[] = []):Promise<sqlite3.RunResult> {
        const stack = getStack()
        return new Promise((resolve, reject) => {
            const sql = this.sql
            this.statement?.run(params, function(this:sqlite3.RunResult, err:Error | null){
                if (err) {
                    reject(dbError(err, 'Statement#run', sql, params, stack))
                } else {
                    resolve(this)
                }
            })
        })
    }

    each<T>(callback:{(row:T, result:sqlite3.RunResult):void}):Promise<Error|number>

    each<T>(params:any[], callback:{(row:T, result:sqlite3.RunResult):void}):Promise<Error|number>

    each<T>(params:any, callback?:any):Promise<Error|number> {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        const stack = getStack()
        return new Promise((resolve, reject) => {
            this.statement?.each(params, function(this:sqlite3.RunResult, err:Error, row:T){
                callback(row, this)
            }, (err:Error | null, count:number) => {
                if (err) {
                    reject(dbError(err, 'Statement#each', this.sql, params, stack))
                } else {
                    resolve(count)
                }
            })
        })
    }
}

export class DB {
    database:sqlite3.Database | undefined

    connect(path:string, mode:number = sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE):Promise<DB> {
        const stack = getStack()
        return new Promise((resolve, reject) => {
            this.database = new sqlite3.Database(path, mode, (err) => {
                if (err) {
                    reject(dbError(err, 'DB#connect', undefined, undefined, stack))
                } else {
                    resolve(this)
                }
            })
        })
    }

    private transactional = false

    begin(timeoutMs = 10000, waitMs = 16):Promise<Error|null>{
        const stack = getStack()
        return new Promise((resolve, reject) => {
            const sms = Date.now()
            const doBegin = () => {
                if (this.transactional) {
                    if (Date.now() - sms < timeoutMs) {
                        setTimeout(doBegin, waitMs)
                    } else {
                        reject(dbError(new Error(`transaction begining timeouted on ${timeoutMs}ms.`), 'DB#begin', 'BEGIN', undefined, stack))
                    }
                } else {
                    this.transactional = true
                    this.database?.exec('BEGIN', (err:Error | null) => {
                        if (err) {
                            this.transactional = false
                            reject(dbError(err, 'DB#begin', 'BEGIN', undefined, stack))
                        } else {
                            resolve(null)
                        }
                    })
                }
            }
            doBegin()
        })
    }

    rollback():Promise<Error|null> {
        const stack = getStack()
        return new Promise((resolve, reject) => {
            if (this.transactional) {
                this.database?.exec('ROLLBACK', (err:Error | null) => {
                    this.transactional = false
                    if (err) {
                        reject(dbError(err, 'DB#rollback', 'ROLLBACK', undefined, stack))
                    } else {
                        resolve(null)
                    }
                })
            } else {
                resolve(null)
            }
        })
    }

    commit():Promise<Error|null> {
        const stack = getStack()
        return new Promise((resolve, reject) => {
            if (this.transactional) {
                this.database?.exec('COMMIT', (err:Error | null) => {
                    this.transactional = false
                    if (err) {
                        reject(dbError(err, 'DB#commit', 'COMMIT', undefined, stack))
                    } else {
                        resolve(null)
                    }
                })
            } else {
                resolve(null)
            }
        })
    }

    prepare<T>(sql:string):Promise<Statement<T>> {
        const stack = getStack()
        return new Promise((resolve, reject) => {
            this.database?.prepare(sql, function(this:sqlite3.Statement, err:Error){
                if (err) {
                    reject(dbError(err, 'DB#prepare', sql, undefined, stack))
                } else {
                    resolve(new Statement<T>(this, sql))
                }
            })
        })
    }

    get<T>(sql:string, params?:any[]):Promise<T> {
        const stack = getStack()
        return new Promise((resolve, reject) => {
            this.database?.get(sql, params, (err, row) => {
                if (err) {
                    reject(dbError(err, 'DB#get', sql, params, stack))
                } else {
                    resolve(row)
                }
            })
        })
    }

    all<T>(sql:string, params?:any[]):Promise<T[]> {
        const stack = getStack()
        return new Promise((resolve, reject) => {
            this.database?.all(sql, params, (err:Error | null, rows:T[]) => {
                if (err) {
                    reject(dbError(err, 'DB#all', sql, params, stack))
                } else {
                    resolve(rows)
                }
            })
        })
    }

    run(sql:string, params?:any[]):Promise<sqlite3.RunResult> {
        const stack = getStack()
        return new Promise((resolve, reject) => {
            this.database?.run(sql, params, function(this:sqlite3.RunResult, err:Error) {
                if (err) {
                    reject(dbError(err, 'DB#run', sql, params, stack))
                } else {
                    resolve(this)
                }
            })
        })
    }

    exec(sql:string):Promise<Error|null> {
        const stack = getStack()
        return new Promise((resolve, reject) => {
            this.database?.exec(sql, (err:Error | null) => {
                if (err) {
                    reject(dbError(err, 'DB#exec', sql, undefined, stack))
                } else {
                    resolve(null)
                }
            })
        })
    }

    each<T>(sql:string, callback:{(row:T, result:sqlite3.Statement):void}):Promise<Error|number>

    each<T>(sql:string, params:any[], callback:{(row:T, result:sqlite3.Statement):void}):Promise<Error|number>

    each<T>(sql:string, params:any, callback?:any):Promise<Error|number> {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        const stack = getStack()
        return new Promise((resolve, reject) => {
            this.database?.each(sql, params, function(this:sqlite3.Statement, err:Error, row:T){
                callback(row, this)
            }, (err:Error | null, count:number) => {
                if (err) {
                    reject(dbError(err, 'DB#each', sql, params, stack))
                } else {
                    resolve(count)
                }
            })
        })
    }

    close():Promise<Error|null> {
        const stack = getStack()
        return new Promise((resolve, reject) => {
            this.database?.close((err) => {
                if (err) {
                    reject(dbError(err, 'DB#close', undefined, undefined, stack))
                } else {
                    resolve(null)
                }
            })
        })
    }
}
