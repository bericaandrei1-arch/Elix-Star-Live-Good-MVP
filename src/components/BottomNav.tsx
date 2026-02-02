import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Plus, MessageCircle, UserRound } from 'lucide-react';

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

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { label: 'Home', path: '/feed', icon: Home },
    { label: 'Discover', path: '/search', icon: Search },
    { label: 'Create', path: '/create', icon: Plus, isCenter: true },
    { label: 'Inbox', path: '/inbox', icon: MessageCircle },
    { label: 'Profile', path: '/profile', icon: UserRound },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[300] bg-black border-t border-[#E6B36A]/20 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-[500px] mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          if (item.isCenter) {
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center -mt-4"
              >
                <div className="w-12 h-12 bg-[#E6B36A] rounded-xl flex items-center justify-center transform transition-transform active:scale-95 shadow-[0_0_15px_rgba(230,179,106,0.3)]">
                  <Icon className="w-7 h-7 text-black stroke-[2px]" />
                </div>
              </button>
            );
          }

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center w-14 gap-1 active:scale-95 transition-transform group"
            >
              <Icon 
                className={`w-6 h-6 stroke-[1.5px] transition-all duration-300 ${
                  active 
                    ? 'text-[#E6B36A] drop-shadow-[0_0_8px_rgba(230,179,106,0.5)]' 
                    : 'text-[#E6B36A]/40'
                }`} 
              />
              <span className={`text-[10px] font-medium transition-colors duration-300 ${
                active ? 'text-[#E6B36A]' : 'text-[#E6B36A]/40'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
