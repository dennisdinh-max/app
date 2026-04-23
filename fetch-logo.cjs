const http = require('https');
http.get('https://voltransvn.com/', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const match = data.match(/<img[^>]+src="([^">]+logo[^">]+)"/i);
    if(match) console.log("FOUND LOGO: ", match[1]);
    else console.log("Not found matching logo regex, here are all imgs:", data.match(/<img[^>]+src="([^">]+)"/g)?.slice(0, 5));
  });
});
