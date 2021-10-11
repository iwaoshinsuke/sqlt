import axios from 'axios'
import { GetServerSideProps } from 'next'
import { useRouter } from 'next/dist/client/router'
import { useState, VFC } from 'react'
import { Alert, Button, FormGroup, Modal } from 'react-bootstrap'
import { Form } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import { Header } from '../components/header'
import { getAuthProps } from '../lib/auth'
import { Auth } from '../types/auth'
import * as OTPAuth from 'otpauth'
import QRCode from 'qrcode.react'

export const getServerSideProps: GetServerSideProps = async (context) => {
  return { props: await getAuthProps(context, 0x1) }
}

const AddUserPage: VFC<{ auth: Auth }> = ({ auth }) => {
  const router = useRouter()
  const [error, setError] = useState(null)
  const [show, setShow] = useState(false)
  let [secret, setSecret] = useState(null)
  const { register, handleSubmit } = useForm<{
    userId: string
    name: string
    pass: string
    githubUserName: string
    permissions: number
  }>()
  const qrcode = show ? new OTPAuth.TOTP({ secret: secret, issuer: 'test', label: 'aaa' }).toString() : ''
  const onHide = () => setShow(false)
  const onSubmit = async (data) => {
    try {
      await axios.post('/api/addUser', { ...data, secret }, { headers: { token: auth.token } })
      router.replace({ pathname: '/', query: { token: auth.token } })
    } catch (err) {
      setError(err.response?.data?.message)
    }
  }
  const updateSecret = () => {
    setSecret(new OTPAuth.Secret({ size: 10 }).base32)
    setShow(true)
  }
  return (
    <>
      <Header title="new user"></Header>add user
      <Form onSubmit={handleSubmit(onSubmit)}>
        <FormGroup>
          <Form.Label>userId</Form.Label>
          <Form.Control {...register('userId', { required: true, pattern: /^[a-zA-Z0-9][-a-zA-Z0-9_@\.]{0,127}$/ })} />
        </FormGroup>
        <FormGroup>
          <Form.Label>name</Form.Label>
          <Form.Control {...register('name', { required: true, maxLength: 128 })} />
        </FormGroup>
        <FormGroup>
          <Form.Label>pass</Form.Label>
          <Form.Control type="password" {...register('pass', { required: true, maxLength: 128 })} />
        </FormGroup>
        <FormGroup>
          <Form.Label>githubUserName</Form.Label>
          <Form.Control {...register('githubUserName', { maxLength: 128 })} />
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
        <FormGroup>
          <Form.Check label="admin" type="checkbox" value={1} {...register('permissions')} />
        </FormGroup>
        <Button type="submit">add</Button>
        {error ? <Alert variant="warning">{error}</Alert> : ''}

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
    </>
  )
}
export default AddUserPage
