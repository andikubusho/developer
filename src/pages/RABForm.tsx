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
  Copy,
  Search,
  Download,
  Upload,
  FileText
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { api } from '../lib/api';
import { formatCurrency, cn, formatDate } from '../lib/utils';
import * as XLSX from 'xlsx';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
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
  material_price: number | null;
  wage_price: number | null;
  harga_rab: number | null; // This will be the SUM of material + wage
  harga_pasar: number | null;
  material_id: string | null;
  urutan: number;
  is_manual: boolean;   // true = input total langsung, false = pakai koefisien
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
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const editId = searchParams.get('id');
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
    keterangan: '',
  });

  const [tree, setTree] = useState<RABNode[]>([]);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [existingRabs, setExistingRabs] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  // Handle imported tree from list page
  useEffect(() => {
    if (location.state?.importedTree) {
      setTree(location.state.importedTree);
      // Clear state to avoid re-importing on re-render if needed
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  const [materialSearchNodeId, setMaterialSearchNodeId] = useState<string | null>(null);
  const [materialSearchTerm, setMaterialSearchTerm] = useState('');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const fmtIDR = (val: number | null | undefined) => {
    if (val == null) return '';
    if (val === 0) return '0';
    return val.toLocaleString('id-ID');
  };

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

  useEffect(() => {
    const createInitialNode = (): RABNode => ({
      id: generateId(),
      parent_id: null,
      level: 0,
      uraian: 'PEKERJAAN LANTAI 1',
      volume: null,
      satuan: '',
      koeff: null,
      material_price: null,
      wage_price: null,
      harga_rab: null,
      harga_pasar: null,
      material_id: null,
      urutan: 0,
      is_manual: false,
      isExpanded: true,
      children: []
    });

    const fetchAllData = async () => {
      try {
        const [projData, rabData, matData] = await Promise.all([
          api.get('projects', 'select=id,name,location&order=name.asc'),
          api.get('rab_projects', 'select=id,nama_proyek,lokasi,created_at&order=created_at.desc'),
          api.get('materials', 'select=id,name,unit,harga_satuan&order=name.asc')
        ]);
        setProjects(projData || []);
        setExistingRabs(rabData || []);
        setMaterials(matData || []);

        if (editId) {
          const [rabProj, itemsData] = await Promise.all([
            api.get('rab_projects', `select=*&id=eq.${editId}`),
            api.get('rab_items', `rab_project_id=eq.${editId}&order=urutan.asc`)
          ]);

          if (rabProj && rabProj.length > 0) {
            const proj = rabProj[0];
            const matchedProject = (projData || []).find((p: any) => p.name === proj.nama_proyek);
            const resolvedProjectId = proj.project_id || (matchedProject ? matchedProject.id : '');
            const resolvedUnitId = proj.unit_id || proj.kategori || '';

            setProjectHeader({
              project_id: resolvedProjectId,
              unit_id: resolvedUnitId,
              nama_proyek: proj.nama_proyek || '',
              lokasi: proj.lokasi || '',
              tanggal: proj.created_at ? proj.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
              keterangan: proj.keterangan || ''
            });

            if (resolvedProjectId) {
              const unitsData = await api.get('units', `project_id=eq.${resolvedProjectId}&order=unit_number.asc`);
              setUnits(unitsData || []);
            }
          }

          if (itemsData && itemsData.length > 0) {
            const idMap: { [key: string]: RABNode } = {};
            const roots: RABNode[] = [];

            itemsData.forEach((item: any) => {
              idMap[item.id] = {
                id: item.id,
                parent_id: item.parent_id,
                level: item.level,
                uraian: item.uraian,
                volume: item.volume,
                satuan: item.satuan,
                koeff: item.koeff,
                material_price: item.material_price || 0,
                wage_price: item.wage_price || 0,
                harga_rab: item.harga_rab,
                harga_pasar: item.harga_pasar,
                is_manual: item.is_manual || false,
                material_id: item.material_id,
                urutan: item.urutan,
                isExpanded: true,
                children: [],
                _oldId: item.id
              } as any;
            });

            itemsData.forEach((item: any) => {
              const node = idMap[item.id];
              if (item.parent_id === null) {
                roots.push(node);
              } else {
                const parentNode = idMap[item.parent_id];
                if (parentNode) {
                  parentNode.children.push(node);
                }
              }
            });

            setTree(roots);
          } else {
            setTree([createInitialNode()]);
          }
        } else if (tree.length === 0) {
          setTree([createInitialNode()]);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchAllData();
  }, [editId]);

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
          id: generateId(),
          parent_id: null,
          level: item.level,
          uraian: item.uraian,
          volume: item.volume,
          satuan: item.satuan,
          koeff: item.koeff,
          material_price: item.material_price || 0,
          wage_price: item.wage_price || 0,
          harga_rab: item.harga_rab,
          harga_pasar: item.harga_pasar,
          is_manual: item.is_manual || false,
          material_id: item.material_id,
          urutan: item.urutan,
          isExpanded: true,
          children: [],
          _oldId: item.id
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

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Level': 0,
        'Uraian': 'PEKERJAAN PERSIAPAN',
        'Volume': '',
        'Satuan': '',
        'Koefisien': '',
        'Harga Material': '',
        'Harga Upah': '',
        'Harga RAB (Manual)': '',
        'Material ID': ''
      },
      {
        'Level': 'I',
        'Uraian': 'Pembersihan Lahan',
        'Volume': '',
        'Satuan': '',
        'Koefisien': '',
        'Harga Material': '',
        'Harga Upah': '',
        'Harga RAB (Manual)': '',
        'Material ID': ''
      },
      {
        'Level': 1,
        'Uraian': 'Pembersihan dan Perataan (Dengan Rincian)',
        'Volume': 100,
        'Satuan': 'm2',
        'Koefisien': '',
        'Harga Material': '',
        'Harga Upah': '',
        'Harga RAB (Manual)': '',
        'Material ID': ''
      },
      {
        'Level': '',
        'Uraian': '- Pekerja',
        'Volume': 1,
        'Satuan': 'OH',
        'Koefisien': 0.1,
        'Harga Material': 0,
        'Harga Upah': 120000,
        'Harga RAB (Manual)': '',
        'Material ID': ''
      },
      {
        'Level': 1,
        'Uraian': 'Pembersihan Lahan (Upah Borongan)',
        'Volume': 50,
        'Satuan': 'm2',
        'Koefisien': '',
        'Harga Material': 0,
        'Harga Upah': 15000,
        'Harga RAB (Manual)': '',
        'Material ID': ''
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    // Set column widths
    ws['!cols'] = [
      { wch: 8 }, { wch: 40 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template RAB");
    XLSX.writeFile(wb, "Template_RAB.xlsx");
  };

  const handleExportExcel = () => {
    if (tree.length === 0) {
      alert('Belum ada data untuk di-export!');
      return;
    }

    const flatData: any[] = [];
    
    const flatten = (nodes: any[]) => {
      nodes.forEach(node => {
        flatData.push({
          'Level': node.level,
          'Uraian': node.uraian,
          'Volume': node.volume,
          'Satuan': node.satuan,
          'Koefisien': node.koeff,
          'Harga Material': node.material_price,
          'Harga Upah': node.wage_price,
          'Harga RAB (Manual)': node.is_manual ? node.harga_rab : '',
          'Material ID': node.material_id
        });
        if (node.children && node.children.length > 0) {
          flatten(node.children);
        }
      });
    };
    
    flatten(computedTree);
    
    const ws = XLSX.utils.json_to_sheet(flatData);
    // Set column widths
    ws['!cols'] = [
      { wch: 8 }, { wch: 40 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RAB Data");
    XLSX.writeFile(wb, `RAB_${projectHeader.nama_proyek || 'Export'}.xlsx`);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (tree.length > 0 && !confirm('Mengimport Excel akan menghapus data yang ada di form. Lanjutkan?')) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (data.length === 0) {
          alert('Excel kosong!');
          return;
        }

        const ROMANS = new Set(['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV']);

        const resolveLevel = (rawLevel: any, rawUraian: any, row: any): number | null => {
          const str = String(rawLevel ?? '').trim().toUpperCase();
          if (str !== '') {
            // Explicit zero → Level 0
            if (str === '0') return 0;
            // Romans MUST be checked before single-letter: "I" matches both /^[A-Z]$/ and Romans
            if (ROMANS.has(str)) return 1;
            // Single letter A-Z → Level 0 (section labels A, B, C)
            if (/^[A-Z]$/.test(str)) return 0;
            // Positive integers (1, 2, 3…) → Level 2 (item numbers under sub-sections)
            if (/^\d+$/.test(str) && parseInt(str) >= 1) return 2;
          }
          // Blank Level: detect Level 3 by dash prefix or numeric data
          const uraian = String(rawUraian || '').trim();
          const hasData = row['Koefisien'] != null || row['Harga Material'] != null || row['Harga Upah'] != null;
          if (uraian !== '' && (uraian.startsWith('-') || hasData)) return 3;
          return null;
        };

        const newTree: RABNode[] = [];
        const lastNodes: Record<number, RABNode> = {};

        data.forEach((row: any) => {
          const level = resolveLevel(row['Level'], row['Uraian'], row);
          if (level === null) return;

          // Helper to round floating point from Excel
          const round = (val: any, dec = 4) => {
            if (val == null || val === '') return null;
            const num = Number(val);
            return Math.round((num + Number.EPSILON) * Math.pow(10, dec)) / Math.pow(10, dec);
          };

          const rawUraian = String(row['Uraian'] || '');
          const uraian = level === 3 ? rawUraian.replace(/^-\s*/, '').trim() : rawUraian;

          const node: RABNode = {
            id: generateId(),
            parent_id: level > 0 ? (lastNodes[level - 1]?.id || null) : null,
            level: level as any,
            uraian,
            volume: round(row['Volume'], 4),
            satuan: row['Satuan'] || '',
            koeff: round(row['Koefisien'], 4) ?? (level === 3 ? 1 : null),
            material_price: Math.round(Number(row['Harga Material']) || 0),
            wage_price: Math.round(Number(row['Harga Upah']) || 0),
            harga_rab: round(row['Harga RAB (Manual)'], 2),
            harga_pasar: null,
            is_manual: (row['Harga RAB (Manual)'] != null && row['Harga RAB (Manual)'] !== '')
              ? true
              : (level === 2 && (
                  (row['Harga Material'] != null && row['Harga Material'] !== '' && Number(row['Harga Material']) > 0) ||
                  (row['Harga Upah'] != null && row['Harga Upah'] !== '' && Number(row['Harga Upah']) > 0)
                )),
            material_id: row['Material ID'] || null,
            urutan: 0,
            isExpanded: true,
            children: []
          };

          lastNodes[level] = node;

          if (level === 0) {
            newTree.push(node);
          } else {
            const parent = lastNodes[level - 1];
            if (parent) {
              parent.children.push(node);
            } else {
              // Fallback if parent not found due to bad level sequence
              newTree.push(node);
            }
          }
        });

        setTree(newTree);
        alert('RAB berhasil diimport!');
      } catch (err) {
        console.error(err);
        alert('Gagal mengimport Excel. Pastikan format kolom sesuai template.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };
  
  const handleSyncPrices = () => {
    if (!materials || materials.length === 0) {
      alert('Data master material belum termuat sempurna. Silakan tunggu sebentar.');
      return;
    }

    if (!confirm('Perbarui semua harga material di RAB ini sesuai harga Master saat ini? Tindakan ini akan menimpa harga material yang sudah ada di tabel.')) {
      return;
    }

    const priceMap: Record<string, number> = {};
    materials.forEach((m: any) => {
      priceMap[m.id] = Number(m.harga_satuan || 0);
    });

    let changeCount = 0;
    const updateRecursive = (nodes: RABNode[]): RABNode[] => {
      return nodes.map(node => {
        let updatedNode = { ...node };
        if (node.level === 3 && node.material_id && priceMap[node.material_id] !== undefined) {
          const newPrice = priceMap[node.material_id];
          if (updatedNode.material_price !== newPrice) {
            updatedNode.material_price = newPrice;
            changeCount++;
          }
        }
        if (node.children && node.children.length > 0) {
          updatedNode.children = updateRecursive(node.children);
        }
        return updatedNode;
      });
    };

    const newTree = updateRecursive(tree);
    if (changeCount === 0) {
      alert('Semua harga sudah sesuai dengan Master Material.');
    } else {
      setTree(newTree);
      setShowSyncSuccess(true);
      // Auto hide banner after 10 seconds
      setTimeout(() => setShowSyncSuccess(false), 10000);
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
      material_price: level === 3 ? 0 : null,
      wage_price: level === 3 ? 0 : null,
      harga_rab: level === 3 ? 0 : null,
      harga_pasar: null,
      material_id: null,
      urutan: 0,
      is_manual: false,
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
          if (node.is_manual) {
            subtotal = node.harga_rab || 0;
          } else {
            const material = node.material_price || 0;
            const wage = node.wage_price || 0;
            const unitTotal = material + wage;
            
            // Prioritize Volume column if filled, otherwise fallback to Koeff * Parent Volume
            if (node.volume !== null && node.volume !== 0) {
              jumlah_material = node.volume;
            } else {
              jumlah_material = (node.koeff || 0) * (parentVolume || 0);
            }

            total_material = jumlah_material * unitTotal;
            subtotal = total_material;
          }
        } else if (node.level === 2 && node.is_manual) {
          subtotal = (node.volume || 0) * ((node.material_price || 0) + (node.wage_price || 0));
          children = calc(node.children, node.volume);
        } else {
          children = calc(node.children, node.level === 2 ? node.volume : parentVolume);
          subtotal = children.reduce((sum, child) => sum + (child.subtotal || 0), 0);
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

  const { totalMaterial, totalWage } = useMemo(() => {
    // Aggregate from sectionTotals-style calculation so Rekapitulasi = sum of subtotals
    const calcMat = (node: any): number => {
      if (node.level === 3 && !node.is_manual) return (node.jumlah_material || 0) * (node.material_price || 0);
      if (node.level === 3 && node.is_manual) return node.harga_rab || 0;
      return (node.children || []).reduce((s: number, c: any) => s + calcMat(c), 0);
    };
    const calcWage = (node: any): number => {
      if (node.level === 3 && !node.is_manual) return (node.jumlah_material || 0) * (node.wage_price || 0);
      if (node.level === 3 && node.is_manual) return 0;
      if (node.level === 2 && node.is_manual) return (node.volume || 0) * (node.wage_price || 0);
      return (node.children || []).reduce((s: number, c: any) => s + calcWage(c), 0);
    };
    const mat = computedTree.reduce((s: number, n: any) => s + calcMat(n), 0);
    const wage = computedTree.reduce((s: number, n: any) => s + calcWage(n), 0);
    return { totalMaterial: mat, totalWage: wage };
  }, [computedTree]);

  const sectionTotals = useMemo(() => {
    // Sum ALL visible Total Material values (including reference items under LANGSUNG mode)
    const calcMat = (node: any): number => {
      if (node.level === 3 && !node.is_manual) return (node.jumlah_material || 0) * (node.material_price || 0);
      if (node.level === 3 && node.is_manual) return node.harga_rab || 0;
      return (node.children || []).reduce((s: number, c: any) => s + calcMat(c), 0);
    };
    const calcWage = (node: any): number => {
      if (node.level === 3 && !node.is_manual) return (node.jumlah_material || 0) * (node.wage_price || 0);
      if (node.level === 3 && node.is_manual) return 0;
      if (node.level === 2 && node.is_manual) return (node.volume || 0) * (node.wage_price || 0);
      return (node.children || []).reduce((s: number, c: any) => s + calcWage(c), 0);
    };
    const result: Record<string, { mat: number; wage: number }> = {};
    computedTree.forEach((node: any) => {
      result[node.id] = { mat: calcMat(node), wage: calcWage(node) };
    });
    return result;
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
    if (!projectHeader.project_id) {
      alert('Pilih Proyek terlebih dahulu');
      return;
    }

    try {
      setSubmitting(true);
      
      let projectId = '';

      if (editId) {
        // Update Project
        await api.update('rab_projects', editId, {
          project_id: projectHeader.project_id,
          unit_id: projectHeader.unit_id || null,
          kategori: projectHeader.unit_id || null,
          nama_proyek: projectHeader.nama_proyek,
          lokasi: projectHeader.lokasi,
          keterangan: projectHeader.keterangan,
          total_anggaran: totalMaterial + totalWage,
        });
        projectId = editId;

        // Delete old items to be replaced
        const existingItems = await api.get('rab_items', `select=id&rab_project_id=eq.${editId}`);
        if (existingItems && existingItems.length > 0) {
          await Promise.all(existingItems.map((item: any) => api.delete('rab_items', item.id)));
        }
      } else {
        // Insert Project
        const project = await api.insert('rab_projects', {
          project_id: projectHeader.project_id,
          unit_id: projectHeader.unit_id || null,
          kategori: projectHeader.unit_id || null,
          nama_proyek: projectHeader.nama_proyek,
          lokasi: projectHeader.lokasi,
          keterangan: projectHeader.keterangan,
          total_anggaran: totalMaterial + totalWage,
        });
        projectId = project[0].id;
      }

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
          const data: Record<string, any> = {
            rab_project_id: projectId,
            parent_id: parentId,
            level: node.level,
            uraian: node.uraian,
            volume: node.volume,
            satuan: node.satuan,
            koeff: node.koeff,
            material_price: node.material_price,
            wage_price: node.wage_price,
            harga_rab: (node.level === 3 && node.is_manual)
              ? (node.harga_rab || 0)
              : (node.material_price || 0) + (node.wage_price || 0),
            harga_pasar: node.harga_pasar,
            is_manual: node.is_manual || false,
            urutan: i
          };
          if (node.material_id) data.material_id = node.material_id;
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
        keterangan: '',
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
            <TD className="px-4 py-3 border-r border-white/40 min-w-[400px]">
              <div className="flex items-center gap-2" style={{ paddingLeft: `${node.level * 24}px` }}>
                {!isLevel3 && (
                  <button onClick={() => toggleExpand(node.id)} className="p-1 hover:bg-white/50/20 rounded">
                    {node.isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                )}
                {isLevel3 ? (
                  /* Level 3: input autocomplete material */
                  <div className="flex-1 relative flex items-center gap-1.5 bg-white/60 border border-white/60 rounded-lg px-2 py-1 focus-within:border-accent-lavender focus-within:ring-1 focus-within:ring-accent-lavender/30">
                    <Search className="w-3 h-3 text-text-muted flex-shrink-0" />
                    <input
                      type="text"
                      value={materialSearchNodeId === node.id ? materialSearchTerm : (node.uraian || '')}
                      placeholder="Cari / ketik nama material..."
                      onChange={(e) => {
                        setMaterialSearchTerm(e.target.value);
                        if (materialSearchNodeId !== node.id) setMaterialSearchNodeId(node.id);
                      }}
                      onFocus={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setDropdownPos({ top: rect.bottom + 6, left: rect.left - 8 });
                        setMaterialSearchNodeId(node.id);
                        setMaterialSearchTerm(node.uraian || '');
                      }}
                      onBlur={() => {
                        // Delay to allow click on dropdown item
                        setTimeout(() => {
                          if (materialSearchNodeId === node.id) {
                            updateNode(node.id, { uraian: materialSearchTerm || node.uraian });
                          }
                        }, 200);
                      }}
                      className="bg-transparent border-none focus:ring-0 w-full p-0 text-xs text-text-primary placeholder-text-muted"
                    />
                    {node.material_id && (
                      <button
                        type="button"
                        title="Hapus pilihan material"
                        onClick={() => updateNode(node.id, { material_id: null, uraian: '', satuan: '', material_price: 0 })}
                        className="flex-shrink-0 text-text-muted hover:text-rose-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={node.uraian}
                    onChange={(e) => updateNode(node.id, { uraian: e.target.value })}
                    placeholder={isLevel0 ? "Nama Lantai / Bagian..." : isLevel1 ? "Kelompok Pekerjaan..." : "Deskripsi..."}
                    className="bg-transparent border-none focus:ring-0 w-full p-0 text-gray-900 placeholder-text-muted"
                  />
                )}
              </div>
            </TD>

            {/* KOEFF — hanya mode koefisien, Level 3 */}
            <TD className="px-4 py-3 border-r border-white/40 w-20">
              {isLevel3 && !node.is_manual && (
                <input
                  type="number"
                  step="any"
                  value={node.koeff ?? ''}
                  onChange={(e) => updateNode(node.id, { koeff: e.target.value === '' ? null : Number(e.target.value) })}
                  className="bg-transparent border-none focus:ring-0 w-full text-right p-0 text-gray-900"
                />
              )}
              {isLevel3 && node.is_manual && (
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">MANUAL</span>
              )}
            </TD>

            {/* VOLUME */}
            <TD className="px-4 py-3 border-r border-white/40 w-28">
              {isLevel2 && (
                <input
                  type="number"
                  step="any"
                  value={node.volume ?? ''}
                  onChange={(e) => updateNode(node.id, { volume: e.target.value === '' ? null : Number(e.target.value) })}
                  className="bg-transparent border-none focus:ring-0 w-full text-right p-0 text-gray-900"
                />
              )}
              {isLevel3 && !node.is_manual && (
                <input
                  type="number"
                  step="any"
                  value={node.volume ?? ''}
                  onChange={(e) => updateNode(node.id, { volume: e.target.value === '' ? null : Number(e.target.value) })}
                  placeholder="0"
                  className="bg-transparent border-none focus:ring-0 w-full text-right p-0 text-gray-900"
                />
              )}
            </TD>

            {/* SATUAN */}
            <TD className="px-4 py-3 border-r border-white/40 w-20 text-center">
              {(isLevel2 || (isLevel3 && !node.is_manual)) && (
                <input
                  type="text"
                  value={node.satuan}
                  onChange={(e) => updateNode(node.id, { satuan: e.target.value })}
                  placeholder="m2, zak..."
                  className="bg-transparent border-none focus:ring-0 w-full text-center p-0 text-gray-900"
                />
              )}
            </TD>

            {/* HARGA MATERIAL */}
            <TD className="px-4 py-3 border-r border-white/40 w-44">
              {((isLevel3 && !node.is_manual) || (isLevel2 && node.is_manual)) && (
                <div className="flex flex-col items-end gap-0.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={fmtIDR(node.material_price)}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                      updateNode(node.id, { material_price: val === '' ? null : Number(val) });
                    }}
                    placeholder="0"
                    className="bg-transparent border-none focus:ring-0 w-full text-right p-0 font-bold text-gray-900"
                  />
                  {isLevel2 && node.is_manual && (
                    <span className="text-[9px] text-text-muted">per {node.satuan || 'satuan'}</span>
                  )}
                </div>
              )}
            </TD>

            {/* TOTAL MATERIAL */}
            <TD className="px-4 py-3 border-r border-white/40 w-36 text-right font-bold text-blue-700 text-sm">
              {isLevel3 && !node.is_manual && (node.jumlah_material || 0) * (node.material_price || 0) > 0
                ? formatCurrency((node.jumlah_material || 0) * (node.material_price || 0))
                : isLevel2 && node.is_manual && (node.volume || 0) * (node.material_price || 0) > 0
                  ? formatCurrency((node.volume || 0) * (node.material_price || 0))
                  : null}
            </TD>

            {/* HARGA UPAH */}
            <TD className="px-4 py-3 border-r border-white/40 w-44">
              {((isLevel3 && !node.is_manual) || (isLevel2 && node.is_manual)) && (
                <div className="flex flex-col items-end gap-0.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={fmtIDR(node.wage_price)}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                      updateNode(node.id, { wage_price: val === '' ? null : Number(val) });
                    }}
                    placeholder="0"
                    className="bg-transparent border-none focus:ring-0 w-full text-right p-0 font-bold text-gray-900"
                  />
                  {isLevel2 && node.is_manual && (
                    <span className="text-[9px] text-text-muted">per {node.satuan || 'satuan'}</span>
                  )}
                </div>
              )}
            </TD>

            {/* SUBTOTAL / TOTAL — editable di mode manual */}
            <TD className="px-4 py-3 font-bold text-right w-52">
              {isLevel3 && node.is_manual ? (
                <div className="flex items-center justify-end">
                   <input
                    type="text"
                    inputMode="numeric"
                    value={fmtIDR(node.harga_rab)}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                      updateNode(node.id, { harga_rab: val === '' ? null : Number(val) });
                    }}
                    placeholder="0"
                    className="bg-transparent border-none focus:ring-0 w-32 text-right p-0 font-bold text-emerald-700"
                  />
                </div>
              ) : (
                <span className="text-text-primary">{formatCurrency(node.subtotal)}</span>
              )}
            </TD>

            {/* ACTION */}
            <TD className="px-4 py-3 w-40">
               <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isLevel2 && (
                    <button
                      title={node.is_manual ? 'Ganti ke mode Rincian (Level 3)' : 'Input harga langsung (Upah/Opname)'}
                      onClick={() => updateNode(node.id, { is_manual: !node.is_manual, material_price: 0, wage_price: 0 })}
                      className={cn(
                        'h-7 px-2 rounded text-[9px] font-black uppercase tracking-widest border transition-colors',
                        node.is_manual
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                      )}
                    >
                      {node.is_manual ? 'LANGSUNG' : 'RINCIAN'}
                    </button>
                  )}
                  {isLevel3 && (
                    <button
                      title={node.is_manual ? 'Ganti ke mode Koefisien' : 'Ganti ke mode Manual'}
                      onClick={() => updateNode(node.id, { is_manual: !node.is_manual, koeff: null, volume: null })}
                      className={cn(
                        'h-7 px-2 rounded text-[9px] font-black uppercase tracking-widest border transition-colors',
                        node.is_manual
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                      )}
                    >
                      {node.is_manual ? 'M→K' : 'K→M'}
                    </button>
                  )}
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
          {isLevel0 && (
            <tr className="bg-slate-50 border-t border-b-2 border-slate-300">
              <td colSpan={6} className="px-4 py-2.5 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest pr-6">
                Subtotal {node.uraian || 'Bagian'}
              </td>
              <td className="px-4 py-2.5 text-right text-xs font-black text-blue-700">
                {formatCurrency(sectionTotals[node.id]?.mat || 0)}
              </td>
              <td className="px-4 py-2.5 text-right text-xs font-black text-orange-600">
                {formatCurrency(sectionTotals[node.id]?.wage || 0)}
              </td>
              <td className="px-4 py-2.5 text-right text-sm font-black text-slate-700">
                {formatCurrency((sectionTotals[node.id]?.mat || 0) + (sectionTotals[node.id]?.wage || 0))}
              </td>
              <td />
            </tr>
          )}
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
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleDownloadTemplate}
            className="h-12 px-6 rounded-xl bg-white border border-white/40 shadow-glass font-bold text-text-primary"
          >
            <Download className="w-4 h-4 mr-2 text-accent-dark" />
            Template
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportExcel}
            className="h-12 px-6 rounded-xl bg-white border border-white/40 shadow-glass font-bold text-emerald-600"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Excel
          </Button>
          <label className="cursor-pointer">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              className="hidden" 
              onChange={handleImportExcel}
            />
            <div className="h-12 px-6 rounded-xl bg-white border border-white/40 shadow-glass font-bold text-text-primary flex items-center hover:bg-white/50 transition-all">
              <Upload className="w-4 h-4 mr-2 text-emerald-600" />
              Upload RAB
            </div>
          </label>
          <Button variant="outline" onClick={() => setIsCopyModalOpen(true)} className="h-12 px-6 rounded-xl bg-white shadow-glass font-bold text-text-primary">
            <Copy className="w-4 h-4 mr-2 text-accent-dark" /> Salin Dari RAB Lain
          </Button>
          <Button 
            variant="outline" 
            onClick={handleSyncPrices} 
            className="h-12 px-6 rounded-xl bg-white border-amber-200 shadow-glass font-bold text-amber-700 hover:bg-amber-50"
          >
            <RotateCcw className="w-4 h-4 mr-2" /> Sinkron Harga Master
          </Button>
          <Button variant="ghost" onClick={handleReset} className="h-12 px-6 rounded-xl glass-input font-bold text-rose-500">
            <RotateCcw className="w-4 h-4 mr-2" /> Reset
          </Button>
          <Button 
            onClick={handleSave} 
            isLoading={submitting}
            className="h-12 px-8 rounded-xl shadow-premium font-black text-xs uppercase tracking-widest"
          >
            <Save className="w-4 h-4 mr-2" /> {submitting ? 'Menyimpan...' : 'Simpan RAB'}
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
              <Layers className="w-3 h-3 text-accent-dark" /> Pilih Unit <span className="text-text-muted font-normal normal-case">(opsional — kosongkan untuk pekerjaan umum/infrastruktur)</span>
            </label>
            <select
              value={projectHeader.unit_id}
              onChange={(e) => setProjectHeader({ ...projectHeader, unit_id: e.target.value })}
              disabled={!projectHeader.project_id}
              className="w-full h-14 glass-input border-none rounded-xl px-6 text-base font-bold text-text-primary focus:outline-none disabled:opacity-50"
            >
              <option value="">{projectHeader.project_id ? '-- Tanpa Unit (Umum / Infrastruktur) --' : 'Pilih Proyek Dulu'}</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>
                  {u.unit_number} - {u.type}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3 space-y-2">
            <label className="text-xs font-black text-text-primary uppercase tracking-widest block flex items-center gap-2 ml-1">
              <FileText className="w-3 h-3 text-accent-dark" /> Judul RAB / Pekerjaan
            </label>
            <Input
              value={projectHeader.keterangan}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProjectHeader({ ...projectHeader, keterangan: e.target.value })}
              placeholder="Contoh: Pembangunan Rumah Blok A-01, Renovasi Taman, dll..."
              className="h-14 text-base font-black rounded-xl border-accent-lavender/40 focus:border-primary shadow-premium placeholder:font-normal placeholder:italic"
              required
            />
          </div>
        </div>
      </Card>

      {showSyncSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-[2rem] flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm mx-1">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <Save className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-900 uppercase tracking-widest">Harga Berhasil Disinkronkan!</p>
              <p className="text-[11px] font-bold text-emerald-700 mt-0.5">
                Nilai RAB telah diperbarui mengikuti harga Master terbaru. Pastikan untuk menekan tombol <span className="underline italic text-emerald-900 font-black">SIMPAN RAB</span> di atas untuk menyimpan perubahan ini secara permanen.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowSyncSuccess(false)} 
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-emerald-100 text-emerald-400 hover:text-emerald-600 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main Table */}
      <Card className="p-0 border-none shadow-premium bg-white overflow-hidden rounded-[2rem]">
        <Table>
            <THead>
              <TR className="bg-white/60 text-text-primary text-[10px] font-black uppercase tracking-[0.2em] sticky top-0 z-10 border-b border-white/40">
                <TH className="px-4 py-5 border-r border-white/20 w-16">No</TH>
                <TH className="px-4 py-5 border-r border-white/20">Uraian Pekerjaan</TH>
                <TH className="px-4 py-5 border-r border-white/20 w-24">Koeff</TH>
                <TH className="px-4 py-5 border-r border-white/20 w-32">Volume</TH>
                <TH className="px-4 py-5 border-r border-white/20 w-24">Satuan</TH>
                <TH className="px-4 py-5 border-r border-white/20 w-32 text-center text-[8px]">H. Material</TH>
                <TH className="px-4 py-5 border-r border-white/20 w-36 text-right text-[8px]">Total Material</TH>
                <TH className="px-4 py-5 border-r border-white/20 w-32 text-center text-[8px]">H. Upah</TH>
                <TH className="px-4 py-5 w-44 text-right">Total Biaya</TH>
                <TH className="px-4 py-5 w-40">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {renderRows(computedTree)}
              {tree.length === 0 && (
                <TR>
                  <TD colSpan={9} className="py-20 text-center text-text-muted italic">
                    Belum ada item. Klik tombol di bawah untuk menambah Lantai.
                  </TD>
                </TR>
              )}
              {tree.length > 0 && (
                <>
                  <tr className="border-t-2 border-gray-300 bg-gray-50">
                    <td colSpan={5} className="px-4 py-3 text-xs font-black text-gray-600 uppercase tracking-widest">Rekapitulasi</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right text-xs font-black text-blue-700">{formatCurrency(totalMaterial)}</td>
                    <td className="px-4 py-3 text-right text-xs font-black text-orange-600">{formatCurrency(totalWage)}</td>
                    <td className="px-4 py-3 text-right text-sm font-black text-accent-dark">{formatCurrency(totalMaterial + totalWage)}</td>
                    <td className="px-4 py-3" />
                  </tr>
                  <tr className="bg-accent-dark/5">
                    <td colSpan={5} className="px-4 py-2 text-[10px] text-gray-500 uppercase tracking-widest">
                      <span className="inline-flex items-center gap-4">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Material</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />Upah</span>
                      </span>
                    </td>
                    <td colSpan={5} className="px-4 py-2 text-right text-[10px] text-gray-500">
                      {(totalMaterial + totalWage) > 0 && (
                        <span>Material {Math.round(totalMaterial / (totalMaterial + totalWage) * 100)}% · Upah {Math.round(totalWage / (totalMaterial + totalWage) * 100)}%</span>
                      )}
                    </td>
                  </tr>
                </>
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
                 {computedTree.map((node, idx) => {
                   const sec = sectionTotals[node.id];
                   const secTotal = (sec?.mat || 0) + (sec?.wage || 0);
                   return (
                     <div key={node.id} className="flex items-center justify-between p-4 bg-white/30 rounded-xl border border-white/40">
                       <span className="text-sm font-bold text-text-primary">{getIndexLabel(0, idx)} - {node.uraian || "Tanpa Judul"}</span>
                       <span className="text-sm font-black text-text-primary">{formatCurrency(secTotal)}</span>
                     </div>
                   );
                 })}
                 <div className="border-t border-white/40 pt-4 space-y-2 mt-2">
                   <div className="flex items-center justify-between px-2 py-2">
                     <span className="text-xs font-bold text-blue-600 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Total Material</span>
                     <span className="text-sm font-black text-blue-700">{formatCurrency(totalMaterial)}</span>
                   </div>
                   <div className="flex items-center justify-between px-2 py-2">
                     <span className="text-xs font-bold text-orange-500 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />Total Upah</span>
                     <span className="text-sm font-black text-orange-600">{formatCurrency(totalWage)}</span>
                   </div>
                 </div>
                 <div className="flex items-center justify-between p-6 bg-white/50 rounded-xl text-text-primary shadow-3d-inset border border-white/40 mt-2">
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Total Seluruh Anggaran</span>
                    <span className="text-2xl font-black text-accent-lavender">{formatCurrency(totalMaterial + totalWage)}</span>
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
                  <Button size="sm" variant="ghost" className="text-accent-dark font-black text-[10px] uppercase tracking-wider hover:bg-accent-lavender/20 rounded-lg">
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

      {/* Material Search Dropdown — fixed position agar tidak ter-clip overflow table */}
      {materialSearchNodeId && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMaterialSearchNodeId(null)} />
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-2xl w-72 p-2"
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
          >
            <input
              type="text"
              autoFocus
              placeholder="Ketik nama material..."
              value={materialSearchTerm}
              onChange={(e) => setMaterialSearchTerm(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-1 focus:ring-accent-lavender"
            />
            <div className="max-h-52 overflow-y-auto space-y-0.5">
              {materials
                .filter(m => m.name.toLowerCase().includes(materialSearchTerm.toLowerCase()))
                .map((m: any) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      updateNode(materialSearchNodeId, {
                        material_id: m.id,
                        uraian: m.name,
                        satuan: m.unit,
                        material_price: Number(m.harga_satuan || 0)
                      });
                      setMaterialSearchNodeId(null);
                      setMaterialSearchTerm('');
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent-lavender/10 transition-colors"
                  >
                    <div className="text-xs font-bold text-text-primary">{m.name}</div>
                    <div className="text-[10px] text-text-muted">{m.unit} · {m.harga_satuan ? `Rp ${Number(m.harga_satuan).toLocaleString('id-ID')}` : '-'}</div>
                  </button>
                ))
              }
              {materials.filter(m => m.name.toLowerCase().includes(materialSearchTerm.toLowerCase())).length === 0 && (
                <p className="text-center text-[10px] text-text-muted py-4 italic">Material tidak ditemukan</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RABForm;
