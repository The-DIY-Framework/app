import React from 'react';
import AgentInteraction from '@/components/AgentInteraction';

const AgentPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <AgentInteraction />
        </div>
      </div>
    </div>
  );
};

export default AgentPage;