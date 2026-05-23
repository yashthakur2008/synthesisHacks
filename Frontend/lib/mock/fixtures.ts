import type { Analysis, Rebuilt } from "../types";

export const newsFixture: Analysis = {
  url: "",
  pageTitle: "City council weighs new transit plan",
  readability: {
    level: "difficult",
    gradeApprox: 14,
    note: "This page reads at about a college level. Many sentences are long and use unfamiliar words.",
  },
  missingA11y: [
    {
      id: "alt-1",
      label: "Images without descriptions",
      description:
        "Six images on this page have no text alternative. People using a screen reader cannot tell what they show.",
    },
    {
      id: "caption-1",
      label: "Video without captions",
      description:
        "One embedded video plays without captions or a transcript. People who are deaf or hard of hearing cannot follow it.",
    },
  ],
  structureIssues: [
    {
      id: "head-1",
      label: "Headings skip levels",
      description:
        "The page jumps from a main heading to small sub-sub-headings. This makes it hard to follow with a screen reader.",
    },
    {
      id: "link-1",
      label: "Vague link text",
      description:
        "Several links say only “read more”. Out of context, you can’t tell where they lead.",
    },
  ],
  barriers: [
    {
      id: "popup-1",
      label: "Cookie banner traps focus",
      description:
        "The cookie notice does not return keyboard focus to the page when dismissed. Keyboard users can get stuck.",
    },
    {
      id: "complexity-1",
      label: "Dense paragraphs",
      description:
        "Long paragraphs without breaks make reading harder, especially for dyslexic readers and people new to the language.",
    },
  ],
};

export const productFixture: Analysis = {
  url: "",
  pageTitle: "Indoor herb garden — product details",
  readability: {
    level: "moderate",
    gradeApprox: 10,
    note: "This page is readable but uses marketing phrases that may be confusing if English is not your first language.",
  },
  missingA11y: [
    {
      id: "form-1",
      label: "Unlabeled form fields",
      description:
        "The quantity and address fields have no visible labels. Screen readers will read them as just “text field”.",
    },
    {
      id: "color-1",
      label: "Stock status shown only in color",
      description:
        "“In stock” and “Out of stock” use only green and red. People who can’t see color differences won’t know which is which.",
    },
  ],
  structureIssues: [
    {
      id: "nav-1",
      label: "Many similar links in a row",
      description:
        "The product menu has 18 links in a row with no grouping. Tabbing through takes a long time.",
    },
  ],
  barriers: [
    {
      id: "popup-2",
      label: "Newsletter popup over the page",
      description:
        "A signup popup covers the page after a few seconds. It cannot be closed with the keyboard.",
    },
    {
      id: "motion-1",
      label: "Background video that auto-plays",
      description:
        "A looping video plays behind the text. It can’t be paused and may be distracting.",
    },
  ],
};

export const newsRebuilt: Rebuilt = {
  views: {
    original: {
      title: "City council weighs new transit plan amid bond questions",
      body: [
        {
          kind: "paragraph",
          text: "Council members convened in a contentious six-hour session Tuesday evening to deliberate the merits of a comprehensive transit overhaul, with fiscal hawks expressing reservations about the proposed bond instrument and progressive members advocating for expedited implementation timelines.",
        },
        {
          kind: "paragraph",
          text: "The municipal financing mechanism, projected to mature over a twenty-year horizon, would underwrite the construction of three new light-rail corridors and a complementary network of bus rapid transit lanes traversing the metropolitan core.",
        },
        {
          kind: "paragraph",
          text: "Detractors, including Councilmember Hardin (District 4), characterized the package as fiscally imprudent given prevailing macroeconomic headwinds, while proponents underscored the externalities of continued automotive dependency.",
        },
      ],
    },
    simplified: {
      title: "The city council is talking about new buses and trains",
      body: [
        {
          kind: "callout",
          tone: "info",
          text: "What this is about: the city wants to build new buses and trains. The council met on Tuesday to talk about how to pay for it.",
        },
        {
          kind: "heading",
          level: 2,
          text: "What the council wants to do",
        },
        {
          kind: "paragraph",
          text: "Build three new train lines and add new bus lanes through the middle of the city.",
        },
        {
          kind: "paragraph",
          text: "Pay for it with a loan that the city would pay back over 20 years.",
        },
        {
          kind: "heading",
          level: 2,
          text: "Why some people don’t like the plan",
        },
        {
          kind: "list",
          items: [
            "Some council members say it costs too much money right now.",
            "They worry that prices and interest rates are going up.",
          ],
        },
        {
          kind: "heading",
          level: 2,
          text: "Why other people want to start soon",
        },
        {
          kind: "list",
          items: [
            "More buses and trains mean fewer cars on the road.",
            "Less traffic helps the air be cleaner.",
            "People who don’t drive can get around more easily.",
          ],
        },
        {
          kind: "callout",
          tone: "grow",
          text: "What happens next: the council will vote on the plan in two weeks. You can share your thoughts at city hall before then.",
        },
      ],
    },
    screenReader: {
      title: "City council transit plan — plain summary",
      body: [
        {
          kind: "heading",
          level: 2,
          text: "Summary",
        },
        {
          kind: "paragraph",
          text: "On Tuesday evening, the city council discussed a plan to build new public transit. The plan would add three new light rail lines and new bus lanes. The city would pay for it with a 20-year loan.",
        },
        {
          kind: "heading",
          level: 2,
          text: "Arguments against the plan",
        },
        {
          kind: "list",
          items: [
            "Councilmember Hardin of District 4 says the plan is too expensive right now.",
            "Some members are worried about rising interest rates.",
          ],
        },
        {
          kind: "heading",
          level: 2,
          text: "Arguments for the plan",
        },
        {
          kind: "list",
          items: [
            "Supporters say the plan reduces the city’s reliance on cars.",
            "Supporters say the plan will improve air quality and access to transit.",
          ],
        },
        {
          kind: "heading",
          level: 2,
          text: "Next step",
        },
        {
          kind: "paragraph",
          text: "The council will vote on the plan in two weeks. Public comment is open until then.",
        },
      ],
    },
  },
  improvements: [
    {
      id: "imp-1",
      category: "readability",
      summary: "Rewrote long sentences into short, plain-language ones.",
    },
    {
      id: "imp-2",
      category: "readability",
      summary: "Added a short summary at the top so you know what the article is about.",
    },
    {
      id: "imp-3",
      category: "structure",
      summary: "Grouped arguments into clearly labeled sections instead of one long block.",
    },
    {
      id: "imp-4",
      category: "structure",
      summary: "Fixed heading order so screen readers can follow the page.",
    },
    {
      id: "imp-5",
      category: "a11y",
      summary: "Replaced vague “read more” links with descriptive text.",
    },
    {
      id: "imp-6",
      category: "a11y",
      summary: "Wrote text descriptions for all images.",
    },
  ],
  readabilityDelta: {
    before: 14,
    after: 6,
    note: "Now reads at about a sixth-grade level — easier for most readers.",
  },
};

export const productRebuilt: Rebuilt = {
  views: {
    original: {
      title: "AeroLeaf™ Indoor Herb Garden — Reimagine Your Culinary Journey",
      body: [
        {
          kind: "paragraph",
          text: "Elevate your epicurean ambitions with the AeroLeaf™ Indoor Herb Garden — a category-defining intersection of horticultural innovation and ambient design language. Harnessing proprietary hydroponic substrate technology, AeroLeaf™ democratizes year-round access to chef-grade botanicals.",
        },
        {
          kind: "paragraph",
          text: "Unlock the full spectrum of flavor potential while curating an aesthetic centerpiece that resonates with the modern lifestyle consumer.",
        },
      ],
    },
    simplified: {
      title: "Indoor herb garden",
      body: [
        {
          kind: "callout",
          tone: "info",
          text: "What it is: a small device that grows fresh herbs like basil and mint on your kitchen counter, all year.",
        },
        {
          kind: "heading",
          level: 2,
          text: "How it works",
        },
        {
          kind: "list",
          items: [
            "You add water and seed pods.",
            "The light turns on by itself.",
            "Herbs grow in about three weeks.",
          ],
        },
        {
          kind: "heading",
          level: 2,
          text: "What you get in the box",
        },
        {
          kind: "list",
          items: [
            "The garden unit",
            "A pack of basil, mint, and parsley seeds",
            "A power cable",
          ],
        },
        {
          kind: "heading",
          level: 2,
          text: "Stock and delivery",
        },
        {
          kind: "paragraph",
          text: "In stock. Ships in 2 to 3 days.",
        },
        {
          kind: "callout",
          tone: "warm",
          text: "Price: $129. Free shipping on orders over $50.",
        },
      ],
    },
    screenReader: {
      title: "Indoor herb garden — product summary",
      body: [
        {
          kind: "heading",
          level: 2,
          text: "Product",
        },
        {
          kind: "paragraph",
          text: "Indoor herb garden. Grows herbs like basil, mint, and parsley on a kitchen counter using water and a built-in light.",
        },
        {
          kind: "heading",
          level: 2,
          text: "What is included",
        },
        {
          kind: "list",
          items: [
            "One garden unit.",
            "One seed pack with basil, mint, and parsley.",
            "One power cable.",
          ],
        },
        {
          kind: "heading",
          level: 2,
          text: "Price and availability",
        },
        {
          kind: "paragraph",
          text: "Price: 129 US dollars. Status: in stock. Shipping: 2 to 3 days. Free shipping for orders over 50 dollars.",
        },
      ],
    },
  },
  improvements: [
    {
      id: "imp-1",
      category: "readability",
      summary: "Removed marketing language and explained the product in plain words.",
    },
    {
      id: "imp-2",
      category: "structure",
      summary: "Broke the page into short labeled sections.",
    },
    {
      id: "imp-3",
      category: "a11y",
      summary: "Showed stock status with text, not just color.",
    },
    {
      id: "imp-4",
      category: "a11y",
      summary: "Added clear labels to every form field.",
    },
    {
      id: "imp-5",
      category: "a11y",
      summary: "Removed the popup and the auto-playing background video.",
    },
  ],
  readabilityDelta: {
    before: 10,
    after: 5,
    note: "Now reads at about a fifth-grade level — friendly for most readers.",
  },
};
