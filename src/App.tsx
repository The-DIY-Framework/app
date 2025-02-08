import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AgentCreationForm from './components/AgentCreationForm';
import AgentPage from './pages/AgentPage';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <div className="min-h-screen bg-gray-50 py-8">
            <AgentCreationForm />
          </div>
        } />
        <Route path="/agent/:id" element={<AgentPage />} />
      </Routes>
    </Router>
  );
};

export default App;