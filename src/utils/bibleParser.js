// Try different import approaches for xml2js
let xml2js;
try {
  xml2js = require('xml2js');
} catch (e) {
  console.error('Error requiring xml2js:', e);
  // Try ES module import as fallback
  import('xml2js').then(module => {
    xml2js = module;
  }).catch(err => {
    console.error('Failed to import xml2js:', err);
  });
}

export const parseBibleXML = (xmlContent) => {
  return new Promise((resolve, reject) => {
    console.log('Starting XML parsing with xml2js...');
    if (!xmlContent || xmlContent.length < 100) {
      reject(new Error(`Invalid XML content: ${xmlContent ? 'too short' : 'empty'}`));
      return;
    }

    if (!xml2js || !xml2js.parseString) {
      reject(new Error('XML parser (xml2js) not available'));
      return;
    }

    xml2js.parseString(xmlContent, { explicitArray: false }, (err, result) => {
      if (err) {
        console.error('XML parsing error:', err);
        reject(err);
        return;
      }
      
      try {
        console.log('XML parsed, processing Bible structure...');
        console.log('XML result structure:', Object.keys(result || {}));
        
        if (!result || !result.XMLBIBLE || !result.XMLBIBLE.BIBLEBOOK) {
          reject(new Error('Invalid Bible XML structure'));
          return;
        }

        // Make sure BIBLEBOOK is an array for consistent processing
        const bibleBooks = Array.isArray(result.XMLBIBLE.BIBLEBOOK) 
          ? result.XMLBIBLE.BIBLEBOOK 
          : [result.XMLBIBLE.BIBLEBOOK];
        
        console.log('Found Bible books:', bibleBooks.length);
        const books = [];
        
        bibleBooks.forEach((book) => {
          if (!book || !book.$) {
            console.warn('Invalid book entry, skipping');
            return;
          }

          const bookData = {
            id: book.$.bnumber,
            name: book.$.bname,
            chapters: []
          };
          
          // Handle cases where there's only one chapter or no chapters
          if (!book.CHAPTER) {
            console.warn(`No chapters found in book: ${bookData.name}`);
            books.push(bookData);
            return;
          }

          const chapters = Array.isArray(book.CHAPTER) ? book.CHAPTER : [book.CHAPTER];
          
          chapters.forEach((chapter) => {
            if (!chapter || !chapter.$) {
              console.warn('Invalid chapter entry, skipping');
              return;
            }

            const chapterData = {
              number: chapter.$.cnumber,
              verses: []
            };
            
            // Handle cases where there's only one verse or no verses
            if (!chapter.VERS) {
              console.warn(`No verses found in chapter ${chapterData.number}`);
              bookData.chapters.push(chapterData);
              return;
            }

            const verses = Array.isArray(chapter.VERS) ? chapter.VERS : [chapter.VERS];
            
            verses.forEach((verse) => {
              if (!verse || !verse.$ || verse._ === undefined) {
                console.warn('Invalid verse entry, skipping');
                return;
              }

              chapterData.verses.push({
                number: verse.$.vnumber,
                text: verse._
              });
            });
            
            bookData.chapters.push(chapterData);
          });
          
          books.push(bookData);
        });
        
        console.log('Bible parsing complete, total books:', books.length);
        resolve(books);
      } catch (error) {
        console.error('Error processing Bible structure:', error);
        reject(error);
      }
    });
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