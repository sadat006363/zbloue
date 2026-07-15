export const getCardStyle = (code: string) => {
  const lines = code.split('\n').length;
  return lines > 25 ? 'scroll' : 'standard';
};