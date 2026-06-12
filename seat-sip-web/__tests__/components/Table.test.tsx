import { render, screen, fireEvent } from '@/setup/test-utils'
import { DataTable } from '@/components/ui/Table'
import { ColumnDef } from '@tanstack/react-table'

describe('DataTable Component', () => {
  const mockData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'ADMIN' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'USER' },
    { id: 3, name: 'Bob Wilson', email: 'bob@example.com', role: 'STAFF' },
  ]

  const columns: ColumnDef<typeof mockData[0]>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: (info) => info.getValue() as string,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: (info) => info.getValue() as string,
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: (info) => info.getValue() as string,
    },
  ]

  it('should render table with data', () => {
    render(<DataTable data={mockData} columns={columns} />)

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Role')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
  })

  it('should render empty state when no data', () => {
    render(<DataTable data={[]} columns={columns} />)

    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('should handle row selection when selectable', () => {
    const onMultiSelect = jest.fn()
    render(
      <DataTable
        data={mockData}
        columns={columns}
        selectable
        onMultiSelect={onMultiSelect}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(4) // 3 rows + 1 select all
  })

  it('should handle pagination', () => {
    render(<DataTable data={mockData} columns={columns} />)

    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
  })

  it('should handle sorting', () => {
    render(<DataTable data={mockData} columns={columns} />)

    const nameHeader = screen.getByText('Name')
    expect(nameHeader).toBeInTheDocument()
    fireEvent.click(nameHeader)
  })

  it('should handle virtual scroll mode', () => {
    render(
      <DataTable
        data={mockData}
        columns={columns}
        virtualScroll
        rowHeight={56}
      />
    )

    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })
})
