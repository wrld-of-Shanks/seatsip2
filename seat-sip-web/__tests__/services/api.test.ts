import { fetchApi } from '@/services/api'

describe('API Service', () => {
  beforeEach(() => {
    document.cookie = 'admin_token=test-token'
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
    document.cookie = 'admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
  })

  describe('fetchApi', () => {
    it('should make GET request with auth token', async () => {
      const mockResponse = { success: true, data: { id: 1 } }
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await fetchApi('/test')

      expect(global.fetch).toHaveBeenCalledWith(
        `${process.env.NEXT_PUBLIC_API_URL}/test`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('should make POST request with body', async () => {
      const mockResponse = { success: true, data: { id: 1 } }
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const body = { name: 'Test' }
      await fetchApi('/test', { method: 'POST', body: JSON.stringify(body) })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        })
      )
    })

    it('should handle error responses', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal Server Error' }),
      })

      await expect(fetchApi('/test')).rejects.toThrow()
    })

    it('should handle network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network Error'))

      await expect(fetchApi('/test')).rejects.toThrow('Network Error')
    })

    it('should handle missing token', () => {
      document.cookie = ''
      
      expect(() => fetchApi('/test')).not.toThrow()
    })
  })
})
