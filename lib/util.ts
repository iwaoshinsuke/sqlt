export function hstr(val: string | string[]): string {
  return (Array.isArray(val) ? val[0] : val) || ''
}

export function addToken(url: string, token: string) {
  return url && token ? url + (url.indexOf('?') < 0 ? '?' : '&') + `token=${token}` : url
}
