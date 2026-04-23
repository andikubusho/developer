import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/Card";
import { Download, FileSpreadsheet, FileText, Monitor, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface SummaryCardProps {
  label: string;
  value: string | number;
  icon: any;
  color?: string;
}

function SummaryCard({ label, value, icon: Icon, color = "bg-primary" }: SummaryCardProps) {
  return (
    <Card className="overflow-hidden border-none shadow-sm subtle-shadow hover-elevate transition-all duration-300">
      <CardContent className="p-0">
        <div className="flex items-stretch h-24">
          <div className={`${color} w-3 font-bold`}></div>
          <div className="flex-1 p-4 flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">{label}</p>
            <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tighter leading-none">{value}</h3>
          </div>
          <div className="p-4 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity">
            <Icon className="h-10 w-10 text-slate-900" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ReportLayoutProps {
  title: string;
  subtitle?: string;
  summaryCards?: SummaryCardProps[];
  children: ReactNode;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
  onPrint?: () => void;
}

export function ReportLayout({ 
  title, 
  subtitle, 
  summaryCards, 
  children, 
  onExportExcel, 
  onExportPDF, 
  onPrint 
}: ReportLayoutProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#fafbfc] pb-20">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 pt-6 md:pt-8 pb-8 md:pb-12 px-3 md:px-8 border-b border-slate-700/50 shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-primary/10 rounded-full blur-[60px] md:blur-[100px] -mr-32 -mt-32 md:-mr-48 md:-mt-48 pointer-events-none opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-32 md:w-64 h-32 md:h-64 bg-indigo-500/10 rounded-full blur-[40px] md:blur-[80px] -ml-16 -mb-16 md:-ml-32 md:-mb-32 pointer-events-none opacity-30"></div>
        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 relative z-10">
          <div className="space-y-1 md:space-y-2">
            <Button 
                variant="ghost" 
                size="sm" 
                className="text-slate-400 hover:text-white hover:bg-white/10 -ml-2 mb-1 md:mb-2 group px-2 py-0 h-8 md:h-9"
                onClick={() => setLocation("/")}
            >
                <ArrowLeft className="h-3 md:h-4 w-3 md:w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                <span className="text-[10px] md:text-sm">Kembali ke Dashboard</span>
            </Button>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter leading-tight drop-shadow-md uppercase italic">
              {title}
            </h1>
            {subtitle && (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <p className="text-[10px] md:text-sm font-bold text-slate-400 tracking-wider uppercase opacity-80">{subtitle}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
             {onPrint && (
               <Button 
                 variant="outline" 
                 size="sm" 
                 onClick={onPrint}
                 className="h-8 md:h-10 px-3 md:px-4 bg-white/5 border-white/10 text-white hover:bg-white/20 hover:border-white/30 rounded-lg md:rounded-xl font-bold transition-all active:scale-95 shadow-lg backdrop-blur-sm text-[10px] md:text-sm"
               >
                 <Monitor className="h-3 md:h-4 w-3 md:w-4 mr-2 text-cyan-400" />
                 Layar
               </Button>
             )}
             {onExportExcel && (
               <Button 
                 variant="outline" 
                 size="sm" 
                 onClick={onExportExcel}
                 className="h-8 md:h-10 px-3 md:px-4 bg-white/5 border-white/10 text-white hover:bg-white/20 hover:border-white/30 rounded-lg md:rounded-xl font-bold transition-all active:scale-95 shadow-lg backdrop-blur-sm text-[10px] md:text-sm"
               >
                 <FileSpreadsheet className="h-3 md:h-4 w-3 md:w-4 mr-2 text-emerald-400" />
                 Excel
               </Button>
             )}
             {onExportPDF && (
               <Button 
                 variant="outline" 
                 size="sm" 
                 onClick={onExportPDF}
                 className="h-8 md:h-10 px-3 md:px-4 bg-white/5 border-white/10 text-white hover:bg-white/20 hover:border-white/30 rounded-lg md:rounded-xl font-bold transition-all active:scale-95 shadow-lg backdrop-blur-sm text-[10px] md:text-sm"
               >
                 <FileText className="h-3 md:h-4 w-3 md:w-4 mr-2 text-rose-400" />
                 PDF
               </Button>
             )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 md:px-8 -mt-4 md:-mt-6 space-y-4 md:space-y-6 relative z-20">
        {/* Summary Cards */}
        {summaryCards && summaryCards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryCards.map((card, idx) => (
              <SummaryCard key={idx} {...card} />
            ))}
          </div>
        )}

        {/* Content Area */}
        {children}
      </div>
    </div>
  );
}
