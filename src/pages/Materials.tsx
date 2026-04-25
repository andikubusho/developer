import React, { useEffect, useState } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Package, AlertTriangle, ArrowRightLeft, ArrowLeft } from 'lucide-react';
import { Material } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { MaterialForm } from '../components/forms/MaterialForm';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

const Materials: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const data = await api.get('materials', 'select=*&order=name.asc');
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

  const handleSuccess = () => {
    setIsModalOpen(false);
    fetchMaterials();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Stok Material</h1>
            <p className="text-text-secondary">Pantau ketersediaan bahan bangunan proyek</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><ArrowRightLeft className="w-4 h-4 mr-2" /> Riwayat</Button>
          <Button onClick={handleAdd}><Plus className="w-4 h-4 mr-2" /> Tambah Material</Button>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedMaterial ? 'Edit Material' : 'Tambah Material'} size="md">
        <MaterialForm onSuccess={handleSuccess} onCancel={() => setIsModalOpen(false)} initialData={selectedMaterial} />
      </Modal>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="p-4 flex items-center gap-4">
          <div className="p-2 bg-accent-lavender/20 rounded-xl"><Package className="w-5 h-5 text-accent-dark" /></div>
          <div>
            <p className="text-xs text-text-secondary font-medium">Total Jenis</p>
            <p className="text-lg font-bold text-text-primary">{materials.length}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="p-2 bg-red-50 rounded-xl"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
          <div>
            <p className="text-xs text-text-secondary font-medium">Stok Menipis</p>
            <p className="text-lg font-bold text-red-600">{materials.filter(m => m.stock <= m.min_stock).length}</p>
          </div>
        </Card>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-white/40">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input placeholder="Cari material..." className="w-full h-10 rounded-xl border border-white/40 pl-10 pr-4 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <Table className="min-w-[800px]">
            <THead>
              <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
                <TH className="px-6 py-3 font-semibold">Nama Material</TH>
                <TH className="px-6 py-3 font-semibold">Satuan</TH>
                <TH className="px-6 py-3 font-semibold">Stok Saat Ini</TH>
                <TH className="px-6 py-3 font-semibold text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={4} className="px-6 py-10 text-center text-text-muted">Memuat data...</TD></TR>
              ) : filteredMaterials.length === 0 ? (
                <TR><TD colSpan={4} className="px-6 py-10 text-center text-text-secondary">Tidak ada material ditemukan.</TD></TR>
              ) : (
                filteredMaterials.map((material) => (
                  <TR key={material.id} className="hover:bg-white/30 transition-colors">
                    <TD className="px-6 py-4 font-medium text-text-primary">{material.name}</TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary uppercase">{material.unit}</TD>
                    <TD className="px-6 py-4 font-bold">{material.stock}</TD>
                    <TD className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(material)}>Update Stok</Button>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
      </Card>
    </div>
  );
};

export default Materials;
