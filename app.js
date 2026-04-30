import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const statusEl = document.querySelector('#status')
const authArea = document.querySelector('#authArea')
const userArea = document.querySelector('#userArea')
const userEmailEl = document.querySelector('#userEmail')
const providerNameEl = document.querySelector('#providerName')
const emailInput = document.querySelector('#email')
const passwordInput = document.querySelector('#password')
const googleLoginBtn = document.querySelector('#googleLoginBtn')
const discordLoginBtn = document.querySelector('#discordLoginBtn')

const config = window.SUPABASE_CONFIG
if (!config || !config.url || !config.anonKey) {
  setStatus('缺少 Supabase 設定。請建立 config.js（可由 config.example.js 複製）。', true)
  lockAuthActions(true)
  throw new Error('Missing SUPABASE_CONFIG in config.js')
}

const supabase = createClient(config.url, config.anonKey)

function setStatus(message, isError = false) {
  statusEl.textContent = message
  statusEl.style.color = isError ? '#b42318' : '#69655e'
}

function lockAuthActions(disabled) {
  document.querySelector('#signupBtn').disabled = disabled
  document.querySelector('#loginBtn').disabled = disabled
  googleLoginBtn.disabled = disabled
  discordLoginBtn.disabled = disabled
  document.querySelector('#logoutBtn').disabled = disabled
  emailInput.disabled = disabled
  passwordInput.disabled = disabled
}

function readCredentials() {
  return {
    email: emailInput.value.trim(),
    password: passwordInput.value
  }
}

function validateCredentials(email, password) {
  if (!email || !password) {
    setStatus('請輸入 Email 與密碼。', true)
    return false
  }

  if (password.length < 6) {
    setStatus('密碼至少要 6 碼。', true)
    return false
  }

  return true
}

async function refreshUser() {
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    authArea.classList.remove('hidden')
    userArea.classList.add('hidden')
    userEmailEl.textContent = ''
    providerNameEl.textContent = ''
    return
  }

  authArea.classList.add('hidden')
  userArea.classList.remove('hidden')
  userEmailEl.textContent = data.user.email ?? '(無 Email)'
  providerNameEl.textContent = readProviderName(data.user)
}

function readProviderName(user) {
  const provider = user.app_metadata?.provider
  if (provider === 'google') return 'Google'
  if (provider === 'discord') return 'Discord'
  if (provider === 'email') return 'Email / Password'
  return provider ?? 'Unknown'
}

async function onSignUp() {
  const { email, password } = readCredentials()
  if (!validateCredentials(email, password)) return

  lockAuthActions(true)
  setStatus('註冊中...')

  const { data, error } = await supabase.auth.signUp({ email, password })

  lockAuthActions(false)

  if (error) {
    setStatus(error.message, true)
    return
  }

  if (data.session) {
    setStatus('註冊成功，已直接登入。')
  } else {
    setStatus('註冊成功，請到 Email 收信完成驗證。')
  }

  await refreshUser()
}

async function onLogin() {
  const { email, password } = readCredentials()
  if (!validateCredentials(email, password)) return

  lockAuthActions(true)
  setStatus('登入中...')

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  lockAuthActions(false)

  if (error) {
    setStatus(error.message, true)
    return
  }

  setStatus('登入成功。')
  await refreshUser()
}

async function onLogout() {
  lockAuthActions(true)

  const { error } = await supabase.auth.signOut()

  lockAuthActions(false)

  if (error) {
    setStatus(error.message, true)
    return
  }

  setStatus('已登出。')
  await refreshUser()
}

async function onOAuthLogin(provider) {
  lockAuthActions(true)
  setStatus(`導向 ${provider} 登入中...`)

  const redirectTo = `${window.location.origin}${window.location.pathname}`
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo }
  })

  lockAuthActions(false)

  if (error) {
    setStatus(error.message, true)
    return
  }
}

function normalizeOAuthReturnUrl() {
  const url = new URL(window.location.href)
  const hasOAuthParams =
    url.searchParams.has('code') ||
    url.searchParams.has('error') ||
    url.searchParams.has('error_description')

  if (!hasOAuthParams) return false

  window.history.replaceState({}, document.title, `${url.origin}${url.pathname}`)
  return true
}

const fromOAuthCallback = normalizeOAuthReturnUrl()

document.querySelector('#signupBtn').addEventListener('click', onSignUp)
document.querySelector('#loginBtn').addEventListener('click', onLogin)
document.querySelector('#logoutBtn').addEventListener('click', onLogout)
googleLoginBtn.addEventListener('click', () => onOAuthLogin('google'))
discordLoginBtn.addEventListener('click', () => onOAuthLogin('discord'))

supabase.auth.onAuthStateChange(async () => {
  await refreshUser()
})

await refreshUser()
if (fromOAuthCallback) {
  setStatus('OAuth 回跳完成，正在更新登入狀態。')
} else {
  setStatus('請先登入或註冊。')
}
