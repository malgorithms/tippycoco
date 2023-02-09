function isMobile() {
  if (/iPad|Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    return true
  } else {
    return false
  }
}
const $ = (s: string): HTMLElement => document.querySelector(s) as HTMLElement
export {isMobile, $}
