import { PrismaClient, Role, MediaType, PricingType } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

/**
 * CineTube — Complete Database Seed Script
 *
 * Populates the database with:
 * 1. 12 Genres
 * 2. Admin user (admin@cinetube.com / Admin123!)
 * 3. 20 realistic movies and series
 *
 * Idempotent: Uses upserts — safe to run multiple times.
 *
 * Run from backend directory:
 *   cd backend && npx ts-node --transpile-only ../prisma/seed.ts
 */

// ── Genres ────────────────────────────────────────────────

const GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Crime",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller",
  "Animation",
];

// ── Media ─────────────────────────────────────────────────

interface MediaSeed {
  title: string;
  slug: string;
  synopsis: string;
  type: MediaType;
  pricingType: PricingType;
  streamingLink: string;
  posterUrl: string;
  backdropUrl: string;
  releaseYear: number;
  director: string;
  cast: string[];
  genres: string[];
}

const MEDIA: MediaSeed[] = [
  // ── MOVIES ──────────────────────────────────────────────
  {
    title: "The Dark Knight",
    slug: "the-dark-knight",
    synopsis:
      "When the menace known as the Joker wreaks havoc and chaos on Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice and come closer to the hero the city deserves.",
    type: "MOVIE",
    pricingType: "FREE",
    streamingLink: "https://example.com/stream/dark-knight",
    posterUrl: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911BTUgMe0nQ.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/hkBaDkMWbLaf8B1lsWsKX7Ew3Xq.jpg",
    releaseYear: 2008,
    director: "Christopher Nolan",
    cast: ["Christian Bale", "Heath Ledger", "Aaron Eckhart", "Gary Oldman"],
    genres: ["Action", "Crime", "Drama"],
  },
  {
    title: "Inception",
    slug: "inception",
    synopsis:
      "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O., but his tragic past may doom the project and his team to disaster.",
    type: "MOVIE",
    pricingType: "PREMIUM",
    streamingLink: "https://example.com/stream/inception",
    posterUrl: "https://image.tmdb.org/t/p/w500/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/s3TBrRGB1iav7gFOCNx3H31MoES.jpg",
    releaseYear: 2010,
    director: "Christopher Nolan",
    cast: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Elliot Page", "Tom Hardy"],
    genres: ["Action", "Sci-Fi", "Thriller"],
  },
  {
    title: "Pulp Fiction",
    slug: "pulp-fiction",
    synopsis:
      "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
    type: "MOVIE",
    pricingType: "FREE",
    streamingLink: "https://example.com/stream/pulp-fiction",
    posterUrl: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg",
    releaseYear: 1994,
    director: "Quentin Tarantino",
    cast: ["John Travolta", "Uma Thurman", "Samuel L. Jackson", "Bruce Willis"],
    genres: ["Crime", "Drama", "Thriller"],
  },
  {
    title: "The Shawshank Redemption",
    slug: "the-shawshank-redemption",
    synopsis:
      "Over the course of several years, two convicts form a friendship, seeking consolation and, eventually, redemption through basic compassion.",
    type: "MOVIE",
    pricingType: "FREE",
    streamingLink: "https://example.com/stream/shawshank",
    posterUrl: "https://image.tmdb.org/t/p/w500/9cjIGRQL1JruKhBMFBPEEkNUOVP.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg",
    releaseYear: 1994,
    director: "Frank Darabont",
    cast: ["Tim Robbins", "Morgan Freeman", "Bob Gunton", "William Sadler"],
    genres: ["Drama"],
  },
  {
    title: "Spirited Away",
    slug: "spirited-away",
    synopsis:
      "During her family's move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits, where humans are changed into beasts.",
    type: "MOVIE",
    pricingType: "PREMIUM",
    streamingLink: "https://example.com/stream/spirited-away",
    posterUrl: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/Ab8mkHmkYADjU7wQiOkia9BzGvS.jpg",
    releaseYear: 2001,
    director: "Hayao Miyazaki",
    cast: ["Rumi Hiiragi", "Miyu Irino", "Mari Natsuki", "Takashi Naitō"],
    genres: ["Animation", "Fantasy", "Adventure"],
  },
  {
    title: "Get Out",
    slug: "get-out",
    synopsis:
      "A young African-American visits his white girlfriend's parents for the weekend, where his simmering uneasiness about their reception of him eventually reaches a boiling point.",
    type: "MOVIE",
    pricingType: "PREMIUM",
    streamingLink: "https://example.com/stream/get-out",
    posterUrl: "https://image.tmdb.org/t/p/w500/tFXcEccSQMf3lfhfXKSU9iRBpa3.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/sGfBuNPFOGbHm2OXChyUvbcR1Fm.jpg",
    releaseYear: 2017,
    director: "Jordan Peele",
    cast: ["Daniel Kaluuya", "Allison Williams", "Bradley Whitford", "Catherine Keener"],
    genres: ["Horror", "Mystery", "Thriller"],
  },
  {
    title: "La La Land",
    slug: "la-la-land",
    synopsis:
      "While navigating their careers in Los Angeles, a pianist and an actress fall in love while attempting to reconcile their aspirations for the future.",
    type: "MOVIE",
    pricingType: "FREE",
    streamingLink: "https://example.com/stream/la-la-land",
    posterUrl: "https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/ylXCdC106IKiarftHkcacasaAcb.jpg",
    releaseYear: 2016,
    director: "Damien Chazelle",
    cast: ["Ryan Gosling", "Emma Stone", "John Legend", "Rosemarie DeWitt"],
    genres: ["Romance", "Drama", "Comedy"],
  },
  {
    title: "Interstellar",
    slug: "interstellar",
    synopsis:
      "When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot is tasked with piloting a spacecraft along with a team of researchers on a mission through a wormhole to find a new home for humanity.",
    type: "MOVIE",
    pricingType: "PREMIUM",
    streamingLink: "https://example.com/stream/interstellar",
    posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK1TVg7C.jpg",
    releaseYear: 2014,
    director: "Christopher Nolan",
    cast: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain", "Michael Caine"],
    genres: ["Sci-Fi", "Drama", "Adventure"],
  },
  {
    title: "The Grand Budapest Hotel",
    slug: "the-grand-budapest-hotel",
    synopsis:
      "A writer encounters the owner of an aging high-class hotel, who tells him of his early years serving as a lobby boy in the hotel's glorious years under an exceptional concierge.",
    type: "MOVIE",
    pricingType: "FREE",
    streamingLink: "https://example.com/stream/grand-budapest",
    posterUrl: "https://image.tmdb.org/t/p/w500/eWDyYq6Iu2pjNiIZLJYCmGlPTr2.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/nX5XotM9yprCKarRH4fzOq1VM1J.jpg",
    releaseYear: 2014,
    director: "Wes Anderson",
    cast: ["Ralph Fiennes", "Tony Revolori", "F. Murray Abraham", "Mathieu Amalric"],
    genres: ["Comedy", "Drama", "Adventure"],
  },
  {
    title: "Parasite",
    slug: "parasite",
    synopsis:
      "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.",
    type: "MOVIE",
    pricingType: "PREMIUM",
    streamingLink: "https://example.com/stream/parasite",
    posterUrl: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/TU9bcgLCEo3GJiQWFwm5yS1Fdn.jpg",
    releaseYear: 2019,
    director: "Bong Joon-ho",
    cast: ["Song Kang-ho", "Lee Sun-kyun", "Cho Yeo-jeong", "Choi Woo-shik"],
    genres: ["Thriller", "Drama", "Comedy"],
  },

  // ── SERIES ──────────────────────────────────────────────
  {
    title: "Breaking Bad",
    slug: "breaking-bad",
    synopsis:
      "A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student to secure his family's future.",
    type: "SERIES",
    pricingType: "PREMIUM",
    streamingLink: "https://example.com/stream/breaking-bad",
    posterUrl: "https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
    releaseYear: 2008,
    director: "Vince Gilligan",
    cast: ["Bryan Cranston", "Aaron Paul", "Anna Gunn", "Dean Norris"],
    genres: ["Crime", "Drama", "Thriller"],
  },
  {
    title: "Stranger Things",
    slug: "stranger-things",
    synopsis:
      "When a young boy disappears, his mother, a police chief, and his friends must confront terrifying supernatural forces in order to get him back.",
    type: "SERIES",
    pricingType: "PREMIUM",
    streamingLink: "https://example.com/stream/stranger-things",
    posterUrl: "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/56v2KjBlYj3Ey2t4WDrYRAin39.jpg",
    releaseYear: 2016,
    director: "The Duffer Brothers",
    cast: ["Millie Bobby Brown", "Finn Wolfhard", "Winona Ryder", "David Harbour"],
    genres: ["Sci-Fi", "Horror", "Mystery"],
  },
  {
    title: "The Office",
    slug: "the-office",
    synopsis:
      "A mockumentary on a group of typical office workers, where the workday consists of ego clashes, inappropriate behavior, and tedium.",
    type: "SERIES",
    pricingType: "FREE",
    streamingLink: "https://example.com/stream/the-office",
    posterUrl: "https://image.tmdb.org/t/p/w500/qWnJzyZhyy74gdi3GZ1YjSy0XoQ.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/3jsRjatWMVcTGrxmax0NU1FPhHj.jpg",
    releaseYear: 2005,
    director: "Greg Daniels",
    cast: ["Steve Carell", "Rainn Wilson", "John Krasinski", "Jenna Fischer"],
    genres: ["Comedy"],
  },
  {
    title: "Game of Thrones",
    slug: "game-of-thrones",
    synopsis:
      "Nine noble families fight for control over the lands of Westeros, while an ancient enemy returns after being dormant for millennia.",
    type: "SERIES",
    pricingType: "PREMIUM",
    streamingLink: "https://example.com/stream/game-of-thrones",
    posterUrl: "https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/suopoADq6k8YC09c0iFSGGM4ICY.jpg",
    releaseYear: 2011,
    director: "David Benioff & D.B. Weiss",
    cast: ["Emilia Clarke", "Kit Harington", "Peter Dinklage", "Lena Headey"],
    genres: ["Fantasy", "Drama", "Adventure"],
  },
  {
    title: "Sherlock",
    slug: "sherlock",
    synopsis:
      "A modern update finds the famous sleuth and his doctor partner solving crime in 21st-century London.",
    type: "SERIES",
    pricingType: "FREE",
    streamingLink: "https://example.com/stream/sherlock",
    posterUrl: "https://image.tmdb.org/t/p/w500/f9z4ycm9k5C4JRQJ0dFNrR.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/luYqkIMj2w1MA3Gj5LmEb2m2gBC.jpg",
    releaseYear: 2010,
    director: "Mark Gatiss & Steven Moffat",
    cast: ["Benedict Cumberbatch", "Martin Freeman", "Una Stubbs", "Rupert Graves"],
    genres: ["Crime", "Drama", "Mystery"],
  },
  {
    title: "The Witcher",
    slug: "the-witcher",
    synopsis:
      "Geralt of Rivia, a solitary monster hunter, struggles to find his place in a world where people often prove more wicked than beasts.",
    type: "SERIES",
    pricingType: "PREMIUM",
    streamingLink: "https://example.com/stream/the-witcher",
    posterUrl: "https://image.tmdb.org/t/p/w500/7vjaCdMw15FEbXyLQTVa04URsPm.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/jBJWaqoSCiARWtfV0GlqHrcdiJq.jpg",
    releaseYear: 2019,
    director: "Lauren Schmidt Hissrich",
    cast: ["Henry Cavill", "Anya Chalotra", "Freya Allan", "Joey Batey"],
    genres: ["Fantasy", "Action", "Adventure"],
  },
  {
    title: "Ted Lasso",
    slug: "ted-lasso",
    synopsis:
      "An American football coach is hired to manage a British soccer team despite having no experience coaching soccer.",
    type: "SERIES",
    pricingType: "FREE",
    streamingLink: "https://example.com/stream/ted-lasso",
    posterUrl: "https://image.tmdb.org/t/p/w500/caGVr9Il2gj8bN4ow6qsLm60TxM.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/xGex7FzxBMIp2V5MIiCMbPlEBAG.jpg",
    releaseYear: 2020,
    director: "Bill Lawrence & Jason Sudeikis",
    cast: ["Jason Sudeikis", "Hannah Waddingham", "Brett Goldstein", "Juno Temple"],
    genres: ["Comedy", "Drama"],
  },
  {
    title: "Chernobyl",
    slug: "chernobyl",
    synopsis:
      "In April 1986, the city of Chernobyl in the Soviet Union suffers a catastrophic nuclear disaster. Valery Legasov and a team of scientists work to contain the damage.",
    type: "SERIES",
    pricingType: "PREMIUM",
    streamingLink: "https://example.com/stream/chernobyl",
    posterUrl: "https://image.tmdb.org/t/p/w500/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/900hLhKHj4VQSS47rOveLjTGfR1.jpg",
    releaseYear: 2019,
    director: "Johan Renck",
    cast: ["Jared Harris", "Stellan Skarsgård", "Emily Watson", "Paul Ritter"],
    genres: ["Drama", "Thriller"],
  },
  {
    title: "Arcane",
    slug: "arcane",
    synopsis:
      "Set in the utopian region of Piltover and the oppressed underground of Zaun, the story follows the origins of two iconic League of Legends champions and the power that will tear them apart.",
    type: "SERIES",
    pricingType: "FREE",
    streamingLink: "https://example.com/stream/arcane",
    posterUrl: "https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/q54qEgagGOYCq5D1903eCRYdMkM.jpg",
    releaseYear: 2021,
    director: "Christian Linke & Alex Yee",
    cast: ["Hailee Steinfeld", "Ella Purnell", "Katie Leung", "Kevin Alejandro"],
    genres: ["Animation", "Action", "Sci-Fi"],
  },
  {
    title: "The Bear",
    slug: "the-bear",
    synopsis:
      "A young chef from the fine dining world returns to Chicago to run his family's sandwich shop after a heartbreaking death in the family.",
    type: "SERIES",
    pricingType: "PREMIUM",
    streamingLink: "https://example.com/stream/the-bear",
    posterUrl: "https://image.tmdb.org/t/p/w500/sHFlRFVR6gXLRSEAS3ia0oPgfp.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/zPIug5giU8ugg0gBK7PsFcLMg0.jpg",
    releaseYear: 2022,
    director: "Christopher Storer",
    cast: ["Jeremy Allen White", "Ebon Moss-Bachrach", "Ayo Edebiri", "Abby Elliott"],
    genres: ["Drama", "Comedy"],
  },
];

// ── Seed Functions ────────────────────────────────────────

async function seedGenres(): Promise<Map<string, string>> {
  console.log("🌱 Seeding genres...");

  const genreMap = new Map<string, string>();

  for (const name of GENRES) {
    const genre = await prisma.genre.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    genreMap.set(name, genre.id);
  }

  console.log(`   ✅ ${GENRES.length} genres`);
  return genreMap;
}

async function seedAdmin() {
  console.log("🌱 Seeding admin user...");

  const email = "admin@cinetube.com";
  const password = "Admin123!";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      name: "CineTube Admin",
      email,
      passwordHash,
      role: Role.ADMIN,
      emailVerified: new Date(),
      profile: {
        create: {
          bio: "CineTube Platform Administrator",
          favoriteGenres: [],
        },
      },
    },
  });

  console.log(`   ✅ Admin: ${email} / ${password}`);
}

async function seedMedia(genreMap: Map<string, string>) {
  console.log("🌱 Seeding media...");

  let created = 0;

  for (const item of MEDIA) {
    const genreIds = item.genres
      .map((name) => genreMap.get(name))
      .filter((id): id is string => !!id);

    const existing = await prisma.media.findUnique({ where: { slug: item.slug } });

    const media = await prisma.media.upsert({
      where: { slug: item.slug },
      update: {
        title: item.title,
        synopsis: item.synopsis,
        type: item.type,
        pricingType: item.pricingType,
        streamingLink: item.streamingLink,
        posterUrl: item.posterUrl,
        backdropUrl: item.backdropUrl,
        releaseYear: item.releaseYear,
        director: item.director,
        cast: item.cast,
      },
      create: {
        title: item.title,
        slug: item.slug,
        synopsis: item.synopsis,
        type: item.type,
        pricingType: item.pricingType,
        streamingLink: item.streamingLink,
        posterUrl: item.posterUrl,
        backdropUrl: item.backdropUrl,
        releaseYear: item.releaseYear,
        director: item.director,
        cast: item.cast,
      },
    });

    if (!existing) created++;

    // Sync genres
    await prisma.mediaGenre.deleteMany({ where: { mediaId: media.id } });
    await prisma.mediaGenre.createMany({
      data: genreIds.map((genreId) => ({ mediaId: media.id, genreId })),
    });
  }

  console.log(`   ✅ ${MEDIA.length} media (${created} created, ${MEDIA.length - created} updated)`);
}

// ── Main ──────────────────────────────────────────────────

async function main() {
  console.log("🚀 CineTube Database Seed\n");

  const genreMap = await seedGenres();
  await seedAdmin();
  await seedMedia(genreMap);

  const totalMedia = await prisma.media.count();
  const totalUsers = await prisma.user.count();
  const totalGenres = await prisma.genre.count();

  console.log("\n📊 Database Summary:");
  console.log(`   Genres: ${totalGenres}`);
  console.log(`   Users:  ${totalUsers}`);
  console.log(`   Media:  ${totalMedia}`);
  console.log("\n✨ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
