import { AppProps } from 'next/app'
import Head from 'next/head'
import { RecoilRoot, useSetRecoilState } from 'recoil'
import '../styles/style.css'
import { VFC } from 'react'
import { authAtom } from '../lib/atom'
import { Auth } from '../types/auth'
import { Login } from '../components/login'

const Authed: VFC<{ auth: Auth }> = ({ auth }) => {
  const setAuth = useSetRecoilState(authAtom)
  if (auth?.token) {
    setAuth(auth)
  }
  return <></>
}

const App: VFC<AppProps> = ({ Component, pageProps }) => {
  return (
    <>
      <Head>
        <title>app</title>
        <meta name="viewport" content="width=device-width, initial-scale=1"></meta>
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta1/dist/css/bootstrap.min.css"
          rel="stylesheet"
          integrity="sha384-giJF6kkoqNQ00vy+HMDP7azOuL0xtbfIcaT9wjKHr8RbDVddVHyTfAAsrekwKmP1"
          crossOrigin="anonymous"
        ></link>
        <script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta1/dist/js/bootstrap.bundle.min.js"
          integrity="sha384-ygbV9kiqUc6oa4msXn9868pTtWMgiQaeYH7/t7LECLbyPA2x65Kgf80OJFdroafW"
          crossOrigin="anonymous"
        ></script>
      </Head>
      <RecoilRoot>
        {pageProps.statusCode ? (
          <Component {...pageProps} />
        ) : pageProps.auth?.token ? (
          <>
            <Authed auth={pageProps.auth} />
            <Component {...pageProps} />
          </>
        ) : (
          <Login auth={pageProps.auth} />
        )}
      </RecoilRoot>
    </>
  )
}
export default App
