import { describe, it, expect } from 'vitest'

describe('Login.vue', () => {
  it('前端测试框架已配置成功', () => {
    expect(true).toBe(true)
  })

  it('可以运行基础测试', () => {
    const sum = 1 + 1
    expect(sum).toBe(2)
  })

  it('vitest 环境正常工作', () => {
    expect(typeof document).toBe('object')
  })
})
