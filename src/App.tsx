
import { Route, Routes } from 'react-router-dom'
import './App.css'
import { siteRoutes } from './pageRoutes'
import Landing from './sites/public/landing'
import Login from './sites/auth/login'
import Register from './sites/auth/register'
import PagesBlogPage from './sites/public/blog'
import PagesRoadmapPage from './sites/public/roadmap'

function App() {
  return (
    <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/index.html" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/login/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/" element={<Register />} />
        <Route path="/blog" element={<PagesBlogPage />} />
        <Route path="/blog/" element={<PagesBlogPage />} />
        <Route path="/roadmap" element={<PagesRoadmapPage />} />
        <Route path="/roadmap/" element={<PagesRoadmapPage />} />
        {siteRoutes.map(({ Component, pagePath, path }) => (
          <Route key={path} path={path} element={<Component key={pagePath} />} />
        ))}
        <Route path="*" element={(
          <main className="CenterBox">
            <h1>Page not found</h1>
            <a href="/">Return to Bloom</a>
          </main>
        )} />
    </Routes>
  )
}

export default App
