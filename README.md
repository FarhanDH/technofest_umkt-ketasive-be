# Crawling Site API Spec

## Crawling Site Request

Endpoint : POST /crawl

Request Body :

```json
{
  "url": "https://example.com/",
  "maxDepth": 10
}
```

Response Body (Success) :

```json
[
  {
    "url": "https://exmaple.com/",
    "content": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
  }
]
```

## How To Run

1. **Install the dependencies:**

   ```bash
   pnpm install
   ```

2. **Start the dev server:**

   ```bash
   pnpm dev
   ```

   Your api will be live at `http://localhost:4000`!
