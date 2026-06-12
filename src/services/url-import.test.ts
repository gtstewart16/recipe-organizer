import { importRecipeFromUrl } from './url-import';

describe('importRecipeFromUrl', () => {
  it('rejects non-web URLs before fetching', async () => {
    const fetcher = jest.fn();

    await expect(
      importRecipeFromUrl('exp://192.168.4.28:8081/--/share?url=https%3A%2F%2Fexample.com%2Frecipe', {
        fetcher,
      })
    ).rejects.toThrow('Paste a web recipe link that starts with http:// or https://.');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('parses recipe schema JSON-LD into a review draft', async () => {
    const draft = await importRecipeFromUrl('https://example.com/cacio-e-pepe', {
      fetcher: async () =>
        new Response(
          `
            <html>
              <head>
                <script type="application/ld+json">
                  {
                    "@context": "https://schema.org",
                    "@type": "Recipe",
                    "name": "Cacio e Pepe",
                    "image": ["https://images.example.com/cacio.jpg"],
                    "recipeYield": "4",
                    "prepTime": "PT15M",
                    "cookTime": "PT20M",
                    "recipeIngredient": [
                      "12 ounces spaghetti",
                      "2 cups Pecorino Romano",
                      "2 teaspoons black pepper"
                    ],
                    "recipeInstructions": [
                      { "@type": "HowToStep", "text": "Cook the pasta in salted water." },
                      { "@type": "HowToStep", "text": "Toss with cheese, pepper, and pasta water." }
                    ]
                  }
                </script>
              </head>
              <body></body>
            </html>
          `,
          { status: 200 }
        ),
    });

    expect(draft.title).toBe('Cacio e Pepe');
    expect(draft.heroImageUri).toBe('https://images.example.com/cacio.jpg');
    expect(draft.servings).toBe('4');
    expect(draft.prepTime).toBe('15 mins');
    expect(draft.cookTime).toBe('20 mins');
    expect(draft.ingredients).toEqual([
      '12 ounces spaghetti',
      '2 cups Pecorino Romano',
      '2 teaspoons black pepper',
    ]);
    expect(draft.instructions).toEqual([
      'Cook the pasta in salted water.',
      'Toss with cheese, pepper, and pasta water.',
    ]);
    expect(draft.sourceUrl).toBe('https://example.com/cacio-e-pepe');
  });

  it('preserves servings when recipe schema yield is an array', async () => {
    const draft = await importRecipeFromUrl('https://www.skinnytaste.com/grilled-chicken-sandwich/', {
      fetcher: async () =>
        new Response(
          `
            <html>
              <head>
                <script type="application/ld+json">
                  {
                    "@context": "https://schema.org",
                    "@type": "Recipe",
                    "name": "Grilled Chicken Sandwich Recipe",
                    "recipeYield": ["4", "4 servings"],
                    "prepTime": "PT15M",
                    "cookTime": "PT15M",
                    "recipeIngredient": [
                      "4 small boneless skinless chicken breasts",
                      "4 whole wheat rolls"
                    ],
                    "recipeInstructions": [
                      { "@type": "HowToStep", "text": "Grill the chicken until cooked through." }
                    ]
                  }
                </script>
              </head>
            </html>
          `,
          { status: 200 }
        ),
    });

    expect(draft.title).toBe('Grilled Chicken Sandwich Recipe');
    expect(draft.servings).toBe('4');
    expect(draft.prepTime).toBe('15 mins');
    expect(draft.cookTime).toBe('15 mins');
  });

  it('uses recipe schema before remote normalization for regular recipe pages', async () => {
    const normalizer = jest.fn<
      Promise<{ title: string; ingredients: string[]; instructions: string[] }>,
      [{ rawText: string; pageTitle?: string }]
    >(async (_input) => ({
      title: 'Expensive Remote Result',
      ingredients: ['Remote ingredient'],
      instructions: ['Remote instruction.'],
    }));

    const draft = await importRecipeFromUrl('https://example.com/schema-first', {
      fetcher: async () =>
        new Response(
          `
            <html>
              <head>
                <script type="application/ld+json">
                  {
                    "@context": "https://schema.org",
                    "@type": "Recipe",
                    "name": "Schema First Soup",
                    "recipeYield": "6",
                    "recipeIngredient": ["2 cups stock", "1 cup corn"],
                    "recipeInstructions": [
                      { "@type": "HowToStep", "text": "Simmer the stock and corn." }
                    ]
                  }
                </script>
              </head>
              <body>${'newsletter signup '.repeat(2000)}</body>
            </html>
          `,
          { status: 200 }
        ),
      normalizer,
    });

    expect(normalizer).not.toHaveBeenCalled();
    expect(draft.title).toBe('Schema First Soup');
    expect(draft.ingredients).toEqual(['2 cups stock', '1 cup corn']);
    expect(draft.instructions).toEqual(['Simmer the stock and corn.']);
  });

  it('caps text sent to remote normalization when schema is unavailable', async () => {
    let normalizationInput: { rawText: string; pageTitle?: string } | undefined;
    const normalizer = jest.fn(async (input: { rawText: string; pageTitle?: string }) => {
      normalizationInput = input;

      return {
        title: 'Capped Recipe',
        ingredients: ['1 ingredient'],
        instructions: ['Cook it.'],
      };
    });

    await importRecipeFromUrl('https://example.com/giant-recipe-page', {
      fetcher: async () =>
        new Response(
          `
            <html>
              <head>
                <meta property="og:title" content="Giant Recipe Page" />
              </head>
              <body>
                ${'advertisement newsletter comments '.repeat(3000)}
                <h1>Useful Recipe</h1>
                <p>Ingredients: 1 ingredient. Instructions: Cook it.</p>
              </body>
            </html>
          `,
          { status: 200 }
        ),
      normalizer,
    });

    expect(normalizer).toHaveBeenCalled();
    expect(normalizationInput).toBeDefined();
    const rawText = normalizationInput?.rawText ?? '';

    expect(rawText.length).toBeLessThanOrEqual(12000);
    expect(rawText).toContain('Useful Recipe');
    expect(normalizer).toHaveBeenCalledWith(
      expect.objectContaining({
        pageTitle: 'Giant Recipe Page',
      })
    );
  });

  it('falls back to a placeholder draft when no recipe schema exists', async () => {
    const draft = await importRecipeFromUrl('https://example.com/not-a-recipe', {
      fetcher: async () => new Response('<html><body>No recipe here.</body></html>', { status: 200 }),
    });

    expect(draft.title).toBe('Not A Recipe');
    expect(draft.status).toBe('needs_review');
    expect(draft.ingredients.length).toBeGreaterThan(0);
  });

  it('formats ISO durations returned by the remote normalizer', async () => {
    const draft = await importRecipeFromUrl('https://example.com/remote-recipe', {
      fetcher: async () => new Response('<html><body>recipe text</body></html>', { status: 200 }),
      normalizer: async () => ({
        title: 'Remote Recipe',
        ingredients: ['1 squash'],
        instructions: ['Roast it.'],
        prepTime: 'PT15M',
        cookTime: 'PT1H5M',
      }),
    });

    expect(draft.prepTime).toBe('15 mins');
    expect(draft.cookTime).toBe('1 hour 5 mins');
  });

  it('extracts an Instagram reel caption into a reviewable recipe draft', async () => {
    const draft = await importRecipeFromUrl('https://www.instagram.com/reel/DLBKdccunV7/', {
      fetcher: async () =>
        new Response(
          `
            <html>
              <head>
                <meta property="og:title" content="Creator on Instagram: &quot;our favorite banh mi bowls &#x1F955;&quot;" />
                <meta property="og:description" content="our favorite banh mi bowls &#x1F955; Ingredients: 1 lb ground chicken, 2 cups jasmine rice, 1 cucumber, quick pickled carrots. Instructions: Brown the chicken with garlic. Cook the rice. Top with cucumbers and carrots. Drizzle with spicy mayo and serve." />
                <meta property="og:image" content="https://images.example.com/reel-cover.jpg" />
              </head>
            </html>
          `,
          { status: 200 }
        ),
    });

    expect(draft.title).toBe('Banh Mi Bowls');
    expect(draft.heroImageUri).toBe('https://images.example.com/reel-cover.jpg');
    expect(draft.ingredients).toEqual([
      '1 lb ground chicken',
      '2 cups jasmine rice',
      '1 cucumber',
      'quick pickled carrots',
    ]);
    expect(draft.instructions).toEqual([
      'Brown the chicken with garlic.',
      'Cook the rice.',
      'Top with cucumbers and carrots.',
      'Drizzle with spicy mayo and serve.',
    ]);
  });

  it('slims down the Instagram title and splits hyphen-style ingredient captions into lines', async () => {
    const draft = await importRecipeFromUrl('https://www.instagram.com/reel/example-banh-mi/', {
      fetcher: async () =>
        new Response(
          `
            <html>
              <head>
                <meta property="og:title" content="Creator on Instagram: &quot;Our Favorite Banh Mi Bowls Recipe Below&quot;" />
                <meta property="og:description" content="7,248 likes, 48 comments - jacialisont. Our Favorite Banh Mi Bowls Recipe Below *serves 2-3* - 1 lb ground chicken - 1 cup shredded carrots - 1 cucumber (thinly sliced) - 1 jalapeño (thinly sliced) - jasmine rice - green onion (roughly chopped) FOR THE SAUCE: - 1/3 cup coconut aminos - 1 tsp rice vinegar - 1 tbsp sesame oil - 2-3 tbsps honey - 1/4 tsp ground ginger - 3-4 cloves fresh garlic (minced) SRIRACHA MAYO FOR TOPPING: - 2 tbsps mayo - 1 tsp sriracha - splash of water Instructions: Brown the chicken. Simmer the sauce. Assemble the bowls and drizzle with sriracha mayo." />
              </head>
            </html>
          `,
          { status: 200 }
        ),
    });

    expect(draft.title).toBe('Banh Mi Bowls');
    expect(draft.description).toBeUndefined();
    expect(draft.ingredients).toEqual([
      '1 lb ground chicken',
      '1 cup shredded carrots',
      '1 cucumber (thinly sliced)',
      '1 jalapeño (thinly sliced)',
      'jasmine rice',
      'green onion (roughly chopped)',
      '1/3 cup coconut aminos',
      '1 tsp rice vinegar',
      '1 tbsp sesame oil',
      '2-3 tbsps honey',
      '1/4 tsp ground ginger',
      '3-4 cloves fresh garlic (minced)',
      '2 tbsps mayo',
      '1 tsp sriracha',
      'splash of water',
    ]);
    expect(draft.instructions).toEqual([
      'Brown the chicken.',
      'Simmer the sauce.',
      'Assemble the bowls and drizzle with sriracha mayo.',
    ]);
  });

  it('keeps ingredient bullets separate from unlabeled cooking directions', async () => {
    const draft = await importRecipeFromUrl('https://www.instagram.com/reel/example-banh-mi-2/', {
      fetcher: async () =>
        new Response(
          `
            <html>
              <head>
                <meta property="og:title" content="Creator on Instagram: &quot;Our Favorite Banh Mi Bowls!!! Recipe Below&quot;" />
                <script type="application/json">
                  {
                    "caption": "Our Favorite Banh Mi Bowls!!! Recipe Below\\n*serves 2-3* - 1 lb ground chicken - 1 cup shredded carrots - 1 cucumber (thinly sliced) - 1 jalapeño (thinly sliced) - jasmine rice - green onion (roughly chopped) FOR THE SAUCE: - 1/3 cup coconut aminos - 1 tsp rice vinegar - 1 tbsp sesame oil - 2-3 tbsps honey - 1/4 tsp ground ginger - 3-4 cloves fresh garlic (minced) SRIRACHA MAYO FOR TOPPING: - 2 tbsps mayo - 1 tsp sriracha - splash of water Heat up your skillet over medium heat, add a tiny splash of oil and your ground chicken. Break it up til it’s brown. While that cooks, prep your toppings. Give your sauce a quick whisk and pour it into the pan. Mix until fully coated and allow it to simmer. Add your jasmine rice at the base, then add your toppings and drizzle the sauce over the top."
                  }
                </script>
              </head>
            </html>
          `,
          { status: 200 }
        ),
    });

    expect(draft.title).toBe('Banh Mi Bowls');
    expect(draft.ingredients).toEqual([
      '1 lb ground chicken',
      '1 cup shredded carrots',
      '1 cucumber (thinly sliced)',
      '1 jalapeño (thinly sliced)',
      'jasmine rice',
      'green onion (roughly chopped)',
      '1/3 cup coconut aminos',
      '1 tsp rice vinegar',
      '1 tbsp sesame oil',
      '2-3 tbsps honey',
      '1/4 tsp ground ginger',
      '3-4 cloves fresh garlic (minced)',
      '2 tbsps mayo',
      '1 tsp sriracha',
      'splash of water',
    ]);
    expect(draft.instructions).toEqual([
      'Heat up your skillet over medium heat, add a tiny splash of oil and your ground chicken.',
      'Break it up til it’s brown.',
      'While that cooks, prep your toppings.',
      'Give your sauce a quick whisk and pour it into the pan.',
      'Mix until fully coated and allow it to simmer.',
      'Add your jasmine rice at the base, then add your toppings and drizzle the sauce over the top.',
    ]);
  });

  it('prefers AI-normalized recipe output when a normalizer is available', async () => {
    const normalizer = jest.fn(async () => ({
      title: 'Banh Mi Bowls',
      ingredients: ['1 lb ground chicken', '1 cup shredded carrots'],
      instructions: ['Cook the chicken.', 'Assemble the bowls.'],
      servings: '2-3',
      description: undefined,
    }));

    const draft = await importRecipeFromUrl('https://www.instagram.com/reel/DLBKdccunV7/', {
      fetcher: async () =>
        new Response(
          `
            <html>
              <head>
                <meta property="og:title" content="Creator on Instagram: &quot;our favorite banh mi bowls recipe below!&quot;" />
                <meta property="og:description" content="messy social caption text" />
              </head>
            </html>
          `,
          { status: 200 }
        ),
      normalizer,
    });

    expect(normalizer).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: 'url',
        sourceUrl: 'https://www.instagram.com/reel/DLBKdccunV7/',
        rawText: expect.stringContaining('messy social caption text'),
      })
    );
    expect(draft.title).toBe('Banh Mi Bowls');
    expect(draft.ingredients).toEqual(['1 lb ground chicken', '1 cup shredded carrots']);
    expect(draft.instructions).toEqual(['Cook the chicken.', 'Assemble the bowls.']);
  });

  it('throws a friendly error when AI determines the content is not a recipe', async () => {
    const normalizer = jest.fn(async () => ({
      isRecipe: false,
      error: 'This link does not appear to contain a recipe.',
    }));

    await expect(
      importRecipeFromUrl('https://www.instagram.com/reel/baseball-highlights/', {
        fetcher: async () =>
          new Response(
            `
              <html>
                <head>
                  <meta property="og:title" content="Baseball Highlights" />
                  <meta property="og:description" content="Fastball, strikeout, scoreboard, walk-off reactions." />
                </head>
              </html>
            `,
            { status: 200 }
          ),
        normalizer,
      })
    ).rejects.toThrow('This link does not appear to contain a recipe.');
  });
});
