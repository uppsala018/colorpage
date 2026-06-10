import type { Metadata } from "next";

export const siteConfig = {
  name: "Color Printables",
  url: "https://www.colorprintables.online",
  domain: "www.colorprintables.online",
  description:
    "Create printable coloring pages from any idea, then print or download as PDF.",
};

export type UseCaseSlug =
  | "teacher"
  | "sunday-school"
  | "parents"
  | "homeschool"
  | "preschool"
  | "adult-coloring-pages"
  | "party-activities"
  | "paint-by-numbers"
  | "free-coloring-page-generator";

export type UseCasePage = {
  slug: UseCaseSlug;
  path: string;
  label: string;
  title: string;
  seoTitle: string;
  description: string;
  eyebrow: string;
  scenarioTitle: string;
  scenario: string;
  outcome: string;
  audience: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  promptIdeas: string[];
  steps: string[];
  features: string[];
  ctaLabel: string;
  ctaPrompt: string;
  visual: "classroom" | "bible" | "kids" | "adult" | "pbn";
  /** Real AI-generated example image in /public/examples/ — run scripts/generate-examples.mjs to create */
  exampleImage?: string;
};

export const useCasePages: UseCasePage[] = [
  {
    slug: "teacher",
    path: "/teacher",
    label: "Teachers",
    title: "Printable Coloring Pages for Teachers",
    seoTitle: "Printable Coloring Pages for Teachers | Color Printables",
    description:
      "Create classroom coloring pages in seconds. Enter a topic, generate a printable page, then download a PDF for the whole class.",
    eyebrow: "Classroom printables",
    scenarioTitle: "A fast activity when the class needs focus",
    scenario:
      "A teacher can open Color Printables on a classroom laptop, type the lesson topic, and create a printable coloring page before the next activity starts. It works for animals, seasons, vocabulary, history, science, and quiet end-of-day work.",
    outcome:
      "The class gets a focused activity that is easy to copy, easy to explain, and ready for pencils, crayons, or markers.",
    audience: "teachers, substitute teachers, classroom aides, after-school programs",
    primaryKeyword: "coloring pages for teachers",
    secondaryKeywords: [
      "classroom coloring pages",
      "printable coloring pages for school",
      "teacher coloring page generator",
    ],
    promptIdeas: [
      "a classroom poster about the water cycle with clouds and rain",
      "friendly farm animals for a first grade coloring activity",
      "a Viking ship on the sea for a history lesson",
      "large alphabet letters with objects for each sound",
    ],
    steps: [
      "Type the lesson topic or classroom theme.",
      "Choose Children for simple shapes or Teen for more detail.",
      "Generate the page and print copies for the class.",
    ],
    features: [
      "A4, A5, and A3 PDF export",
      "Large simple areas for younger students",
      "Detailed pages for older students",
      "Works from a browser on a school laptop",
    ],
    ctaLabel: "Create a classroom printable",
    ctaPrompt: "friendly classroom coloring page about the water cycle",
    visual: "classroom",
    exampleImage: "/examples/teacher-example.png",
  },
  {
    slug: "sunday-school",
    path: "/sunday-school",
    label: "Sunday School",
    title: "Sunday School Coloring Pages",
    seoTitle: "Sunday School Coloring Pages | Bible Printables Generator",
    description:
      "Generate Bible coloring pages for Sunday school lessons, church activities, Easter, Christmas, Noah's Ark, and more.",
    eyebrow: "Bible lesson printables",
    scenarioTitle: "Bible story pages for a busy Sunday morning",
    scenario:
      "A Sunday school teacher can prepare a lesson, type the Bible story, and create a printable coloring page that matches the theme of the day. It is useful for arrival time, lesson reflection, or a calm activity after group teaching.",
    outcome:
      "Children get a page that supports the lesson instead of a generic worksheet pulled from a folder.",
    audience: "Sunday school teachers, children's ministry teams, churches, homeschool Bible lessons",
    primaryKeyword: "Sunday school coloring pages",
    secondaryKeywords: [
      "Bible coloring pages printable",
      "church coloring pages",
      "Noah's Ark coloring page",
    ],
    promptIdeas: [
      "Noah's Ark with animals walking two by two",
      "Jesus welcoming children in a simple garden scene",
      "Nativity scene with baby Jesus in the manger",
      "Easter cross with flowers and butterflies",
    ],
    steps: [
      "Enter the Bible story or lesson theme.",
      "Pick Children for younger groups or Teen for older children.",
      "Download a PDF and print enough copies for the class.",
    ],
    features: [
      "Bible story prompts",
      "Simple designs for younger children",
      "Print-ready PDF downloads",
      "Useful for Sunday school and church groups",
    ],
    ctaLabel: "Create a Bible coloring page",
    ctaPrompt: "Noah's Ark with animals walking two by two",
    visual: "bible",
    exampleImage: "/examples/sunday-school-example.png",
  },
  {
    slug: "parents",
    path: "/parents",
    label: "Parents",
    title: "Printable Coloring Pages for Kids at Home",
    seoTitle: "Printable Coloring Pages for Kids at Home | Color Printables",
    description:
      "Make quick coloring pages for kids at home. Generate animals, vehicles, princesses, dinosaurs, letters, and calming activities to print.",
    eyebrow: "At-home activities",
    scenarioTitle: "A calm activity when a child needs something to do",
    scenario:
      "A parent at home with a restless child can open Color Printables, type a favorite animal or character idea, and print a page in minutes. It is a simple way to turn a difficult afternoon into a focused table activity.",
    outcome:
      "The child gets a page made around their interests, and the parent gets a screen-free activity that is easy to repeat.",
    audience: "parents, grandparents, babysitters, family activity planners",
    primaryKeyword: "kids coloring pages to print",
    secondaryKeywords: [
      "printable coloring pages for kids",
      "free coloring pages for kids",
      "coloring activity for sick child",
    ],
    promptIdeas: [
      "a happy dinosaur wearing rain boots",
      "a kitten sleeping on a moon with stars",
      "a race car on a simple road with flags",
      "a fairy garden with mushrooms and flowers",
    ],
    steps: [
      "Ask the child what they want to color.",
      "Type the idea into the generator.",
      "Print the result or save it as a PDF for later.",
    ],
    features: [
      "Fast screen-free activity",
      "Custom pages for each child's interests",
      "Simple Children difficulty",
      "Printable from home",
    ],
    ctaLabel: "Create a kids coloring page",
    ctaPrompt: "happy dinosaur wearing rain boots",
    visual: "kids",
    exampleImage: "/examples/kids-example.png",
  },
  {
    slug: "homeschool",
    path: "/homeschool",
    label: "Homeschool",
    title: "Homeschool Coloring Pages and Learning Printables",
    seoTitle: "Homeschool Coloring Pages | Printable Learning Activities",
    description:
      "Create homeschool coloring pages for letters, numbers, animals, history, science, geography, and themed learning activities.",
    eyebrow: "Learning printables",
    scenarioTitle: "A printable that matches today's lesson",
    scenario:
      "A homeschool parent can make a coloring activity that connects directly to a lesson, from alphabet practice to science vocabulary. The page can be simple for younger children or more detailed for older learners.",
    outcome:
      "The coloring page becomes part of the lesson instead of a separate filler activity.",
    audience: "homeschool parents, co-ops, tutors, learning pods",
    primaryKeyword: "homeschool coloring pages",
    secondaryKeywords: [
      "educational coloring pages",
      "printable learning activities",
      "alphabet coloring pages generator",
    ],
    promptIdeas: [
      "letter B with butterflies, books, and balloons",
      "simple map of Europe with landmarks for coloring",
      "solar system coloring page with labeled planets",
      "ocean animals with names for early readers",
    ],
    steps: [
      "Choose the subject and age level.",
      "Describe the learning goal in plain language.",
      "Generate, print, and use it with the lesson.",
    ],
    features: [
      "Alphabet and number themes",
      "Science and nature topics",
      "History and geography scenes",
      "PDF export for lesson binders",
    ],
    ctaLabel: "Create a homeschool printable",
    ctaPrompt: "solar system coloring page with labeled planets",
    visual: "classroom",
  },
  {
    slug: "preschool",
    path: "/preschool",
    label: "Preschool",
    title: "Preschool Coloring Pages to Print",
    seoTitle: "Preschool Coloring Pages to Print | Simple Kids Printables",
    description:
      "Generate simple preschool coloring pages with large shapes, animals, letters, numbers, and easy scenes for young children.",
    eyebrow: "Simple early learning",
    scenarioTitle: "Large shapes for little hands",
    scenario:
      "A preschool teacher or parent can create pages with big outlines, friendly subjects, and fewer details. These pages are easier for young children to complete and more forgiving for early motor skills.",
    outcome:
      "Young children get a page they can finish without frustration, and adults can match the theme to the day.",
    audience: "preschool teachers, daycare providers, parents of toddlers",
    primaryKeyword: "preschool coloring pages",
    secondaryKeywords: [
      "easy coloring pages for toddlers",
      "simple coloring pages to print",
      "large shape coloring pages",
    ],
    promptIdeas: [
      "large smiling sun with three clouds",
      "simple teddy bear holding a balloon",
      "big letter A with apples around it",
      "friendly fish with bubbles",
    ],
    steps: [
      "Use short prompts with one clear subject.",
      "Choose Children difficulty.",
      "Print one page at a time for table activities.",
    ],
    features: [
      "Large open shapes",
      "Clear outlines",
      "Simple subjects",
      "Good for crayons and thick markers",
    ],
    ctaLabel: "Create a preschool page",
    ctaPrompt: "large smiling sun with three clouds",
    visual: "kids",
  },
  {
    slug: "adult-coloring-pages",
    path: "/adult-coloring-pages",
    label: "Adults",
    title: "Adult Coloring Page Generator",
    seoTitle: "Adult Coloring Page Generator | Mandalas, Flowers and Relaxing Printables",
    description:
      "Create detailed adult coloring pages with mandala-like patterns, flowers, butterflies, botanical scenes, and relaxing printable designs.",
    eyebrow: "Relaxing printables",
    scenarioTitle: "A quiet page after a long day",
    scenario:
      "An adult who wants a calm creative break can describe a pattern, flower scene, or mandala-style page and print it at home. Adult difficulty creates more detail and more areas to color.",
    outcome:
      "The result is a printable page made for slow coloring, relaxation, and a more detailed creative session.",
    audience: "adults, mindfulness hobbyists, creative journals, relaxation groups",
    primaryKeyword: "adult coloring page generator",
    secondaryKeywords: [
      "adult coloring pages printable",
      "mandala coloring page generator",
      "flower coloring pages for adults",
    ],
    promptIdeas: [
      "intricate mandala with flowers and butterflies",
      "botanical garden with detailed leaves and vines",
      "cozy tea cup surrounded by floral patterns",
      "moon and stars with ornamental clouds",
    ],
    steps: [
      "Describe the mood, pattern, or subject.",
      "Choose Adults difficulty for more detail.",
      "Download the PDF and print it for a quiet coloring session.",
    ],
    features: [
      "Intricate line art",
      "Mandala-like decorative patterns",
      "Flowers, butterflies, and botanical details",
      "PDF export for clean printing",
    ],
    ctaLabel: "Create an adult coloring page",
    ctaPrompt: "intricate mandala with flowers and butterflies",
    visual: "adult",
    exampleImage: "/examples/adult-example.png",
  },
  {
    slug: "party-activities",
    path: "/party-activities",
    label: "Party Activities",
    title: "Printable Coloring Pages for Parties and Groups",
    seoTitle: "Printable Coloring Pages for Parties | Easy Group Activities",
    description:
      "Create printable coloring activities for birthdays, family gatherings, rainy days, holiday parties, and group events.",
    eyebrow: "Group activities",
    scenarioTitle: "A quick activity for the table",
    scenario:
      "For a birthday, holiday gathering, or rainy afternoon, a host can create themed coloring pages that match the event. Print several copies and place them with crayons or markers.",
    outcome:
      "Kids and guests get an easy shared activity without needing a prepared activity pack.",
    audience: "parents, party hosts, youth leaders, community groups",
    primaryKeyword: "party coloring pages",
    secondaryKeywords: [
      "birthday coloring pages printable",
      "group coloring activity",
      "rainy day coloring pages",
    ],
    promptIdeas: [
      "birthday cake with balloons and confetti",
      "pirate treasure map for a party activity",
      "holiday cookies on a decorated table",
      "rainy day animals under umbrellas",
    ],
    steps: [
      "Pick the party theme.",
      "Generate a page with simple or medium detail.",
      "Print enough copies for the group table.",
    ],
    features: [
      "Birthday and holiday themes",
      "Fast printable activity",
      "Works for groups",
      "Easy PDF saving",
    ],
    ctaLabel: "Create a party printable",
    ctaPrompt: "birthday cake with balloons and confetti",
    visual: "kids",
  },
  {
    slug: "paint-by-numbers",
    path: "/paint-by-numbers",
    label: "Paint by Numbers",
    title: "Paint by Numbers Generator",
    seoTitle: "Paint by Numbers Generator | Printable Numbered Coloring Pages",
    description:
      "Generate a printable paint-by-numbers page with numbered regions and a color guide. Choose 6, 12, or 24 colors.",
    eyebrow: "Numbered printables",
    scenarioTitle: "A guided coloring page with a color key",
    scenario:
      "Paint by Numbers turns a prompt into a numbered printable with a matching color guide. It is useful for older kids, classroom activities, and adults who prefer a guided coloring experience.",
    outcome:
      "The page gives clear regions and numbers, so the user can match each number to a color in the guide.",
    audience: "older kids, teens, adults, teachers, hobbyists",
    primaryKeyword: "paint by numbers generator",
    secondaryKeywords: [
      "printable paint by numbers",
      "paint by numbers coloring page",
      "numbered coloring page generator",
    ],
    promptIdeas: [
      "simple sailboat on calm water",
      "butterflies in a flower garden",
      "cozy cabin in the forest",
      "friendly dragon in a mountain cave",
    ],
    steps: [
      "Describe the subject.",
      "Choose Easy, Medium, or Hard for the number of colors.",
      "Print the numbered page and color guide.",
    ],
    features: [
      "6, 12, or 24 color difficulty",
      "Numbered regions",
      "Color guide included",
      "PDF export for printing",
    ],
    ctaLabel: "Create paint by numbers",
    ctaPrompt: "butterflies in a flower garden",
    visual: "pbn",
    exampleImage: "/live-pbn-production-dense-final.png",
  },
  {
    slug: "free-coloring-page-generator",
    path: "/free-coloring-page-generator",
    label: "Free Generator",
    title: "Free Coloring Page Generator",
    seoTitle: "Free Coloring Page Generator | Create Coloring Pages to Print",
    description:
      "Use Color Printables to generate a free printable coloring page from a prompt. Create a page, print it, or save it as PDF.",
    eyebrow: "Free to try",
    scenarioTitle: "Generate a printable page from any idea",
    scenario:
      "Instead of searching through the same old coloring sheets, type exactly what you need and generate a new printable. The free flow is designed so you can try the tool before choosing a paid plan.",
    outcome:
      "You can make a custom coloring page for a classroom, child, Bible lesson, party, or relaxing adult activity.",
    audience: "anyone who needs printable coloring pages",
    primaryKeyword: "free coloring page generator",
    secondaryKeywords: [
      "generate coloring pages free",
      "coloring pages to print",
      "AI coloring page generator",
    ],
    promptIdeas: [
      "cute puppy in a garden with big flowers",
      "space rocket flying past planets",
      "simple unicorn with stars",
      "adult floral mandala with butterflies",
    ],
    steps: [
      "Type your coloring page idea.",
      "Choose a difficulty level.",
      "Generate, then print or download the result.",
    ],
    features: [
      "Free to try",
      "Children, Teen, and Adults difficulty",
      "Classic coloring pages and paint by numbers",
      "Printable PDF export",
    ],
    ctaLabel: "Try the free generator",
    ctaPrompt: "cute puppy in a garden with big flowers",
    visual: "classroom",
    exampleImage: "/examples/free-generator-example.png",
  },
];

export function absoluteUrl(path = "/"): string {
  return new URL(path, siteConfig.url).toString();
}

export function getUseCasePage(slug: UseCaseSlug): UseCasePage {
  const page = useCasePages.find((item) => item.slug === slug);
  if (!page) throw new Error(`Unknown use case page: ${slug}`);
  return page;
}

export function createUseCaseMetadata(slug: UseCaseSlug): Metadata {
  const page = getUseCasePage(slug);
  return {
    title: page.seoTitle,
    description: page.description,
    keywords: [page.primaryKeyword, ...page.secondaryKeywords],
    alternates: { canonical: page.path },
    openGraph: {
      title: page.seoTitle,
      description: page.description,
      url: page.path,
      type: "website",
      siteName: siteConfig.name,
      images: [{ url: "/og-image.svg", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: page.seoTitle,
      description: page.description,
      images: ["/og-image.svg"],
    },
  };
}
