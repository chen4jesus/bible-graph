import React, { useState } from 'react';
import useNodeStore from '../../store/useNodeStore';
import useBibleStore from '../../store/useBibleStore';
import NodeEditor from './NodeEditor';

const NodeTable = () => {
  const nodes = useNodeStore(state => state.nodes.filter(node => !node.data.isBibleRef));
  const setCurrentLocation = useBibleStore(state => state.setCurrentLocation);
  const [nodeToEdit, setNodeToEdit] = useState(null);
  const [nodeToConnectFrom, setNodeToConnectFrom] = useState(null);
  
  const handleBibleRefClick = (bibleReference) => {
    if (bibleReference) {
      const [book, chapter, verse] = bibleReference.split('.');
      setCurrentLocation(book, chapter, verse);
    }
  };
  
  const handleEditClick = (node) => {
    setNodeToEdit(node);
  };
  
  const handleConnectClick = (node) => {
    setNodeToConnectFrom(node);
  };
  
  if (nodes.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">No knowledge nodes have been created yet. Highlight text in the Bible reader to create nodes.</p>
      </div>
    );
  }
  
  return (
    <>
      <div className="overflow-x-auto">
        <h2 className="text-xl font-bold mb-4 px-4">Knowledge Nodes ({nodes.length})</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created At
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bible Reference
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Connections
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {nodes.map((node) => {
              const { title, datetime, description, bibleReference, referencedBy = [], referencedTo = [] } = node.data;
              const date = new Date(datetime).toLocaleString();
              const connections = (referencedBy?.length || 0) + (referencedTo?.length || 0);
              
              return (
                <tr key={node.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{date}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {bibleReference && (
                      <div 
                        className="text-sm text-primary-600 cursor-pointer hover:underline"
                        onClick={() => handleBibleRefClick(bibleReference)}
                      >
                        {bibleReference}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">{description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{connections}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button 
                        className="text-teal-600 hover:text-teal-900"
                        onClick={() => handleConnectClick(node)}
                        aria-label={`Create connected node from ${title}`}
                        title="Create connected node"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V15a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V9z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button 
                        className="text-primary-600 hover:text-primary-900"
                        onClick={() => handleEditClick(node)}
                        aria-label={`Edit ${title}`}
                        title="Edit node"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {nodeToEdit && (
        <NodeEditor
          existingNode={nodeToEdit}
          onClose={() => setNodeToEdit(null)}
        />
      )}
      
      {nodeToConnectFrom && (
        <NodeEditor
          connectToNode={nodeToConnectFrom}
          onClose={() => setNodeToConnectFrom(null)}
        />
      )}
    </>
  );
};

export default NodeTable; 