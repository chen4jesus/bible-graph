import React, { useState } from 'react';
import useNodeStore from '../../store/useNodeStore';

const NodeEditor = ({ highlightedText, onClose }) => {
  const addNode = useNodeStore(state => state.addNode);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!title.trim()) return;
    
    addNode({
      title,
      description,
      bibleReference: highlightedText.verseRef,
    });
    
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Create Knowledge Node</h2>
        
        <div className="mb-4 p-3 bg-gray-50 rounded border-l-4 border-primary-500 italic text-sm text-gray-700">
          "{highlightedText.text}"
          <div className="text-xs font-semibold mt-1 text-primary-600">
            {highlightedText.verseRef}
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              id="title"
              type="text"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for this node"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              className="w-full p-2 border border-gray-300 rounded h-32 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter insights, thoughts, or context for this verse"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              Create Node
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NodeEditor; 