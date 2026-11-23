// Both the Site Worker and the installed app serve single-range media requests.
export function audioRange(blob, range, headers) {
  const result = new Headers(headers);
  result.set('Accept-Ranges', 'bytes');
  const match = /^bytes=(\d*)-(\d*)$/i.exec(range);
  if (!match || (!match[1] && !match[2])) {
    result.set('Content-Length', String(blob.size));
    return new Response(blob, {headers: result});
  }
  const start = match[1] ? Number(match[1]) : Math.max(0, blob.size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), blob.size - 1) : blob.size - 1;
  if (start >= blob.size || start > end) {
    result.set('Content-Range', 'bytes */' + blob.size);
    result.set('Content-Length', '0');
    return new Response(null, {status: 416, headers: result});
  }
  result.set('Content-Range', 'bytes ' + start + '-' + end + '/' + blob.size);
  result.set('Content-Length', String(end - start + 1));
  return new Response(blob.slice(start, end + 1), {status: 206, headers: result});
}
