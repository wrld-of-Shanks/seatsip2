import { render, screen, fireEvent, waitFor } from '@/setup/test-utils'
import { setupServer } from 'msw/node'
import { handlers } from '@/setup/msw-handlers'
import { DataTable } from '@/components/ui/Table'
import { ColumnDef } from '@tanstack/react-table'

const server = setupServer(...handlers)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Users Integration Tests', () => {
  const mockUsers = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'ADMIN', isActive: true },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'USER', isActive: false },
  ]

  const columns: ColumnDef<typeof mockUsers[0]>[] = [
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

  it('should fetch and display users from API', async () => {
    render(<DataTable data={mockUsers} columns={columns} />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
  })

  it('should handle API error gracefully', async () => {
    server.use(
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'}/admin/users`, {
        handler: () => new Response('Internal Server Error', { status: 500 }),
      })
    )

    render(<DataTable data={[]} columns={columns} />)

    await waitFor(() => {
      expect(screen.getByText('No data available')).toBeInTheDocument()
    })
  })

  it('should handle network error', async () => {
    server.use(
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'}/admin/users`, {
        handler: () => new Response('Network Error', { status: 503 }),
      })
    )

    render(<DataTable data={[]} columns={columns} />)

    await waitFor(() => {
      expect(screen.getByText('No data available')).toBeInTheDocument()
    })
  })
})
