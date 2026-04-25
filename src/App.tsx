import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import DivisionSelection from './pages/DivisionSelection';
import Login from './pages/Login';

// Lazy load pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Units = lazy(() => import('./pages/Units'));
const Sales = lazy(() => import('./pages/Sales'));
const Customers = lazy(() => import('./pages/Customers'));
const Payments = lazy(() => import('./pages/Payments'));
const Materials = lazy(() => import('./pages/Materials'));
const PurchaseOrders = lazy(() => import('./pages/PurchaseOrders'));
const Reports = lazy(() => import('./pages/Reports'));
const Leads = lazy(() => import('./pages/Leads'));
const FollowUps = lazy(() => import('./pages/FollowUps'));
const Deposits = lazy(() => import('./pages/Deposits'));
const Promos = lazy(() => import('./pages/Promos'));
const PriceList = lazy(() => import('./pages/PriceList'));
const SitePlan = lazy(() => import('./pages/SitePlan'));
const FloorPlan = lazy(() => import('./pages/FloorPlan'));
const MasterMaterial = lazy(() => import('./pages/MasterMaterial'));
const MarketingSchedule = lazy(() => import('./pages/MarketingSchedule'));
const MarketingMaster = lazy(() => import('./pages/MarketingMaster'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const DocumentTemplates = lazy(() => import('./pages/DocumentTemplates'));

// Teknik
const RAB = lazy(() => import('./pages/RAB'));
const RABForm = lazy(() => import('./pages/RABForm'));
const ConstructionProgress = lazy(() => import('./pages/ConstructionProgress'));
const PurchaseRequests = lazy(() => import('./pages/PurchaseRequests'));
const SPK = lazy(() => import('./pages/SPK'));
const Opname = lazy(() => import('./pages/Opname'));
const RealCost = lazy(() => import('./pages/RealCost'));

// Keuangan
const KPRDisbursement = lazy(() => import('./pages/KPRDisbursement'));
const SupplierPayments = lazy(() => import('./pages/SupplierPayments'));
const CashFlow = lazy(() => import('./pages/CashFlow'));
const PettyCash = lazy(() => import('./pages/PettyCash'));

// Accounting
const GeneralJournal = lazy(() => import('./pages/GeneralJournal'));
const Ledger = lazy(() => import('./pages/Ledger'));
const FinancialReports = lazy(() => import('./pages/FinancialReports'));
const Taxation = lazy(() => import('./pages/Taxation'));

// HRD
const Employees = lazy(() => import('./pages/Employees'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Payroll = lazy(() => import('./pages/Payroll'));
const Recruitment = lazy(() => import('./pages/Recruitment'));

// Audit
const AuditTransactions = lazy(() => import('./pages/AuditTransactions'));
const AuditStock = lazy(() => import('./pages/AuditStock'));
const AuditCosts = lazy(() => import('./pages/AuditCosts'));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-white/30">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-dark"></div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, division } = useAuth();

  if (loading) return <LoadingFallback />;

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
        <Suspense fallback={<LoadingFallback />}>
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
              <Route path="master-material" element={<MasterMaterial />} />
              <Route path="marketing-schedule" element={<MarketingSchedule />} />
              <Route path="marketing-master" element={<MarketingMaster />} />
              <Route path="user-management" element={<UserManagement />} />
              <Route path="document-templates" element={<DocumentTemplates />} />
              
              {/* Teknik */}
              <Route path="rab" element={<RAB />} />
              <Route path="rab/create" element={<ProtectedRoute><RABForm /></ProtectedRoute>} />
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
              <Route path="user-management" element={<UserManagement />} />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}
