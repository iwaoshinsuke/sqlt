import { atom } from 'recoil'
import { Auth } from '../types/auth'

const authAtom = atom<Auth>({
  key: 'auth',
  default: null
})

export { authAtom }
