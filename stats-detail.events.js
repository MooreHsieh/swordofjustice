// 綁定事件：分頁、視角、搜尋、排序、自選象限互動
export function wireEvents({
  elements,
  state,
  setStatus,
  onRenderMvp,
  onRenderContent,
  onSortToggle,
  onTabActivated,
  onCqChange,
  onSignOut,
}) {
  const { logoutBtn, viewBtnA, viewBtnB, tabsEl, searchEl, detailContentEl } = elements

  logoutBtn?.addEventListener('click', async () => {
    try {
      await onSignOut()
      window.location.replace('./login.html')
    } catch (error) {
      setStatus(error?.message || '登出失敗', true)
    }
  })

  viewBtnA?.addEventListener('click', () => {
    state.view = 'a'
    viewBtnA.classList.add('active')
    viewBtnB.classList.remove('active')
    onRenderMvp()
    onRenderContent()
  })

  viewBtnB?.addEventListener('click', () => {
    state.view = 'b'
    viewBtnB.classList.add('active')
    viewBtnA.classList.remove('active')
    onRenderMvp()
    onRenderContent()
  })

  tabsEl?.addEventListener('click', (event) => {
    const btn = event.target.closest('.detail-tab')
    if (!btn) return
    const tab = btn.dataset.tab
    if (!tab) return
    state.tab = tab
    onTabActivated(tab)
    tabsEl.querySelectorAll('.detail-tab').forEach((el) => el.classList.remove('active'))
    btn.classList.add('active')
    onRenderContent()
  })

  searchEl?.addEventListener('input', (event) => {
    state.search = event.target.value || ''
    onRenderContent()
  })

  detailContentEl?.addEventListener('click', (event) => {
    const cqBtn = event.target.closest('[data-cq-action]')
    if (cqBtn) {
      const action = cqBtn.dataset.cqAction
      // select 元件由 change 事件處理，避免點開下拉時提前重繪造成收起
      if (action === 'set-x' || action === 'set-y') return
      if (onCqChange(action, cqBtn.dataset)) onRenderContent()
      return
    }

    const jobBtn = event.target.closest('[data-job-filter]')
    if (jobBtn) {
      state.jobFilter = jobBtn.dataset.jobFilter || ''
      onRenderContent()
      return
    }

    const th = event.target.closest('.detail-sort')
    if (!th) return
    const key = th.dataset.key
    if (!key) return
    onSortToggle(key)
    onRenderContent()
  })

  detailContentEl?.addEventListener('change', (event) => {
    const el = event.target
    if (!(el instanceof HTMLSelectElement)) return
    if (!el.dataset.cqAction) return
    if (onCqChange(el.dataset.cqAction, { value: el.value })) onRenderContent()
  })
}
