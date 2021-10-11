import axios from 'axios'
import { useRouter } from 'next/dist/client/router'
import Head from 'next/head'
import { useRef, useState, VFC } from 'react'
import { Alert, Button, Modal } from 'react-bootstrap'
import { Form, FormGroup } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import { Auth } from '../types/auth'

export const Login: VFC<{ auth?: Auth }> = (props) => {
  const router = useRouter()
  const [error, setError] = useState(null)
  const [show, setShow] = useState(false)
  const { register, handleSubmit } = useForm<{ userId: string; pass: string }>()
  const submitRef = useRef<HTMLButtonElement | null>(null)
  const otpRef = useRef<HTMLInputElement | null>(null)
  const onSubmit = async (data) => {
    try {
      const res = await axios.post<{ token: string }>('/api/login', { ...data, otp: otpRef?.current?.value })
      const { token } = res.data
      router.replace({ pathname: router.pathname, query: { ...router.query, token } })
    } catch (ignore) {
      setError('id or password is different.')
    }
  }
  const onHide = () => setShow(false)
  const onTFLogin = () => {
    submitRef?.current.click()
    setShow(false)
  }
  return (
    <>
      <Head>
        <title>login</title>
      </Head>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <FormGroup>
          <Form.Label>userId</Form.Label>
          <Form.Control {...register('userId')} />
        </FormGroup>
        <FormGroup>
          <Form.Label>pass</Form.Label>
          <Form.Control type="password" {...register('pass')} />
        </FormGroup>
        <Button ref={submitRef} type="submit">
          login
        </Button>{' '}
        <Button onClick={() => setShow(true)}>2-factor login</Button>{' '}
        <Button href="/auth/github_login">login from github</Button>
        {error || ((router.pathname !== '/' || router.query.token || router.query.failed) && props.auth?.error) ? (
          <Alert variant="warning">{error || props.auth.error}</Alert>
        ) : (
          ''
        )}
        <Modal show={show} onHide={onHide}>
          <Modal.Header>
            <Modal.Title>2-factor</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <FormGroup>
              <Form.Label>otp</Form.Label>
              <Form.Control ref={otpRef} type="password" />
            </FormGroup>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={onTFLogin}>login</Button> <Button onClick={onHide}>cancel</Button>
          </Modal.Footer>
        </Modal>
      </Form>
    </>
  )
}
