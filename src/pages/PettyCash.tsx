import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PettyCashView } from '../components/petty-cash/PettyCashView';

const PettyCashPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto w-fit">
        <ArrowLeft className="w-5 h-5" />
      </Button>
      <PettyCashView
        division="keuangan"
        accentColor="teal"
        title="Petty Cash Keuangan"
        subtitle="Manajemen Kas Kecil Operasional"
      />
    </div>
  );
};

export default PettyCashPage;
