import { renderHook, act } from '@testing-library/react'
import { useWebSocket } from '@/hooks/useWebSocket'

describe('useWebSocket Hook', () => {
  beforeEach(() => {
    document.cookie = 'admin_token=test-token'
  })

  afterEach(() => {
    document.cookie = 'admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
  })

  it('should initialize with disconnected state', () => {
    const { result } = renderHook(() => useWebSocket())
    
    expect(result.current.isConnected).toBe(false)
  })

  it('should connect when token is available', () => {
    const { result } = renderHook(() => useWebSocket())
    
    expect(result.current.socket).toBeDefined()
  })

  it('should handle order update events', () => {
    const onOrderUpdate = jest.fn()
    const { result } = renderHook(() => useWebSocket({ onOrderUpdate }))
    
    act(() => {
      result.current.socket?.emit('order:created', { orderId: '123' })
    })
    
    expect(onOrderUpdate).toHaveBeenCalled()
  })

  it('should handle payment events', () => {
    const onPaymentUpdate = jest.fn()
    const { result } = renderHook(() => useWebSocket({ onPaymentUpdate }))
    
    act(() => {
      result.current.socket?.emit('payment:received', { amount: 100 })
    })
    
    expect(onPaymentUpdate).toHaveBeenCalled()
  })

  it('should handle reservation events', () => {
    const onReservationUpdate = jest.fn()
    const { result } = renderHook(() => useWebSocket({ onReservationUpdate }))
    
    act(() => {
      result.current.socket?.emit('reservation:created', { customerName: 'John' })
    })
    
    expect(onReservationUpdate).toHaveBeenCalled()
  })

  it('should join and leave rooms', () => {
    const { result } = renderHook(() => useWebSocket())
    
    act(() => {
      result.current.joinRoom('orders')
    })
    
    act(() => {
      result.current.leaveRoom('orders')
    })
  })

  it('should emit events', () => {
    const { result } = renderHook(() => useWebSocket())
    
    act(() => {
      result.current.emit('test-event', { data: 'test' })
    })
  })
})
