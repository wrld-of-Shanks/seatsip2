import { exportToCSV, exportToExcel } from '@/utils/export'

describe('Export Utilities', () => {
  const mockData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'ADMIN' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'USER' },
  ]

  beforeEach(() => {
    document.body.innerHTML = ''
    jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      const element = document.createElement(tagName)
      if (tagName === 'a') {
        Object.defineProperty(element, 'href', { value: '', writable: true })
        Object.defineProperty(element, 'download', { value: '', writable: true })
      }
      return element
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('exportToCSV', () => {
    it('should export data to CSV format', () => {
      const createElementSpy = jest.spyOn(document, 'createElement')
      exportToCSV(mockData, 'test-export')

      expect(createElementSpy).toHaveBeenCalledWith('a')
    })

    it('should handle empty data', () => {
      const createElementSpy = jest.spyOn(document, 'createElement')
      exportToCSV([], 'test-export')

      expect(createElementSpy).not.toHaveBeenCalled()
    })

    it('should handle data with commas', () => {
      const dataWithCommas = [
        { id: 1, name: 'Doe, John', email: 'john@example.com' },
      ]
      const createElementSpy = jest.spyOn(document, 'createElement')
      exportToCSV(dataWithCommas, 'test-export')

      expect(createElementSpy).toHaveBeenCalledWith('a')
    })

    it('should handle data with quotes', () => {
      const dataWithQuotes = [
        { id: 1, name: 'John "The Boss" Doe', email: 'john@example.com' },
      ]
      const createElementSpy = jest.spyOn(document, 'createElement')
      exportToCSV(dataWithQuotes, 'test-export')

      expect(createElementSpy).toHaveBeenCalledWith('a')
    })
  })

  describe('exportToExcel', () => {
    it('should export data to Excel format', () => {
      const createElementSpy = jest.spyOn(document, 'createElement')
      exportToExcel(mockData, 'test-export')

      expect(createElementSpy).toHaveBeenCalledWith('a')
    })

    it('should handle empty data', () => {
      const createElementSpy = jest.spyOn(document, 'createElement')
      exportToExcel([], 'test-export')

      expect(createElementSpy).not.toHaveBeenCalled()
    })
  })
})
