import { render, screen, fireEvent } from '@/setup/test-utils'
import { Filter } from '@/components/ui/Filter'
import { useRouter, useSearchParams } from 'next/navigation'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

describe('Filter Component', () => {
  const mockPush = jest.fn()
  const mockSearchParams = new URLSearchParams()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
  })

  const filterConfigs = [
    {
      key: 'search',
      label: 'Search',
      type: 'text' as const,
    },
    {
      key: 'role',
      label: 'Role',
      type: 'select' as const,
      options: [
        { value: 'ADMIN', label: 'Admin' },
        { value: 'USER', label: 'User' },
      ],
    },
    {
      key: 'dateRange',
      label: 'Date Range',
      type: 'dateRange' as const,
    },
  ]

  it('should render filter component with configs', () => {
    render(<Filter configs={filterConfigs} />)

    expect(screen.getByText('Filters')).toBeInTheDocument()
    expect(screen.getByText('Search')).toBeInTheDocument()
    expect(screen.getByText('Role')).toBeInTheDocument()
    expect(screen.getByText('Date Range')).toBeInTheDocument()
  })

  it('should handle text input changes', () => {
    const onFilterChange = jest.fn()
    render(<Filter configs={filterConfigs} onFilterChange={onFilterChange} />)

    const searchInput = screen.getByPlaceholderText(/search/i)
    fireEvent.change(searchInput, { target: { value: 'test' } })

    expect(onFilterChange).toHaveBeenCalled()
  })

  it('should handle select changes', () => {
    const onFilterChange = jest.fn()
    render(<Filter configs={filterConfigs} onFilterChange={onFilterChange} />)

    const select = screen.getByLabelText('Role')
    fireEvent.change(select, { target: { value: 'ADMIN' } })

    expect(onFilterChange).toHaveBeenCalled()
  })

  it('should handle date range changes', () => {
    const onFilterChange = jest.fn()
    render(<Filter configs={filterConfigs} onFilterChange={onFilterChange} />)

    const startDateInput = screen.getAllByRole('textbox')[0]
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } })

    expect(onFilterChange).toHaveBeenCalled()
  })

  it('should show reset button when filters are active', () => {
    mockSearchParams.set('search', 'test')
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)

    render(<Filter configs={filterConfigs} showReset />)

    expect(screen.getByText('Reset')).toBeInTheDocument()
  })

  it('should reset filters on button click', () => {
    mockSearchParams.set('search', 'test')
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)

    render(<Filter configs={filterConfigs} showReset />)

    const resetButton = screen.getByText('Reset')
    fireEvent.click(resetButton)

    expect(mockPush).toHaveBeenCalledWith(window.location.pathname, { scroll: false })
  })
})
