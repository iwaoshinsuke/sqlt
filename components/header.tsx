import axios from 'axios'
import { useRouter } from 'next/dist/client/router'
import Head from 'next/head'
import React, { VFC } from 'react'
import { Button } from 'react-bootstrap'
import { useRecoilValue } from 'recoil'
import { authAtom } from '../lib/atom'
import { ALink } from './alink'

export const Header: VFC<{ title: string }> = ({ title }) => {
  const auth = useRecoilValue(authAtom)
  const router = useRouter()
  const onLogout = async (evt: React.MouseEvent<HTMLAnchorElement>) => {
    if (!window.confirm('logout it, are you sure?')) {
      evt.preventDefault()
      return
    }
    try {
      await axios.delete('/api/logout', { headers: { token: auth.token } })
    } catch (ignore) {}
    router.push('/')
  }
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <nav>
        <ALink href="/">
          <Button variant="outline-primary">home</Button>
        </ALink>{' '}
        <ALink href="/about">
          <Button variant="outline-secondary">about</Button>
        </ALink>{' '}
        <Button variant="outline-info" onClick={onLogout}>
          logout
        </Button>
      </nav>
    </>
  )
}
