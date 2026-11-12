export default function getGuestId() {
  let id = null
  try { id = localStorage.getItem('guest_id') } catch { /* storage blocked */ }
  if (!id) {
    id = crypto.randomUUID()
    try { localStorage.setItem('guest_id', id) } catch { /* ignore */ }
  }
  return id
}