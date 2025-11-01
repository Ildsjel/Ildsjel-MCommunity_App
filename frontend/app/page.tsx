import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        {/* Logo/Title */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-ghost-white mb-4 font-serif">
            Grimr
          </h1>
          <p className="text-xl text-stone-gray">
            Metalheads Connect
          </p>
          <p className="text-sm text-stone-gray mt-2">
            Letterboxd meets Bandcamp for Metal
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-4 justify-center mb-12">
          <Link
            href="/auth/register"
            className="px-8 py-3 bg-occult-crimson hover:bg-opacity-80 text-ghost-white font-semibold rounded transition-all"
          >
            Sign Up
          </Link>
          <Link
            href="/auth/login"
            className="px-8 py-3 border-2 border-iron-gray hover:border-occult-crimson text-silver-text font-semibold rounded transition-all"
          >
            Login
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="p-6 bg-deep-charcoal rounded-lg border border-iron-gray">
            <h3 className="text-xl font-bold text-occult-crimson mb-2">
              Metal-ID
            </h3>
            <p className="text-stone-gray">
              Connect your Spotify, Last.fm, Discogs & Bandcamp. Auto-generate your Metal identity.
            </p>
          </div>

          <div className="p-6 bg-deep-charcoal rounded-lg border border-iron-gray">
            <h3 className="text-xl font-bold text-occult-crimson mb-2">
              Find Your Tribe
            </h3>
            <p className="text-stone-gray">
              Discover Metalheads with similar taste nearby. Compatibility matching based on your music DNA.
            </p>
          </div>

          <div className="p-6 bg-deep-charcoal rounded-lg border border-iron-gray">
            <h3 className="text-xl font-bold text-occult-crimson mb-2">
              Events & Community
            </h3>
            <p className="text-stone-gray">
              Find concerts, join event groups, share album reviews. Connect IRL.
            </p>
          </div>
        </div>

        {/* API Status */}
        <div className="text-center mt-12 text-xs text-stone-gray">
          <p>Backend API: <span className="text-whisper-green">●</span> Running on localhost:8000</p>
        </div>
      </div>
    </main>
  )
}

