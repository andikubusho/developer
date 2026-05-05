import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import AssetView from '../components/asset/AssetView';

const AssetToolsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto w-fit">
        <ArrowLeft className="w-5 h-5" />
      </Button>
      <AssetView
        defaultClass="tool"
        accentColor="amber"
        pageTitle="Inventaris Alat Kerja"
        pageSubtitle="Daftar Alat Lapangan, Peminjaman, Mutasi & Opname"
      />
    </div>
  );
};

export default AssetToolsPage;
