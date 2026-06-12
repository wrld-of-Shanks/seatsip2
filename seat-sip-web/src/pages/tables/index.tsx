import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { api } from '@/services/api';
import {
  Search,
  Plus,
  Bell,
  Settings,
  MoreHorizontal,
  ZoomIn,
  ZoomOut,
  Info,
  Save,
  Square,
  Circle,
  Users,
  Timer,
  ChevronRight,
  Lock,
  LayoutGrid,
  Building2,
  Table as TableIconLucide,
  Trash2,
  Armchair,
  X,
  Calendar
} from 'lucide-react';
import { Sidebar } from '@/components/ui/Sidebar';

const TableIcon = ({ status }: { status: string }) => {
  if (status === 'AVAILABLE') return <Armchair className="text-emerald-500" size={28} />;
  if (status === 'OCCUPIED') return <Users className="text-stone-900" size={28} />;
  if (status === 'RESERVED') return <Timer className="text-amber-500" size={28} />;
  return <Lock className="text-stone-300" size={28} />;
};

export default function TablesPage() {
  const [tables, setTables] = useState<any[]>([]);
  const [cafes, setCafes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [selectedCafe, setSelectedCafe] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzOffset).toISOString().split('T')[0];
  });
  const [showAddSidebar, setShowAddSidebar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [editingTable, setEditingTable] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    tableNumber: '',
    capacity: '2',
    section: 'Ground',
    status: 'AVAILABLE',
    posX: '0',
    posY: '0',
  });

  useEffect(() => {
    loadCafes();
  }, []);

  useEffect(() => {
    if (selectedCafe) {
      loadTables(selectedCafe, selectedDate);
    } else {
      setTables([]);
      setLoading(false);
    }
  }, [selectedCafe, selectedDate]);

  async function loadCafes() {
    try {
      const res = await api.cafes.list();
      if (res.success && res.data.length > 0) {
        setCafes(res.data);
        setSelectedCafe(res.data[0].id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to load cafes:', error);
      setLoading(false);
    }
  }

  async function loadTables(cafeId: string, date?: string) {
    setLoading(true);
    try {
      const res = await api.tables.list(cafeId, { date });
      if (res.success) {
        setTables(res.data);
      }
    } catch (error) {
      console.error('Failed to load tables:', error);
    } finally {
      setLoading(false);
    }
  }

  const resetForm = () => {
    setFormData({
      tableNumber: '',
      capacity: '2',
      section: 'Ground',
      status: 'AVAILABLE',
      posX: '0',
      posY: '0',
    });
    setEditingTable(null);
  };

  const handleEdit = (table: any) => {
    setEditingTable(table);
    setFormData({
      tableNumber: table.tableNumber || table.table_number || '',
      capacity: String(table.capacity || 2),
      section: table.section || table.floor || 'Ground',
      status: table.status || (table.is_available === 1 ? 'AVAILABLE' : 'OCCUPIED'),
      posX: String(table.position_x || 0),
      posY: String(table.position_y || 0),
    });
    setShowAddSidebar(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCafe) return;
    setIsSubmitting(true);
    try {
      const payload = {
        tableNumber: formData.tableNumber,
        capacity: parseInt(formData.capacity),
        section: formData.section,
        status: formData.status,
        posX: parseFloat(formData.posX || '0'),
        posY: parseFloat(formData.posY || '0'),
      };

      let res;
      if (editingTable) {
        res = await api.tables.update(editingTable.id, payload);
      } else {
        res = await api.tables.create(selectedCafe, payload);
      }
      
      if (res.success) {
        setShowAddSidebar(false);
        resetForm();
        loadTables(selectedCafe);
        if (editingTable && res.data) {
          setSelectedTable(res.data);
        }
      }
    } catch (error: any) {
      console.error('Failed to save table:', error);
      alert(error.message || 'An error occurred while saving the table');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (table: any) => {
    try {
      const nextStatus = table.status === 'AVAILABLE' ? 'OCCUPIED' : 'AVAILABLE';
      const res = await api.tables.update(table.id, { status: nextStatus });
      if (res.success) {
        loadTables(selectedCafe);
        setSelectedTable(res.data);
      }
    } catch (error) {
      console.error('Failed to toggle table status:', error);
    }
  };

  const handleDeleteTable = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this table?')) return;
    try {
      const res = await api.tables.delete(id);
      if (res.success) {
        setSelectedTable(null);
        loadTables(selectedCafe);
      }
    } catch (error) {
      console.error('Failed to delete table:', error);
    }
  };

  return (
    <Layout>
      <div className="mb-12">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-4xl font-black text-stone-900 mb-2 font-headline italic tracking-tight">Spatial Architecture</h1>
            <p className="text-stone-400 font-bold text-sm tracking-wide">Orchestrate the floor plan and seating configurations of your establishments.</p>
          </div>
          <div className="flex gap-4">
              <div className="relative group">
                <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-stone-900 transition-colors" />
                <select
                  value={selectedCafe}
                  onChange={(e) => setSelectedCafe(e.target.value)}
                  disabled={userRole === 'CAFE_OWNER'}
                  className={`pl-12 pr-10 py-4 bg-white border border-stone-100 rounded-2xl text-sm focus:ring-4 ring-stone-900/5 transition-all outline-none font-black italic shadow-sm appearance-none ${userRole === 'CAFE_OWNER' ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                >
                  {cafes.map((cafe) => (
                    <option key={cafe.id} value={cafe.id}>{cafe.name}</option>
                  ))}
                  {cafes.length === 0 && <option value="">No Cafes Available</option>}
                </select>
                {userRole !== 'CAFE_OWNER' && (
                  <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-300 rotate-90 pointer-events-none" />
                )}
              </div>
              <div className="relative group">
                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-stone-900 transition-colors pointer-events-none" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-12 pr-6 py-4 bg-white border border-stone-100 rounded-2xl text-sm focus:ring-4 ring-stone-900/5 transition-all outline-none font-black italic shadow-sm cursor-pointer"
                />
              </div>
             <button 
                onClick={() => { resetForm(); setShowAddSidebar(true); }}
                disabled={!selectedCafe}
                className="bg-stone-900 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-2xl shadow-stone-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 italic font-headline disabled:opacity-50"
             >
                <Plus size={20} /> Add New Table
             </button>
          </div>
        </div>
      </div>

      <div className="flex gap-10 h-[calc(100vh-16rem)]">
        {/* Floor Plan Canvas */}
        <div className="flex-1 bg-stone-50/50 rounded-[3rem] p-12 flex flex-col relative overflow-hidden border border-stone-100 shadow-inner">
          {/* Visual Background Elements */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
          
          <div className="relative z-10 flex justify-between items-start mb-16">
            <div>
              <h3 className="text-2xl font-headline font-black tracking-tight text-stone-900 italic mb-3">
                {cafes.find((c) => c.id === selectedCafe)?.name || 'Select a Cafe'}
              </h3>
              <div className="flex gap-3">
                <span className="flex items-center gap-2 text-[10px] font-black text-stone-400 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-stone-100 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span> {tables.filter((t) => t.status === 'AVAILABLE').length} Available
                </span>
                <span className="flex items-center gap-2 text-[10px] font-black text-stone-400 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-stone-100 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-stone-900"></span> {tables.filter((t) => (t.status === 'OCCUPIED' || t.status === 'RESERVED')).length} In Use
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="bg-white p-3 rounded-2xl shadow-sm hover:shadow-md transition-all text-stone-400 hover:text-stone-900 border border-stone-100">
                <ZoomIn size={20} />
              </button>
              <button className="bg-white p-3 rounded-2xl shadow-sm hover:shadow-md transition-all text-stone-400 hover:text-stone-900 border border-stone-100">
                <ZoomOut size={20} />
              </button>
            </div>
          </div>

          {/* Interactive Canvas */}
          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900"></div>
            </div>
          ) : tables.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
               <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-stone-100">
                  <LayoutGrid size={40} className="text-stone-100" />
               </div>
               <h4 className="text-xl font-black text-stone-900 italic font-headline mb-2">No Tables Mapped</h4>
               <p className="text-stone-400 font-bold max-w-xs mx-auto text-sm">Synchronize your floor plan by adding tables to this establishment.</p>
            </div>
          ) : (
            <div className="relative flex-1 grid grid-cols-4 lg:grid-cols-5 gap-10 p-4 auto-rows-max overflow-y-auto pr-4 custom-scrollbar">
              {tables.map((table) => (
                <div
                  key={table.id}
                  className="group relative flex items-center justify-center"
                  onClick={() => setSelectedTable(table)}
                >
                  <div className={`
                    w-40 h-40 rounded-[2.5rem]
                    ${table.status === 'OCCUPIED' ? 'bg-white border-stone-900 shadow-2xl' : 'bg-white border-stone-100 shadow-lg group-hover:shadow-2xl'}
                    border-2 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer relative overflow-hidden
                    ${selectedTable?.id === table.id ? 'ring-8 ring-stone-900/5 scale-105' : 'hover:scale-105'}
                  `}>
                    <div className="absolute top-0 inset-x-0 h-1 bg-stone-50"></div>
                    <div className={`text-[10px] font-black font-headline uppercase tracking-widest ${table.status === 'OCCUPIED' ? 'text-stone-900' : 'text-stone-300'}`}>
                      #{typeof table.tableNumber === 'object' ? '?' : table.tableNumber}
                    </div>
                    <TableIcon status={table.status} />
                    <div className={`text-xs font-black italic tracking-tighter ${table.status === 'OCCUPIED' ? 'text-stone-900' : 'text-stone-400'}`}>
                      {typeof table.capacity === 'object' ? '?' : table.capacity} Seater
                    </div>
                    
                    {table.section && (
                       <div className="absolute bottom-4 text-[8px] font-black uppercase text-stone-300 tracking-[0.2em]">{table.section}</div>
                    )}
                  </div>
                  <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-2xl border-4 border-white shadow-lg ${table.status === 'AVAILABLE' ? 'bg-emerald-500' : table.status === 'RESERVED' ? 'bg-amber-500' : 'bg-stone-900'}`}></div>
                </div>
              ))}
            </div>
          )}

          {/* Legend Footer */}
          <div className="relative z-10 flex gap-10 mt-auto pt-10 border-t border-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div>
              <span className="text-[10px] font-black font-headline text-stone-400 tracking-widest uppercase">Available</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-stone-900"></div>
              <span className="text-[10px] font-black font-headline text-stone-400 tracking-widest uppercase">Occupied</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]"></div>
              <span className="text-[10px] font-black font-headline text-stone-400 tracking-widest uppercase">Reserved</span>
            </div>
            <div className="ml-auto flex items-center gap-2 text-stone-300">
              <Info size={14} />
              <span className="text-[10px] font-black italic">Select a table to manage its lifecycle</span>
            </div>
          </div>
        </div>

        {/* Controls Side Panel */}
        {selectedTable ? (
          <aside className="w-[26rem] flex flex-col animate-in slide-in-from-right duration-500">
            <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-stone-100 relative overflow-hidden flex-1 flex flex-col">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                <TableIconLucide size={160} className="-rotate-12" />
              </div>
              
              <div className="relative z-10 flex-1">
                <div className="flex justify-between items-center mb-10">
                   <h4 className="text-[10px] font-black text-stone-400 tracking-[0.3em] uppercase">Table Specifications</h4>
                   <button onClick={() => setSelectedTable(null)} className="p-2 hover:bg-stone-50 rounded-xl transition-all"><X size={18} className="text-stone-300" /></button>
                </div>

                <div className="flex items-end gap-4 mb-12">
                  <span className="text-7xl font-headline font-black text-stone-900 tracking-tighter italic leading-none">{selectedTable.tableNumber}</span>
                  <div className="mb-2">
                     <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Establishment</p>
                     <p className="text-sm font-bold text-stone-900">{cafes.find((c) => c.id === selectedCafe)?.name}</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="p-6 bg-stone-50/50 rounded-3xl border border-stone-100 flex justify-between items-center group cursor-pointer hover:bg-white hover:shadow-lg transition-all">
                    <div>
                      <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-1 group-hover:text-stone-400 transition-colors">Current Status</p>
                      <p className={`text-sm font-black italic font-headline ${selectedTable.status === 'AVAILABLE' ? 'text-emerald-600' : 'text-stone-900'}`}>{selectedTable.status}</p>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${selectedTable.status === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-stone-900'}`}></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                     <div className="p-6 bg-stone-50/50 rounded-3xl border border-stone-100 group hover:bg-white hover:shadow-lg transition-all">
                        <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-1 group-hover:text-stone-400 transition-colors">Capacity</p>
                        <p className="text-sm font-black text-stone-900 italic font-headline">{selectedTable.capacity} Guests</p>
                     </div>
                     <div className="p-6 bg-stone-50/50 rounded-3xl border border-stone-100 group hover:bg-white hover:shadow-lg transition-all">
                        <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-1 group-hover:text-stone-400 transition-colors">Section</p>
                        <p className="text-sm font-black text-stone-900 italic font-headline">{selectedTable.section || 'Main Floor'}</p>
                     </div>
                  </div>
                </div>

                <div className="mt-12 space-y-4">
                  <button onClick={() => handleToggleStatus(selectedTable)} className="w-full bg-stone-900 text-white py-5 rounded-2xl font-black text-sm tracking-widest uppercase hover:shadow-2xl hover:shadow-stone-900/30 transition-all active:scale-95 italic font-headline">Update Table Status</button>
                  <div className="flex gap-3">
                     <button onClick={() => handleEdit(selectedTable)} className="flex-1 py-4 border border-stone-200 rounded-2xl text-stone-400 font-black text-[10px] uppercase tracking-widest hover:bg-stone-50 hover:text-stone-600 transition-all uppercase">Edit Details</button>
                     <button onClick={() => handleDeleteTable(selectedTable.id)} className="p-4 border border-rose-100 rounded-2xl text-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-all">
                        <Trash2 size={20} />
                     </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        ) : (
           <aside className="w-[26rem] flex flex-col">
              <div className="bg-stone-900 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden flex-1 flex flex-col border border-white/5">
                 <div className="absolute top-0 right-0 p-8 opacity-10">
                    <TableIconLucide size={160} className="text-white -rotate-12" />
                 </div>
                 <div className="relative z-10 mt-auto">
                    <h3 className="text-3xl font-black text-white italic font-headline mb-4 leading-tight">Master Floor Topology</h3>
                    <p className="text-stone-400 font-bold mb-8 leading-relaxed">Select a table on the blueprint to manage its live status, guest allocation, and spatial parameters.</p>
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-md">
                       <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">Architectural Tip</p>
                       <p className="text-xs text-stone-300 font-bold leading-relaxed opacity-80 italic">Position tables logically to optimize flow. Large circular tables are best for the central gallery.</p>
                    </div>
                 </div>
              </div>
           </aside>
        )}
      </div>

      {/* Add Table Sidebar */}
      <Sidebar
        isOpen={showAddSidebar}
        onClose={() => setShowAddSidebar(false)}
        title="Map New Table"
      >
        <form onSubmit={handleAddSubmit} className="space-y-8">
          <div className="space-y-6">
            <div className="group">
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Table Descriptor</label>
              <input
                type="text"
                required
                value={formData.tableNumber}
                onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
                className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-900 italic font-headline text-lg"
                placeholder="e.g. T-10..."
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Seating Capacity</label>
                <div className="relative">
                  <Users className="absolute left-5 top-5 text-stone-300 group-focus-within:text-stone-900" size={18} />
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full pl-14 pr-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800"
                    placeholder="4"
                  />
                </div>
              </div>
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Floor Selector</label>
                <div className="relative">
                  <LayoutGrid className="absolute left-5 top-5 text-stone-300 group-focus-within:text-stone-900" size={18} />
                  <select
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full pl-14 pr-10 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800 appearance-none cursor-pointer"
                  >
                    <option value="Ground">Ground Floor</option>
                    <option value="First">First Floor</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Grid Coordinate X</label>
                <input
                  type="number"
                  step="any"
                  value={formData.posX}
                  onChange={(e) => setFormData({ ...formData, posX: e.target.value })}
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800"
                  placeholder="0.0"
                />
              </div>
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Grid Coordinate Y</label>
                <input
                  type="number"
                  step="any"
                  value={formData.posY}
                  onChange={(e) => setFormData({ ...formData, posY: e.target.value })}
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800"
                  placeholder="0.0"
                />
              </div>
            </div>

            <div className="group">
               <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Initial Status</label>
               <div className="grid grid-cols-2 gap-3">
                  {['AVAILABLE', 'RESERVED'].map((stat) => (
                     <button
                        key={stat}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: stat })}
                        className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${formData.status === stat ? 'bg-stone-900 text-white border-stone-900 shadow-lg' : 'bg-stone-50 text-stone-400 border-stone-100 hover:bg-stone-100'}`}
                     >
                        {stat}
                     </button>
                  ))}
               </div>
            </div>
          </div>

          <div className="pt-8 border-t border-stone-100 flex gap-4">
            <button
              type="button"
              onClick={() => { resetForm(); setShowAddSidebar(false); }}
              className="flex-1 px-4 py-4 border border-stone-200 rounded-2xl font-black text-xs uppercase tracking-widest text-stone-400 hover:bg-stone-50 hover:text-stone-600 transition-all font-headline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-4 bg-stone-900 text-white rounded-2xl font-black italic tracking-tight hover:shadow-2xl hover:shadow-stone-900/20 active:scale-95 disabled:opacity-50 transition-all font-headline text-lg"
            >
              {isSubmitting ? 'Synchronizing...' : (editingTable ? 'Update Table' : 'Integrate Table')}
            </button>
          </div>
        </form>
      </Sidebar>
    </Layout>
  );
}
