import { GetServerSideProps } from 'next'
import { inject } from '../lib/injector'
import { getAuthProps } from '../lib/auth'
import { Header } from '../components/header'
import { User } from '../types/user'
import { ALink } from '../components/alink'
import { VFC } from 'react'
import { Button } from 'react-bootstrap'
import { Auth } from '../types/auth'

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: await getAuthProps(context, null, async (auth) => {
      const { db, mapper } = await inject()
      const users: User[] = await db.all(mapper.getStatement('db', 'listUsers'))
      return { auth, users }
    })
  }
}

const IndexPage: VFC<{ auth: Auth; users: User[] }> = ({ auth, users }) => {
  return (
    <>
      <Header title="index"></Header>hellow, {auth?.userId}.
      <ul>
        {users.map((v) => (
          <li key={v.userId}>
            <ALink href="/users/[userId]" as={`/users/${v.userId}`}>
              {v.name}
            </ALink>
          </li>
        ))}
      </ul>
      {auth?.permissions ? (
        <ALink href="/addUser">
          <Button>add</Button>
        </ALink>
      ) : (
        ''
      )}
    </>
  )
}
export default IndexPage
