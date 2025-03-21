// Alternative parser using browser's built-in DOMParser
export const parseBibleXML = (xmlContent) => {
  return new Promise((resolve, reject) => {
    try {
      console.log('Using browser DOMParser for XML parsing...');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      
      // Check for parsing errors
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        throw new Error('XML parsing error: ' + parseError.textContent);
      }
      
      console.log('XML parsed successfully, extracting Bible structure...');
      
      const books = [];
      const bibleBooks = xmlDoc.querySelectorAll('BIBLEBOOK');
      
      console.log('Found Bible books:', bibleBooks.length);
      
      bibleBooks.forEach((bookElement) => {
        const bookData = {
          id: bookElement.getAttribute('bnumber'),
          name: bookElement.getAttribute('bname'),
          chapters: []
        };
        
        const chapters = bookElement.querySelectorAll('CHAPTER');
        chapters.forEach((chapterElement) => {
          const chapterData = {
            number: chapterElement.getAttribute('cnumber'),
            verses: []
          };
          
          const verses = chapterElement.querySelectorAll('VERS');
          verses.forEach((verseElement) => {
            chapterData.verses.push({
              number: verseElement.getAttribute('vnumber'),
              text: verseElement.textContent
            });
          });
          
          bookData.chapters.push(chapterData);
        });
        
        books.push(bookData);
      });
      
      console.log('Bible parsing complete, total books:', books.length);
      resolve(books);
    } catch (error) {
      console.error('Error parsing Bible XML:', error);
      reject(error);
    }
  });
};

export const getVerseText = (bibleData, book, chapter, verse) => {
  const bookObj = bibleData.find(b => b.id === book || b.name === book);
  if (!bookObj) return null;
  
  const chapterObj = bookObj.chapters.find(c => c.number === chapter.toString());
  if (!chapterObj) return null;
  
  const verseObj = chapterObj.verses.find(v => v.number === verse.toString());
  return verseObj ? verseObj.text : null;
};

export const getChapterVerses = (bibleData, book, chapter) => {
  const bookObj = bibleData.find(b => b.id === book || b.name === book);
  if (!bookObj) return [];
  
  const chapterObj = bookObj.chapters.find(c => c.number === chapter.toString());
  return chapterObj ? chapterObj.verses : [];
};

export const getBookChapters = (bibleData, book) => {
  const bookObj = bibleData.find(b => b.id === book || b.name === book);
  return bookObj ? bookObj.chapters.map(c => c.number) : [];
};

export const getBooks = (bibleData) => {
  return bibleData.map(book => ({
    id: book.id,
    name: book.name
  }));
}; 