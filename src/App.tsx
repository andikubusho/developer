import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Units from './pages/Units';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import Payments from './pages/Payments';
import Materials from './pages/Materials';
import PurchaseOrders from './pages/PurchaseOrders';
import Reports from './pages/Reports';
import Leads from './pages/Leads';
import FollowUps from './pages/FollowUps';
import Deposits from './pages/Deposits';
import Promos from './pages/Promos';
import PriceList from './pages/PriceList';
import SitePlan from './pages/SitePlan';
import FloorPlan from './pages/FloorPlan';
import MarketingSchedule from './pages/MarketingSchedule';
import MarketingMaster from './pages/MarketingMaster';

// Teknik
import RAB from './pages/RAB';
import ConstructionProgress from './pages/ConstructionProgress';
import PurchaseRequests from './pages/PurchaseRequests';
import SPK from './pages/SPK';
import Opname from './pages/Opname';
import RealCost from './pages/RealCost';

// Keuangan
import KPRDisbursement from './pages/KPRDisbursement';
import SupplierPayments from './pages/SupplierPayments';
import CashFlow from './pages/CashFlow';
import PettyCash from './pages/PettyCash';

// Accounting
import GeneralJournal from './pages/GeneralJournal';
import Ledger from './pages/Ledger';
import FinancialReports from './pages/FinancialReports';
import Taxation from './pages/Taxation';

// HRD
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Payroll from './pages/Payroll';
import Recruitment from './pages/Recruitment';

// Audit
import AuditTransactions from './pages/AuditTransactions';
import AuditStock from './pages/AuditStock';
import AuditCosts from './pages/AuditCosts';

import DivisionSelection from './pages/DivisionSelection';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, division } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!division) {
    return <DivisionSelection />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="units" element={<Units />} />
            <Route path="sales" element={<Sales />} />
            <Route path="customers" element={<Customers />} />
            <Route path="payments" element={<Payments />} />
            <Route path="materials" element={<Materials />} />
            <Route path="purchase-orders" element={<PurchaseOrders />} />
            <Route path="reports" element={<Reports />} />
            <Route path="leads" element={<Leads />} />
            <Route path="follow-ups" element={<FollowUps />} />
            <Route path="deposits" element={<Deposits />} />
            <Route path="promos" element={<Promos />} />
            <Route path="price-list" element={<PriceList />} />
            <Route path="site-plan" element={<SitePlan />} />
            <Route path="floor-plan" element={<FloorPlan />} />
            <Route path="marketing-schedule" element={<MarketingSchedule />} />
            <Route path="marketing-master" element={<MarketingMaster />} />
            
            {/* Teknik */}
            <Route path="rab" element={<RAB />} />
            <Route path="construction-progress" element={<ConstructionProgress />} />
            <Route path="purchase-requests" element={<PurchaseRequests />} />
            <Route path="spk" element={<SPK />} />
            <Route path="opname" element={<Opname />} />
            <Route path="real-cost" element={<RealCost />} />

            {/* Keuangan */}
            <Route path="kpr-disbursement" element={<KPRDisbursement />} />
            <Route path="supplier-payments" element={<SupplierPayments />} />
            <Route path="cash-flow" element={<CashFlow />} />
            <Route path="petty-cash" element={<PettyCash />} />

            {/* Accounting */}
            <Route path="general-journal" element={<GeneralJournal />} />
            <Route path="ledger" element={<Ledger />} />
            <Route path="financial-reports" element={<FinancialReports />} />
            <Route path="taxation" element={<Taxation />} />

            {/* HRD */}
            <Route path="employees" element={<Employees />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="recruitment" element={<Recruitment />} />

            {/* Audit */}
            <Route path="audit-transactions" element={<AuditTransactions />} />
            <Route path="audit-stock" element={<AuditStock />} />
            <Route path="audit-costs" element={<AuditCosts />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}


