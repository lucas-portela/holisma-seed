export const writeToCursor = (
  cursor: string,
  text: string,
  content: string
) => {
  const cursorIndex = content.indexOf(cursor);
  return (
    content.substring(0, cursorIndex) +
    text +
    cursor +
    content.substring(cursorIndex + cursor.length)
  );
};

export const closeCursor = (cursor: string, content: string) => {
  const cursorIndex = content.indexOf(cursor);
  return (
    content.substring(0, cursorIndex) +
    content.substring(cursorIndex + cursor.length)
  );
};
