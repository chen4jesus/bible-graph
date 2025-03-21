export const getSelectedText = () => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
    return null;
  }
  
  const range = selection.getRangeAt(0);
  const selectedText = selection.toString().trim();
  
  // Get the verse reference from the parent element
  let verseRef = null;
  let element = range.commonAncestorContainer;
  
  // Navigate up the DOM tree to find verse element
  while (element && !verseRef) {
    if (element.nodeType === 1 && element.dataset && element.dataset.verseRef) {
      verseRef = element.dataset.verseRef;
    }
    element = element.parentElement;
  }
  
  if (!verseRef) return null;
  
  return {
    text: selectedText,
    verseRef,
    range
  };
};

export const clearSelection = () => {
  if (window.getSelection) {
    window.getSelection().removeAllRanges();
  }
};

export const highlightRange = (range, className = 'highlight') => {
  if (!range) return null;
  
  const span = document.createElement('span');
  span.className = className;
  
  try {
    range.surroundContents(span);
    return span;
  } catch (e) {
    console.error('Could not highlight range:', e);
    return null;
  }
}; 