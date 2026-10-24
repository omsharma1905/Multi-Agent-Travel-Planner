// uses global fetch

async function testWikiImage(query) {
  const cleanQuery = query.trim();
  const wikiBaseUrl = "https://en.wikipedia.org/w/api.php";
  const commonsBaseUrl = "https://commons.wikimedia.org/w/api.php";

  // Step 1: Query English Wikipedia
  const pageUrl = `${wikiBaseUrl}?action=query&titles=${encodeURIComponent(
    cleanQuery,
  )}&prop=pageimages&piprop=name|thumbnail|original&pithumbsize=1200&format=json&origin=*`;

  const pageRes = await fetch(pageUrl, {
    headers: { "User-Agent": "SafariX/1.0" },
  });
  const pageData = await pageRes.json();
  const page = Object.values(pageData.query?.pages || {})[0];
  console.log(`[${cleanQuery}] pageimage:`, page?.pageimage);
  const rawUrl = page?.original?.source || page?.thumbnail?.source;
  console.log(`[${cleanQuery}] rawUrl:`, rawUrl);

  const isNonPhoto = (name) => !name || /\b(flag|coat_of_arms|seal|emblem|locator|map|insignia|symbol|logo)\b/i.test(name) || /\.svg(\.png)?$/i.test(name);

  if (isNonPhoto(page?.pageimage) || isNonPhoto(rawUrl)) {
    console.log(`[${cleanQuery}] Lead image is a flag/map/coat of arms. Searching Wikimedia Commons...`);
    const searchUrl = `${commonsBaseUrl}?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery + " skyline OR panoramic OR landmark")}&srnamespace=6&srlimit=10&format=json&origin=*`;
    const searchRes = await fetch(searchUrl, { headers: { "User-Agent": "SafariX/1.0" } });
    const searchData = await searchRes.json();
    const hits = (searchData.query?.search || []).filter(h => !isNonPhoto(h.title));
    console.log(`[${cleanQuery}] Commons search hits:`, hits.slice(0, 3).map(h => h.title));
    if (hits.length > 0) {
      const chosenTitle = hits[0].title;
      const infoUrl = `${commonsBaseUrl}?action=query&titles=${encodeURIComponent(chosenTitle)}&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`;
      const infoRes = await fetch(infoUrl, { headers: { "User-Agent": "SafariX/1.0" } });
      const infoData = await infoRes.json();
      const filePage = Object.values(infoData.query?.pages || {})[0];
      const photoUrl = filePage?.imageinfo?.[0]?.url;
      console.log(`[${cleanQuery}] Found real photo:`, photoUrl);
    }
  }
}

async function run() {
  await testWikiImage("Dubai");
  await testWikiImage("United Arab Emirates");
  await testWikiImage("India");
  await testWikiImage("Paris");
}

run().catch(console.error);
