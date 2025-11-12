import React from 'react';

// The routing logic has been moved to index.tsx to simulate a multi-page app.
// This App component is now effectively a placeholder and is not directly
// used by the new page-specific rendering logic.
function App() {
  return (
    <div className="relative min-h-screen bg-[#FFFDFD]">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-10" 
        style={{backgroundImage: "url('https://images.unsplash.com/photo-1496062031456-07b8f162a322?q=80&w=1974&auto=format&fit=crop')"}}
      ></div>
      <div className="relative z-10 flex items-center justify-center h-screen">
        <p className="text-center text-gray-600">
            Application root. Please navigate to a specific HTML page like <a href="/app/login.html" className="underline text-[#D79AA0]">/app/login.html</a>
        </p>
      </div>
    </div>
  );
}

export default App;
