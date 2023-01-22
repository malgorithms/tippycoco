class KeyboardMonitor {
  keysDown: Set<string>
  prevKeysDown: Set<string>
  constructor() {
    this.keysDown = new Set()
    this.prevKeysDown = new Set()
    this.registerKeyboardActions()
  }

  public update(): void {
    this.prevKeysDown = new Set(this.keysDown)
  }
  public isKeyDown(code: string) {
    return this.keysDown.has(code)
  }
  public anyKeyDown(codes: string[]) {
    for (const c of codes) {
      if (this.isKeyDown(c)) return true
    }
    return false
  }
  public anyKeysJustPushed(codes: string[]) {
    for (const c of codes) {
      if (this.wasKeyJustPushed(c)) return true
    }
    return false
  }
  public wasKeyJustPushed(code: string) {
    if (!this.prevKeysDown) return false
    const isPressed = this.keysDown.has(code)
    const wasPressed = this.prevKeysDown.has(code)
    if (this.prevKeysDown.size !== this.keysDown.size) return isPressed && !wasPressed
    return false
  }

  // ---- PRIVACY PLEASE

  private registerKeyboardActions() {
    window.addEventListener('keydown', (event) => {
      this.keysDown.add(event.code)
    })
    window.addEventListener('keyup', (event) => {
      this.keysDown.delete(event.code)
    })
  }
}
export {KeyboardMonitor}
