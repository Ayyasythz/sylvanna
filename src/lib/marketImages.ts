// Placeholder art until the backend can store an image per market. Photos come from
// Wikimedia Commons, resized to 800 px wide; their licences require the credit shown in the UI.
export interface MarketImage {
  src: string
  alt: string
  credit: { artist: string; license: string; licenseUrl: string; source: string }
}

const IMAGES: Record<number, MarketImage> = {
  1: {
    src: '/markets/1.jpg',
    alt: 'A golden Bitcoin coin',
    credit: {
      artist: 'Satheesh Sankaran',
      license: 'CC BY-SA 2.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0',
      source: 'https://commons.wikimedia.org/wiki/File:Bitcoin_BTC_golden_coin_with_the_symbol.jpg',
    },
  },
  2: {
    src: '/markets/2.jpg',
    alt: 'Indonesia fans at Gelora Bung Karno Stadium',
    credit: {
      artist: 'Gunawan Kartapranata',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
      source: 'https://commons.wikimedia.org/wiki/File:Gelora_Bung_Karno_Stadium,_Asia_Cup_2007.jpg',
    },
  },
  3: {
    src: '/markets/3.jpg',
    alt: 'Bank Indonesia headquarters in Jakarta',
    credit: {
      artist: 'Medelam',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      source: 'https://commons.wikimedia.org/wiki/File:Gedung_Bank_Indonesia_di_Jakarta_(2026)_01.jpg',
    },
  },
  4: {
    src: '/markets/4.jpg',
    alt: 'A physical Ethereum coin',
    credit: {
      artist: 'Ivan Radic',
      license: 'CC BY 2.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
      source: 'https://commons.wikimedia.org/wiki/File:Close-up_of_a_physical_Ethereum_coin_(51002904687).jpg',
    },
  },
  5: {
    src: '/markets/5.jpg',
    alt: 'A Jakarta MRT train at ASEAN station',
    credit: {
      artist: 'VulcanSphere',
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0',
      source: 'https://commons.wikimedia.org/wiki/File:Jakarta_MRT_train_departing_from_ASEAN_MRT_Station.jpg',
    },
  },
  6: {
    src: '/markets/6.jpg',
    alt: 'A strip of 35 mm film',
    credit: {
      artist: 'Runner1616',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
      source: 'https://commons.wikimedia.org/wiki/File:35mm_movie_negative.jpg',
    },
  },
}

export const marketImage = (market: number): MarketImage | undefined => IMAGES[market]
