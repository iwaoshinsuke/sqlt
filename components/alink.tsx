import Link, { LinkProps } from 'next/link'
import { ReactNode, VFC } from 'react'
import { useRecoilValue } from 'recoil'
import { authAtom } from '../lib/atom'
import { addToken } from '../lib/util'

export const ALink: VFC<LinkProps & { children: ReactNode }> = (props) => {
  const auth = useRecoilValue(authAtom)
  return (
    <Link
      {...props}
      href={addToken(props.href.toString(), auth?.token)}
      as={addToken(props.as?.toString(), auth?.token)}
    ></Link>
  )
}
