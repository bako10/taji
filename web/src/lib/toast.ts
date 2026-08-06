// Toast minimal via événement custom (écouté par <Toaster/>).
export function toast(message: string) {
  window.dispatchEvent(new CustomEvent('taji-toast', { detail: message }))
}
