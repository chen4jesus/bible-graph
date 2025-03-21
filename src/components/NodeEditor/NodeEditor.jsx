import React, { useState, useEffect, useRef } from 'react';
import useNodeStore from '../../store/useNodeStore';
import { useTranslation } from 'react-i18next';

const NodeEditor = ({ highlightedText, existingNode, connectToNode, onClose }) => {
  const { t } = useTranslation();
  const addNode = useNodeStore(state => state.addNode);
  const updateNode = useNodeStore(state => state.updateNode);
  const linkNodes = useNodeStore(state => state.linkNodes);
  const modalRef = useRef(null);
  
  const [title, setTitle] = useState(existingNode ? existingNode.data.title : '');
  const [description, setDescription] = useState(existingNode ? existingNode.data.description : '');
  
  const isEditMode = !!existingNode;
  const isConnectedMode = !!connectToNode;
  
  // Add event listener to handle clicks outside the modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Block scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    // Cleanup function
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);
  
  // Generate title placeholder based on connection source if in connected mode
  const getPlaceholder = () => {
    if (isConnectedMode) {
      return t('node.placeholders.connectedThought', { title: connectToNode.data.title });
    }
    return t('node.placeholders.title');
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!title.trim()) return;
    
    if (isEditMode) {
      updateNode(existingNode.id, {
        title,
        description
      });
    } else {
      const nodeData = {
        title,
        description,
      };
      
      // If created from highlighted text, add the Bible reference
      if (highlightedText) {
        nodeData.bibleReference = highlightedText.verseRef;
      }
      
      // Create the new node
      const newNodeId = addNode(nodeData);
      
      // If this is a connected node, create the link
      if (isConnectedMode && newNodeId) {
        linkNodes(connectToNode.id, newNodeId);
      }
    }
    
    onClose();
  };
  
  // Stop propagation to prevent interaction with elements behind the modal
  const handleModalClick = (e) => {
    e.stopPropagation();
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      style={{ 
        pointerEvents: 'auto',
        cursor: 'default'
      }}
      onClick={handleModalClick}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl"
        style={{ cursor: 'default' }}
      >
        <h2 className="text-xl font-bold mb-4 text-gray-800">
          {isEditMode ? t('node.actions.editKnowledgeNode') : isConnectedMode ? t('node.actions.createConnectedNode') : t('node.actions.createKnowledgeNode')}
        </h2>
        
        {!isEditMode && !isConnectedMode && highlightedText && (
          <div className="mb-4 p-3 bg-gray-50 rounded border-l-4 border-primary-500 italic text-sm text-gray-700">
            "{highlightedText.text}"
            <div className="text-xs font-semibold mt-1 text-primary-600">
              {highlightedText.verseRef}
            </div>
          </div>
        )}
        
        {isEditMode && existingNode.data.bibleReference && (
          <div className="mb-4 p-3 bg-gray-50 rounded border-l-4 border-primary-500 text-sm text-gray-700">
            <div className="text-xs font-semibold mt-1 text-primary-600">
              {t('node.bibleRef')}: {existingNode.data.bibleReference}
            </div>
          </div>
        )}
        
        {isConnectedMode && (
          <div className="mb-4 p-3 bg-gray-50 rounded border-l-4 border-teal-500 text-sm text-gray-700">
            <div className="text-xs font-semibold text-teal-700 mb-1">
              {t('node.actions.creatingNodeConnectedTo')}
            </div>
            <div className="font-medium">{connectToNode.data.title}</div>
            {connectToNode.data.description && (
              <div className="text-xs mt-1 text-gray-600 italic truncate">{connectToNode.data.description}</div>
            )}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              {t('node.title')}
            </label>
            <input
              id="title"
              type="text"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={getPlaceholder()}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              {t('node.description')}
            </label>
            <textarea
              id="description"
              className="w-full p-2 border border-gray-300 rounded h-32 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isConnectedMode ? t('node.placeholders.connectedThought', { title: connectToNode.data.title }) : t('node.placeholders.description')}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50"
              onClick={onClose}
            >
              {t('editConfirm.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              {isEditMode ? t('editConfirm.save') : t('editConfirm.add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NodeEditor; 