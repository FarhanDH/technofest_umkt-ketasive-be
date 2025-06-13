import { serve } from '@hono/node-server';
import { zValidator } from '@hono/zod-validator';
import { Readability } from '@mozilla/readability';
import axios from 'axios';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { JSDOM } from 'jsdom';
import { z } from 'zod';

const app = new Hono();

app.use(
  cors({
    origin: '*',
  }),
);

app.get('/', (c) => {
  return c.text('Hello Hono!');
});

app.post(
  '/crawl',
  zValidator(
    'json',
    z.object({
      url: z.string(),
      maxDepth: z.number().optional().default(10), // maximum number of pages to crawl
    }),
  ),
  async (c) => {
    const { maxDepth, url } = c.req.valid('json');
    const result = await _crawlSite({
      rootUrl: url,
      maxPages: maxDepth,
    });
    return c.json(result);
  },
);

/**
 * _crawlSite will get all important link from root url, then extract
 * the content from each founded link
 */
const _crawlSite = async ({
  rootUrl,
  maxPages = 10,
}: {
  rootUrl: string;
  maxPages?: number;
}) => {
  const urls = await _crawlLinks({
    rootUrl,
    maxPages,
  });
  console.log('crawlLinks: ', urls);
  const results: { url: string; content: string }[] = [];
  for (const url of urls) {
    const page = await _getPageContent({
      url,
    });
    if (page) {
      results.push(page);
    }
  }
  return results;
};

/**
 * _getPageContent extract all the content from each founded link
 */
const _getPageContent = async ({ url }: { url: string }) => {
  try {
    const response = await axios.get(url, { timeout: 8000 });
    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.includes('text/html')) {
      return null;
    }
    const dom = new JSDOM(response.data, { url });
    const doc = dom.window.document;

    const reader = new Readability(doc);
    const article = reader.parse();

    // Cleaning content string
    const content = article?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    // console.log('getPageContent: ', content);

    if (content.length >= 200) {
      return { url, content };
    }
    return null;
  } catch (err) {
    return null;
  }
};

/**
 * _crawlLinks will get all important link from root url
 */
const _crawlLinks = async ({
  rootUrl,
  maxPages = 10,
}: {
  rootUrl: string;
  maxPages?: number;
}) => {
  const normalizedRootUrlObj = new URL(rootUrl);
  // console.log('normalizedRootUrlObj', normalizedRootUrlObj);

  normalizedRootUrlObj.hash = '';
  const normalizedRootUrl = normalizedRootUrlObj.href;

  const visited = new Set<string>();
  const toVisit = [normalizedRootUrl];
  // console.log('toVisit: ', toVisit);
  const baseDomain = new URL(normalizedRootUrl).origin;
  const foundUrls: string[] = [];

  while (toVisit.length > 0 && foundUrls.length < maxPages) {
    const currentUrl = toVisit.pop();
    if (!currentUrl || visited.has(currentUrl)) {
      continue;
    }
    visited.add(currentUrl);

    try {
      const response = await axios.get(currentUrl, { timeout: 8000 });
      // console.log('response: ', response);

      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.includes('text/html')) {
        console.log(`Skipped (not HTML content): ${currentUrl}`);
        continue;
      }
      const dom = new JSDOM(response.data, { url: currentUrl });
      const doc = dom.window.document;
      // console.log('doc: ', doc);

      foundUrls.push(currentUrl);

      const links = Array.from(doc.querySelectorAll('a'))
        .map((a) => a.getAttribute('href'))
        .filter((href): href is string => !!href)
        .map((href) => {
          try {
            const url = new URL(href, currentUrl);
            url.hash = '';
            return url.href;
          } catch {
            return null;
          }
        })
        .filter(
          (href): href is string =>
            !!href && href.startsWith(baseDomain) && !visited.has(href),
        );

      toVisit.push(...links);
    } catch (err) {
      console.warn(`_crawlLinks Failed to crawl: ${currentUrl}`, err);
    }
  }
  return foundUrls;
};

serve(
  {
    fetch: app.fetch,
    port: 4000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
