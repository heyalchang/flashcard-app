// Parse spoken numbers from text to numeric values
export function parseSpokenNumber(text: string): number | null {
  if (!text) return null;
  
  // Normalize the text
  const normalized = text.toLowerCase().trim().replace(/[.,!?]/g, '');
  
  // Simple number words
  const ones: { [key: string]: number } = {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
    'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
    'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
    'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17,
    'eighteen': 18, 'nineteen': 19
  };
  
  const tens: { [key: string]: number } = {
    'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
    'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90
  };
  
  // Check if it's already a number
  const directNumber = parseInt(normalized);
  if (!isNaN(directNumber)) {
    return directNumber;
  }
  
  // Check simple ones
  if (ones[normalized] !== undefined) {
    return ones[normalized];
  }
  
  // Check simple tens
  if (tens[normalized] !== undefined) {
    return tens[normalized];
  }
  
  // Parse compound numbers like "forty eight"
  const words = normalized.split(/[\s-]+/);
  
  if (words.length === 2) {
    const tensWord = words[0];
    const onesWord = words[1];
    
    if (tens[tensWord] !== undefined && ones[onesWord] !== undefined) {
      return tens[tensWord] + ones[onesWord];
    }
  }
  
  // Parse "number and number" format (like "forty and eight")
  if (words.length === 3 && words[1] === 'and') {
    const tensWord = words[0];
    const onesWord = words[2];
    
    if (tens[tensWord] !== undefined && ones[onesWord] !== undefined) {
      return tens[tensWord] + ones[onesWord];
    }
  }
  
  return null;
}