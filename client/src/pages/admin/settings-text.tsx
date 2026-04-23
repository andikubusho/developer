import { useState } from "react";
import { useSettings } from "@/hooks/use-settings";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, Save, RefreshCcw, Type } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsTextPage() {
  const { settings, isLoading, updateSetting, isUpdating } = useSettings();
  const [search, setSearch] = useState("");

  const filteredKeys = Object.keys(settings).filter(key => 
    key.toLowerCase().includes(search.toLowerCase()) || 
    settings[key].toLowerCase().includes(search.toLowerCase())
  );

  const handleUpdate = (key: string, value: string) => {
    updateSetting({ key, value });
  };

  return (
    <>
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] blur-xl opacity-20 animate-pulse" />
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] p-6 sm:p-8 overflow-hidden shadow-2xl border border-white/10">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-black/20 rounded-full blur-3xl" />
            
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-inner group transition-transform hover:scale-105">
                  <Type className="h-8 w-8 sm:h-9 sm:w-9 text-slate-100 animate-in zoom-in duration-500" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Pengaturan Teks</h1>
                    <div className="px-2 py-0.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-widest">
                      Admin
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm sm:text-base font-medium flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-ping" />
                    Ubah teks dan label aplikasi
                  </p>
                </div>
              </div>
              
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                <Input 
                  placeholder="Cari kunci atau teks..." 
                  className="pl-10 h-12 bg-white/10 backdrop-blur-md border border-white/10 text-white placeholder:text-white/40 shadow-inner rounded-xl focus:bg-white/20 transition-all font-medium text-base"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))
          ) : filteredKeys.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-slate-200" />
               </div>
               <p className="text-slate-400 font-bold">Tidak ada teks yang cocok dengan pencarian Anda.</p>
            </div>
          ) : (
            filteredKeys.map((key) => (
              <SettingCard 
                key={key} 
                settingKey={key} 
                value={settings[key]} 
                onSave={handleUpdate}
                isUpdating={isUpdating}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

function SettingCard({ settingKey, value, onSave, isUpdating }: { 
  settingKey: string, 
  value: string, 
  onSave: (k: string, v: string) => void,
  isUpdating: boolean
}) {
  const [currentValue, setCurrentValue] = useState(value);
  const hasChanged = currentValue !== value;

  return (
    <Card className="rounded-[2rem] border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-500 group bg-white">
      <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100/60">
        <div className="flex justify-between items-center">
           <CardTitle className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-colors">
             {settingKey}
           </CardTitle>
           {hasChanged && (
             <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-3 py-1 rounded-full animate-pulse shadow-sm">
               Belum Disimpan
             </span>
           )}
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-3">
          <Label className="text-xs font-bold text-slate-400 flex items-center gap-2 uppercase tracking-widest pl-1">
            Isi Teks / Konten
          </Label>
          <div className="flex gap-3 relative">
             <Input 
               value={currentValue}
               onChange={(e) => setCurrentValue(e.target.value)}
               className={`h-14 bg-slate-50 border-2 focus:bg-white transition-all rounded-xl text-slate-700 font-bold text-base px-4
                 ${hasChanged ? 'border-orange-200 focus:border-orange-400' : 'border-slate-100 focus:border-slate-300'}`}
             />
             <Button 
               disabled={!hasChanged || isUpdating}
               onClick={() => onSave(settingKey, currentValue)}
               className={`h-14 w-14 rounded-xl shrink-0 transition-all duration-300 shadow-lg ${
                 hasChanged 
                   ? 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-300 hover:scale-105' 
                   : 'bg-slate-100 text-slate-400 shadow-none'
               }`}
             >
               {isUpdating ? <RefreshCcw className="h-6 w-6 animate-spin text-white" /> : <Save className="h-6 w-6" />}
             </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
