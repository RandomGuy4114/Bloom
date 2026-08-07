
import { Suspense } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import './App.css'
import { siteRoutes } from './pageRoutes'
import Landing from './sites/public/landing'
import Login from './sites/auth/login'
import Register from './sites/auth/register'
import ScrollToTop from './components/ScrollToTop'
import RouteFallback from './components/RouteFallback'
import RouteTransition from './components/RouteTransition'
import PagesAuthCallbackPage from './sites/auth/callback'
import PagesLegalCommunityGuidelinesPage from './sites/legal/communityGuidelines'

function App() {
  return (
    <>
      <ScrollToTop />
      <RouteTransition />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/index.html" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/login/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/" element={<Register />} />
          <Route path="/callback" element={<PagesAuthCallbackPage />} />
          <Route path="/callback/" element={<PagesAuthCallbackPage />} />
          <Route path="/pages/legal/community-guidelines/" element={<PagesLegalCommunityGuidelinesPage />} />
          <Route path="/pages/legal/community-guidelines" element={<PagesLegalCommunityGuidelinesPage />} />
          {siteRoutes.map(({ Component, pagePath, path }) => (
            <Route key={path} path={path} element={<Component key={pagePath} />} />
          ))}
          <Route path="*" element={(
            <main className="CenterBox">
              <h1>Page not found</h1>
              <Link to="/">Return to Bloom</Link>
            </main>
          )} />
        </Routes>
      </Suspense>
    </>
  )
}

export default App
