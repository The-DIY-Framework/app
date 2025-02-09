import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletContextProvider } from './providers/WalletProvider';
import { TokenGuard } from './components/TokenGuard';
import AgentCreationForm from './components/AgentCreationForm';
import AgentPage from './pages/AgentPage';

const App = () => {
  return (
    <WalletContextProvider>
      <Router>
        <Routes>
          <Route path="/" element={
            <TokenGuard>
              <div className="min-h-screen bg-gray-50 py-8">
                <AgentCreationForm />
              </div>
            </TokenGuard>
          } />
          <Route path="/agent/:id" element={<AgentPage />} />
        </Routes>
      </Router>
    </WalletContextProvider>
  );
};

export default App;