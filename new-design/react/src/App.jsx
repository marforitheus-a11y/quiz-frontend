import React from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import Dashboard from './pages/Dashboard'
import QuizPage from './pages/QuizPage'
import Login from './pages/Login'

export default function App(){
  const [route, setRoute] = React.useState('home')
  return (
    <div className="min-h-screen bg-surface text-gray-900">
      <Header onNavigate={setRoute} />
      <main className="p-6 max-w-6xl mx-auto">
        {route === 'home' && <>
          <Hero onStart={() => setRoute('quiz')} />
        </>}
        {route === 'login' && <Login onSuccess={(role)=> setRoute(role === 'admin' ? 'dashboard' : 'quiz')} />}
        {route === 'dashboard' && <Dashboard />}
        {route === 'quiz' && <QuizPage />}
      </main>
    </div>
  )
}
