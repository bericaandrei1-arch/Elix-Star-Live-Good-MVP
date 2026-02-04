import React, { useMemo, useState } from 'react';
import { ArrowLeft, Search, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SUGGESTED_FRIENDS = [
  { id: 'u1', username: 'bestie_jen', name: 'Jen' },
  { id: 'u2', username: 'mark_travels', name: 'Mark' },
  { id: 'u3', username: 'sarah_dance', name: 'Sarah' },
  { id: 'u4', username: 'elix_radio', name: 'Elix Radio' },
];

export default function FriendsFeed() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [following, setFollowing] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SUGGESTED_FRIENDS;
    return SUGGESTED_FRIENDS.filter(
      (u) => u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="min-h-screen bg-black text-white flex justify-center">
      <div className="w-full max-w-[500px]">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-1">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-lg font-bold">Friends</h1>
          </div>
          <button onClick={() => navigate('/search')} aria-label="Search"><Search size={24} /></button>
        </div>

        <div className="px-4">
          <div className="flex items-center gap-2 bg-transparent border border-transparent rounded-2xl px-3 py-2">
            <Search size={18} className="text-white/60" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
              placeholder="Search friends"
              aria-label="Search friends"
            />
          </div>
        </div>

        <div className="p-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[55vh] text-center p-8 opacity-60">
              <UserPlus size={48} className="mb-4" />
              <h2 className="text-xl font-bold mb-2">No results</h2>
              <p>Try a different search.</p>
            </div>
          ) : (
            filtered.map((u) => {
              const isFollowing = !!following[u.id];
              return (
                <div key={u.id} className="flex items-center justify-between bg-transparent border border-transparent rounded-2xl p-3">
                  <button
                    type="button"
                    className="flex items-center gap-3 text-left"
                    onClick={() => navigate(`/profile/${u.id}`)}
                  >
                    <div className="w-11 h-11 bg-gray-700 rounded-full overflow-hidden">
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&background=random`}
                        alt={u.username}
                      />
                    </div>
                    <div>
                      <div className="text-sm font-bold">{u.username}</div>
                      <div className="text-xs text-white/60">{u.name}</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                      isFollowing
                        ? 'bg-transparent border-transparent text-white'
                        : 'bg-[#E6B36A] border-[#E6B36A] text-black'
                    }`}
                    onClick={() => setFollowing((prev) => ({ ...prev, [u.id]: !isFollowing }))}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
