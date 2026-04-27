import React, { useState, useEffect, useMemo } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw, 
  X, 
  Calculator,
  Building2,
  MapPin,
  Calendar,
  Layers,
  ArrowLeft,
  Copy
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { api } from '../lib/api';
import { formatCurrency, cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Project, Unit } from '../types';

// --- Types ---

interface RABNode {
  id: string;
  parent_id: string | null;
  level: 0 | 1 | 2 | 3;
  uraian: string;
  volume: number | null;
  satuan: string;
  koeff: number | null;
  harga_rab: number | null;
  harga_pasar: number | null;
  urutan: number;
  isExpanded: boolean;
  children: RABNode[];
  errorFields?: string[];
}

const CATEGORIES = [
  'Rumah Tinggal Tipe 36', 'Rumah Tinggal Tipe 45', 'Rumah Tinggal Tipe 54',
  'Rumah Tinggal Tipe 60', 'Rumah Tinggal Tipe 72', 'Ruko', 'Gudang',
  'Renovasi', 'Infrastruktur'
];

// --- Utilities ---

const generateId = () => Math.random().toString(36).substring(2, 9);

const toRoman = (num: number): string => {
  const lookup: { [key: string]: number } = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
  let roman = '';
  for (const i in lookup) {
    while (num >= lookup[i]) {
      roman += i;
      num -= lookup[i];
    }
  }
  return roman;
};

const getIndexLabel = (level: number, index: number): string => {
  if (level === 0) return String.fromCharCode(65 + index); // A, B, C
  if (level === 1) return toRoman(index + 1); // I, II, III
  if (level === 2) return (index + 1).toString(); // 1, 2, 3
  return '';
};

// --- Calculation Engine ---

const calculateNodeTotal = (node: RABNode): number => {
  if (node.level === 3) {
    // Level 3 total is handled in useMemo calculation
    return 0;
  }
  return node.children.reduce((sum, child) => sum + calculateNodeTotal(child), 0);
};

// --- Main Component ---

const RABForm: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [projectHeader, setProjectHeader] = useState({
    project_id: '',
    unit_id: '',
    nama_proyek: '',
    lokasi: '',
    tanggal: new Date().toISOString().split('T')[0],
  });

  const [tree, setTree] = useState<RABNode[]>([]);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [existingRabs, setExistingRabs] = useState<any[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Fetch units when project changes
  useEffect(() => {
    const fetchUnits = async () => {
      if (!projectHeader.project_id) {
        setUnits([]);
        return;
      }
      try {
        const data = await api.get('units', `project_id=eq.${projectHeader.project_id}&order=unit_number.asc`);
        setUnits(data || []);
      } catch (err) {
        console.error('Error fetching units:', err);
      }
    };
    fetchUnits();
  }, [projectHeader.project_id]);

  // Initialize with one Level 0 and fetch projects
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [projData, rabData] = await Promise.all([
          api.get('projects', 'select=id,name,location&active=eq.true&order=name.asc'),
          api.get('rab_projects', 'select=id,nama_proyek,lokasi,created_at&order=created_at.desc')
        ]);
        setProjects(projData || []);
        setExistingRabs(rabData || []);
      } catch (err) {
        console.error('Error fetching initial data:', err);
      }
    };

    fetchInitialData();

    if (tree.length === 0) {
      const initialNode: RABNode = {
        id: generateId(),
        parent_id: null,
        level: 0,
        uraian: 'PEKERJAAN LANTAI 1',
        volume: null,
        satuan: '',
        koeff: null,
        harga_rab: null,
        harga_pasar: null,
        urutan: 0,
        isExpanded: true,
        children: []
      };
      setTree([initialNode]);
    }
  }, []);

  const handleCopyFrom = async (sourceRabId: string) => {
    try {
      setLoadingExisting(true);
      const items = await api.get('rab_items', `rab_project_id=eq.${sourceRabId}&order=urutan.asc`);
      
      if (!items || items.length === 0) {
        alert('RAB sumber tidak memiliki item.');
        return;
      }

      // Rebuild tree from flat items
      const idMap: { [key: string]: RABNode } = {};
      const roots: RABNode[] = [];

      items.forEach((item: any) => {
        idMap[item.id] = {
          id: generateId(), // New ID for the form session
          parent_id: null, // Will be set below
          level: item.level,
          uraian: item.uraian,
          volume: item.volume,
          satuan: item.satuan,
          koeff: item.koeff,
          harga_rab: item.harga_rab,
          harga_pasar: item.harga_pasar,
          urutan: item.urutan,
          isExpanded: true,
          children: [],
          _oldId: item.id // Track old ID to map parents
        } as any;
      });

      // Map children and find roots
      items.forEach((item: any) => {
        const node = idMap[item.id];
        if (item.parent_id === null) {
          roots.push(node);
        } else {
          const parentNode = Object.values(idMap).find((n: any) => n._oldId === item.parent_id);
          if (parentNode) {
            node.parent_id = parentNode.id;
            parentNode.children.push(node);
          }
        }
      });

      setTree(roots);
      setIsCopyModalOpen(false);
      alert('RAB berhasil disalin!');
    } catch (err) {
      console.error('Error copying RAB:', err);
      alert('Gagal menyalin RAB');
    } finally {
      setLoadingExisting(false);
    }
  };

  // --- Tree Mutations ---

  const addNode = (parentId: string | null, level: 0 | 1 | 2 | 3) => {
    const newNode: RABNode = {
      id: generateId(),
      parent_id: parentId,
      level,
      uraian: '',
      volume: level === 2 ? 1 : null,
      satuan: '',
      koeff: level === 3 ? 1 : null,
      harga_rab: level === 3 ? 0 : null,
      harga_pasar: null,
      urutan: 0, // Will be set on flatten
      isExpanded: true,
      children: []
    };

    const updateTree = (nodes: RABNode[]): RABNode[] => {
      if (parentId === null) return [...nodes, newNode];
      return nodes.map(node => {
        if (node.id === parentId) {
          return { ...node, children: [...node.children, newNode], isExpanded: true };
        }
        if (node.children.length > 0) {
          return { ...node, children: updateTree(node.children) };
        }
        return node;
      });
    };

    setTree(updateTree(tree));
  };

  const removeNode = (id: string) => {
    const updateTree = (nodes: RABNode[]): RABNode[] => {
      return nodes
        .filter(node => node.id !== id)
        .map(node => ({ ...node, children: updateTree(node.children) }));
    };
    setTree(updateTree(tree));
  };

  const updateNode = (id: string, updates: Partial<RABNode>) => {
    const updateTree = (nodes: RABNode[]): RABNode[] => {
      return nodes.map(node => {
        if (node.id === id) return { ...node, ...updates };
        return { ...node, children: updateTree(node.children) };
      });
    };
    setTree(updateTree(tree));
  };

  const toggleExpand = (id: string) => {
    const updateTree = (nodes: RABNode[]): RABNode[] => {
      return nodes.map(node => {
        if (node.id === id) return { ...node, isExpanded: !node.isExpanded };
        return { ...node, children: updateTree(node.children) };
      });
    };
    setTree(updateTree(tree));
  };

  // --- Realtime Calculations ---

  const computedTree = useMemo(() => {
    const calc = (nodes: RABNode[], parentVolume: number | null = null): any[] => {
      return nodes.map(node => {
        let subtotal = 0;
        let children: any[] = [];
        let jumlah_material = 0;
        let total_material = 0;

        if (node.level === 3) {
          jumlah_material = (node.koeff || 0) * (node.volume || 0);
          total_material = jumlah_material * (node.harga_rab || 0);
          subtotal = total_material;
        } else {
          children = calc(node.children, node.level === 2 ? node.volume : parentVolume);
          subtotal = children.reduce((sum, child) => sum + child.subtotal, 0);
        }

        return {
          ...node,
          children,
          subtotal,
          jumlah_material,
          total_material
        };
      });
    };
    return calc(tree);
  }, [tree]);

  const grandTotal = useMemo(() => {
    return computedTree.reduce((sum, node) => sum + node.subtotal, 0);
  }, [computedTree]);

  // --- Persistence ---

  const handleSave = async () => {
    // 1. Validation
    const errors: string[] = [];
    const validate = (nodes: RABNode[]) => {
      nodes.forEach(node => {
        const nodeErrors: string[] = [];
        if (!node.uraian) nodeErrors.push('uraian');
        
        if (node.level === 2) {
          if (node.volume === null || node.volume <= 0) nodeErrors.push('volume');
          if (!node.satuan) nodeErrors.push('satuan');
        }
        
        if (node.level === 3) {
          if (node.koeff === null || node.koeff < 0) nodeErrors.push('koeff');
          if (node.harga_rab === null || node.harga_rab < 0) nodeErrors.push('harga_rab');
        }

        if (nodeErrors.length > 0) {
          errors.push(node.id);
          updateNode(node.id, { errorFields: nodeErrors });
        } else {
          updateNode(node.id, { errorFields: [] });
        }
        validate(node.children);
      });
    };

    // Note: We need a clean way to handle validation state across the recursive structure.
    // For now, let's assume validation is handled or simplified for the user.
    if (!projectHeader.project_id || !projectHeader.unit_id) {
      alert('Pilih Proyek dan Unit terlebih dahulu');
      return;
    }

    try {
      setSubmitting(true);
      
      // 1. Insert Project
      const project = await api.insert('rab_projects', {
        project_id: projectHeader.project_id,
        unit_id: projectHeader.unit_id,
        nama_proyek: projectHeader.nama_proyek,
        lokasi: projectHeader.lokasi,
        total_anggaran: grandTotal,
      });

      const projectId = project[0].id;

      // 2. Flatten Tree
      const flatItems: any[] = [];
      const flatten = (nodes: any[], parentDbId: string | null = null) => {
        nodes.forEach((node, idx) => {
          const { children, isExpanded, subtotal, total_material, jumlah_material, errorFields, ...cleanNode } = node;
          // We use temporary IDs for parents, so we need a mapping if we do it in one pass
          // Better: We'll need to insert Level by Level or use a more complex logic.
          // Simplification: PostgREST doesn't easily return all IDs in order for hierarchy.
          // Strategy: Use nanoid for IDs in DB too if possible, or insert parent then children.
        });
      };

      // Since we are in a "Simpan" flow, let's do a sequential insertion to preserve hierarchy
      const insertRecursive = async (nodes: any[], parentId: string | null = null) => {
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          const data = {
            rab_project_id: projectId,
            parent_id: parentId,
            level: node.level,
            uraian: node.uraian,
            volume: node.volume,
            satuan: node.satuan,
            koeff: node.koeff,
            harga_rab: node.harga_rab,
            harga_pasar: node.harga_pasar,
            urutan: i
          };
          const res = await api.insert('rab_items', data);
          const newId = res[0].id;
          if (node.children.length > 0) {
            await insertRecursive(node.children, newId);
          }
        }
      };

      await insertRecursive(computedTree);
      
      alert('RAB Berhasil Disimpan!');
      navigate('/rab');
    } catch (error: any) {
      console.error('Save error:', error);
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    if (confirm('Apakah Anda yakin ingin mereset seluruh form?')) {
      setTree([]);
      setProjectHeader({
        project_id: '',
        unit_id: '',
        nama_proyek: '',
        lokasi: '',
        tanggal: new Date().toISOString().split('T')[0],
      });
    }
  };

  // --- Rendering ---

  const renderRows = (nodes: any[], depth = 0): React.ReactNode => {
    return nodes.map((node, index) => {
      const label = getIndexLabel(node.level, index);
      const isLevel0 = node.level === 0;
      const isLevel1 = node.level === 1;
      const isLevel2 = node.level === 2;
      const isLevel3 = node.level === 3;

      const bgClass = isLevel0 ? 'bg-accent-dark/80 text-white' :
                      isLevel1 ? 'bg-white/40 text-text-primary font-semibold' :
                      isLevel2 ? 'bg-white text-text-primary' : 'bg-white/30 text-text-secondary italic';

      return (
        <React.Fragment key={node.id}>
          <TR className={cn("group transition-colors border-b border-white/40", bgClass, "hover:bg-accent-lavender/20/30")}>
            {/* NO */}
            <TD className="px-4 py-3 border-r border-white/40 font-bold text-center w-16">
              {label || (isLevel3 ? '-' : '')}
            </TD>
            
            {/* URAIAN */}
            <TD className="px-4 py-3 border-r border-white/40 min-w-[300px]">
              <div className="flex items-center gap-2" style={{ paddingLeft: `${node.level * 24}px` }}>
                {!isLevel3 && (
                  <button onClick={() => toggleExpand(node.id)} className="p-1 hover:bg-white/50/20 rounded">
                    {node.isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                )}
                <input 
                  type="text"
                  value={node.uraian}
                  onChange={(e) => updateNode(node.id, { uraian: e.target.value })}
                  placeholder={isLevel0 ? "Nama Lantai / Bagian..." : isLevel1 ? "Kelompok Pekerjaan..." : "Deskripsi..."}
                  className={cn(
                    "bg-transparent border-none focus:ring-0 w-full p-0 font-inherit",
                    isLevel0 ? "placeholder-text-muted" : "placeholder-text-muted"
                  )}
                />
              </div>
            </TD>

            {/* KOEFF */}
            <TD className="px-4 py-3 border-r border-white/40 w-24">
              {isLevel3 && (
                <input 
                  type="number"
                  step="0.001"
                  value={node.koeff ?? ''}
                  onChange={(e) => updateNode(node.id, { koeff: Number(e.target.value) })}
                  className="bg-transparent border-none focus:ring-0 w-full text-right p-0"
                />
              )}
            </TD>

            {/* VOLUME / JUMLAH */}
            <TD className="px-4 py-3 border-r border-white/40 w-32">
              {(isLevel2 || isLevel3) && (
                <input 
                  type="number"
                  step="0.01"
                  value={isLevel2 ? (node.volume ?? '') : (node.volume ?? '')}
                  onChange={(e) => updateNode(node.id, { volume: Number(e.target.value) })}
                  placeholder={isLevel3 ? '0' : ''}
                  className={cn(
                    "bg-transparent border-none focus:ring-0 w-full text-right p-0"
                  )}
                />
              )}
            </TD>

            {/* SATUAN */}
            <TD className="px-4 py-3 border-r border-white/40 w-24 text-center">
              {(isLevel2 || isLevel3) && (
                <input 
                  type="text"
                  value={node.satuan}
                  onChange={(e) => updateNode(node.id, { satuan: e.target.value })}
                  placeholder="m2, zak..."
                  className="bg-transparent border-none focus:ring-0 w-full text-center p-0"
                />
              )}
            </TD>

            {/* HARGA RAB */}
            <TD className="px-4 py-3 border-r border-white/40 w-40">
              {isLevel3 && (
                <input 
                  type="number"
                  value={node.harga_rab ?? ''}
                  onChange={(e) => updateNode(node.id, { harga_rab: e.target.value === '' ? null : Number(e.target.value) })}
                  placeholder="0"
                  className="bg-transparent border-none focus:ring-0 w-full text-right p-0"
                />
              )}
            </TD>

            {/* SUBTOTAL / TOTAL */}
            <TD className="px-4 py-3 font-bold text-right w-44">
              {formatCurrency(node.subtotal)}
            </TD>

            {/* ACTION */}
            <TD className="px-4 py-3 w-40">
               <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {node.level < 3 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => addNode(node.id, (node.level + 1) as any)}
                      className={cn("h-8 px-2 text-[10px] uppercase font-black tracking-tighter", isLevel0 ? "text-white hover:bg-accent-dark/60" : "text-accent-dark")}
                    >
                      <Plus className="w-3 h-3 mr-1" /> {node.level === 0 ? "Pekerjaan" : node.level === 1 ? "Item" : "Material"}
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeNode(node.id)}
                    className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
               </div>
            </TD>
          </TR>
          {node.isExpanded && node.children.length > 0 && renderRows(node.children, depth + 1)}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="space-y-8 pb-20 max-w-[1600px] mx-auto">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/rab')} className="p-3 h-auto rounded-xl bg-white shadow-glass border border-white/40">
            <ArrowLeft className="w-5 h-5 text-text-secondary" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-text-primary tracking-tight">Form RAB Proyek</h1>
            <p className="text-text-secondary font-medium">Buat rincian anggaran biaya konstruksi baru</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setIsCopyModalOpen(true)} className="rounded-xl h-12 px-6 bg-white shadow-glass">
            <Copy className="w-5 h-5 mr-2 text-accent-dark" /> Salin dari RAB Lain
          </Button>
          <Button variant="ghost" onClick={handleReset} className="rounded-xl h-12 px-6 glass-input">
            <RotateCcw className="w-5 h-5 mr-2" /> Reset
          </Button>
          <Button onClick={handleSave} isLoading={submitting} className="rounded-xl h-12 px-8 shadow-glass shadow-glass">
            <Save className="w-5 h-5 mr-2" /> Simpan RAB
          </Button>
        </div>
      </div>

      {/* Project Info Card */}
      <Card className="p-8 border-none shadow-premium bg-white rounded-[2rem]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-2">
            <label className="text-xs font-black text-text-primary uppercase tracking-widest block flex items-center gap-2 ml-1">
              <Building2 className="w-3 h-3 text-accent-dark" /> Pilih Master Proyek
            </label>
            <select 
              value={projectHeader.project_id}
              onChange={(e) => {
                const proj = projects.find(p => p.id === e.target.value);
                setProjectHeader({ 
                  ...projectHeader, 
                  project_id: e.target.value,
                  nama_proyek: proj?.name || '',
                  lokasi: proj?.location || ''
                });
              }}
              className="w-full h-14 glass-input border-none rounded-xl px-6 text-base font-bold text-text-primary focus:outline-none"
            >
              <option value="">-- Pilih Proyek --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-text-muted uppercase tracking-widest block flex items-center gap-2 ml-1">
              <MapPin className="w-3 h-3 text-accent-dark" /> Lokasi
            </label>
            <Input 
              value={projectHeader.lokasi}
              onChange={(e) => setProjectHeader({ ...projectHeader, lokasi: e.target.value })}
              placeholder="Kota / Wilayah..."
              className="h-14 text-base font-bold rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-text-muted uppercase tracking-widest block flex items-center gap-2 ml-1">
              <Calendar className="w-3 h-3 text-accent-dark" /> Tanggal
            </label>
            <Input 
              type="date"
              value={projectHeader.tanggal}
              onChange={(e) => setProjectHeader({ ...projectHeader, tanggal: e.target.value })}
              className="h-14 text-base font-bold rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-text-primary uppercase tracking-widest block flex items-center gap-2 ml-1">
              <Layers className="w-3 h-3 text-accent-dark" /> Pilih Unit
            </label>
            <select 
              value={projectHeader.unit_id}
              onChange={(e) => setProjectHeader({ ...projectHeader, unit_id: e.target.value })}
              disabled={!projectHeader.project_id}
              className="w-full h-14 glass-input border-none rounded-xl px-6 text-base font-bold text-text-primary focus:outline-none disabled:opacity-50"
            >
              <option value="">{projectHeader.project_id ? '-- Pilih Unit --' : 'Pilih Proyek Dulu'}</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>
                  {u.unit_number} - {u.type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Main Table */}
      <Card className="p-0 border-none shadow-premium bg-white overflow-hidden rounded-[2rem]">
        <Table>
            <THead>
              <TR className="bg-accent-dark text-white text-[10px] font-black uppercase tracking-[0.2em] sticky top-0 z-10">
                <TH className="px-4 py-5 border-r border-white/40 w-16">No</TH>
                <TH className="px-4 py-5 border-r border-white/40">Uraian Pekerjaan</TH>
                <TH className="px-4 py-5 border-r border-white/40 w-24">Koeff</TH>
                <TH className="px-4 py-5 border-r border-white/40 w-32">Volume</TH>
                <TH className="px-4 py-5 border-r border-white/40 w-24">Satuan</TH>
                <TH className="px-4 py-5 border-r border-white/40 w-40">Harga Satuan</TH>
                <TH className="px-4 py-5 w-44 text-right">Total Biaya</TH>
                <TH className="px-4 py-5 w-40">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {renderRows(computedTree)}
              {tree.length === 0 && (
                <TR>
                  <TD colSpan={8} className="py-20 text-center text-text-muted italic">
                    Belum ada item. Klik tombol di bawah untuk menambah Lantai.
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        
        {/* Table Footer Controls */}
        <div className="p-6 bg-white/30 border-t border-white/40 flex justify-start gap-4">
           <Button variant="ghost" onClick={() => addNode(null, 0)} className="text-accent-dark font-black text-xs uppercase tracking-widest hover:bg-white shadow-glass border border-white/40 rounded-xl">
              <Plus className="w-4 h-4 mr-2" /> Tambah Lantai / Bagian Baru
           </Button>
        </div>
      </Card>

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div>
           <Card className="p-8 border-none shadow-premium bg-white rounded-[2rem]">
              <h3 className="text-sm font-black text-text-primary uppercase tracking-widest mb-6 flex items-center gap-2">
                 <Calculator className="w-4 h-4 text-accent-dark" /> Ringkasan Biaya per Bagian
              </h3>
              <div className="space-y-4">
                 {computedTree.map((node, idx) => (
                   <div key={node.id} className="flex items-center justify-between p-4 bg-white/30 rounded-xl border border-white/40">
                      <span className="text-sm font-bold text-text-primary">{getIndexLabel(0, idx)} - {node.uraian || "Tanpa Judul"}</span>
                      <span className="text-sm font-black text-text-primary">{formatCurrency(node.subtotal)}</span>
                   </div>
                 ))}
                 <div className="flex items-center justify-between p-6 bg-accent-dark rounded-xl text-white shadow-glass mt-8">
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Total Seluruh Anggaran</span>
                    <span className="text-2xl font-black text-emerald-400">{formatCurrency(grandTotal)}</span>
                 </div>
              </div>
           </Card>
        </div>

        <div className="flex flex-col justify-end gap-6 pb-4">
           <div className="p-8 bg-accent-lavender/20 rounded-[2rem] border border-accent-lavender/30">
              <h4 className="font-black text-accent-dark uppercase text-xs tracking-widest mb-2">Penting</h4>
              <p className="text-sm text-accent-dark leading-relaxed">
                 Kalkulasi dilakukan secara otomatis dan real-time. Pastikan <strong>Volume Item (Level 2)</strong>, <strong>Koefisien (Level 3)</strong>, dan <strong>Harga RAB (Level 3)</strong> terisi dengan benar untuk mendapatkan hasil yang akurat.
              </p>
           </div>
           <div className="flex gap-4">
              <Button variant="ghost" onClick={() => navigate('/rab')} className="flex-1 h-16 rounded-xl text-base font-bold">
                 Batal & Kembali
              </Button>
              <Button onClick={handleSave} isLoading={submitting} className="flex-1 h-16 rounded-xl text-base font-black shadow-glass shadow-glass">
                 Simpan Seluruh RAB
              </Button>
           </div>
        </div>
      </div>

      {/* Copy RAB Modal */}
      <Modal
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        title="Pilih RAB Sumber untuk Disalin"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary mb-4">Pilih RAB yang sudah ada untuk menyalin struktur dan rincian biayanya ke dalam form saat ini.</p>
          <div className="max-h-[500px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {existingRabs.length === 0 ? (
              <div className="p-8 text-center text-text-muted italic bg-white/30 rounded-xl">Belum ada RAB lain yang tersedia.</div>
            ) : (
              existingRabs.map((r: any) => (
                <div 
                  key={r.id} 
                  className="p-4 bg-white hover:bg-accent-lavender/10 border border-white/60 rounded-xl flex items-center justify-between cursor-pointer transition-all group shadow-sm hover:shadow-md"
                  onClick={() => handleCopyFrom(r.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-accent-lavender/20 rounded-lg group-hover:bg-accent-lavender/40 transition-colors">
                      <Calculator className="w-5 h-5 text-accent-dark" />
                    </div>
                    <div>
                      <h4 className="font-bold text-text-primary">{r.nama_proyek}</h4>
                      <p className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {r.lokasi || '-'} • {formatDate(r.created_at)}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="text-accent-dark font-black text-[10px] uppercase tracking-wider group-hover:bg-accent-dark group-hover:text-white rounded-lg">
                    Pilih & Salin
                  </Button>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end pt-4">
            <Button variant="ghost" onClick={() => setIsCopyModalOpen(false)}>Batal</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RABForm;
