import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import AssetView from '../components/asset/AssetView';

const FixedAssetsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto w-fit">
        <ArrowLeft className="w-5 h-5" />
      </Button>
      <AssetView
        defaultClass="fixed_asset"
        accentColor="indigo"
        pageTitle="Aset Tetap"
        pageSubtitle="Pencatatan Aset Tetap & Penyusutan"
      />
    </div>
  );
};

export default FixedAssetsPage;
