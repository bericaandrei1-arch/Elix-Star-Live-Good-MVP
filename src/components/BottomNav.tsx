import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  if (
    location.pathname === '/upload' ||
    location.pathname === '/create' ||
    location.pathname.startsWith('/create/') ||
    location.pathname === '/live' ||
    location.pathname.startsWith('/live/') ||
    location.pathname === '/login' ||
    location.pathname === '/register'
  ) {
    return null;
  }

  return (
    <nav className="fixed bottom-8 left-0 right-0 z-[199] pointer-events-none bg-transparent">
      <div className="flex justify-center px-2 pb-0 bg-transparent">
        <div className="relative w-full max-w-[500px]" style={{ transform: 'scaleY(0.85)' }}>
          {/* Background bar with LUXURY GLOW */}
          <img 
            src="/navbar-bg.png" 
            alt="" 
            className="w-full h-auto pointer-events-none"
            draggable={false}
            style={{
              filter: 'drop-shadow(0 -4px 20px rgba(230,179,106,0.3)) drop-shadow(0 0 40px rgba(0,0,0,0.8))',
            }}
          />
          
          {/* Plus button in center circle - LUXURY STYLE */}
          <button
            onClick={() => navigate('/create')}
            className="absolute left-1/2 top-[-1%] -translate-x-1/2 w-[20%] hover:scale-110 active:scale-95 transition-all duration-300 pointer-events-auto"
          >
            <div className="relative">
              <img src="/nav-icons/plus.png" alt="Create" className="w-full h-auto relative z-10" draggable={false} />
            </div>
          </button>
          
          {/* Home icon - LUXURY HOVER */}
          <button
            onClick={() => navigate('/feed')}
            className="absolute left-[6.5%] top-[35%] w-[10%] hover:scale-110 active:scale-90 transition-all duration-300 pointer-events-auto hover:brightness-125"
          >
            <img src="/nav-icons/home.png" alt="Home" className="w-full h-auto" draggable={false} />
          </button>
          
          {/* Friends icon - LUXURY HOVER */}
          <button
            onClick={() => navigate('/friends')}
            className="absolute left-[23%] top-[35%] w-[10%] hover:scale-110 active:scale-90 transition-all duration-300 pointer-events-auto hover:brightness-125"
          >
            <img src="/nav-icons/friends.png" alt="Friends" className="w-full h-auto" draggable={false} />
          </button>
          
          {/* Inbox icon - LUXURY HOVER */}
          <button
            onClick={() => navigate('/inbox')}
            className="absolute right-[24.5%] top-[35%] w-[10%] hover:scale-110 active:scale-90 transition-all duration-300 pointer-events-auto hover:brightness-125"
          >
            <img src="/nav-icons/inbox.png" alt="Inbox" className="w-full h-auto" draggable={false} />
          </button>
          
          {/* Profile icon - LUXURY HOVER */}
          <button
            onClick={() => navigate('/profile')}
            className="absolute right-[6.5%] top-[35%] w-[10%] hover:scale-110 active:scale-90 transition-all duration-300 pointer-events-auto hover:brightness-125"
          >
            <img src="/nav-icons/profile.png" alt="Profile" className="w-full h-auto" draggable={false} />
          </button>
        </div>
      </div>
    </nav>
  );
};
