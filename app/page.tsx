import HollerLogo from '@/components/HollerLogo'

export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>

      <div style={{ maxWidth: '520px', width: '100%', textAlign: 'center' }}>

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <HollerLogo variant="full" size={420} />
        </div>

        {/* Tagline */}
        <p className="label" style={{ marginBottom: '48px', letterSpacing: '0.2em' }}>
          Live Song Requests
        </p>

        {/* How it works */}
        <div className="card" style={{ marginBottom: '40px', textAlign: 'left', padding: '28px 32px' }}>
          <p className="label-accent" style={{ marginBottom: '20px' }}>How it works</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              ['Scan the QR code', 'The band puts up a code at the start of their set.'],
              ['Request a song', 'Search Spotify or type in anything you want to hear.'],
              ['Tip to boost it', 'Add a tip to your request. Others can add to it too.'],
              ['Get your money back', "If the song doesn't get played, you're automatically refunded."],
            ].map(([title, desc]) => (
              <div key={title} style={{ display: 'flex', gap: '16px' }}>
                <span style={{ color: 'var(--accent)', fontFamily: "'Teko', sans-serif", fontSize: '18px', lineHeight: '1.4', flexShrink: 0 }}>✦</span>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '2px' }}>{title}</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.7' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <a
            href="/signup"
            className="btn-primary"
            style={{ display: 'block', textDecoration: 'none', fontSize: '18px', padding: '14px' }}
          >
            I'm a musician — sign me up →
          </a>
          <a
            href="/dashboard"
            style={{
              display: 'block',
              color: 'var(--text-muted)',
              fontSize: '12px',
              letterSpacing: '0.08em',
              textDecoration: 'none',
              padding: '8px',
            }}
          >
            Already have an account? Sign in
          </a>
        </div>

      </div>

    </main>
  )
}
