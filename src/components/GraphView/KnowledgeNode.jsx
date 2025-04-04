import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Handle, Position } from 'reactflow';
import useBibleStore from '../../store/useBibleStore';
import NodeEditor from '../NodeEditor/NodeEditor';

const KnowledgeNode = ({ id, data, isConnectable, selected, dragging, onDelete }) => {
  const { t } = useTranslation();
  const setCurrentLocation = useBibleStore(state => state.setCurrentLocation);
  const getVerseContent = useBibleStore(state => state.getVerseContent);
  const [showEditor, setShowEditor] = useState(false);
  const [showCreateConnected, setShowCreateConnected] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [verseContent, setVerseContent] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const nodeRef = useRef(null);
  const tooltipRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  
  const { title, datetime, description, bibleReference, isBibleRef, referencedBy = [], referencedTo = [] } = data;
  const date = new Date(datetime).toLocaleString();
  const connectionCount = (referencedBy?.length || 0) + (referencedTo?.length || 0);
  
  // Load Bible verse content when hovering over Bible reference nodes
  useEffect(() => {
    if (isBibleRef && bibleReference && showTooltip) {
      const content = getVerseContent(bibleReference);
      setVerseContent(content);
    }
  }, [isBibleRef, bibleReference, showTooltip, getVerseContent]);
  
  // Calculate tooltip position when it becomes visible
  useEffect(() => {
    if (showTooltip && nodeRef.current && isBibleRef) {
      const nodeRect = nodeRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: nodeRect.height + 8, // Position below the node with a small gap
        left: nodeRect.width / 2, // Center horizontally
      });
    }
  }, [showTooltip, isBibleRef]);
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);
  
  // Handle mouse enter with debounce to prevent flicker
  const handleMouseEnter = useCallback((e) => {
    e.stopPropagation();
    
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    hoverTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 50); // Short delay to stabilize hover
  }, []);
  
  // Handle mouse leave with debounce to prevent flicker
  const handleMouseLeave = useCallback((e) => {
    e.stopPropagation();
    
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    hoverTimeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 100); // Slightly longer delay before hiding
  }, []);
  
  const handleBibleRefClick = (e) => {
    e.stopPropagation();
    if (bibleReference) {
      const [book, chapter, verse] = bibleReference.split('.');
      setCurrentLocation(book, chapter, verse);
    }
  };
  
  const handleEditClick = (e) => {
    e.stopPropagation(); // Prevent node selection in ReactFlow
    setShowEditor(true);
  };
  
  const handleDeleteClick = (e) => {
    e.stopPropagation(); // Prevent node selection in ReactFlow
    if (onDelete) {
      onDelete(id, title);
    }
  };
  
  const handleCreateConnectedClick = (e) => {
    e.stopPropagation(); // Prevent node selection in ReactFlow
    setShowCreateConnected(true);
  };
  
  // Don't show action buttons for Bible reference nodes
  const showActionButtons = !isBibleRef;
  
  return (
    <>
      <div 
        ref={nodeRef}
        className={`p-4 rounded-lg border min-w-[220px] shadow-sm ${
          isBibleRef 
            ? 'bg-blue-50 border-blue-300 bible-node cursor-pointer-stable' 
            : 'bg-white border-gray-200 cursor-grab'
        } ${selected ? 'ring-2 ring-blue-400' : ''} ${dragging ? 'cursor-grabbing opacity-70' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => isBibleRef && e.stopPropagation()}
      >
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={isConnectable}
          className={`w-3 h-3 ${isBibleRef ? 'bg-blue-500' : 'bg-primary-500'}`}
        />
        
        <div className="flex justify-between items-start">
          <div className={`font-bold text-lg mb-2 ${
            isBibleRef ? 'text-blue-700' : 'text-gray-800'
          }`}>
            {title}
            {connectionCount > 0 && (
              <span className="ml-2 text-xs font-normal bg-gray-100 px-2 py-1 rounded-full">
                {connectionCount} {connectionCount === 1 ? t('node.connection') : t('node.connections')}
              </span>
            )}
          </div>
          
          {showActionButtons && (
            <div className="flex space-x-1">
              <button 
                onClick={handleCreateConnectedClick}
                className="text-xs text-gray-500 hover:text-primary-600 z-10 cursor-pointer-stable"
                aria-label={t('node.actions.createConnected')}
                title={t('node.actions.createConnected')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V15a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V9z" clipRule="evenodd" />
                </svg>
              </button>
              <button 
                onClick={handleEditClick}
                className="text-xs text-gray-500 hover:text-primary-600 z-10 cursor-pointer-stable"
                aria-label={t('node.actions.edit')}
                title={t('node.actions.edit')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
                </svg>
              </button>
              <button
                onClick={handleDeleteClick}
                className="text-xs text-gray-500 hover:text-red-600 z-10 cursor-pointer-stable"
                aria-label={t('node.actions.delete')}
                title={t('node.actions.delete')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        {!isBibleRef && <div className="text-xs text-gray-500 mb-2">{date}</div>}
        
        <div className="text-sm text-gray-700 mb-3">{description}</div>
        
        {bibleReference && !isBibleRef && (
          <div 
            className="text-xs italic text-primary-600 mt-2 cursor-pointer-stable hover:underline"
            onClick={handleBibleRefClick}
            tabIndex={0}
            aria-label={`Navigate to Bible reference ${bibleReference}`}
            onKeyDown={(e) => e.key === 'Enter' && handleBibleRefClick(e)}
          >
            {bibleReference}
          </div>
        )}
        
        <Handle
          type="source"
          position={Position.Bottom}
          isConnectable={isConnectable}
          className={`w-3 h-3 ${isBibleRef ? 'bg-blue-500' : 'bg-primary-500'}`}
        />
      </div>
      
      {/* Bible verse tooltip - only show for Bible reference nodes when hovering */}
      {isBibleRef && verseContent && (
        <div 
          ref={tooltipRef}
          className={`bible-verse-tooltip ${showTooltip ? 'visible' : ''}`}
          style={{ 
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="font-semibold text-blue-800 mb-1">{verseContent.reference}</div>
          <div className="text-sm text-gray-700">{verseContent.text}</div>
        </div>
      )}
      
      {showEditor && (
        <NodeEditor
          existingNode={{ id, data }}
          onClose={() => setShowEditor(false)}
        />
      )}
      
      {showCreateConnected && (
        <NodeEditor
          connectToNode={{ id, data }}
          onClose={() => setShowCreateConnected(false)}
        />
      )}
    </>
  );
};

export default memo(KnowledgeNode); 