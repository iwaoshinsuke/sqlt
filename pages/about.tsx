import { GetServerSideProps } from 'next'
import { Header } from '../components/header'
import { getAuthProps } from '../lib/auth'
import { VFC } from 'react'
import { Auth } from '../types/auth'

export const getServerSideProps: GetServerSideProps = async (context) => {
  return { props: await getAuthProps(context) }
}

const AboutPage: VFC<{ auth: Auth }> = ({ auth }) => {
  return (
    <>
      <Header title="about"></Header>about {auth?.userId}...
    </>
  )
}
export default AboutPage
