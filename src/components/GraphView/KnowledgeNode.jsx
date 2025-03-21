import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import useBibleStore from '../../store/useBibleStore';

const KnowledgeNode = ({ id, data, isConnectable }) => {
  const setCurrentLocation = useBibleStore(state => state.setCurrentLocation);
  
  const { title, datetime, description, bibleReference, isBibleRef, referencedBy = [], referencedTo = [] } = data;
  const date = new Date(datetime).toLocaleString();
  const connectionCount = (referencedBy?.length || 0) + (referencedTo?.length || 0);
  
  const handleBibleRefClick = () => {
    if (bibleReference) {
      const [book, chapter, verse] = bibleReference.split('.');
      setCurrentLocation(book, chapter, verse);
    }
  };
  
  return (
    <div className={`p-4 rounded-lg border min-w-[220px] shadow-sm ${
      isBibleRef 
        ? 'bg-blue-50 border-blue-300' 
        : 'bg-white border-gray-200'
    }`}>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className={`w-3 h-3 ${isBibleRef ? 'bg-blue-500' : 'bg-primary-500'}`}
      />
      
      <div className={`font-bold text-lg mb-2 ${
        isBibleRef ? 'text-blue-700' : 'text-gray-800'
      }`}>
        {title}
        {connectionCount > 0 && (
          <span className="ml-2 text-xs font-normal bg-gray-100 px-2 py-1 rounded-full">
            {connectionCount} {connectionCount === 1 ? 'connection' : 'connections'}
          </span>
        )}
      </div>
      
      {!isBibleRef && <div className="text-xs text-gray-500 mb-2">{date}</div>}
      
      <div className="text-sm text-gray-700 mb-3">{description}</div>
      
      {bibleReference && !isBibleRef && (
        <div 
          className="text-xs italic text-primary-600 mt-2 cursor-pointer hover:underline"
          onClick={handleBibleRefClick}
          tabIndex={0}
          aria-label={`Navigate to Bible reference ${bibleReference}`}
          onKeyDown={(e) => e.key === 'Enter' && handleBibleRefClick()}
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
  );
};

export default memo(KnowledgeNode); 