import React, { useEffect, useState } from 'react';
import { Plus, Search, Package, AlertTriangle, ArrowRightLeft, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Material } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { MaterialForm } from '../components/forms/MaterialForm';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { getMockData, saveMockData } from '../lib/storage';

const Materials: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (division === 'marketing') {
      fetchMaterials();
    } else {
      setLoading(false);
    }
  }, [division]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      
      if (isMockMode) {
        const defaultMaterials: Material[] = [
          {
            id: '1',
            name: 'Semen Tiga Roda',
            unit: 'sak',
            stock: 50,
            min_stock: 10,
          },
          {
            id: '2',
            name: 'Pasir Beton',
            unit: 'm3',
            stock: 5,
            min_stock: 8,
          }
        ];
        setMaterials(getMockData<Material>('materials', defaultMaterials));
        return;
      }

      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  const handleAdd = () => {
    setSelectedMaterial(null);
    setIsModalOpen(true);
  };

  const handleEdit = (material: Material) => {
    setSelectedMaterial(material);
    setIsModalOpen(true);
  };

  const handleSuccess = (values?: any) => {
    if (isMockMode && values) {
      let updatedMaterials: Material[];
      if (selectedMaterial) {
        updatedMaterials = materials.map(m => m.id === selectedMaterial.id ? { ...m, ...values } : m);
      } else {
        const newMaterial: Material = {
          id: Math.random().toString(36).substr(2, 9),
          ...values
        };
        updatedMaterials = [newMaterial, ...materials];
      }
      setMaterials(updatedMaterials);
      saveMockData('materials', updatedMaterials);
    }
    setIsModalOpen(false);
    if (!isMockMode) fetchMaterials();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              localStorage.removeItem('user_division');
              setDivision(null);
            }}
            className="p-2 h-auto"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Stok Material</h1>
            <p className="text-slate-500">Pantau ketersediaan bahan bangunan proyek</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Riwayat
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Material
          </Button>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedMaterial ? 'Edit Material' : 'Tambah Material'}
        size="md"
      >
        <MaterialForm 
          onSuccess={handleSuccess} 
          onCancel={() => setIsModalOpen(false)} 
          initialData={selectedMaterial} 
        />
      </Modal>


      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="p-4 flex items-center gap-4">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Package className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Jenis</p>
            <p className="text-lg font-bold text-slate-900">{materials.length}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="p-2 bg-red-50 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Stok Menipis</p>
            <p className="text-lg font-bold text-red-600">
              {materials.filter(m => m.stock <= m.min_stock).length}
            </p>
          </div>
        </Card>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari material..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Nama Material</th>
                <th className="px-6 py-3 font-semibold">Satuan</th>
                <th className="px-6 py-3 font-semibold">Stok Saat Ini</th>
                <th className="px-6 py-3 font-semibold">Min. Stok</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada material ditemukan.
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((material) => (
                  <tr key={material.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{material.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 uppercase">{material.unit}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'text-sm font-bold',
                        material.stock <= material.min_stock ? 'text-red-600' : 'text-slate-900'
                      )}>
                        {material.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{material.min_stock}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        material.stock <= material.min_stock ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                      )}>
                        {material.stock <= material.min_stock ? 'Perlu Order' : 'Aman'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(material)}>Update Stok</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table></div>
      </Card>
    </div>
  );
};

export default Materials;



