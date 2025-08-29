'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { database } from '@/lib/database';
import { X, Plus, Lock, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onListCreated?: () => void;
  initialMovieId?: number;
}

const CreateListModal = ({ isOpen, onClose, onListCreated, initialMovieId }: CreateListModalProps) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setLoading(true);
    try {
      const listId = await database.createList({
        userId: user.uid,
        name: name.trim(),
        description: description.trim(),
        isPublic,
        movies: initialMovieId ? [initialMovieId] : [],
        followers: [],
        likes: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      toast.success('List created successfully!');
      setName('');
      setDescription('');
      setIsPublic(true);
      onClose();
      onListCreated?.();
    } catch (error) {
      console.error('Error creating list:', error);
      toast.error('Failed to create list');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Create New List</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              List Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Favorite Comedies"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your list..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={3}
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Privacy
            </label>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  checked={isPublic}
                  onChange={() => setIsPublic(true)}
                  className="text-primary focus:ring-primary"
                />
                <Globe className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="font-medium">Public</div>
                  <div className="text-sm text-gray-500">Anyone can see this list</div>
                </div>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  checked={!isPublic}
                  onChange={() => setIsPublic(false)}
                  className="text-primary focus:ring-primary"
                />
                <Lock className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="font-medium">Private</div>
                  <div className="text-sm text-gray-500">Only you can see this list</div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 flex items-center justify-center space-x-2 bg-primary text-white py-2 px-4 rounded-lg hover:bg-secondary transition disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>{loading ? 'Creating...' : 'Create List'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateListModal;
