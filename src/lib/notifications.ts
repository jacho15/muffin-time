let swRegistration: ServiceWorkerRegistration | null = null

async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (swRegistration) return swRegistration
  if (!('serviceWorker' in navigator)) return null
  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js')
    return swRegistration
  } catch {
    return null
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') {
    await getSwRegistration()
    return true
  }
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  if (result === 'granted') {
    await getSwRegistration()
    return true
  }
  return false
}

export async function sendNotification(title: string, body?: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const reg = await getSwRegistration()
  if (reg) {
    reg.showNotification(title, { body, icon: '/favicon.ico' })
  } else {
    new Notification(title, { body })
  }
}
