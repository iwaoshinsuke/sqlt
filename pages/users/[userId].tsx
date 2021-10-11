import axios from 'axios'
import { GetServerSideProps } from 'next'
import { useRouter } from 'next/dist/client/router'
import { useState, VFC } from 'react'
import { Button, Form, FormGroup, Modal } from 'react-bootstrap'
import { Alert } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import { Header } from '../../components/header'
import { getAuthProps } from '../../lib/auth'
import { inject } from '../../lib/injector'
import { Auth } from '../../types/auth'
import { User } from '../../types/user'
import * as OTPAuth from 'otpauth'
import QRCode from 'qrcode.react'

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: await getAuthProps(context, null, async (auth) => {
      const { db, mapper } = await inject()
      const user = await db.get<User>(mapper.getStatement('db', 'findUser', { userId: context.query.userId }))
      return { auth, user: user || null }
    })
  }
}

const UserPage: VFC<{ auth: Auth; user: User }> = ({ auth, user }) => {
  const router = useRouter()
  let [error, setError] = useState(null)
  const [show, setShow] = useState(false)
  let [secret, setSecret] = useState(user?.secret)
  const { register, handleSubmit, getValues } = useForm<{
    userId: string
    name: string
    pass: string
    passConfirm: string
    githubUserName: string
    permissions: number
  }>()
  if (!user) {
    error = 'not found.'
    router.replace({ pathname: '/', query: { token: auth.token } })
  }
  const qrcode = show ? new OTPAuth.TOTP({ secret: secret, issuer: 'test', label: 'aaa' }).toString() : ''
  const onHide = () => setShow(false)
  const onSubmit = async (data) => {
    try {
      await axios.put('/api/modifyUser', { ...data, secret, userId: user?.userId }, { headers: { token: auth.token } })
      router.replace({ pathname: '/', query: { token: auth.token } })
    } catch (err) {
      setError(err.response?.data?.message)
    }
  }
  const onClick = async () => {
    if (!window.confirm('delete it, are you sure?')) {
      return
    }
    try {
      await axios.delete('/api/removeUser', { params: { userId: user.userId }, headers: { token: auth.token } })
      router.replace({ pathname: '/', query: { token: auth.token } })
    } catch (err) {
      setError(err.message)
    }
  }
  const validatePass = {
    same: (value) => {
      const { pass } = getValues()
      return pass == null || pass === value
    }
  }
  const updateSecret = () => {
    setSecret(new OTPAuth.Secret({ size: 10 }).base32)
    setShow(true)
  }
  return (
    <>
      <Header title="user"></Header>userId {user?.userId}{' '}
      {auth?.permissions || user?.userId === auth?.userId ? (
        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <Form.Label>name</Form.Label>
            <Form.Control {...register('name', { required: true, maxLength: 128, value: user?.name })} />
          </FormGroup>
          <FormGroup>
            <Form.Label>pass</Form.Label>
            <Form.Control type="password" {...register('pass', { maxLength: 128 })} />
          </FormGroup>
          <FormGroup>
            <Form.Label>pass (confirm)</Form.Label>
            <Form.Control type="password" {...register('passConfirm', { maxLength: 128, validate: validatePass })} />
          </FormGroup>
          <FormGroup>
            <Form.Label>githubUserName</Form.Label>
            <Form.Control {...register('githubUserName', { maxLength: 128, value: user?.githubUserName })} />
          </FormGroup>
          <FormGroup>
            <Form.Label>2-factor</Form.Label>
            {secret ? (
              <>
                <Button onClick={() => setSecret(null)}>disable</Button> <Button onClick={updateSecret}>update</Button>{' '}
                <Button onClick={() => setShow(true)}>show</Button>
              </>
            ) : (
              <Button onClick={updateSecret}>enable</Button>
            )}
          </FormGroup>
          {auth?.permissions && user?.userId !== auth?.userId ? (
            <FormGroup>
              <Form.Check
                label="admin"
                type="checkbox"
                value={1}
                {...register('permissions', { value: user?.permissions })}
              />
            </FormGroup>
          ) : (
            ''
          )}
          <Button type="submit">modify</Button>

          <Modal show={show} onHide={onHide}>
            <Modal.Header>
              <Modal.Title>secret key</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <QRCode value={qrcode}></QRCode>
              <p>{secret}</p>
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={onHide}>ok</Button>
            </Modal.Footer>
          </Modal>
        </Form>
      ) : (
        <dl>
          <dt>name</dt>
          <dd>{user?.name}</dd>
          <dt>permissions</dt>
          <dd>{user?.permissions}</dd>
        </dl>
      )}
      {auth?.permissions && user?.userId !== auth?.userId ? <Button onClick={onClick}>remove</Button> : ''}
      {error ? <Alert variant="warning">{error}</Alert> : ''}
    </>
  )
}
export default UserPage
