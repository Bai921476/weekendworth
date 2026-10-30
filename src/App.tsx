import { useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AppLayout } from './components/Layout';
import { LandingPage } from './pages/Landing';
import { DiscoverPage } from './pages/Discover';
import { JobDetailPage } from './pages/JobDetail';
import { MyGigsPage } from './pages/MyGigs';
import { WorkCardPage } from './pages/WorkCard';
import { MerchantDashboardPage } from './pages/MerchantDashboard';
import { NewJobPage } from './pages/NewJob';
import { MerchantJobsPage } from './pages/MerchantJobs';
import { ApplicantsPage } from './pages/Applicants';
import { FulfillmentPage } from './pages/Fulfillment';
import { AdminPage } from './pages/Admin';
import { Button, EmptyState } from './components/UI';

function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);
  return null;
}

function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="page">
      <EmptyState
        title="页面走丢了"
        description="这个地址不存在，回首页重新开始吧。"
        action={<Button onClick={() => navigate('/')}>回首页</Button>}
      />
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="student" element={<DiscoverPage />} />
          <Route path="student/jobs/:jobId" element={<JobDetailPage />} />
          <Route path="student/gigs" element={<MyGigsPage />} />
          <Route path="student/work/:orderId" element={<WorkCardPage />} />
          <Route path="merchant" element={<MerchantDashboardPage />} />
          <Route path="merchant/jobs" element={<MerchantJobsPage />} />
          <Route path="merchant/jobs/new" element={<NewJobPage />} />
          <Route path="merchant/jobs/:jobId/applicants" element={<ApplicantsPage />} />
          <Route path="merchant/fulfillment" element={<FulfillmentPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}
