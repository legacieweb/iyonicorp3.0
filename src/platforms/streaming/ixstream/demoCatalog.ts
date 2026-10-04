import type { IXStreamContent, IXStreamEpisode, IXStreamSeason } from '../../../services/api';

export type DemoTitle = IXStreamContent & {
  trailerUrl: string;
  seasons: IXStreamSeason[];
};

const now = '2026-09-29T00:00:00.000Z';

const makeEpisode = (seasonId: string, episodeNumber: number, title: string, videoUrl: string): IXStreamEpisode => ({
  id: `${seasonId}-episode-${episodeNumber}`,
  seasonId,
  episodeNumber,
  title,
  description: 'A preview episode from the IxStream demo collection.',
  duration: 28,
  videoUrl,
  thumbnailUrl: null,
  createdAt: now,
  updatedAt: now,
});

const makeSeason = (contentId: string, episodes: IXStreamEpisode[]): IXStreamSeason => ({
  id: `${contentId}-season-1`,
  contentId,
  seasonNumber: 1,
  title: 'Season one',
  description: 'The opening chapter.',
  episodes,
  createdAt: now,
  updatedAt: now,
});

const sampleVideo = 'https://media.w3.org/2010/05/sintel/trailer_hd.mp4';
const sampleVideoTwo = 'https://www.w3schools.com/html/mov_bbb.mp4';
const sampleVideoThree = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

export const DEMO_STREAMING_CATALOG: DemoTitle[] = [
  {
    id: 'demo-glass-current', sellerId: null, title: 'The Glass Current',
    description: 'On a remote research station, oceanographer Mara Venn discovers a signal moving beneath the ice shelf. As the storm closes in, the crew must decide whether the voice below is a warning or an invitation.',
    type: 'movie', genre: 'Sci-fi thriller', tags: ['Original', 'Atmospheric', 'First contact'], releaseYear: 2026,
    duration: 118, rating: 8.7, thumbnailUrl: null, videoUrl: sampleVideo, trailerUrl: sampleVideo,
    isActive: true, createdBy: null, createdAt: now, updatedAt: now, seasons: [],
  },
  {
    id: 'demo-northbound', sellerId: null, title: 'Northbound: Zero Hour',
    description: 'A night-shift rail crew races a blackout across the northern line, carrying a passenger who knows exactly when the lights will go out again.',
    type: 'tvshow', genre: 'Mystery drama', tags: ['IxStream original', 'New episodes weekly', 'Mystery'], releaseYear: 2026,
    duration: 48, rating: 9.1, thumbnailUrl: null, videoUrl: sampleVideoTwo, trailerUrl: sampleVideoTwo,
    isActive: true, createdBy: null, createdAt: now, updatedAt: now,
    seasons: [makeSeason('demo-northbound', [
      makeEpisode('demo-northbound-season-1', 1, 'The Last Departure', sampleVideoTwo),
      makeEpisode('demo-northbound-season-1', 2, 'Signals in the Snow', sampleVideoThree),
    ])],
  },
  {
    id: 'demo-second-sun', sellerId: null, title: 'A Second Sun',
    description: 'When a second star appears over Lagos, an estranged family of astronomers reunites to decode the impossible phenomenon before the world chooses what it means.',
    type: 'movie', genre: 'Speculative drama', tags: ['Award winner', 'Family', 'Wonder'], releaseYear: 2025,
    duration: 104, rating: 8.4, thumbnailUrl: null, videoUrl: sampleVideoThree, trailerUrl: sampleVideoThree,
    isActive: true, createdBy: null, createdAt: now, updatedAt: now, seasons: [],
  },
  {
    id: 'demo-atlas-protocol', sellerId: null, title: 'The Atlas Protocol',
    description: 'An urban cartographer finds a map that redraws itself around crimes that have not happened yet. Every new route leads closer to the person who made it.',
    type: 'tvshow', genre: 'Crime / thriller', tags: ['Binge-worthy', 'Smart suspense', 'New season'], releaseYear: 2025,
    duration: 52, rating: 8.9, thumbnailUrl: null, videoUrl: sampleVideo, trailerUrl: sampleVideo,
    isActive: true, createdBy: null, createdAt: now, updatedAt: now,
    seasons: [makeSeason('demo-atlas-protocol', [
      makeEpisode('demo-atlas-protocol-season-1', 1, 'A Map of Missing Things', sampleVideo),
      makeEpisode('demo-atlas-protocol-season-1', 2, 'The Unfinished Road', sampleVideoTwo),
    ])],
  },
  {
    id: 'demo-blue-hour', sellerId: null, title: 'Blue Hour, Open City',
    description: 'Across one restless summer night, five strangers in a coastal city make the small choices that quietly change each other’s lives.',
    type: 'movie', genre: 'Independent · 96 min', tags: ['Festival pick', 'Human stories', 'Subtitled'], releaseYear: 2024,
    duration: 96, rating: 8.2, thumbnailUrl: null, videoUrl: sampleVideoTwo, trailerUrl: sampleVideoTwo,
    isActive: true, createdBy: null, createdAt: now, updatedAt: now, seasons: [],
  },
  {
    id: 'demo-wild-meridian', sellerId: null, title: 'Wild Meridian',
    description: 'Field biologist Nia Okafor and a documentary crew follow a changing migration route through a landscape that has never been filmed this closely.',
    type: 'tvshow', genre: 'Nature documentary', tags: ['Earth stories', 'Immersive', 'All ages'], releaseYear: 2026,
    duration: 44, rating: 9.3, thumbnailUrl: null, videoUrl: sampleVideoThree, trailerUrl: sampleVideoThree,
    isActive: true, createdBy: null, createdAt: now, updatedAt: now,
    seasons: [makeSeason('demo-wild-meridian', [
      makeEpisode('demo-wild-meridian-season-1', 1, 'Where the River Turns', sampleVideoThree),
      makeEpisode('demo-wild-meridian-season-1', 2, 'The Long Crossing', sampleVideo),
    ])],
  },
];

export const getDemoTitle = (id?: string) => DEMO_STREAMING_CATALOG.find((title) => title.id === id) ?? null;