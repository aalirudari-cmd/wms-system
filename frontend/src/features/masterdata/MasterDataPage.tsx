import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { CrudPage } from './CrudPage';

interface Named { id: number; name: string }
interface Coded { id: number; code: string; name: string }

export function MasterDataPage() {
  return (
    <Tabs defaultValue="warehouses">
      <TabsList className="mb-4 flex-wrap">
        <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
        <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        <TabsTrigger value="customers">Customers</TabsTrigger>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="brands">Brands</TabsTrigger>
        <TabsTrigger value="units">Units</TabsTrigger>
      </TabsList>

      <TabsContent value="warehouses">
        <CrudPage<Coded & { address?: string }>
          title="Warehouses"
          description="Physical warehouse facilities."
          endpoint="/warehouses"
          fields={[
            { name: 'code', label: 'Code', required: true },
            { name: 'name', label: 'Name', required: true },
            { name: 'address', label: 'Address' },
          ]}
          columns={[
            { header: 'Code', render: (r) => r.code },
            { header: 'Name', render: (r) => r.name },
            { header: 'Address', render: (r) => r.address ?? '—' },
          ]}
        />
      </TabsContent>

      <TabsContent value="suppliers">
        <CrudPage<Coded & { email?: string; phone?: string }>
          title="Suppliers"
          description="Vendors goods are received from."
          endpoint="/suppliers"
          fields={[
            { name: 'code', label: 'Code', required: true },
            { name: 'name', label: 'Name', required: true },
            { name: 'email', label: 'Email', type: 'email' },
            { name: 'phone', label: 'Phone' },
          ]}
          columns={[
            { header: 'Code', render: (r) => r.code },
            { header: 'Name', render: (r) => r.name },
            { header: 'Email', render: (r) => r.email ?? '—' },
          ]}
        />
      </TabsContent>

      <TabsContent value="customers">
        <CrudPage<Coded & { email?: string; phone?: string }>
          title="Customers"
          description="Customers orders are shipped to."
          endpoint="/customers"
          fields={[
            { name: 'code', label: 'Code', required: true },
            { name: 'name', label: 'Name', required: true },
            { name: 'email', label: 'Email', type: 'email' },
            { name: 'phone', label: 'Phone' },
          ]}
          columns={[
            { header: 'Code', render: (r) => r.code },
            { header: 'Name', render: (r) => r.name },
            { header: 'Email', render: (r) => r.email ?? '—' },
          ]}
        />
      </TabsContent>

      <TabsContent value="categories">
        <CrudPage<Named>
          title="Categories"
          endpoint="/categories"
          fields={[{ name: 'name', label: 'Name', required: true }]}
          columns={[{ header: 'Name', render: (r) => r.name }]}
        />
      </TabsContent>

      <TabsContent value="brands">
        <CrudPage<Named>
          title="Brands"
          endpoint="/brands"
          fields={[{ name: 'name', label: 'Name', required: true }]}
          columns={[{ header: 'Name', render: (r) => r.name }]}
        />
      </TabsContent>

      <TabsContent value="units">
        <CrudPage<Coded>
          title="Units"
          description="Units of measure (EA, BOX, PLT…)."
          endpoint="/units"
          fields={[
            { name: 'code', label: 'Code', required: true },
            { name: 'name', label: 'Name', required: true },
          ]}
          columns={[
            { header: 'Code', render: (r) => r.code },
            { header: 'Name', render: (r) => r.name },
          ]}
        />
      </TabsContent>
    </Tabs>
  );
}
