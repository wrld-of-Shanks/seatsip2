import { render, screen } from '@/setup/test-utils'
import { axe, toHaveNoViolations } from 'jest-axe'
import { DataTable } from '@/components/ui/Table'
import { ColumnDef } from '@tanstack/react-table'

expect.extend(toHaveNoViolations)

describe('DataTable Accessibility', () => {
  const mockData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'ADMIN' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'USER' },
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

  it('should have no accessibility violations', async () => {
    const { container } = render(<DataTable data={mockData} columns={columns} />)
    const results = await axe(container)
    
    expect(results).toHaveNoViolations()
  })

  it('should have accessible table headers', async () => {
    const { container } = render(<DataTable data={mockData} columns={columns} />)
    const results = await axe(container)
    
    expect(results).toHaveNoViolations()
  })

  it('should have accessible checkboxes when selectable', async () => {
    const { container } = render(
      <DataTable data={mockData} columns={columns} selectable />
    )
    const results = await axe(container)
    
    expect(results).toHaveNoViolations()
  })

  it('should have accessible pagination controls', async () => {
    const { container } = render(<DataTable data={mockData} columns={columns} />)
    const results = await axe(container)
    
    expect(results).toHaveNoViolations()
  })
})
