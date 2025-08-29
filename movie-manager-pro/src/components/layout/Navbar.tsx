'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Menu, User, LogOut, Film, TrendingUp, Calendar, Settings } from 'lucide-react';

const Navbar = () => {
  const { user, userProfile, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <nav className="bg-white shadow-lg border-b-4 border-primary sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Film className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-primary">MoviePro</span>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies, actors, directors..."
                className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <button type="submit" className="absolute right-2 top-2">
                <Search className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </form>

          {/* Navigation Links */}
          {user ? (
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/dashboard" className="flex items-center space-x-1 text-gray-700 hover:text-primary">
                <TrendingUp className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              <Link href="/discover" className="flex items-center space-x-1 text-gray-700 hover:text-primary">
                <Film className="h-4 w-4" />
                <span>Discover</span>
              </Link>
              <Link href="/calendar" className="flex items-center space-x-1 text-gray-700 hover:text-primary">
                <Calendar className="h-4 w-4" />
                <span>Calendar</span>
              </Link>
              
              {/* Profile Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-primary"
                >
                  <User className="h-5 w-5" />
                  <span>{userProfile?.displayName}</span>
                </button>
                
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border">
                    <Link href="/profile" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                      <User className="inline h-4 w-4 mr-2" />
                      Profile
                    </Link>
                    <Link href="/settings" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                      <Settings className="inline h-4 w-4 mr-2" />
                      Settings
                    </Link>
                    <button 
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="inline h-4 w-4 mr-2" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Link href="/auth/login" className="text-gray-700 hover:text-primary">
                Login
              </Link>
              <Link href="/auth/signup" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary">
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-4 py-2">
            <form onSubmit={handleSearch} className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies..."
                className="w-full px-4 py-2 border rounded-lg"
              />
            </form>
            
            {user ? (
              <div className="space-y-2">
                <Link href="/dashboard" className="block py-2 text-gray-700">Dashboard</Link>
                <Link href="/discover" className="block py-2 text-gray-700">Discover</Link>
                <Link href="/profile" className="block py-2 text-gray-700">Profile</Link>
                <button onClick={logout} className="block w-full text-left py-2 text-gray-700">
                  Logout
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link href="/auth/login" className="block py-2 text-gray-700">Login</Link>
                <Link href="/auth/signup" className="block py-2 text-primary">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
