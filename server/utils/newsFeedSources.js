/**
 * Curated RSS feeds per education category — shared by scraper + DB seed.
 */

const FEEDS_BY_CATEGORY = {
  science: [
    'https://www.nasa.gov/rss/dyn/breaking_news.rss',
    'https://www.sciencedaily.com/rss/all.xml',
    'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
    'https://phys.org/rss-feed/',
    'https://www.space.com/feeds/all',
    'https://www.livescience.com/feeds/all',
  ],
  history: [
    'https://www.history.com/.rss/full',
    'https://www.smithsonianmag.com/rss/latest_articles/',
    'https://feeds.bbci.co.uk/news/world/rss.xml',
  ],
  geography: [
    'https://www.nationalgeographic.com/pages/topic/latest-stories/rss',
    'https://www.bbc.com/travel/rss.xml',
    'https://feeds.bbci.co.uk/news/world/rss.xml',
  ],
  current_affairs: [
    'https://www.isro.gov.in/rss/isro.rss',
    'https://www.thehindu.com/news/national/feeder/default.rss',
    'https://indianexpress.com/feed/',
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://www.theguardian.com/world/rss',
  ],
  technology: [
    'https://techcrunch.com/feed/',
    'https://github.blog/feed/',
    'https://feeds.bbci.co.uk/news/technology/rss.xml',
    'https://www.wired.com/feed/rss',
    'https://www.theverge.com/rss/index.xml',
    'https://www.technologyreview.com/feed/',
  ],
  sports: [
    'https://feeds.bbci.co.uk/sport/rss.xml',
    'https://feeds.bbci.co.uk/sport/cricket/rss.xml',
    'https://www.espncricinfo.com/rss/content/story/feeds/0.xml',
  ],
  environment: [
    'https://www.theguardian.com/environment/rss',
    'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
    'https://www.mongabay.com/feed/',
    'https://www.theguardian.com/uk/environment/rss',
  ],
  arts_culture: [
    'https://www.theguardian.com/books/rss',
    'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
    'https://www.npr.org/books/rss.xml',
  ],
  general_knowledge: [
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://www.smithsonianmag.com/rss/latest_articles/',
    'https://www.theguardian.com/science/rss',
  ],
};

/** Flat list for DB seeding ({ name, url, category, source_type }). */
function buildDefaultSources() {
  const labelFromUrl = (url) => {
    try {
      const host = new URL(url).hostname.replace(/^www\./, '');
      return host.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    } catch {
      return 'News Feed';
    }
  };

  const sources = [];
  for (const [category, urls] of Object.entries(FEEDS_BY_CATEGORY)) {
    for (const url of urls) {
      sources.push({
        name: labelFromUrl(url),
        url,
        category,
        source_type: 'rss',
      });
    }
  }
  return sources;
}

module.exports = { FEEDS_BY_CATEGORY, buildDefaultSources };
