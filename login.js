import { supabase } from './supabase-client.js'

const statusEl = document.querySelector('#status')
const googleLoginBtn = document.querySelector('#googleLoginBtn')
const discordLoginBtn = document.querySelector('#discordLoginBtn')

function setStatus(message, isError = false) {
  statusEl.textContent = message
  statusEl.style.color = isError ? '#b42318' : '#69655e'
}

function lockAuthActions(disabled) {
  if (googleLoginBtn) googleLoginBtn.disabled = disabled
  if (discordLoginBtn) discordLoginBtn.disabled = disabled
}

function cleanOAuthUrl() {
  const url = new URL(window.location.href)
  const hasSearch = url.searchParams.has('code') || url.searchParams.has('error')
  const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : '')
  const hasHash = hashParams.has('access_token') || hashParams.has('refresh_token')
  if (hasSearch || hasHash) {
    window.history.replaceState({}, document.title, `${url.origin}${url.pathname}`)
  }
}

async function onOAuthLogin(provider) {
  lockAuthActions(true)
  setStatus(`導向 ${provider} 登入中...`)
  const redirectTo = `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, '')}stats.html`
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })
  lockAuthActions(false)
  if (error) setStatus(error.message, true)
}

async function bootstrap() {
  const { data } = await supabase.auth.getUser()
  if (data.user) {
    window.location.replace('./stats.html')
    return
  }

  cleanOAuthUrl()
  setStatus('請選擇 Google 或 Discord 登入。')

  if (googleLoginBtn) googleLoginBtn.addEventListener('click', () => onOAuthLogin('google'))
  if (discordLoginBtn) discordLoginBtn.addEventListener('click', () => onOAuthLogin('discord'))
}

bootstrap()
