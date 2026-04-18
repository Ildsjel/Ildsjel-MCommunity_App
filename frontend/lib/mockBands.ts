export type ReleaseType = 'LP' | 'EP' | 'Split-EP' | 'Demo' | 'Single' | 'Compilation' | 'Live'

export interface Track {
  number: number
  title: string
  duration: string
  lyrics?: string
}

export interface Release {
  id: string
  slug: string
  title: string
  type: ReleaseType
  year: number
  label: string
  tracks: Track[]
}

export interface Band {
  id: string
  slug: string
  name: string
  country: string
  countryCode: string
  formed: number
  genres: string[]
  bio: string
  releases: Release[]
}

export const BANDS: Band[] = [
  {
    id: 'mgla',
    slug: 'mgla',
    name: 'Mgła',
    country: 'Poland',
    countryCode: 'PL',
    formed: 2000,
    genres: ['Black Metal'],
    bio: 'Mgła is a black metal duo from Kraków, Poland. Operating under a veil of anonymity — members known only as M. and Darkside — they have become one of the defining acts of modern orthodox black metal. Their music is characterized by hypnotic, mid-paced riffing over blasting percussion, imbued with a philosophical nihilism that sets them apart from their peers.',
    releases: [
      {
        id: 'mgla-groza',
        slug: 'groza',
        title: 'Groza',
        type: 'LP',
        year: 2008,
        label: 'No Solace',
        tracks: [
          { number: 1, title: 'Groza I', duration: '6:42', lyrics: `Through the wound in the firmament\nA cold breath descends\nThe world bends its back\nUnder weight it cannot name\n\nAnd I am the silence\nBefore the last word spoken\nThe hollow that remains\nWhen everything is broken` },
          { number: 2, title: 'Groza II', duration: '7:18', lyrics: `No compass points to meaning here\nEach direction leads to ash\nThe gods we built from desperation\nCrumble under honest gaze` },
          { number: 3, title: 'Groza III', duration: '6:55' },
          { number: 4, title: 'Groza IV', duration: '8:02' },
          { number: 5, title: 'Groza V', duration: '5:44' },
        ],
      },
      {
        id: 'mgla-with-hearts-toward-none',
        slug: 'with-hearts-toward-none',
        title: 'With Hearts Toward None',
        type: 'LP',
        year: 2012,
        label: 'No Solace',
        tracks: [
          { number: 1, title: 'With Hearts Toward None I', duration: '7:04', lyrics: `We are the residue of prayers\nThat no heaven answered\nThe static left when hope\nFails to find its signal\n\nWith hearts toward none\nWe walk the burned meridian\nNo absolution offered\nNo benediction given` },
          { number: 2, title: 'With Hearts Toward None II', duration: '6:31' },
          { number: 3, title: 'With Hearts Toward None III', duration: '7:48' },
          { number: 4, title: 'With Hearts Toward None IV', duration: '5:22' },
          { number: 5, title: 'With Hearts Toward None V', duration: '8:14' },
          { number: 6, title: 'With Hearts Toward None VI', duration: '6:09' },
          { number: 7, title: 'With Hearts Toward None VII', duration: '9:03' },
        ],
      },
      {
        id: 'mgla-exercises-in-futility',
        slug: 'exercises-in-futility',
        title: 'Exercises in Futility',
        type: 'LP',
        year: 2015,
        label: 'No Solace',
        tracks: [
          { number: 1, title: 'Exercises in Futility I', duration: '7:02', lyrics: `We are born into the long defeat\nBefore the first breath clears\nEvery monument to meaning\nAlready tilting toward the earth\n\nExercise: hold your shape\nAgainst the pressure of the nothing\nExercise: name the void\nAs though naming it could tame it\n\nIt cannot` },
          { number: 2, title: 'Exercises in Futility II', duration: '7:24' },
          { number: 3, title: 'Exercises in Futility III', duration: '6:47', lyrics: `The city of the self\nBuilt on unstable ground\nEach room I furnish carefully\nIs wind by morning found\n\nI learn the shape of loss\nThrough repetition's grace\nAnd practice the futility\nOf holding any place` },
          { number: 4, title: 'Exercises in Futility IV', duration: '4:53' },
          { number: 5, title: 'Exercises in Futility V', duration: '8:36' },
          { number: 6, title: 'Exercises in Futility VI', duration: '5:01', lyrics: `This is the last exercise:\nSurrender the last fiction\nThat any of this mattered\nBeyond the moment's friction\n\nAnd yet — the riff descends again\nAnd yet — the kick drum strikes the air\nThe exercise is not the answer\nThe exercise is being there` },
        ],
      },
      {
        id: 'mgla-age-of-excuse',
        slug: 'age-of-excuse',
        title: 'Age of Excuse',
        type: 'LP',
        year: 2019,
        label: 'No Solace',
        tracks: [
          { number: 1, title: 'Age of Excuse I', duration: '6:28' },
          { number: 2, title: 'Age of Excuse II', duration: '7:51', lyrics: `The age of excuse arrives\nOn a tide of careful language\nWhere every wound finds its alibi\nAnd truth becomes a bandage\n\nWe built our prisons word by word\nAnd called the walls protection\nThe age of excuse is not decline —\nIt is decline's reflection` },
          { number: 3, title: 'Age of Excuse III', duration: '6:14' },
          { number: 4, title: 'Age of Excuse IV', duration: '7:02' },
          { number: 5, title: 'Age of Excuse V', duration: '5:44' },
          { number: 6, title: 'Age of Excuse VI', duration: '8:33' },
        ],
      },
    ],
  },

  {
    id: 'panopticon',
    slug: 'panopticon',
    name: 'Panopticon',
    country: 'United States',
    countryCode: 'US',
    formed: 2007,
    genres: ['Post-Black Metal', 'Folk Metal', 'Atmospheric Black Metal'],
    bio: 'Panopticon is the one-man project of Austin Lunn, born in Kentucky and based in Minnesota. Operating at the intersection of Cascadian black metal, American folk, and Appalachian tradition, Panopticon creates music of extraordinary emotional and political depth. Lunn draws on themes of labor struggle, ecological grief, isolation, and the beauty of the natural world.',
    releases: [
      {
        id: 'panopticon-kentucky',
        slug: 'kentucky',
        title: 'Kentucky',
        type: 'LP',
        year: 2012,
        label: 'Bindrune Recordings',
        tracks: [
          { number: 1, title: 'Bernheim Forest, in Spring', duration: '1:48' },
          { number: 2, title: 'Which Side Are You On?', duration: '4:56', lyrics: `Come all of you good workers\nGood news to you I'll tell\nOf how the good old union\nHas come in here to dwell\n\nWhich side are you on?\nWhich side are you on?\n\n[Traditional — Florence Reece, 1931\nArranged for Panopticon, 2012]` },
          { number: 3, title: 'Black Soot and Red Blood', duration: '8:22', lyrics: `The seam runs dark beneath the mountain\nAnd we ran darker still\nEvery shift a deal struck with the nothing\nEvery breath another bill\n\nBlack soot and red blood\nAre the colors of this county\nBlack soot and red blood\nAre the price of its bounty` },
          { number: 4, title: 'The Ghosts of Harlan County', duration: '9:44' },
          { number: 5, title: 'Killing the Giants as They Sleep', duration: '11:02' },
          { number: 6, title: 'Bodies Under the Falls', duration: '4:12' },
          { number: 7, title: 'Come All Ye Coal Miners', duration: '3:28' },
          { number: 8, title: 'When the Sun Fell from the Sky', duration: '9:17' },
        ],
      },
      {
        id: 'panopticon-roads-to-the-north',
        slug: 'roads-to-the-north',
        title: 'Roads to the North',
        type: 'LP',
        year: 2014,
        label: 'Bindrune Recordings',
        tracks: [
          { number: 1, title: 'The Echoes of a Disharmonic Evensong', duration: '8:37', lyrics: `The lake holds the sky without judgment\nEach cloud a guest it doesn't name\nI have been the surface and the depth\nI have been the mirror and the frame\n\nNorth is not a place —\nIt is the direction that makes sense\nWhen south is only loss\nAnd east and west are tense` },
          { number: 2, title: 'The Long Road (Pt. 1)', duration: '7:21', lyrics: `Mile one: I carry everything\nMile ten: I'm choosing what to keep\nMile fifty: the weight was never the pack\nMile hundred: the weight was never sleep\n\nThe long road does not ask\nIf you are ready for its length\nThe long road only asks\nIf you have used your strength` },
          { number: 3, title: 'The Long Road (Pt. 2) / Finale', duration: '9:44' },
          { number: 4, title: 'Oraison', duration: '3:22' },
          { number: 5, title: 'The Crescendo of Dusk', duration: '4:41', lyrics: `The light does not leave — it is taken\nBy the rotating fact of the earth\nI have stood here while the valley darkened\nAnd found in the ending a worth\n\nThis is the crescendo of dusk:\nThe moment the song most means\nBefore the final chord is silence\nBefore the night convenes` },
          { number: 6, title: 'In Silence', duration: '7:14' },
          { number: 7, title: 'Roads to the North', duration: '17:43', lyrics: `I drove these roads as a younger grief\nHeaded nowhere that had a name\nThe pines kept their counsel on both sides\nThe road itself remained the same\n\nI am going north because south is done\nNorth holds nothing I can name\nBut nothing is what I need tonight —\nA nothing without blame\n\nThe roads branch and I choose by feel\nThe fork that feels like cold\nAnd somewhere in the boreal dark\nI am becoming old\n\nAnd that is fine.\nAnd that is fine.` },
        ],
      },
      {
        id: 'panopticon-the-scars-of-man',
        slug: 'the-scars-of-man',
        title: 'The Scars of Man on the Once Nameless Wilderness (I and II)',
        type: 'LP',
        year: 2018,
        label: 'Bindrune Recordings',
        tracks: [
          { number: 1, title: 'Where Mountains Pierce the Clouds', duration: '9:12' },
          { number: 2, title: 'Dead Loons', duration: '8:44' },
          { number: 3, title: 'Moth Eaten Soul', duration: '6:28' },
          { number: 4, title: 'A Snowless Winter', duration: '5:17' },
          { number: 5, title: 'The Sorrow Paths', duration: '10:03' },
          { number: 6, title: 'The Wandering Ghost', duration: '4:55' },
          { number: 7, title: 'The Slow Decay', duration: '7:41' },
          { number: 8, title: 'Chase the Dark Away', duration: '4:02' },
        ],
      },
    ],
  },

  {
    id: 'bell-witch',
    slug: 'bell-witch',
    name: 'Bell Witch',
    country: 'United States',
    countryCode: 'US',
    formed: 2010,
    genres: ['Funeral Doom', 'Doom Metal'],
    bio: 'Bell Witch is a two-piece funeral doom band from Seattle, Washington, consisting of bass and drums — no guitar. Their sound is characterized by extreme sonic weight, glacial tempos, and a profound emotional depth rarely encountered in heavy music. Their 2017 album Mirror Reaper, a single 83-minute composition, is widely regarded as a landmark of the genre.',
    releases: [
      {
        id: 'bell-witch-longing',
        slug: 'longing',
        title: 'Longing',
        type: 'LP',
        year: 2012,
        label: 'Profound Lore Records',
        tracks: [
          { number: 1, title: 'Longing (The Messenger)', duration: '12:48', lyrics: `I carry your name like a stone in my chest\nThat I press against sleep\nAnd even the sleep will not take it\nOnly deepen the keep\n\nThe messenger brought me your leaving\nIn a language I already knew\nThe messenger was only the morning\nAnd the morning is always true` },
          { number: 2, title: 'Rows (of Endless Waves)', duration: '14:22' },
          { number: 3, title: 'I Wait', duration: '16:07', lyrics: `I wait in the place you are not\nI wait in the light you left\nI wait in the shape of a greeting\nFor the one who has become the bereft\n\nThe room does not mourn\nOnly I perform that office\nThe room simply holds the air\nYour absence fills like darkness` },
          { number: 4, title: 'Massacre', duration: '8:51' },
          { number: 5, title: 'Beneath the Mask', duration: '11:04' },
        ],
      },
      {
        id: 'bell-witch-four-phantoms',
        slug: 'four-phantoms',
        title: 'Four Phantoms',
        type: 'LP',
        year: 2015,
        label: 'Profound Lore Records',
        tracks: [
          { number: 1, title: 'Suffocation, A Burial: I - Awoken (From the Deep Sleep of the Earth)', duration: '21:03', lyrics: `Below all dreaming, below all refusal\nThe quiet weight of the sediment year\nI woke inside the burial\nAnd found my waking was a deeper fear\n\nThe phantom of suffocation\nSits across from me at every meal\nOffers me the bread of ending\nAnd asks me how I feel` },
          { number: 2, title: 'Suffocation, A Burial: II - Somniloquy', duration: '16:44' },
          { number: 3, title: 'Starvation, A Sickness: I - Hunger', duration: '14:22' },
          { number: 4, title: 'Starvation, A Sickness: II - Harrowing', duration: '19:08' },
        ],
      },
      {
        id: 'bell-witch-mirror-reaper',
        slug: 'mirror-reaper',
        title: 'Mirror Reaper',
        type: 'LP',
        year: 2017,
        label: 'Profound Lore Records',
        tracks: [
          {
            number: 1,
            title: 'Mirror Reaper',
            duration: '83:43',
            lyrics: `I.\n\nThe mirror holds what cannot hold itself\nThe reaper waits at the reflective edge\nBetween the image and the thing itself\nBetween the dying and the made pledge\n\nHere is the first movement:\nThe weight of continuation\nThe impossibility of grief's end\nAnd grief's strange consolation\n\nII.\n\nEdward rides the organ through the dark\nHis notes the only warmth in that cold nave\nAnd everything that ends begins again\nThe song the requiem the grave\n\nIII.\n\nThe mirror fractures —\nNot from impact\nBut from the slow pressure\nOf everything it held\n\nAnd in each shard:\na smaller mirror\nAnd in each smaller mirror:\nthe same reaper\n\nwaiting\n\nIV.\n\nThis is where the record ends\nThis is where the record begins\nThe needle lifts\nAnd sets itself again\n\nThe same weight\nThe same groove\nThe same song\nof irreducible loss`,
          },
        ],
      },
    ],
  },

  {
    id: 'sunno',
    slug: 'sunno',
    name: 'Sunn O)))',
    country: 'United States',
    countryCode: 'US',
    formed: 1998,
    genres: ['Drone Metal', 'Doom Metal', 'Avant-Garde'],
    bio: 'Sunn O))) is an American avant-garde metal band formed in Seattle, Washington, by guitarists Greg Anderson and Stephen O\'Malley. Pioneering drone metal and post-metal, they create music of extraordinary volume and minimalism — long, sustained guitar tones building into overwhelming sonic environments. Live, they perform in robes within clouds of fog, prioritizing physical and psychological immersion over conventional performance.',
    releases: [
      {
        id: 'sunno-oo-void',
        slug: 'oo-void',
        title: '00 Void',
        type: 'LP',
        year: 2000,
        label: 'Important Records',
        tracks: [
          { number: 1, title: 'Richard', duration: '20:41' },
          { number: 2, title: 'NN O))))', duration: '15:24' },
          { number: 3, title: 'Mythology of Void (Electric Max)', duration: '22:07' },
        ],
      },
      {
        id: 'sunno-monoliths-and-dimensions',
        slug: 'monoliths-and-dimensions',
        title: 'Monoliths & Dimensions',
        type: 'LP',
        year: 2009,
        label: 'Southern Lord',
        tracks: [
          { number: 1, title: 'Aghartha', duration: '16:38', lyrics: `Beneath the earth's crust: a sun\nBeneath that sun: another world\nBeneath that world: the sound\nthat holds all worlds\nin suspension\n\nDescend.\n\nThe drone is not music —\nIt is the frequency\nAt which matter\nBelieves in itself` },
          { number: 2, title: 'Big Church [megszentségteleníthetetlenségeskedéseitekért]', duration: '13:24' },
          { number: 3, title: 'Hunting & Gathering (Cydonia)', duration: '13:16' },
          { number: 4, title: 'Alice', duration: '18:07', lyrics: `Alice walked into the volume\nAs through a looking-glass of sound\nOn the other side of maximum\nA silence more profound\n\nShe did not lose herself in there —\nShe found what self had been concealing:\nThe resonance beneath the person\nThe frequency past feeling` },
        ],
      },
      {
        id: 'sunno-life-metal',
        slug: 'life-metal',
        title: 'Life Metal',
        type: 'LP',
        year: 2019,
        label: 'Southern Lord',
        tracks: [
          { number: 1, title: 'Between Sleipnir\'s Breaths', duration: '11:11', lyrics: `Between the god-horse's exhalations\nWe fit our entire lives\nThe breath is long — we call that living\nThe pause is brief — we call that what survives\n\nThe riff is the breath\nThe silence is the gallop\nAnd we are small figures\nIn the passage between` },
          { number: 2, title: 'Troubled Air', duration: '16:06' },
          { number: 3, title: 'Life Metal', duration: '11:41', lyrics: `Life is the metal —\nNot the death that poses\nNot the skull, not the cross, not the grave\n\nLife is the metal:\nThe unreasonable insistence\nOf the living, even unto the wave\n\nPlay it loud.\nPlay it loud because it ends.\nPlay it loud because it ends\nand that is why it ascends.` },
          { number: 4, title: 'Novæ', duration: '24:00' },
        ],
      },
    ],
  },
]

export function getBandBySlug(slug: string): Band | undefined {
  return BANDS.find((b) => b.slug === slug)
}

export function getReleaseBySlug(band: Band, albumSlug: string): Release | undefined {
  return band.releases.find((r) => r.slug === albumSlug)
}

export function getRelease(bandSlug: string, albumSlug: string): { band: Band; release: Release } | undefined {
  const band = getBandBySlug(bandSlug)
  if (!band) return undefined
  const release = getReleaseBySlug(band, albumSlug)
  if (!release) return undefined
  return { band, release }
}
